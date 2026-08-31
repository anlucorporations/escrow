// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Escrow.sol";
import "../src/UserRegistry.sol";
import "../src/MockERC20.sol";

/**
 * @title EscrowInvariantsTest
 * @dev Pruebas de Fuzzing, Propiedades e Invariantes para el protocolo de custodia TrueKeat Escrow.
 * 
 * Invariantes del Sistema:
 *  1. Conservación de Balances y Solvencia: El contrato nunca retiene fondos huérfanos ni pierde saldo.
 *  2. Invariante de Cuotas: Ningún usuario puede violar los límites de intercambios simultáneos de su nivel.
 *  3. Invariante de Reembolso: Cancelaciones y reembolsos por expiración devuelven el 100% exacto de amountA.
 *  4. Invariante de Completitud: Al completarse un trueque, user1 recibe exacto amountB y user2 recibe exacto amountA.
 *  5. Invariante de Arbitraje: Solo el árbitro autorizado puede resolver disputas, restituyendo el saldo atómicamente.
 */
contract EscrowInvariantsTest is Test {
    Escrow public escrow;
    UserRegistry public registry;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    address public owner = address(0xAA);
    address public arbiter = address(0xBB);
    address public user1 = address(0x11);
    address public user2 = address(0x22);
    address public user3 = address(0x33);

    uint256 public initialBalance = 1_000_000_000 ether;

    function setUp() public {
        vm.startPrank(owner);
        registry = new UserRegistry();
        escrow = new Escrow();
        escrow.setUserRegistry(address(registry));

        tokenA = new MockERC20("Token A", "TKA", 18);
        tokenB = new MockERC20("Token B", "TKB", 18);

        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));
        escrow.setArbiter(arbiter);
        vm.stopPrank();

        // Fondear cuentas
        tokenA.mint(user1, initialBalance);
        tokenB.mint(user1, initialBalance);
        tokenA.mint(user2, initialBalance);
        tokenB.mint(user2, initialBalance);
        tokenA.mint(user3, initialBalance);
        tokenB.mint(user3, initialBalance);
    }

    // =========================================================================
    // 1. FUZZING: Creación de Operaciones con Montos y Plazos Arbitrarios
    // =========================================================================

    function testFuzz_CreateOperation_AmountsAndDeadlines(
        uint128 rawAmountA,
        uint128 rawAmountB,
        uint32 deadlineOffset
    ) public {
        vm.assume(rawAmountA > 0 && rawAmountA <= 10_000_000 ether);
        vm.assume(rawAmountB > 0 && rawAmountB <= 10_000_000 ether);

        uint256 amountA = uint256(rawAmountA);
        uint256 amountB = uint256(rawAmountB);
        uint256 deadline = deadlineOffset == 0 ? 0 : block.timestamp + uint256(deadlineOffset);

        uint256 u1BalanceBefore = tokenA.balanceOf(user1);
        uint256 escrowBalanceBefore = tokenA.balanceOf(address(escrow));

        vm.startPrank(user1);
        tokenA.approve(address(escrow), amountA);
        uint256 opId = escrow.createOperation(address(tokenA), address(tokenB), amountA, amountB, deadline);
        vm.stopPrank();

        // Verificaciones de Invariante de Estado
        assertEq(tokenA.balanceOf(user1), u1BalanceBefore - amountA, "Balance de user1 debe disminuir exactamente amountA");
        assertEq(tokenA.balanceOf(address(escrow)), escrowBalanceBefore + amountA, "Balance de custodia debe aumentar exactamente amountA");
        assertEq(escrow.activeTradesCount(user1), 1, "Cuota de trades activos debe ser 1");

        Escrow.Operation memory op = escrow.getOperation(opId);

        assertEq(op.id, opId);
        assertEq(op.user1, user1);
        assertEq(op.tokenA, address(tokenA));
        assertEq(op.tokenB, address(tokenB));
        assertEq(op.amountA, amountA);
        assertEq(op.amountB, amountB);
        assertEq(uint256(op.status), uint256(Escrow.Status.Active));
        assertEq(op.deadline, deadline);
    }

    // =========================================================================
    // 2. INVARIANTE DE CONSERVACIÓN DE FONDOS: Liquidación Bilateral Atómica
    // =========================================================================

    function testFuzz_CompleteOperation_BalanceConservation(
        uint128 rawAmountA,
        uint128 rawAmountB
    ) public {
        vm.assume(rawAmountA > 0 && rawAmountA <= 1_000_000 ether);
        vm.assume(rawAmountB > 0 && rawAmountB <= 1_000_000 ether);

        uint256 amountA = uint256(rawAmountA);
        uint256 amountB = uint256(rawAmountB);

        // Crear operación
        vm.startPrank(user1);
        tokenA.approve(address(escrow), amountA);
        uint256 opId = escrow.createOperation(address(tokenA), address(tokenB), amountA, amountB, block.timestamp + 1 days);
        vm.stopPrank();

        uint256 u1TokenBBefore = tokenB.balanceOf(user1);
        uint256 u2TokenABefore = tokenA.balanceOf(user2);
        uint256 u2TokenBBefore = tokenB.balanceOf(user2);
        uint256 escrowTokenABefore = tokenA.balanceOf(address(escrow));

        // Contraparte completa el intercambio
        vm.startPrank(user2);
        tokenB.approve(address(escrow), amountB);
        escrow.completeOperation(opId);
        vm.stopPrank();

        // Invariante 1: User1 recibe exacto amountB
        assertEq(tokenB.balanceOf(user1), u1TokenBBefore + amountB, "User1 debe recibir exactamente amountB");

        // Invariante 2: User2 recibe exacto amountA y desembolsa exacto amountB
        assertEq(tokenA.balanceOf(user2), u2TokenABefore + amountA, "User2 debe recibir exactamente amountA");
        assertEq(tokenB.balanceOf(user2), u2TokenBBefore - amountB, "User2 debe desembolsar exactamente amountB");

        // Invariante 3: El contrato libera exactamente amountA (saldo remanente de esta op = 0)
        assertEq(tokenA.balanceOf(address(escrow)), escrowTokenABefore - amountA, "Custodia no debe retener ningun remanente");

        // Invariante 4: La cuota de user1 vuelve a 0
        assertEq(escrow.activeTradesCount(user1), 0, "Cuota de trades activos debe decrementarse a 0");
    }

    // =========================================================================
    // 3. INVARIANTE DE REEMBOLSO TOTAL: Cancelación y Expiración
    // =========================================================================

    function testFuzz_CancelOperation_FullRefund(uint128 rawAmountA) public {
        vm.assume(rawAmountA > 0 && rawAmountA <= 5_000_000 ether);
        uint256 amountA = uint256(rawAmountA);

        uint256 balanceBefore = tokenA.balanceOf(user1);

        vm.startPrank(user1);
        tokenA.approve(address(escrow), amountA);
        uint256 opId = escrow.createOperation(address(tokenA), address(tokenB), amountA, 100 ether, 0);

        assertEq(tokenA.balanceOf(user1), balanceBefore - amountA);

        escrow.cancelOperation(opId);
        vm.stopPrank();

        // Invariante: Reembolso 100% exacto
        assertEq(tokenA.balanceOf(user1), balanceBefore, "Cancelacion debe restituir el 100% de amountA al creador");
        assertEq(escrow.activeTradesCount(user1), 0, "Cuota activa debe quedar en 0");
    }

    function testFuzz_RefundAfterExpiry_FullRefund(uint128 rawAmountA, uint32 deadlineOffset) public {
        vm.assume(rawAmountA > 0 && rawAmountA <= 5_000_000 ether);
        vm.assume(deadlineOffset >= 1 && deadlineOffset <= 365 days);

        uint256 amountA = uint256(rawAmountA);
        uint256 deadline = block.timestamp + uint256(deadlineOffset);
        uint256 balanceBefore = tokenA.balanceOf(user1);

        vm.startPrank(user1);
        tokenA.approve(address(escrow), amountA);
        uint256 opId = escrow.createOperation(address(tokenA), address(tokenB), amountA, 100 ether, deadline);
        vm.stopPrank();

        // Intentar reembolsar antes de tiempo debe fallar (Invariante de bloqueo temporal)
        vm.prank(user1);
        vm.expectRevert("Deadline not reached yet");
        escrow.refundAfterExpiry(opId);

        // Avanzar el reloj más allá del plazo
        vm.warp(deadline + 1 seconds);

        // Ahora el reembolso debe ser exitoso e íntegro
        vm.prank(user1);
        escrow.refundAfterExpiry(opId);

        assertEq(tokenA.balanceOf(user1), balanceBefore, "Reembolso por expiracion debe restituir el 100% integro");
        assertEq(escrow.activeTradesCount(user1), 0);
    }

    // =========================================================================
    // 4. INVARIANTE DE CUOTAS POR NIVEL DE IDENTIDAD (Tiers 1, 2, 3)
    // =========================================================================

    function testFuzz_TierQuotasInvariants(uint8 levelMod) public {
        address testUser = address(uint160(0x9000 + uint256(levelMod)));
        tokenA.mint(testUser, 100_000 ether);

        string memory uName = string(abi.encodePacked("u_", vm.toString(uint256(levelMod))));
        string memory uMail = string(abi.encodePacked("mail_", vm.toString(uint256(levelMod)), "@test.com"));
        string memory uPhone = string(abi.encodePacked("+58412", vm.toString(uint256(1000000 + uint256(levelMod)))));

        vm.prank(testUser);
        registry.register(uName, uMail, uPhone, string(abi.encodePacked("Plaza ", vm.toString(uint256(levelMod)))), 500000 + int32(uint32(levelMod)), 1150000 + int32(uint32(levelMod)), 19, true);

        uint8 tierChoice = levelMod % 3;
        if (tierChoice == 1) {
            // Nivel 2: Verificado (Límite: 3)
            vm.prank(owner);
            registry.setUserIdentificationLevel(testUser, UserRegistry.IdentificationLevel.Verificado);

            // Puede crear hasta 3 operaciones
            vm.startPrank(testUser);
            tokenA.approve(address(escrow), 400 ether);
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 100 ether, 0);
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 100 ether, 0);
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 100 ether, 0);
            assertEq(escrow.activeTradesCount(testUser), 3);

            // La 4ta operación debe revertir
            vm.expectRevert("Verificado limit: max 3 active trades");
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 100 ether, 0);
            vm.stopPrank();

        } else if (tierChoice == 2) {
            // Nivel 3: Certificado (Límite: Ilimitado)
            vm.prank(owner);
            registry.setUserIdentificationLevel(testUser, UserRegistry.IdentificationLevel.Certificado);

            // Puede crear 4 o más operaciones sin revertir por cuota
            vm.startPrank(testUser);
            tokenA.approve(address(escrow), 500 ether);
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 100 ether, 0);
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 100 ether, 0);
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 100 ether, 0);
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 100 ether, 0);
            assertEq(escrow.activeTradesCount(testUser), 4);
            vm.stopPrank();

        } else {
            // Nivel 1: Inscrito (Límite: 1)
            // Por defecto register asigna Inscrito
            vm.startPrank(testUser);
            tokenA.approve(address(escrow), 200 ether);
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 100 ether, 0);
            assertEq(escrow.activeTradesCount(testUser), 1);

            // La 2da operación debe revertir
            vm.expectRevert("Inscrito limit: max 1 active trade");
            escrow.createOperation(address(tokenA), address(tokenB), 100 ether, 100 ether, 0);
            vm.stopPrank();
        }
    }

    // =========================================================================
    // 5. INVARIANTE DE ARBITRAJE: Resolución Justa Exclusiva del Árbitro
    // =========================================================================

    function testFuzz_DisputeResolutionFavorUser1(uint128 rawAmountA, uint128 rawAmountB) public {
        vm.assume(rawAmountA > 0 && rawAmountA <= 500_000 ether);
        vm.assume(rawAmountB > 0 && rawAmountB <= 500_000 ether);

        uint256 amountA = uint256(rawAmountA);
        uint256 amountB = uint256(rawAmountB);

        vm.startPrank(user1);
        tokenA.approve(address(escrow), amountA);
        uint256 opId = escrow.createOperation(address(tokenA), address(tokenB), amountA, amountB, block.timestamp + 7 days);
        vm.stopPrank();

        // Abrir disputa
        vm.prank(user1);
        escrow.disputeOperation(opId);

        uint256 u1BalanceBefore = tokenA.balanceOf(user1);

        // No árbitro no puede resolver
        vm.prank(user3);
        vm.expectRevert("Only arbiter can call");
        escrow.resolveDispute(opId, true);

        // Árbitro resuelve a favor del creador
        vm.prank(arbiter);
        escrow.resolveDispute(opId, true);

        assertEq(tokenA.balanceOf(user1), u1BalanceBefore + amountA, "Si favorece a user1, se le devuelve amountA integro");
        assertEq(escrow.activeTradesCount(user1), 0, "Cuota de trade queda liberada tras la disputa");
    }
}
