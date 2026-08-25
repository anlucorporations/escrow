// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";
import {MockERC20} from "../src/MockERC20.sol";

/// M5 — Meta-transacciones EIP-712 + permit EIP-2612 (gas gratis para
/// particulares; el relayer ejecuta la transacción).
contract EscrowMetaTest is Test {
    uint256 internal constant USER1_PK = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    uint256 internal constant USER2_PK = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;

    Escrow public escrow;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    address public user1;
    address public user2;

    bytes32 internal constant _CREATE_TYPEHASH = keccak256(
        "MetaCreateOperation(address user,address tokenA,address tokenB,uint256 amountA,uint256 amountB,uint256 deadline,uint256 nonce)"
    );
    bytes32 internal constant _COMPLETE_TYPEHASH =
        keccak256("MetaCompleteOperation(address user,uint256 operationId,uint256 nonce)");
    bytes32 internal constant _PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    function setUp() public {
        user1 = vm.addr(USER1_PK);
        user2 = vm.addr(USER2_PK);

        escrow = new Escrow();
        tokenA = new MockERC20("TokenA", "TKA", 18);
        tokenB = new MockERC20("TokenB", "TKB", 18);
        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        tokenA.mint(user1, 1000 ether);
        tokenB.mint(user2, 1000 ether);
    }

    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("Escrow")),
                keccak256(bytes("1")),
                block.chainid,
                address(escrow)
            )
        );
    }

    function _metaDigest(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
    }

    function _tokenDigest(MockERC20 token, bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
    }

    function _permitSignature(
        MockERC20 token,
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint256 privKey
    ) internal returns (uint8 v, bytes32 r, bytes32 s) {
        uint256 nonce = token.nonces(owner);
        bytes32 structHash = keccak256(abi.encode(_PERMIT_TYPEHASH, owner, spender, value, nonce, deadline));
        (v, r, s) = vm.sign(privKey, _tokenDigest(token, structHash));
    }

    function _createSignature(
        address user,
        address tA,
        address tB,
        uint256 amountA,
        uint256 amountB,
        uint256 deadline,
        uint256 nonce,
        uint256 privKey
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(_CREATE_TYPEHASH, user, tA, tB, amountA, amountB, deadline, nonce));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, _metaDigest(structHash));
        return abi.encodePacked(r, s, v);
    }

    function _completeSignature(address user, uint256 operationId, uint256 nonce, uint256 privKey)
        internal
        view
        returns (bytes memory)
    {
        bytes32 structHash = keccak256(abi.encode(_COMPLETE_TYPEHASH, user, operationId, nonce));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, _metaDigest(structHash));
        return abi.encodePacked(r, s, v);
    }

    // ------------------------------------------------------------ tests

    function testMetaCreateOperation() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig =
            _createSignature(user1, address(tokenA), address(tokenB), 100 ether, 200 ether, deadline, 0, USER1_PK);
        (uint8 v, bytes32 r, bytes32 s) =
            _permitSignature(tokenA, user1, address(escrow), 100 ether, deadline, USER1_PK);

        // El relayer (este contrato de test) ejecuta pagando el gas
        uint256 opId = escrow.metaCreateOperation(
            user1, address(tokenA), address(tokenB), 100 ether, 200 ether, deadline, 0, sig, deadline, v, r, s
        );

        assertEq(opId, 1);
        (,,,, uint256 opAmount,, Escrow.Status status,,,) = escrow.operations(opId);
        assertEq(escrow.getOperation(opId).user1, user1);
        assertEq(opAmount, 100 ether);
        assertEq(uint256(status), uint256(Escrow.Status.Active));
        assertEq(escrow.metaNonces(user1), 1);
        assertEq(tokenA.balanceOf(user1), 900 ether);
        assertEq(tokenA.balanceOf(address(escrow)), 100 ether);
    }

    function testMetaCreateReplayFails() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig =
            _createSignature(user1, address(tokenA), address(tokenB), 100 ether, 200 ether, deadline, 0, USER1_PK);
        (uint8 v, bytes32 r, bytes32 s) =
            _permitSignature(tokenA, user1, address(escrow), 100 ether, deadline, USER1_PK);

        escrow.metaCreateOperation(
            user1, address(tokenA), address(tokenB), 100 ether, 200 ether, deadline, 0, sig, deadline, v, r, s
        );

        // Reintento con el mismo nonce -> debe revertir (anti-replay)
        (uint8 v2, bytes32 r2, bytes32 s2) =
            _permitSignature(tokenA, user1, address(escrow), 100 ether, deadline, USER1_PK);
        vm.expectRevert("Invalid nonce");
        escrow.metaCreateOperation(
            user1, address(tokenA), address(tokenB), 100 ether, 200 ether, deadline, 0, sig, deadline, v2, r2, s2
        );
    }

    function testMetaCreateWrongSignerFails() public {
        uint256 deadline = block.timestamp + 1 days;
        // user1 "firma" con la clave de user2 -> firma inválida
        bytes memory sig =
            _createSignature(user1, address(tokenA), address(tokenB), 100 ether, 200 ether, deadline, 0, USER2_PK);
        (uint8 v, bytes32 r, bytes32 s) =
            _permitSignature(tokenA, user1, address(escrow), 100 ether, deadline, USER1_PK);

        vm.expectRevert("Invalid signature");
        escrow.metaCreateOperation(
            user1, address(tokenA), address(tokenB), 100 ether, 200 ether, deadline, 0, sig, deadline, v, r, s
        );
    }

    function testMetaCompleteOperation() public {
        // Operación previa (creada con approve normal)
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 opId = escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, 0);
        vm.stopPrank();

        uint256 user1BBefore = tokenB.balanceOf(user1);
        uint256 user2ABefore = tokenA.balanceOf(user2);

        // user2 firma permit de tokenB + intención de completar (sin gas)
        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _completeSignature(user2, opId, 0, USER2_PK);
        (uint8 v, bytes32 r, bytes32 s) =
            _permitSignature(tokenB, user2, address(escrow), 200 ether, deadline, USER2_PK);

        escrow.metaCompleteOperation(user2, opId, 0, sig, deadline, v, r, s);

        assertEq(uint256(escrow.getOperation(opId).status), uint256(Escrow.Status.Completed));
        assertEq(escrow.metaNonces(user2), 1);
        assertEq(tokenB.balanceOf(user1), user1BBefore + 200 ether);
        assertEq(tokenA.balanceOf(user2), user2ABefore + 100 ether);
    }

    function testMetaCompleteOwnOperationFails() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 opId = escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, 0);
        vm.stopPrank();

        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _completeSignature(user1, opId, 0, USER1_PK);
        (uint8 v, bytes32 r, bytes32 s) =
            _permitSignature(tokenB, user1, address(escrow), 200 ether, deadline, USER1_PK);
        tokenB.mint(user1, 200 ether);

        vm.expectRevert("Cannot complete your own operation");
        escrow.metaCompleteOperation(user1, opId, 0, sig, deadline, v, r, s);
    }

    function testMetaCompleteAfterDeadlineFails() public {
        vm.startPrank(user1);
        tokenA.approve(address(escrow), 100 ether);
        uint256 opId =
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 200 ether, block.timestamp + 1 days);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);

        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _completeSignature(user2, opId, 0, USER2_PK);
        (uint8 v, bytes32 r, bytes32 s) =
            _permitSignature(tokenB, user2, address(escrow), 200 ether, deadline, USER2_PK);

        vm.expectRevert("Operation expired");
        escrow.metaCompleteOperation(user2, opId, 0, sig, deadline, v, r, s);
    }

    function testMetaNoncesPerUser() public {
        // El nonce de cada usuario es independiente
        assertEq(escrow.metaNonces(user1), 0);
        assertEq(escrow.metaNonces(user2), 0);
    }
}
