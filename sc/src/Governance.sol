// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Governance
 * @notice Gobernanza del nivel Socio de TrueKeate (M10).
 *
 * Los Socios son mediadores/jueces de la plataforma: votan sanciones a
 * usuarios, aprueban campañas y administran el fondo de operaciones.
 * En v1: el owner designa Socios; las propuestas de sanción se resuelven
 * por mayoría simple de Socios con quórum mínimo.
 */
contract Governance is Ownable {
    struct Proposal {
        uint256 id;
        address target; // usuario propuesto para sanción
        string reason;
        uint256 yes;
        uint256 no;
        uint256 createdAt;
        bool executed;
        bool passed;
    }

    mapping(address => bool) public isSocio;
    mapping(address => bool) public sanctioned;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    uint256 public proposalCount;

    uint256 public constant VOTING_WINDOW = 3 days;
    uint256 public minQuorum = 2; // votos mínimos para ejecutar

    event SocioSet(address indexed account, bool flag);
    event SanctionProposed(uint256 indexed proposalId, address indexed target, string reason);
    event VoteCast(uint256 indexed proposalId, address indexed socio, bool support);
    event SanctionExecuted(uint256 indexed proposalId, address indexed target, bool passed);
    event MinQuorumSet(uint256 quorum);

    constructor() Ownable(msg.sender) {}

    modifier onlySocio() {
        require(isSocio[msg.sender], "Only socio");
        _;
    }

    function setSocio(address account, bool flag) external onlyOwner {
        isSocio[account] = flag;
        emit SocioSet(account, flag);
    }

    function setMinQuorum(uint256 quorum) external onlyOwner {
        minQuorum = quorum;
        emit MinQuorumSet(quorum);
    }

    /// @notice Propone la sanción de un usuario (solo Socios).
    function proposeSanction(address target, string calldata reason) external onlySocio {
        require(target != address(0), "Invalid target");
        require(!sanctioned[target], "Already sanctioned");

        uint256 id = proposalCount++;
        proposals[id] = Proposal({
            id: id,
            target: target,
            reason: reason,
            yes: 0,
            no: 0,
            createdAt: block.timestamp,
            executed: false,
            passed: false
        });

        emit SanctionProposed(id, target, reason);
    }

    /// @notice Vota una propuesta (solo Socios, un voto por propuesta).
    function vote(uint256 proposalId, bool support) external onlySocio {
        Proposal storage p = proposals[proposalId];
        require(p.id == proposalId && p.createdAt != 0, "Proposal not found");
        require(!p.executed, "Proposal executed");
        require(block.timestamp <= p.createdAt + VOTING_WINDOW, "Voting closed");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        hasVoted[proposalId][msg.sender] = true;
        if (support) p.yes++;
        else p.no++;

        emit VoteCast(proposalId, msg.sender, support);
    }

    /// @notice Ejecuta la propuesta si alcanzó quórum y ganó el "sí".
    function executeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(p.id == proposalId && p.createdAt != 0, "Proposal not found");
        require(!p.executed, "Proposal executed");
        require(block.timestamp > p.createdAt + VOTING_WINDOW, "Voting still open");

        p.executed = true;
        p.passed = p.yes > p.no && (p.yes + p.no) >= minQuorum;
        if (p.passed) {
            sanctioned[p.target] = true;
        }

        emit SanctionExecuted(proposalId, p.target, p.passed);
    }

    /// @notice Permite revertir una sanción (solo Socios, nuevo consenso).
    function removeSanction(address target) external onlySocio {
        require(sanctioned[target], "Not sanctioned");
        sanctioned[target] = false;
    }

    function isSanctioned(address account) external view returns (bool) {
        return sanctioned[account];
    }
}
