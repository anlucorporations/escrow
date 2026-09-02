// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";
import {TrueKeateToken} from "../src/mocks/TrueKeateToken.sol";
import {TrueKeateNFT} from "../src/mocks/TrueKeateNFT.sol";

/**
 * @title Escrow — Ciclo 1 (Fase 3)
 * @notice Pruebas unitarias y de fuzzing de la máquina de estados base:
 *         CREADO → CUSTODIADO → APERTURA → COMPLETADO (CU-11…CU-15).
 *         Invariantes cubiertas: I1 (no liberación sin firmas duales + valoraciones),
 *         I2 (sin cancelación unilateral post-custodia — D31) e I3 (ventanas de apertura).
 */
contract EscrowTest is Test {
    Escrow private escrow;
    TrueKeateToken private tka;   // token A (cripto ofrecido por A)
    TrueKeateToken private tkb;   // token B (cripto ofrecido por B)
    TrueKeateNFT private nftA; // NFT ofrecido por A (otra variante)

    address private parteA = address(0xA11CE);
    address private parteB = address(0xB0B);
    address private owner;

    function setUp() public {
        owner = address(this);
        escrow = new Escrow();
        tka = new TrueKeateToken("TokenA", "TKA");
        tkb = new TrueKeateToken("TokenB", "TKB");
        nftA = new TrueKeateNFT("NftA", "NFTA");

        // Fondos de prueba
        tka.mint(parteA, 1_000 ether);
        tkb.mint(parteB, 1_000 ether);
        vm.prank(parteA);
        tka.approve(address(escrow), type(uint256).max);
        vm.prank(parteB);
        tkb.approve(address(escrow), type(uint256).max);
    }

    // ============================================================ helpers
    function _horaPautada() internal view returns (uint256) {
        return block.timestamp + 1 hours;
    }

    function _activoERC20(TrueKeateToken token, uint256 cantidad) internal pure returns (Escrow.Activo memory) {
        return Escrow.Activo({token: address(token), tokenId: 0, cantidad: cantidad, esNft: false});
    }

    function _crearYCompletarFlujo() internal returns (uint256 id) {
        id = _crearTrueke(100 ether, 200 ether);
        vm.prank(parteA);
        escrow.custodiarA(id);
        vm.prank(parteB);
        escrow.custodiarB(id);

        // Apertura en el momento pautado
        vm.warp(block.timestamp + 1 hours);
        vm.prank(parteA);
        escrow.aperturaA(id);
        vm.prank(parteB);
        escrow.aperturaB(id);

        // Valoraciones (D36)
        vm.prank(parteA);
        escrow.marcarValoracionA(id);
        vm.prank(parteB);
        escrow.marcarValoracionB(id);

        // Firmas de recepción
        vm.prank(parteA);
        escrow.firmarRecepcionA(id);
        vm.prank(parteB);
        escrow.firmarRecepcionB(id);
    }

    function _crearTrueke(uint256 cantA, uint256 cantB) internal returns (uint256 id) {
        vm.prank(parteA);
        id = escrow.crearTrueke(
            parteB,
            _activoERC20(tka, cantA),
            _activoERC20(tkb, cantB),
            _horaPautada()
        );
    }

    // ============================================================ CU-11 crear
    function test_CrearTrueke() public {
        vm.prank(parteA);
        uint256 id = escrow.crearTrueke(
            parteB,
            _activoERC20(tka, 100 ether),
            _activoERC20(tkb, 200 ether),
            _horaPautada()
        );
        Escrow.Trueke memory t = escrow.getTrueke(id);
        assertEq(t.parteA, parteA, "parteA = msg.sender");
        assertEq(t.parteB, parteB);
        assertEq(uint256(t.estado), uint256(Escrow.Estado.CREADO));
        assertEq(t.activoA.token, address(tka));
        assertEq(t.activoA.cantidad, 100 ether);
        assertEq(escrow.siguienteId(), 1);
    }

    function test_Revert_CrearTrueke_MismaParte() public {
        vm.prank(parteB); // msg.sender = parteB, contraparte = parteB -> misma parte
        vm.expectRevert(abi.encodeWithSelector(Escrow.NoAutorizado.selector, uint256(0)));
        escrow.crearTrueke(parteB, _activoERC20(tka, 1), _activoERC20(tkb, 1), _horaPautada());
    }

    function test_Revert_CrearTrueke_ActivoInvalido() public {
        // cantidad 0 en ERC20 no permitida
        vm.prank(parteA);
        vm.expectRevert(Escrow.ActivoNoPermitido.selector);
        escrow.crearTrueke(parteB, _activoERC20(tka, 0), _activoERC20(tkb, 1), _horaPautada());
    }

    // ============================================================ CU-12 custodia
    function test_CustodiarA() public {
        uint256 id = _crearTrueke(100 ether, 200 ether);
        vm.prank(parteA);
        escrow.custodiarA(id);

        assertEq(tka.balanceOf(address(escrow)), 100 ether);
        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.CUSTODIADO));
        // El escrow tiene el activo de A
        Escrow.Trueke memory t = escrow.getTrueke(id);
        assertTrue(t.activoCustodiadoA);
    }

    function test_CustodiarB_Completa() public {
        uint256 id = _crearTrueke(100 ether, 200 ether);
        vm.prank(parteA);
        escrow.custodiarA(id);
        vm.prank(parteB);
        escrow.custodiarB(id);

        assertEq(tkb.balanceOf(address(escrow)), 200 ether);
        assertEq(tka.balanceOf(address(escrow)), 100 ether);
        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.CUSTODIADO));
    }

    function test_Revert_Custodiar_NoAutorizado() public {
        uint256 id = _crearTrueke(100 ether, 200 ether);
        vm.prank(parteB); // B intenta custodiar el activo de A
        vm.expectRevert(abi.encodeWithSelector(Escrow.NoAutorizado.selector, id));
        escrow.custodiarA(id);
    }

    // ============================================================ I2 / D31 cancelación
    function test_Cancelar_PreCustodia() public {
        uint256 id = _crearTrueke(100 ether, 200 ether);
        vm.prank(parteA); // la crea parteA, parteA la cancela
        escrow.cancelar(id);
        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.ANULADO));
    }

    function test_Revert_Cancelar_PostCustodia() public {
        uint256 id = _crearTrueke(100 ether, 200 ether);
        vm.prank(parteA);
        escrow.custodiarA(id);
        vm.prank(parteA);
        vm.expectRevert(Escrow.ActivoYaCustodiado.selector);
        escrow.cancelar(id);
    }

    // ============================================================ CU-13 / I3 apertura
    function test_AperturaDual_DentroVentana() public {
        uint256 id = _crearTrueke(100 ether, 200 ether);
        vm.prank(parteA);
        escrow.custodiarA(id);
        vm.prank(parteB);
        escrow.custodiarB(id);

        // A abre justo en la hora pautada
        vm.warp(block.timestamp + 1 hours);
        vm.prank(parteA);
        escrow.aperturaA(id);
        // B abre 5 min después (≤ 10 min de diferencia)
        vm.warp(block.timestamp + 5 minutes);
        vm.prank(parteB);
        escrow.aperturaB(id);

        Escrow.Trueke memory t = escrow.getTrueke(id);
        assertEq(uint256(t.estado), uint256(Escrow.Estado.APERTURA));
        assertEq(t.aperturaA + 5 minutes, t.aperturaB);
    }

    function test_Revert_Apertura_FueraDeVentana() public {
        uint256 id = _crearTrueke(100 ether, 200 ether);
        vm.prank(parteA);
        escrow.custodiarA(id);
        vm.prank(parteB);
        escrow.custodiarB(id);

        // 11 minutos después de la hora pautada → fuera de ventana
        vm.warp(block.timestamp + 1 hours + 11 minutes);
        vm.prank(parteA);
        vm.expectRevert();
        escrow.aperturaA(id);
    }

    function test_Revert_Apertura_DiferenciaExcedida() public {
        uint256 id = _crearTrueke(100 ether, 200 ether);
        vm.prank(parteA);
        escrow.custodiarA(id);
        vm.prank(parteB);
        escrow.custodiarB(id);

        vm.warp(block.timestamp + 1 hours);
        vm.prank(parteA);
        escrow.aperturaA(id);
        // B abre 11 min después de A → diferencia > 10 min
        vm.warp(block.timestamp + 11 minutes);
        vm.prank(parteB);
        vm.expectRevert();
        escrow.aperturaB(id);
    }

    function test_Revert_Apertura_SinCustodiaCompleta() public {
        uint256 id = _crearTrueke(100 ether, 200 ether);
        vm.prank(parteA);
        escrow.custodiarA(id);
        // B no custodia aún
        vm.warp(block.timestamp + 1 hours);
        vm.prank(parteA);
        vm.expectRevert(Escrow.SinCustodiaCompleta.selector);
        escrow.aperturaA(id);
    }

    // ============================================================ CU-14/15 cierre (I1, I7)
    function test_CompletarTrueke() public {
        uint256 id = _crearYCompletarFlujo();

        Escrow.Trueke memory t = escrow.getTrueke(id);
        assertEq(uint256(t.estado), uint256(Escrow.Estado.COMPLETADO));
        // Los activos se liberaron en cruz
        assertEq(tka.balanceOf(parteB), 100 ether, "B recibe activo A");
        assertEq(tkb.balanceOf(parteA), 200 ether, "A recibe activo B");
        assertEq(tka.balanceOf(address(escrow)), 0, "escrow vacio de TKA");
        assertEq(tkb.balanceOf(address(escrow)), 0, "escrow vacio de TKB");
    }

    function test_Revert_Completar_SinValoracion() public {
        uint256 id = _crearTrueke(100 ether, 200 ether);
        vm.prank(parteA);
        escrow.custodiarA(id);
        vm.prank(parteB);
        escrow.custodiarB(id);

        vm.warp(block.timestamp + 1 hours);
        vm.prank(parteA);
        escrow.aperturaA(id);
        vm.prank(parteB);
        escrow.aperturaB(id);

        // Firman pero sin valorar → no se completa (invariante I7/RNF-06.1, D36)
        vm.prank(parteA);
        escrow.firmarRecepcionA(id);
        vm.prank(parteB);
        escrow.firmarRecepcionB(id);

        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.APERTURA));
        // fondos siguen custodiados (I1)
        assertEq(tka.balanceOf(address(escrow)), 100 ether);
        assertEq(tkb.balanceOf(address(escrow)), 200 ether);
    }

    function test_Revert_Completar_FirmaUnicaNoLibera() public {
        uint256 id = _crearTrueke(100 ether, 200 ether);
        vm.prank(parteA);
        escrow.custodiarA(id);
        vm.prank(parteB);
        escrow.custodiarB(id);

        vm.warp(block.timestamp + 1 hours);
        vm.prank(parteA);
        escrow.aperturaA(id);
        vm.prank(parteB);
        escrow.aperturaB(id);
        vm.prank(parteA);
        escrow.marcarValoracionA(id);
        vm.prank(parteB);
        escrow.marcarValoracionB(id);

        // Solo A firma → no se libera nada (I1)
        vm.prank(parteA);
        escrow.firmarRecepcionA(id);

        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.APERTURA));
        assertEq(tka.balanceOf(address(escrow)), 100 ether);
    }

    // ============================================================ NFT (ERC721)
    function test_TruekeConNFT() public {
        nftA.mint(parteA);
        uint256 tokenIdA = 1;
        vm.prank(parteA);
        nftA.approve(address(escrow), tokenIdA);

        // A ofrece un NFT y pide 200 TKB
        vm.prank(parteA);
        uint256 id = escrow.crearTrueke(
            parteB,
            Escrow.Activo({token: address(nftA), tokenId: tokenIdA, cantidad: 1, esNft: true}),
            _activoERC20(tkb, 200 ether),
            _horaPautada()
        );
        vm.prank(parteA);
        escrow.custodiarA(id);
        vm.prank(parteB);
        escrow.custodiarB(id);

        assertEq(nftA.ownerOf(tokenIdA), address(escrow), "NFT custodiado");

        vm.warp(block.timestamp + 1 hours);
        vm.prank(parteA);
        escrow.aperturaA(id);
        vm.prank(parteB);
        escrow.aperturaB(id);
        vm.prank(parteA);
        escrow.marcarValoracionA(id);
        vm.prank(parteB);
        escrow.marcarValoracionB(id);
        vm.prank(parteA);
        escrow.firmarRecepcionA(id);
        vm.prank(parteB);
        escrow.firmarRecepcionB(id);

        assertEq(nftA.ownerOf(tokenIdA), parteB, "NFT liberado a B en cruz");
        assertEq(tkb.balanceOf(parteA), 200 ether, "A recibe TKB");
        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.COMPLETADO));
    }

    // ============================================================ Fuzz ventanas (I3)
    function testFuzz_Apertura_DentroVentana(uint64 diffA, uint64 diffB) public {
        // A y B abren DESPUES de la hora pautada; se exige que cada apertura diste <= 10 min
        // de la pautada y que la diferencia entre ambas sea <= 10 min (I3).
        vm.assume(diffA <= 10);
        vm.assume(diffB <= 10);
        // B abre en pautada + diffA + diffB; debe distar <= 10 min de la pautada
        vm.assume(uint256(diffA) + uint256(diffB) <= 10);

        uint256 id = _crearTrueke(100 ether, 200 ether);
        vm.prank(parteA);
        escrow.custodiarA(id);
        vm.prank(parteB);
        escrow.custodiarB(id);

        uint256 pautada = _horaPautada();
        vm.warp(pautada + uint256(diffA) * 1 minutes);
        vm.prank(parteA);
        escrow.aperturaA(id);
        vm.warp(block.timestamp + uint256(diffB) * 1 minutes);
        vm.prank(parteB);
        escrow.aperturaB(id);

        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.APERTURA));
    }

    function testFuzz_Apertura_FueraDeVentana(uint64 diffA) public {
        // diffA > 10 min respecto a la hora pautada → A no puede abrir (I3)
        vm.assume(diffA > 10 && diffA < 1000);
        uint256 id = _crearTrueke(100 ether, 200 ether);
        vm.prank(parteA);
        escrow.custodiarA(id);
        vm.prank(parteB);
        escrow.custodiarB(id);

        vm.warp(_horaPautada() + diffA * 1 minutes);
        vm.prank(parteA);
        vm.expectRevert();
        escrow.aperturaA(id);
    }
}
