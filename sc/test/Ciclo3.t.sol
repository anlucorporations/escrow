// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {SociosRegistry} from "../src/SociosRegistry.sol";
import {BRLT} from "../src/BRLT.sol";
import {FondoDeValor} from "../src/FondoDeValor.sol";
import {SuscripcionEmpresa} from "../src/SuscripcionEmpresa.sol";

/**
 * @title Ciclo 3 (Fase 3): BRLT + SociosRegistry + SuscripcionEmpresa + FondoDeValor
 * @notice Pruebas de gobernanza y fondos:
 *         - CU-03: admision de Socios por votacion con quorum ≥2/3, 1 voto por Socio (D21)
 *         - CU-31: emision BRLT solo via SociosRegistry (quorum 2/3) respetando tope 1M (D32),
 *                  con 5% al fondo (D7) y proposito registrado
 *         - CU-24: suscripcion de empresa por staking bloqueado 30 dias, 100 BRLT/mes (D33),
 *                  10% al fondo (D7)
 *         - CU-30: fondo de valor con porcentajes configurables por el Owner (D7)
 */
contract Ciclo3Test is Test {
    SociosRegistry private registry;
    BRLT private brlt;
    FondoDeValor private fondo;
    SuscripcionEmpresa private suscripcion;

    address private owner = address(this);
    address private s1 = address(0x5001);
    address private s2 = address(0x5002);
    address private s3 = address(0x5003);
    address private empresa = address(0x6001);

    uint256 private topeInicial = 1_000_000 ether;

    function setUp() public {
        registry = new SociosRegistry();
        brlt = new BRLT();
        fondo = new FondoDeValor();
        suscripcion = new SuscripcionEmpresa();

        // vincular: registry -> brlt -> fondo; suscripcion -> brlt/fondo
        brlt.vincularRegistry(address(registry));
        brlt.vincularFondo(address(fondo));
        fondo.vincularBrlt(address(brlt));
        registry.vincularBrlt(address(brlt));
        suscripcion.vincularBrlt(address(brlt));
        suscripcion.vincularFondo(address(fondo));

        // padron inicial: 3 socios (s1, s2, s3) sembrados por el owner
        registry.admitirSocioDirecto(s1);
        registry.admitirSocioDirecto(s2);
        registry.admitirSocioDirecto(s3);
    }

    // ============================================================ CU-03 admision de Socios
    function test_AdmisionSocio_Quorum2de3() public {
        address candidato = address(0x7001);
        vm.prank(candidato);
        registry.solicitarAdmision();

        // s1 y s2 votan a favor → 2/3 del padron (3 socios) → se admite
        vm.prank(s1);
        registry.votarAdmision(candidato, true);
        assertTrue(!registry.esSocio(candidato), "aun no con 1 voto");

        vm.prank(s2);
        registry.votarAdmision(candidato, true);
        assertTrue(registry.esSocio(candidato), "admitido con 2 de 3");
        assertEq(registry.totalSocios(), 4);
    }

    function test_AdmisionSocio_RequiereDosTercios() public {
        address candidato = address(0x7002);
        vm.prank(candidato);
        registry.solicitarAdmision();
        vm.prank(s1);
        registry.votarAdmision(candidato, true);
        // un voto a favor y un voto en contra (s2): 1/3 → no admitido
        vm.prank(s2);
        registry.votarAdmision(candidato, false);
        assertTrue(!registry.esSocio(candidato), "no admitido con 1 a favor y 1 en contra");
    }

    function test_Revert_VotoAdmision_NoSocio() public {
        address candidato = address(0x7003);
        vm.prank(candidato);
        registry.solicitarAdmision();
        vm.prank(address(0x9999)); // no es socio
        vm.expectRevert(SociosRegistry.SoloSocio.selector);
        registry.votarAdmision(candidato, true);
    }

    function test_Revert_VotoAdmision_Doble() public {
        address candidato = address(0x7004);
        vm.prank(candidato);
        registry.solicitarAdmision();
        vm.prank(s1);
        registry.votarAdmision(candidato, true);
        vm.prank(s1);
        vm.expectRevert(SociosRegistry.YaVoto.selector);
        registry.votarAdmision(candidato, true);
    }

    // ============================================================ CU-31 emision BRLT (D32)
    function test_EmisionBRLT_SoloViaRegistry() public {
        // crear propuesta de emision de 100.000 BRLT al owner
        uint256 pid = registry.crearPropuesta(
            SociosRegistry.TipoPropuesta.EMITIR_BRLT,
            keccak256("compra de inventario"),
            100_000 ether
        );
        // 2/3 aprueban (s1, s2)
        vm.prank(s1);
        registry.votarPropuesta(pid, true);
        vm.prank(s2);
        registry.votarPropuesta(pid, true);

        assertEq(brlt.totalSupply(), 100_000 ether, "emitidos 100.000");
        assertEq(brlt.balanceOf(owner), 95_000 ether, "owner recibe 95% (5% al fondo)");
        assertEq(brlt.balanceOf(address(fondo)), 5_000 ether, "5% al fondo de valor (D7)");
        assertEq(fondo.saldoBrlt(), 5_000 ether, "saldo fondo contabilizado");
        assertEq(brlt.totalEmisiones(), 1, "emision registrada con proposito");
    }

    function test_Revert_Emision_DirectaSinRegistry() public {
        vm.expectRevert(BRLT.SoloRegistry.selector);
        brlt.emitir(1 ether, owner, keccak256("directa"));
    }

    function test_Revert_Emision_ExcedeTope() public {
        // intentar emitir mas que el tope (1M) en una sola operacion
        uint256 pid = registry.crearPropuesta(
            SociosRegistry.TipoPropuesta.EMITIR_BRLT,
            keccak256("excede"),
            topeInicial + 1 ether
        );
        vm.prank(s1);
        registry.votarPropuesta(pid, true); // 1/3: no ejecuta aún
        vm.prank(s2);
        vm.expectRevert(); // el voto de s2 alcanza quórum y la ejecución revierte (ExcedeTope)
        registry.votarPropuesta(pid, true);
    }

    function test_SubirTope_ViaPropuesta2tercios() public {
        uint256 pid = registry.crearPropuesta(
            SociosRegistry.TipoPropuesta.SUBIR_TOPE_BRLT,
            keccak256("aumento"),
            2_000_000 ether
        );
        vm.prank(s1);
        registry.votarPropuesta(pid, true);
        vm.prank(s2);
        registry.votarPropuesta(pid, true);
        assertEq(brlt.topeEmision(), 2_000_000 ether, "tope actualizado por quorum 2/3");
    }

    function test_Revert_SubirTope_Directo() public {
        vm.expectRevert(BRLT.SoloRegistry.selector);
        brlt.subirTope(2_000_000 ether);
    }

    function test_Fondo_PorcentajesConfigurables() public {
        fondo.setPorcentajeTrueque(2);
        fondo.setPorcentajeSuscripcion(15);
        fondo.setPorcentajeEmision(7);
        assertEq(fondo.porcentajeTrueque(), 2);
        assertEq(fondo.porcentajeSuscripcion(), 15);
        assertEq(fondo.porcentajeEmision(), 7);
    }

    // ============================================================ CU-24 suscripcion empresa (D33)
    function _fondearEmpresa() internal {
        // emitir BRLT al owner y transferir a la empresa
        uint256 pid = registry.crearPropuesta(
            SociosRegistry.TipoPropuesta.EMITIR_BRLT,
            keccak256("fondear empresa"),
            10_000 ether
        );
        vm.prank(s1);
        registry.votarPropuesta(pid, true);
        vm.prank(s2);
        registry.votarPropuesta(pid, true);
        // owner tiene 9.500 BRLT netos; transferir 1.000 a la empresa
        brlt.transfer(empresa, 1_000 ether);
        vm.prank(empresa);
        brlt.approve(address(suscripcion), type(uint256).max);
    }

    function test_SuscripcionEmpresa_Staking() public {
        _fondearEmpresa();
        vm.prank(empresa);
        suscripcion.suscribirse();

        SuscripcionEmpresa.Suscripcion memory s = suscripcion.suscripciones(empresa);
        assertEq(uint256(s.estado), uint256(SuscripcionEmpresa.EstadoSuscripcion.ACTIVA));
        assertEq(s.montoPlan, 100 ether, "plan base 100 BRLT/mes (D33)");
        assertEq(brlt.balanceOf(address(suscripcion)), 100 ether, "staking bloqueado");
        assertEq(brlt.balanceOf(empresa), 900 ether, "empresa paga 100");
    }

    function test_SuscripcionEmpresa_CobroCiclo30Dias() public {
        _fondearEmpresa();
        vm.prank(empresa);
        suscripcion.suscribirse();

        // avanzar 30 dias y cobrar el ciclo (keeper)
        vm.warp(block.timestamp + 30 days);
        suscripcion.recolectarCiclo(empresa);

        // 10% del cobro (10 BRLT) al fondo; el fondo ya tenia 500 del 5% de la emision inicial
        assertEq(brlt.balanceOf(address(fondo)), 510 ether, "500 (5% emision) + 10 (10% ciclo)");
    }

    function test_Revert_CobroAntesDe30Dias() public {
        _fondearEmpresa();
        vm.prank(empresa);
        suscripcion.suscribirse();

        vm.warp(block.timestamp + 29 days);
        vm.expectRevert();
        suscripcion.recolectarCiclo(empresa);
    }

    function test_SuscripcionEmpresa_CancelarDevuelveStaking() public {
        _fondearEmpresa();
        vm.prank(empresa);
        suscripcion.suscribirse();

        vm.prank(empresa);
        suscripcion.cancelarSuscripcion();
        assertEq(brlt.balanceOf(empresa), 1_000 ether, "staking devuelto (CU-24 A2)");
    }

    // ============================================================ cobertura extra SociosRegistry
    function test_RemoverSocio() public {
        registry.removerSocio(s1);
        assertTrue(!registry.esSocio(s1));
        assertEq(registry.totalSocios(), 2);
    }

    function test_VotarEnContra_NoAdmite() public {
        address candidato = address(0x7100);
        vm.prank(candidato);
        registry.solicitarAdmision();
        vm.prank(s1);
        registry.votarAdmision(candidato, true);
        vm.prank(s2);
        registry.votarAdmision(candidato, false);
        vm.prank(s3);
        registry.votarAdmision(candidato, false);
        assertTrue(!registry.esSocio(candidato), "2 en contra no admiten");
    }

    function test_Propuesta_VotoEnContraNoEjecuta() public {
        uint256 pid = registry.crearPropuesta(
            SociosRegistry.TipoPropuesta.EMITIR_BRLT,
            keccak256("rechazada"),
            1_000 ether
        );
        vm.prank(s1);
        registry.votarPropuesta(pid, true);
        vm.prank(s2);
        registry.votarPropuesta(pid, false);
        assertEq(brlt.totalSupply(), 0, "sin quorum no emite");
    }

    function test_Revert_PropuestaCerrada() public {
        uint256 pid = registry.crearPropuesta(
            SociosRegistry.TipoPropuesta.SUBIR_TOPE_BRLT,
            keccak256("tope"),
            2_000_000 ether
        );
        vm.prank(s1);
        registry.votarPropuesta(pid, true);
        vm.prank(s2);
        registry.votarPropuesta(pid, true); // se ejecuta y cierra
        // votar de nuevo sobre propuesta cerrada (cerrada=True, ejecutada=True)
        vm.prank(s3);
        vm.expectRevert(SociosRegistry.PropuestaCerrada.selector);
        registry.votarPropuesta(pid, true);
    }

    function test_Fondo_RetirarParaOperacion() public {
        // emitir para fondear el fondo
        uint256 pid = registry.crearPropuesta(
            SociosRegistry.TipoPropuesta.EMITIR_BRLT,
            keccak256("fondo"),
            10_000 ether
        );
        vm.prank(s1);
        registry.votarPropuesta(pid, true);
        vm.prank(s2);
        registry.votarPropuesta(pid, true);
        assertEq(fondo.saldoBrlt(), 500 ether);

        // retiro para operación (owner = Operador de Infraestructura, D15)
        address operador = address(0x8001);
        fondo.retirarParaOperacion(operador, 200 ether);
        assertEq(brlt.balanceOf(operador), 200 ether);
        assertEq(fondo.saldoBrlt(), 300 ether);
    }

    // ============================================================ fuzz
    function testFuzz_AdmisionSocio_VotacionConQuorum(uint8 votosFavor) public {
        vm.assume(votosFavor <= 3);
        address candidato = address(uint160(0x7F00 + votosFavor));
        vm.prank(candidato);
        registry.solicitarAdmision();

        address[3] memory votantes = [s1, s2, s3];
        for (uint8 i = 0; i < votosFavor; i++) {
            if (!registry.esSocio(candidato)) {
                vm.prank(votantes[i]);
                registry.votarAdmision(candidato, true);
            }
        }
        // con 3 socios, quorum = 2: admitido solo si votosFavor >= 2
        assertEq(registry.esSocio(candidato), votosFavor >= 2, "quorum 2/3 respetado");
    }
}
