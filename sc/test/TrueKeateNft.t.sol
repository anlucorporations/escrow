// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";
import {TrueKeateNFT} from "../src/TrueKeateNFT.sol";
import {TrueKeateToken} from "../src/mocks/TrueKeateToken.sol";

/**
 * @title Fase 1 — NFT oficial de la plataforma (logica maestra del director, puntos 1 y 4)
 * @notice Verifica:
 *   - TrueKeateNFT: mint solo por la plataforma (rol minter), categorias validas, metadatos.
 *   - Escrow con NFT oficial vinculado: solo acepta NFTs del TrueKeateNFT (decision del director).
 */
contract TrueKeateNftTest is Test {
    TrueKeateNFT private nft;
    Escrow private escrow;
    TrueKeateToken private tkb;
    address private plataforma; // minter (relayer — RF-09)
    address private parteA;
    address private parteB;

    function setUp() public {
        plataforma = address(0xBEEF);
        parteA = address(0xA11CE);
        parteB = address(0xB0B);
        nft = new TrueKeateNFT("TrueKeate NFT", "TKANFT", plataforma);
        escrow = new Escrow();
        tkb = new TrueKeateToken("TokenB", "TKB");
        tkb.mint(parteB, 1_000 ether);
        vm.prank(parteB);
        tkb.approve(address(escrow), type(uint256).max);
    }

    // ============================================================ mint (solo plataforma)
    function test_MintSoloPlataforma() public {
        vm.prank(plataforma);
        uint256 tokenId = nft.mint(parteA, "ARTICULO", "ipfs://articulo-1");
        assertEq(tokenId, 1);
        assertEq(nft.ownerOf(tokenId), parteA, "propietario es el usuario");
        assertEq(nft.categoriaDe(tokenId), "ARTICULO", "categoria guardada");
        assertEq(nft.siguienteTokenId(), 1, "contador tras primer mint");
    }

    function test_MintRechazaNoPlataforma() public {
        vm.prank(parteA);
        vm.expectRevert(TrueKeateNFT.SoloMinter.selector);
        nft.mint(parteA, "ARTICULO", "ipfs://x");
    }

    function test_MintRechazaCategoriaInvalida() public {
        vm.prank(plataforma);
        vm.expectRevert(TrueKeateNFT.CategoriaInvalida.selector);
        nft.mint(parteA, "INEXISTENTE", "ipfs://x");
    }

    function test_MintAceptaLasCuatroCategorias() public {
        vm.startPrank(plataforma);
        nft.mint(parteA, "ARTICULO", "u1");
        nft.mint(parteB, "SERVICIO", "u2");
        nft.mint(parteA, "BIEN", "u3");
        nft.mint(parteB, "CRIPTO", "u4");
        vm.stopPrank();
        assertEq(nft.categoriaDe(1), "ARTICULO");
        assertEq(nft.categoriaDe(2), "SERVICIO");
        assertEq(nft.categoriaDe(3), "BIEN");
        assertEq(nft.categoriaDe(4), "CRIPTO");
    }

    function test_TokenUriDisponible() public {
        vm.prank(plataforma);
        uint256 tokenId = nft.mint(parteA, "ARTICULO", "ipfs://articulo-1");
        assertEq(nft.tokenURI(tokenId), "ipfs://articulo-1", "URI de metadatos");
    }

    function test_CambiarMinterSoloOwner() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert();
        nft.setMinter(parteB);
        nft.setMinter(parteB); // owner = this
        assertEq(nft.minter(), parteB, "minter actualizado");
    }

    // ============================================================ Escrow: solo NFT oficial
    function _activoNft(TrueKeateNFT nft_, uint256 tokenId_) internal pure returns (Escrow.Activo memory) {
        return Escrow.Activo({token: address(nft_), tokenId: tokenId_, cantidad: 1, esNft: true});
    }

    function _activoErc20(uint256 cantidad) internal view returns (Escrow.Activo memory) {
        return Escrow.Activo({token: address(tkb), tokenId: 0, cantidad: cantidad, esNft: false});
    }

    /// Con el NFT oficial vinculado, un NFT de otro contrato es rechazado al crear el trueque.
    function test_EscrowRechazaNftNoOficial() public {
        TrueKeateNFT nftOtro = new TrueKeateNFT("Otro", "OTRO", plataforma);
        escrow.vincularTrueKeateNft(address(nft));
        vm.prank(plataforma);
        nftOtro.mint(parteA, "ARTICULO", "u");

        vm.prank(parteA);
        vm.expectRevert(Escrow.ActivoNoPermitido.selector);
        escrow.crearTrueke(
            parteB,
            _activoNft(nftOtro, 1),
            _activoErc20(100 ether),
            block.timestamp + 1 hours
        );
    }

    /// Con el NFT oficial vinculado, un NFT del contrato oficial si se acepta.
    function test_EscrowAceptaNftOficial() public {
        escrow.vincularTrueKeateNft(address(nft));
        vm.prank(plataforma);
        uint256 tokenId = nft.mint(parteA, "ARTICULO", "ipfs://articulo-1");
        vm.prank(parteA);
        nft.approve(address(escrow), tokenId);

        vm.prank(parteA);
        uint256 id = escrow.crearTrueke(
            parteB,
            _activoNft(nft, tokenId),
            _activoErc20(100 ether),
            block.timestamp + 1 hours
        );
        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.CREADO));

        // ciclo completo de custodia → apertura → firmas → COMPLETADO con el NFT oficial
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
        vm.prank(parteA);
        escrow.firmarRecepcionA(id);
        vm.prank(parteB);
        escrow.firmarRecepcionB(id);
        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.COMPLETADO));
        assertEq(nft.ownerOf(tokenId), parteB, "NFT liberado a B en cruz");
    }

    /// Sin vincular el NFT oficial, se mantiene la compatibilidad (cualquier ERC721).
    function test_EscrowSinVincularAceptaCualquierNft() public {
        // mock simple ERC721 para el caso sin vincular
        TrueKeateNFT nftOtro = new TrueKeateNFT("Otro", "OTRO", plataforma);
        vm.prank(plataforma);
        nftOtro.mint(parteA, "ARTICULO", "u");
        vm.prank(parteA);
        nftOtro.approve(address(escrow), 1);

        vm.prank(parteA);
        uint256 id = escrow.crearTrueke(
            parteB,
            _activoNft(nftOtro, 1),
            _activoErc20(50 ether),
            block.timestamp + 1 hours
        );
        assertEq(uint256(escrow.estado(id)), uint256(Escrow.Estado.CREADO));
    }
}
