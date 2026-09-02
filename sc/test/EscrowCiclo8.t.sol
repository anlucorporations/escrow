// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";
import {SociosRegistry} from "../src/SociosRegistry.sol";
import {TrueKeateToken} from "../src/mocks/TrueKeateToken.sol";

/**
 * @title Escrow — Ciclo 8 (Fase 3)
 * @notice Cierre vertical: CU-17 (bloqueo por violacion de norma), CU-18 (anulacion con
 *         quorum ≥2/3 y ANULADO por defecto a los 5 dias — D13/D26) y CU-19 (sancion con
 *         timelock de 6 h — D21).
 */
contract EscrowCiclo8Test is Test {
    Escrow private escrow;
    SociosRegistry private registry;
    TrueKeateToken private tka;
    TrueKeateToken private tkb;

    address private parteA = address(0xA11CE);
    address private parteB = address(0xB0B);
    address private s1 = address(0x5001);
    address private s2 = address(0x5002);
    address private s3 = address(0x5003);

    function setUp() public {
        escrow = new Escrow();
        registry = new SociosRegistry();
        tka = new TrueKeateToken("TokenA", "TKA");
        tkb = new TrueKeateToken("TokenB", "TKB");

        // padron de 3 socios
        registry.admitirSocioDirecto(s1);
        registry.admitirSocioDirecto(s2);
        registry.admitirSocioDirecto(s3);
        escrow.vincularSociosRegistry(address(registry));

        tka.mint(parteA, 1_000 ether);
        tkb.mint(parteB, 1_000 ether);
        vm.prank(parteA); tka.approve(address(escrow), type(uint256).max);
        vm.prank(parteB); tkb.approve(address(escrow), type(uint256).max);
    }

    // helper: crea + custodia ambos activos
    function _truekeCustodiado() internal returns (uint256 id) {
        vm.prank(parteA);
        id = escrow.crearTrueke(parteB, _a(tka, 100 ether), _a(tkb, 200 ether), block.timestamp + 1 hours);
        vm.prank(parteA); escrow.custodiarA(id);
        vm.prank(parteB); escrow.custodiarB(id);
    }

    function _a(TrueKeateToken t, uint256 c) internal pure returns (Escrow.Activo memory) {
        return Escrow.Activo({token: address(t), tokenId: 0, cantidad: c, esNft: false});
    }

    // ============================================================ CU-17 bloqueo
    function test_Bloquear_Owner() public {
        uint256 id = _truekeCustodiado();
        escrow.bloquear(id);
        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.BLOQUEADO));
        // activos congelados en el escrow (I1: no liberacion)
        assertEq(tka.balanceOf(address(escrow)), 100 ether);
    }

    function test_Revert_Bloquear_NoOwner() public {
        uint256 id = _truekeCustodiado();
        vm.prank(parteA);
        vm.expectRevert();
        escrow.bloquear(id);
    }

    // ============================================================ CU-18 anulacion con quorum
    function test_Anulacion_Quorum2de3() public {
        uint256 id = _truekeCustodiado();
        vm.prank(parteA);
        escrow.solicitarAnulacion(id, "el articulo llego danado");

        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.EN_DISPUTA));

        // s1 y s2 votan a favor → quorum 2/3 → anulacion con devolucion
        vm.prank(s1); escrow.votarSocio(id, true);
        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.RESOLUCION_SOCIOS));
        vm.prank(s2); escrow.votarSocio(id, true);

        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.ANULADO), "anulado por quorum");
        // activos devueltos a las billeteras (RF-06.1)
        assertEq(tka.balanceOf(parteA), 1_000 ether, "A recupera su activo");
        assertEq(tkb.balanceOf(parteB), 1_000 ether, "B recupera su activo");
        assertEq(tka.balanceOf(address(escrow)), 0);
    }

    function test_Anulacion_QuorumRechazado() public {
        uint256 id = _truekeCustodiado();
        vm.prank(parteA);
        escrow.solicitarAnulacion(id, "cambio de opinion");

        // 1 a favor, 2 en contra → no hay quorum → no se anula dentro del plazo
        vm.prank(s1); escrow.votarSocio(id, true);
        vm.prank(s2); escrow.votarSocio(id, false);
        vm.prank(s3); escrow.votarSocio(id, false);
        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.RESOLUCION_SOCIOS));
    }

    function test_Anulacion_PorDefecto_AlVencer5Dias() public {
        uint256 id = _truekeCustodiado();
        vm.prank(parteB);
        escrow.solicitarAnulacion(id, "no recibido");

        // solo un voto a favor (sin quorum)
        vm.prank(s1); escrow.votarSocio(id, true);

        // vencen los 5 dias → ANULADO por defecto (D26)
        vm.warp(block.timestamp + 5 days + 1);
        escrow.resolverPorDefecto(id);

        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.ANULADO), "ANULADO por defecto (D26)");
        assertEq(tka.balanceOf(parteA), 1_000 ether);
        assertEq(tkb.balanceOf(parteB), 1_000 ether);
    }

    function test_Revert_VotarSocio_NoSocio() public {
        uint256 id = _truekeCustodiado();
        vm.prank(parteA);
        escrow.solicitarAnulacion(id, "motivo");
        vm.prank(parteA); // parteA no es Socio
        vm.expectRevert(Escrow.SoloSocio.selector);
        escrow.votarSocio(id, true);
    }

    function test_Revert_Anulacion_SinCustodia() public {
        vm.prank(parteA);
        uint256 id = escrow.crearTrueke(parteB, _a(tka, 100 ether), _a(tkb, 200 ether), block.timestamp + 1 hours);
        // sin custodia no se puede anular (solo cancelar pre-custodia — D31)
        vm.prank(parteA);
        vm.expectRevert();
        escrow.solicitarAnulacion(id, "x");
    }

    // ============================================================ CU-19 sancion con timelock 6h
    function test_Sancion_Timelock6h() public {
        uint256 id = _truekeCustodiado();
        escrow.bloquear(id); // CU-17

        vm.prank(s1);
        escrow.programarSancion(id);
        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.RESOLUCION_SOCIOS));

        // antes de 6h no se ejecuta (D21)
        vm.warp(block.timestamp + 5 hours);
        vm.expectRevert();
        escrow.ejecutarSancion(id);

        // tras 6h se ejecuta
        vm.warp(block.timestamp + 2 hours);
        escrow.ejecutarSancion(id);
        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.BLOQUEADO), "sancion ejecutada tras timelock");
    }

    function test_Revert_Sancion_SinProgramar() public {
        uint256 id = _truekeCustodiado();
        escrow.bloquear(id);
        vm.expectRevert(Escrow.SinSancionProgramada.selector);
        escrow.ejecutarSancion(id);
    }
}
