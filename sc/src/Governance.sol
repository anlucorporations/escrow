// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Governance
 * @notice Gobernanza del nivel Socio de TrueKeate (M10).
 *
 * Los Socios son mediadores/jueces de la plataforma: votan sanciones, resuelven
 * disputas, aprueban nuevos Socios y administran el fondo de operaciones.
 * - Solicitud de admisión de Socios con depósito en garantía y votación por mayoría simple durante 5 días.
 * - Al ser aprobado, el depósito pasa permanentemente a la tesorería de la plataforma para gastos operativos.
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

    struct SocioApplication {
        uint256 id;
        address candidate;
        string motivation;
        address depositToken;
        uint256 depositAmount;
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

    mapping(uint256 => SocioApplication) public socioApplications;
    mapping(uint256 => mapping(address => bool)) public hasVotedApplication;
    uint256 public applicationCount;

    address public treasuryAddress;

    uint256 public constant SANCTION_VOTING_WINDOW = 3 days;
    uint256 public constant SOCIO_APPLICATION_WINDOW = 5 days;
    uint256 public minQuorum = 2; // votos mínimos para sanciones

    event SocioSet(address indexed account, bool flag);
    event SanctionProposed(uint256 indexed proposalId, address indexed target, string reason);
    event VoteCast(uint256 indexed proposalId, address indexed socio, bool support);
    event SanctionExecuted(uint256 indexed proposalId, address indexed target, bool passed);
    event MinQuorumSet(uint256 quorum);
    event TreasurySet(address indexed treasury);

    event SocioApplicationCreated(
        uint256 indexed applicationId,
        address indexed candidate,
        string motivation,
        address depositToken,
        uint256 depositAmount,
        uint256 createdAt
    );
    event SocioApplicationVoted(uint256 indexed applicationId, address indexed socio, bool support);
    event SocioApplicationResolved(uint256 indexed applicationId, address indexed candidate, bool passed);

    constructor() Ownable(msg.sender) {
        treasuryAddress = msg.sender;
    }

    modifier onlySocio() {
        require(isSocio[msg.sender], "Only socio");
        _;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasuryAddress = _treasury;
        emit TreasurySet(_treasury);
    }

    function setSocio(address account, bool flag) external onlyOwner {
        isSocio[account] = flag;
        emit SocioSet(account, flag);
    }

    function setMinQuorum(uint256 quorum) external onlyOwner {
        minQuorum = quorum;
        emit MinQuorumSet(quorum);
    }

    // ------------------------------------------------------------- 1. Solicitudes de Admisión de Socios

    /// @notice Permite a un candidato postularse como Socio depositando garantía operativa (votación de 5 días).
    function applyForSocio(
        string calldata motivation,
        address depositToken,
        uint256 depositAmount
    ) external returns (uint256) {
        require(!isSocio[msg.sender], "Already a socio");
        require(depositToken != address(0), "Invalid deposit token");
        require(depositAmount > 0, "Deposit amount must be > 0");
        require(bytes(motivation).length >= 10, "Motivation too short");

        // Transferir depósito de garantía al contrato
        IERC20(depositToken).transferFrom(msg.sender, address(this), depositAmount);

        uint256 id = applicationCount++;
        socioApplications[id] = SocioApplication({
            id: id,
            candidate: msg.sender,
            motivation: motivation,
            depositToken: depositToken,
            depositAmount: depositAmount,
            yes: 0,
            no: 0,
            createdAt: block.timestamp,
            executed: false,
            passed: false
        });

        emit SocioApplicationCreated(id, msg.sender, motivation, depositToken, depositAmount, block.timestamp);
        return id;
    }

    /// @notice Los Socios votan una solicitud de admisión dentro de la ventana de 5 días.
    function voteSocioApplication(uint256 applicationId, bool support) external onlySocio {
        SocioApplication storage app = socioApplications[applicationId];
        require(app.candidate != address(0), "Application not found");
        require(!app.executed, "Application already resolved");
        require(block.timestamp <= app.createdAt + SOCIO_APPLICATION_WINDOW, "Application voting closed");
        require(!hasVotedApplication[applicationId][msg.sender], "Already voted on application");

        hasVotedApplication[applicationId][msg.sender] = true;
        if (support) {
            app.yes++;
        } else {
            app.no++;
        }

        emit SocioApplicationVoted(applicationId, msg.sender, support);
    }

    /// @notice Resuelve la postulación tras 5 días por mayoría simple. Si aprueba, el depósito pasa a tesorería.
    function resolveSocioApplication(uint256 applicationId) external {
        SocioApplication storage app = socioApplications[applicationId];
        require(app.candidate != address(0), "Application not found");
        require(!app.executed, "Application already resolved");
        require(block.timestamp > app.createdAt + SOCIO_APPLICATION_WINDOW, "Application voting still open");

        app.executed = true;
        // Mayoría simple: más votos a favor que en contra
        app.passed = app.yes > app.no;

        if (app.passed) {
            isSocio[app.candidate] = true;
            emit SocioSet(app.candidate, true);
            // El depósito pasa permanentemente a la tesorería de la plataforma para gastos operativos
            address dest = treasuryAddress != address(0) ? treasuryAddress : owner();
            IERC20(app.depositToken).transfer(dest, app.depositAmount);
        } else {
            // Si es rechazada, se reembolsa el depósito al candidato
            IERC20(app.depositToken).transfer(app.candidate, app.depositAmount);
        }

        emit SocioApplicationResolved(applicationId, app.candidate, app.passed);
    }

    // ------------------------------------------------------------- 2. Sanciones y Gobernanza Tradicional

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

    /// @notice Vota una propuesta de sanción (solo Socios).
    function vote(uint256 proposalId, bool support) external onlySocio {
        Proposal storage p = proposals[proposalId];
        require(p.id == proposalId && p.createdAt != 0, "Proposal not found");
        require(!p.executed, "Proposal executed");
        require(block.timestamp <= p.createdAt + SANCTION_VOTING_WINDOW, "Voting closed");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        hasVoted[proposalId][msg.sender] = true;
        if (support) p.yes++;
        else p.no++;

        emit VoteCast(proposalId, msg.sender, support);
    }

    /// @notice Ejecuta la sanción si alcanzó quórum y mayoría de votos.
    function executeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(p.id == proposalId && p.createdAt != 0, "Proposal not found");
        require(!p.executed, "Proposal executed");
        require(block.timestamp > p.createdAt + SANCTION_VOTING_WINDOW, "Voting still open");

        p.executed = true;
        p.passed = p.yes > p.no && (p.yes + p.no) >= minQuorum;
        if (p.passed) {
            sanctioned[p.target] = true;
        }

        emit SanctionExecuted(proposalId, p.target, p.passed);
    }

    function removeSanction(address target) external onlySocio {
        require(sanctioned[target], "Not sanctioned");
        sanctioned[target] = false;
    }

    function isSanctioned(address account) external view returns (bool) {
        return sanctioned[account];
    }
}

