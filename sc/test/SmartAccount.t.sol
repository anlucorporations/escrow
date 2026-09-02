// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {SmartAccount} from "../src/SmartAccount.sol";
import {SmartAccountFactory} from "../src/SmartAccountFactory.sol";

/**
 * @title SmartAccount — Ciclo 2 (Fase 3)
 * @notice Pruebas de la wallet de identidad ERC-4337 inspirada (D35):
 *         - despliegue por factory (CU-01)
 *         - ejecucion por firma EIP-712 con nonce (D16/D35)
 *         - escalera KYC INSCRITO/VERIFICADO/CERTIFICADO por merkle root (D28, RF-01.7)
 *         - recuperacion social: 3 guardianes, umbral 2/3, timelock 48 h (D34, CU-04)
 */
contract SmartAccountTest is Test {
    SmartAccountFactory private factory;
    SmartAccount private cuenta;

    uint256 private claveOwner = 0xA11CE;
    address private owner = vm.addr(claveOwner);

    uint256 private claveG1 = 0x6100;
    uint256 private claveG2 = 0x6200;
    uint256 private claveG3 = 0x6300;
    address private g1 = vm.addr(claveG1);
    address private g2 = vm.addr(claveG2);
    address private g3 = vm.addr(claveG3);

    // destinatario de prueba para execute()
    address private destino = address(0xDEAD);
    bytes32 private rootInscrito = keccak256("INSCRITO");

    function setUp() public {
        factory = new SmartAccountFactory();
        cuenta = SmartAccount(payable(factory.desplegarCuenta(owner, rootInscrito)));
    }

    // ============================================================ utilidades de firma EIP-712
    function _firmar(bytes32 digest, uint256 clave) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(clave, digest);
        return abi.encodePacked(r, s, v);
    }

    function _hashExecute(address to, uint256 valor, bytes memory data, uint256 nonce)
        internal
        view
        returns (bytes32)
    {
        bytes32 typehash = keccak256("Execute(address to,uint256 value,bytes data,uint256 nonce)");
        bytes32 structHash = keccak256(abi.encode(typehash, to, valor, keccak256(data), nonce));
        return keccak256(abi.encodePacked("\x19\x01", cuenta.domainSeparator(), structHash));
    }

    function _hashCambiarEstado(uint8 estado, uint256 nonce) internal view returns (bytes32) {
        bytes32 typehash = keccak256("CambiarEstadoVerificacion(uint8 estado,uint256 nonce)");
        bytes32 structHash = keccak256(abi.encode(typehash, estado, nonce));
        return keccak256(abi.encodePacked("\x19\x01", cuenta.domainSeparator(), structHash));
    }

    // ============================================================ CU-01 despliegue
    function test_Factory_DespliegaCuenta() public {
        assertEq(address(cuenta), factory.cuentas(owner), "factory registra cuenta");
        assertEq(cuenta.owner(), owner, "owner inicial");
        assertEq(uint256(cuenta.estadoVerificacion()), uint256(SmartAccount.EstadoVerificacion.INSCRITO));
    }

    function test_Factory_Idempotente() public {
        address previa = factory.predecirCuenta(owner, rootInscrito);
        assertEq(previa, address(cuenta), "prediccion CREATE2 coincide");
        // segunda llamada devuelve la misma
        address otra = factory.desplegarCuenta(owner, rootInscrito);
        assertEq(otra, address(cuenta), "no despliega duplicado");
    }

    // ============================================================ CU-01/23 execute EIP-712
    function test_Execute_PorFirmaOwner() public {
        bytes memory data = abi.encodeWithSignature("registrar(uint256)", 42);
        bytes32 digest = _hashExecute(destino, 0, data, 0);
        bytes memory firma = _firmar(digest, claveOwner);

        // Lo invoca un relayer (no el owner); el owner solo firmo
        vm.prank(address(0x9A11CE));
        cuenta.execute(destino, 0, data, 0, firma);

        assertEq(cuenta.nonce(), 1, "nonce incrementado");
    }

    function test_Revert_Execute_FirmaInvalida() public {
        bytes memory data = abi.encodeWithSignature("registrar(uint256)", 42);
        bytes32 digest = _hashExecute(destino, 0, data, 0);
        bytes memory firma = _firmar(digest, claveG1); // firma de un no-owner
        vm.expectRevert(SmartAccount.FirmaInvalida.selector);
        cuenta.execute(destino, 0, data, 0, firma);
    }

    function test_Revert_Execute_NonceRepetido() public {
        bytes memory data = abi.encodeWithSignature("registrar(uint256)", 42);
        bytes32 digest0 = _hashExecute(destino, 0, data, 0);
        bytes memory firma0 = _firmar(digest0, claveOwner);
        cuenta.execute(destino, 0, data, 0, firma0); // nonce 0→1

        // replay del mismo nonce 0 → rechazado (anti-replay D16)
        vm.expectRevert();
        cuenta.execute(destino, 0, data, 0, firma0);
    }

    // ============================================================ CU-02 escalera KYC (D28)
    function test_KYC_EscaleraVerificacion() public {
        bytes32 rootVerificado = keccak256("VERIFICADO");
        bytes32 rootCertificado = keccak256("CERTIFICADO");

        // Etapa 1: correo+telefono → VERIFICADO (lo firma el owner, lo envia el backend)
        bytes32 digest1 = _hashCambiarEstado(1, 0);
        bytes memory firma1 = _firmar(digest1, claveOwner);
        cuenta.cambiarEstadoVerificacion(SmartAccount.EstadoVerificacion.VERIFICADO, rootVerificado, 0, firma1);
        assertEq(uint256(cuenta.estadoVerificacion()), uint256(SmartAccount.EstadoVerificacion.VERIFICADO));
        assertEq(cuenta.kycMerkleRoot(), rootVerificado);

        // Etapa 2: KYC completo → CERTIFICADO
        bytes32 digest2 = _hashCambiarEstado(2, 1);
        bytes memory firma2 = _firmar(digest2, claveOwner);
        cuenta.cambiarEstadoVerificacion(SmartAccount.EstadoVerificacion.CERTIFICADO, rootCertificado, 1, firma2);
        assertEq(uint256(cuenta.estadoVerificacion()), uint256(SmartAccount.EstadoVerificacion.CERTIFICADO));
        assertEq(cuenta.kycMerkleRoot(), rootCertificado);
        assertEq(cuenta.nonce(), 2);
    }

    function test_KYC_InclusionMerkle() public {
        bytes32 rootCertificado = keccak256("CERTIFICADO");
        bytes32 digest = _hashCambiarEstado(2, 0);
        bytes memory firma = _firmar(digest, claveOwner);
        cuenta.cambiarEstadoVerificacion(SmartAccount.EstadoVerificacion.CERTIFICADO, rootCertificado, 0, firma);

        // Prueba de inclusion trivial: hoja == root (arbol de 1 hoja por usuario)
        assertTrue(cuenta.verificarInclusion(rootCertificado, new bytes32[](0)), "raiz es hoja valida");
    }

    // ============================================================ CU-04 recuperacion social (D34)
    function _designarGuardianes() internal {
        vm.prank(owner);
        cuenta.designarGuardianes([g1, g2, g3]);
    }

    function test_Recuperacion_Umbral2de3_Timelock48h() public {
        vm.prank(owner);
        cuenta.designarGuardianes([g1, g2, g3]);

        address nuevoOwner = address(0x9B0B);
        // g1 propone
        vm.prank(g1);
        cuenta.proponerRecuperacion(nuevoOwner);
        // g2 aprueba → umbral 2/3 alcanzado
        vm.prank(g2);
        cuenta.proponerRecuperacion(nuevoOwner);

        SmartAccount.PropuestaRecuperacion memory p = cuenta.propuestaRecuperacion();
        assertTrue(p.momentoAprobada != 0, "umbral alcanzado fija timestamp");

        // antes de 48 h no se ejecuta
        vm.warp(block.timestamp + 47 hours);
        vm.expectRevert();
        cuenta.ejecutarRecuperacion();

        // tras 48 h se ejecuta (cualquiera puede llamar — keeper)
        vm.warp(block.timestamp + 2 hours);
        cuenta.ejecutarRecuperacion();
        assertEq(cuenta.owner(), nuevoOwner, "owner recuperado");
    }

    function test_Recuperacion_CanceladaPorOwner() public {
        vm.prank(owner);
        cuenta.designarGuardianes([g1, g2, g3]);
        vm.prank(g1);
        cuenta.proponerRecuperacion(address(0x9B0B));
        vm.prank(g2);
        cuenta.proponerRecuperacion(address(0x9B0B));

        vm.prank(owner);
        cuenta.cancelarRecuperacion();

        vm.warp(block.timestamp + 49 hours);
        vm.expectRevert(SmartAccount.SinPropuesta.selector);
        cuenta.ejecutarRecuperacion();
        assertEq(cuenta.owner(), owner, "owner intacto tras cancelar");
    }

    function test_Revert_Recuperacion_UnSoloGuardian() public {
        vm.prank(owner);
        cuenta.designarGuardianes([g1, g2, g3]);
        vm.prank(g1);
        cuenta.proponerRecuperacion(address(0x9B0B));
        // un solo guardian NO alcanza umbral
        SmartAccount.PropuestaRecuperacion memory p = cuenta.propuestaRecuperacion();
        assertEq(p.momentoAprobada, 0, "sin umbral no fija timestamp");
    }

    function test_Revert_Recuperacion_NoGuardian() public {
        vm.prank(owner);
        cuenta.designarGuardianes([g1, g2, g3]);
        vm.prank(address(0x9C1A1)); // no es guardian
        vm.expectRevert(SmartAccount.SoloGuardian.selector);
        cuenta.proponerRecuperacion(address(0x9B0B));
    }

    function test_Revert_Guardianes_NoOwner() public {
        vm.prank(g1);
        vm.expectRevert(SmartAccount.SoloOwner.selector);
        cuenta.designarGuardianes([g1, g2, g3]);
    }

    function test_Revert_Guardianes_Fijos() public {
        vm.prank(owner);
        cuenta.designarGuardianes([g1, g2, g3]);
        // segunda designacion prohibida (evita rotacion durante ataque)
        vm.prank(owner);
        vm.expectRevert(SmartAccount.GuardianesFijos.selector);
        cuenta.designarGuardianes([g3, g2, g1]);
    }

    // ============================================================ fuzz
    function testFuzz_Execute_NonceSecuencial(uint8 n) public {
        vm.assume(n < 20);
        bytes memory data = abi.encodeWithSignature("registrar(uint256)", 1);
        for (uint256 i = 0; i <= n; i++) {
            bytes32 digest = _hashExecute(destino, 0, data, i);
            bytes memory firma = _firmar(digest, claveOwner);
            cuenta.execute(destino, 0, data, i, firma);
        }
        assertEq(cuenta.nonce(), uint256(n) + 1, "nonces secuenciales");
    }
}
