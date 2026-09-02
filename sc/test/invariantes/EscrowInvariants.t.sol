// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Escrow} from "../../src/Escrow.sol";
import {SociosRegistry} from "../../src/SociosRegistry.sol";
import {TrueKeateToken} from "../../src/mocks/TrueKeateToken.sol";
import {EscrowHandler} from "./EscrowHandler.sol";

/**
 * @title Invariantes del Escrow (RNF-04.1, I1-I7)
 * @notice Pruebas de invariantes handler-based: el fuzzer ejecuta acciones aleatorias del
 *         EscrowHandler sobre el MISMO escrow y verifica que las invariantes de
 *         conservacion de activos, cancelacion, resolucion de anulaciones, timelock de
 *         sanciones y cierre valorado se mantienen en todo el espacio de estados.
 */
contract EscrowInvariantsTest is Test {
    Escrow private escrow;
    SociosRegistry private registry;
    TrueKeateToken private tka;
    TrueKeateToken private tkb;
    EscrowHandler private handler;

    address private parteA = address(0xA11CE);
    address private parteB = address(0xB0B);
    address private s1 = address(0x5001);
    address private s2 = address(0x5002);
    address private s3 = address(0x5003);

    uint256 private emitidoA = type(uint128).max;
    uint256 private emitidoB = type(uint128).max;

    function setUp() public {
        escrow = new Escrow();
        registry = new SociosRegistry();
        tka = new TrueKeateToken("TokenA", "TKA");
        tkb = new TrueKeateToken("TokenB", "TKB");

        registry.admitirSocioDirecto(s1);
        registry.admitirSocioDirecto(s2);
        registry.admitirSocioDirecto(s3);
        escrow.vincularSociosRegistry(address(registry));

        tka.mint(parteA, emitidoA);
        tkb.mint(parteB, emitidoB);
        vm.prank(parteA); tka.approve(address(escrow), type(uint256).max);
        vm.prank(parteB); tkb.approve(address(escrow), type(uint256).max);

        handler = new EscrowHandler();
        handler.inicializar(escrow, registry, tka, tkb);
        // el fuzzer actua a traves del handler (no llama al escrow directamente)
        targetContract(address(handler));
        excludeContract(address(escrow));
    }

    /// I1 (conservacion): el escrow nunca crea ni destruye saldo; los activos de A/B solo
    /// se mueven entre sus billeteras y el escrow.
    function invariant_I1_ConservacionDeActivos() public view {
        uint256 enA = tka.balanceOf(parteA) + tka.balanceOf(address(escrow)) + tka.balanceOf(address(handler));
        uint256 enB = tkb.balanceOf(parteB) + tkb.balanceOf(address(escrow)) + tkb.balanceOf(address(handler));
        assertEq(enA, emitidoA, "TKA se conserva (A + escrow + handler)");
        assertEq(enB, emitidoB, "TKB se conserva (B + escrow + handler)");
    }

    /// I2: ningun trueque cancelado (pre-custodia, estado ANULADO sin solicitud de anulacion)
    /// retiene activos; la cancelacion tras custodia es imposible por diseno (D31) y se
    /// verifica con una funcion dedicada del handler que nunca revierte.
    function invariant_I2_SinCancelacionConCustodia() public view {
        for (uint256 i = 0; i < 40; i++) {
            Escrow.Trueke memory t = escrow.getTrueke(i);
            if (t.parteA == address(0)) continue;
            // un ANULADO por cancelacion pre-custodia (sin solicitante de anulacion) jamas
            // pudo haber custodiado activos: si custodiara, la cancelacion habria revertido
            if (t.estado == Escrow.Estado.ANULADO && t.solicitanteAnulacion == address(0)) {
                assertTrue(!t.activoCustodiadoA && !t.activoCustodiadoB, "cancelacion con custodia (I2/D31)");
            }
        }
    }

    /// I4: ninguna solicitud de anulacion vencida (plazo ≤5 dias) queda sin resolver:
    /// pasado el plazo el escrow debe estar ANULADO (D26, cierre en tiempo finito).
    function invariant_I4_AnulacionesResueltasEnPlazo() public view {
        uint256 ahora = block.timestamp;
        for (uint256 i = 0; i < 40; i++) {
            Escrow.Trueke memory t = escrow.getTrueke(i);
            if (t.parteA == address(0)) continue;
            if (t.solicitanteAnulacion != address(0) && t.plazoAnulacion != 0) {
                if (ahora > t.plazoAnulacion) {
                    assertTrue(
                        t.estado == Escrow.Estado.ANULADO,
                        "anulacion vencida sin resolver (I4/D26)"
                    );
                }
            }
        }
    }

    /// I5: si una sancion quedo programada y el timelock de 6h no vencio, el escrow no puede
    /// estar BLOQUEADO por esa sancion (la ejecucion exige esperar las 6h — D21).
    function invariant_I5_SancionSoloTrasTimelock() public view {
        uint256 ahora = block.timestamp;
        for (uint256 i = 0; i < 40; i++) {
            Escrow.Trueke memory t = escrow.getTrueke(i);
            if (t.parteA == address(0)) continue;
            if (t.sancionTimestamp != 0) {
                if (ahora < t.sancionTimestamp) {
                    assertTrue(
                        t.estado != Escrow.Estado.BLOQUEADO,
                        "sancion ejecutada antes del timelock (I5/D21)"
                    );
                }
            }
        }
    }

    /// I7: ningun trueque COMPLETADO sin firmas de recepcion duales y valoracion dual (D36).
    function invariant_I7_CompletadoRequiereFirmasYValoracion() public view {
        for (uint256 i = 0; i < 40; i++) {
            Escrow.Trueke memory t = escrow.getTrueke(i);
            if (t.parteA == address(0)) continue;
            if (t.estado == Escrow.Estado.COMPLETADO) {
                assertTrue(t.firmaRecepcionA && t.firmaRecepcionB, "COMPLETADO sin firmas duales (I1)");
                assertTrue(t.valoracionA && t.valoracionB, "COMPLETADO sin valoracion dual (I7/D36)");
                // ademas, al completar el escrow ya no retiene activos de ese trueke
                assertTrue(!t.activoCustodiadoA && !t.activoCustodiadoB, "COMPLETADO con activos retenidos");
            }
        }
    }
}
