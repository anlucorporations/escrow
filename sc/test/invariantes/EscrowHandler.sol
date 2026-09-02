// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Escrow} from "../../src/Escrow.sol";
import {SociosRegistry} from "../../src/SociosRegistry.sol";
import {TrueKeateToken} from "../../src/mocks/TrueKeateToken.sol";

/**
 * @title EscrowHandler — invariantes (RNF-04.1, I1-I7)
 * @notice Handler que ejecuta acciones aleatorias SOBRE EL MISMO escrow que el test de
 *         invariantes verifica (los contratos se inyectan via `inicializar`). El fuzzer
 *         invoca estos metodos como acciones; las invariantes del test comprueban que las
 *         reglas de no-liberacion, cancelacion, ventanas y cierre se mantienen.
 */
contract EscrowHandler is Test {
    Escrow public escrow;
    SociosRegistry public registry;
    TrueKeateToken public tka;
    TrueKeateToken public tkb;

    address public parteA = address(0xA11CE);
    address public parteB = address(0xB0B);
    address public s1 = address(0x5001);
    address public s2 = address(0x5002);
    address public s3 = address(0x5003);

    uint256 public contadorTruekes;
    uint256 public contadorCompletados;

    uint256[] internal _truekes;

    /// Inyecta los contratos del test (mismo escrow que verifican las invariantes).
    function inicializar(Escrow escrow_, SociosRegistry registry_, TrueKeateToken tka_, TrueKeateToken tkb_) external {
        escrow = escrow_;
        registry = registry_;
        tka = tka_;
        tkb = tkb_;
    }

    function _a(TrueKeateToken t, uint256 c) internal pure returns (Escrow.Activo memory) {
        return Escrow.Activo({token: address(t), tokenId: 0, cantidad: c, esNft: false});
    }

    function _ultimoId() internal view returns (uint256 id, bool existe) {
        if (_truekes.length == 0) return (0, false);
        return (_truekes[_truekes.length - 1], true);
    }

    // --- acciones (el fuzzer las invoca; revierten silenciosamente si el estado no aplica) ---

    function crear(uint128 montoA, uint128 montoB) external {
        uint256 a = uint256(montoA % 10_000 ether) + 1 ether;
        uint256 b = uint256(montoB % 10_000 ether) + 1 ether;
        uint256 hora = block.timestamp + 1 hours;
        try escrow.crearTrueke(parteB, _a(tka, a), _a(tkb, b), hora) returns (uint256 id) {
            _truekes.push(id);
            contadorTruekes++;
        } catch {}
    }

    function custodiarA() external {
        (uint256 id, bool ok) = _ultimoId();
        if (!ok) return;
        vm.prank(parteA);
        try escrow.custodiarA(id) {} catch {}
    }

    function custodiarB() external {
        (uint256 id, bool ok) = _ultimoId();
        if (!ok) return;
        vm.prank(parteB);
        try escrow.custodiarB(id) {} catch {}
    }

    function aperturaA() external {
        (uint256 id, bool ok) = _ultimoId();
        if (!ok) return;
        Escrow.Trueke memory t = escrow.getTrueke(id);
        if (t.horaPautada != 0) vm.warp(t.horaPautada);
        vm.prank(parteA);
        try escrow.aperturaA(id) {} catch {}
    }

    function aperturaB() external {
        (uint256 id, bool ok) = _ultimoId();
        if (!ok) return;
        Escrow.Trueke memory t = escrow.getTrueke(id);
        if (t.aperturaA != 0) vm.warp(t.aperturaA + 5 minutes);
        vm.prank(parteB);
        try escrow.aperturaB(id) {} catch {}
    }

    function marcarValoracionA() external {
        (uint256 id, bool ok) = _ultimoId();
        if (!ok) return;
        vm.prank(parteA);
        try escrow.marcarValoracionA(id) {} catch {}
    }

    function marcarValoracionB() external {
        (uint256 id, bool ok) = _ultimoId();
        if (!ok) return;
        vm.prank(parteB);
        try escrow.marcarValoracionB(id) {} catch {}
    }

    function firmarA() external {
        (uint256 id, bool ok) = _ultimoId();
        if (!ok) return;
        vm.prank(parteA);
        try escrow.firmarRecepcionA(id) {} catch {}
    }

    function firmarB() external {
        (uint256 id, bool ok) = _ultimoId();
        if (!ok) return;
        vm.prank(parteB);
        try escrow.firmarRecepcionB(id) {
            contadorCompletados++;
        } catch {}
    }

    function cancelar() external {
        (uint256 id, bool ok) = _ultimoId();
        if (!ok) return;
        vm.prank(parteA);
        try escrow.cancelar(id) {} catch {}
    }
}
