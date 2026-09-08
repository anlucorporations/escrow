// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TrueKeateSBT} from "../src/TrueKeateSBT.sol";

contract TrueKeateSBTTest is Test {
    TrueKeateSBT sbt;
    address owner = makeAddr("owner");
    address minter = makeAddr("minter");
    address usuario = makeAddr("usuario");

    function setUp() public {
        vm.prank(owner);
        sbt = new TrueKeateSBT(minter);
    }

    function test_MinteenSoloMinter() public {
        vm.prank(minter);
        uint256 id = sbt.mint(usuario, "ipfs://meta-1");
        assertEq(id, 1);
        assertEq(sbt.ownerOf(id), usuario);
        assertEq(sbt.sbtDe(usuario), id);
        assertEq(sbt.locked(id), true);
        assertEq(sbt.tokenURI(id), "ipfs://meta-1");
    }

    function test_RevertSiNoEsMinter() public {
        vm.prank(usuario);
        vm.expectRevert(TrueKeateSBT.SoloMinter.selector);
        sbt.mint(usuario, "ipfs://x");
    }

    function test_NoPermiteSegundoSbtParaLaMismaWallet() public {
        vm.startPrank(minter);
        sbt.mint(usuario, "ipfs://1");
        vm.expectRevert(abi.encodeWithSelector(TrueKeateSBT.YaTieneSbt.selector, usuario));
        sbt.mint(usuario, "ipfs://2");
        vm.stopPrank();
    }

    function test_SoulboundNoPermiteTransferir() public {
        vm.prank(minter);
        uint256 id = sbt.mint(usuario, "ipfs://1");
        address otro = makeAddr("otro");

        vm.expectRevert(abi.encodeWithSelector(TrueKeateSBT.Soulbound.selector, id));
        vm.prank(usuario);
        sbt.transferFrom(usuario, otro, id);

        vm.expectRevert(abi.encodeWithSelector(TrueKeateSBT.Soulbound.selector, id));
        vm.prank(usuario);
        sbt.safeTransferFrom(usuario, otro, id);

        // Una aprobación no permite mover el token (sigue bloqueado)
        vm.prank(usuario);
        sbt.approve(otro, id);
        vm.expectRevert(abi.encodeWithSelector(TrueKeateSBT.Soulbound.selector, id));
        vm.prank(otro);
        sbt.transferFrom(usuario, makeAddr("tercero"), id);
    }

    function test_OwnerCambiaMinter() public {
        vm.prank(owner);
        sbt.setMinter(usuario);
        assertEq(sbt.minter(), usuario);
    }

    function test_SupportsERC5192() public view {
        assertTrue(sbt.supportsInterface(0xb45a3c0e)); // IERC5192
        assertTrue(sbt.supportsInterface(0x80ac58cd)); // IERC721
    }
}
