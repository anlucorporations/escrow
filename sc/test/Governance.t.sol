// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Governance} from "../src/Governance.sol";
import {MockERC20} from "../src/MockERC20.sol";

/// M10 — Gobernanza del nivel Socio.
contract GovernanceTest is Test {
    Governance public gov;

    address public owner;
    address public socio1;
    address public socio2;
    address public target;

    function setUp() public {
        owner = address(this);
        socio1 = makeAddr("socio1");
        socio2 = makeAddr("socio2");
        target = makeAddr("target");

        gov = new Governance();
        gov.setSocio(socio1, true);
        gov.setSocio(socio2, true);
    }

    function testSetSocioOnlyOwner() public {
        vm.prank(socio1);
        vm.expectRevert();
        gov.setSocio(socio1, false);
    }

    function testProposeSanctionOnlySocio() public {
        vm.prank(target);
        vm.expectRevert("Only socio");
        gov.proposeSanction(target, "spam");
    }

    function testVoteAndExecutePasses() public {
        vm.startPrank(socio1);
        gov.proposeSanction(target, "fraude");
        gov.vote(0, true);
        vm.stopPrank();

        vm.prank(socio2);
        gov.vote(0, true);

        vm.warp(block.timestamp + 4 days);
        gov.executeProposal(0);

        assertTrue(gov.isSanctioned(target));
    }

    function testVoteAndExecuteFailsWithoutQuorum() public {
        vm.startPrank(socio1);
        gov.proposeSanction(target, "fraude");
        gov.vote(0, true);
        vm.stopPrank();

        vm.warp(block.timestamp + 4 days);
        gov.executeProposal(0);

        assertFalse(gov.isSanctioned(target)); // 1 voto < quorum 2
    }

    function testVoteAndExecuteFailsWithTie() public {
        vm.startPrank(socio1);
        gov.proposeSanction(target, "discutible");
        gov.vote(0, true);
        vm.stopPrank();

        vm.prank(socio2);
        gov.vote(0, false);

        vm.warp(block.timestamp + 4 days);
        gov.executeProposal(0);

        assertFalse(gov.isSanctioned(target));
    }

    function testCannotVoteTwice() public {
        vm.startPrank(socio1);
        gov.proposeSanction(target, "x");
        gov.vote(0, true);
        vm.expectRevert("Already voted");
        gov.vote(0, true);
        vm.stopPrank();
    }

    function testCannotVoteAfterWindow() public {
        vm.prank(socio1);
        gov.proposeSanction(target, "x");

        vm.warp(block.timestamp + 4 days);
        vm.prank(socio2);
        vm.expectRevert("Voting closed");
        gov.vote(0, true);
    }

    function testRemoveSanction() public {
        vm.startPrank(socio1);
        gov.proposeSanction(target, "fraude");
        gov.vote(0, true);
        vm.stopPrank();
        vm.prank(socio2);
        gov.vote(0, true);
        vm.warp(block.timestamp + 4 days);
        gov.executeProposal(0);
        assertTrue(gov.isSanctioned(target));

        vm.prank(socio1);
        gov.removeSanction(target);
        assertFalse(gov.isSanctioned(target));
    }

    // ------------------------------------------------------------- Admisión de Socios y Depósito

    function testSocioApplicationApprovedTransfersDepositToTreasury() public {
        MockERC20 depositToken = new MockERC20("Governance Deposit", "BRLT", 18);
        address candidate = makeAddr("candidate");
        address treasury = makeAddr("treasury");
        gov.setTreasury(treasury);

        depositToken.mint(candidate, 500 ether);

        vm.startPrank(candidate);
        depositToken.approve(address(gov), 500 ether);
        uint256 appId = gov.applyForSocio("Quiero postularme como Socio y mediador", address(depositToken), 500 ether);
        vm.stopPrank();

        assertEq(depositToken.balanceOf(address(gov)), 500 ether);

        // Socios votan a favor (mayoría simple)
        vm.prank(socio1);
        gov.voteSocioApplication(appId, true);

        vm.prank(socio2);
        gov.voteSocioApplication(appId, true);

        // Avanzar ventana de 5 días
        vm.warp(block.timestamp + 5 days + 1 hours);
        gov.resolveSocioApplication(appId);

        // Candidato ahora es Socio y el depósito pasó a tesorería
        assertTrue(gov.isSocio(candidate));
        assertEq(depositToken.balanceOf(treasury), 500 ether);
        assertEq(depositToken.balanceOf(address(gov)), 0);
    }

    function testSocioApplicationRejectedRefundsDeposit() public {
        MockERC20 depositToken = new MockERC20("Governance Deposit", "BRLT", 18);
        address candidate = makeAddr("candidate");
        address treasury = makeAddr("treasury");
        gov.setTreasury(treasury);

        depositToken.mint(candidate, 500 ether);

        vm.startPrank(candidate);
        depositToken.approve(address(gov), 500 ether);
        uint256 appId = gov.applyForSocio("Postulacion sin experiencia", address(depositToken), 500 ether);
        vm.stopPrank();

        // Socios votan en contra
        vm.prank(socio1);
        gov.voteSocioApplication(appId, false);

        vm.prank(socio2);
        gov.voteSocioApplication(appId, false);

        // Avanzar ventana de 5 días
        vm.warp(block.timestamp + 5 days + 1 hours);
        gov.resolveSocioApplication(appId);

        // Candidato NO es Socio y el depósito fue reembolsado
        assertFalse(gov.isSocio(candidate));
        assertEq(depositToken.balanceOf(candidate), 500 ether);
        assertEq(depositToken.balanceOf(treasury), 0);
    }
}

