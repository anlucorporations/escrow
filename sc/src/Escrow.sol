// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title Escrow
 * @notice Intercambio atómico de tokens ERC20 con custodia bilateral.
 *
 * Patrón central: ninguna parte entrega su contraprestación sin recibir la
 * suya, y ninguna parte puede quedar atrapada con sus fondos en custodia
 * para siempre (cancelación + expiración + arbitraje).
 *
 * Estados de una operación: Active -> Completed | Cancelled | Disputed
 * Disputed -> Completed (resolución del árbitro).
 */
interface IUserRegistryEscrow {
    function getIdentificationLevel(address wallet) external view returns (uint8);
}

contract Escrow is Ownable, ReentrancyGuard {
    enum Status {
        Active,
        Completed,
        Cancelled,
        Disputed
    }

    struct Operation {
        uint256 id;
        address user1;
        address user2;    // A1.1: contraparte registrada al completar / resolver
        address tokenA;
        address tokenB;
        uint256 amountA;
        uint256 amountB;
        Status status;
        uint256 createdAt;
        uint256 deadline; // 0 = sin expiración
        uint256 closedAt;
    }

    uint256 private nextOperationId;
    mapping(uint256 => Operation) public operations;
    mapping(address => bool) public allowedTokens;
    address[] private tokenList;

    address public arbiter;
    address public userRegistry;
    mapping(address => uint256) public activeTradesCount;

    event UserRegistrySet(address indexed registry);

    // ------------------------------------------------- meta-transacciones
    // M5: los particulares firman sus intenciones (EIP-712 + permit EIP-2612)
    // y un relayer ejecuta la transacción asumiendo el gas. El usuario NO
    // necesita pagar gas ni aprobar manualmente (permit incluido).

    bytes32 internal constant _DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 internal constant _CREATE_TYPEHASH = keccak256(
        "MetaCreateOperation(address user,address tokenA,address tokenB,uint256 amountA,uint256 amountB,uint256 deadline,uint256 nonce)"
    );
    bytes32 internal constant _COMPLETE_TYPEHASH =
        keccak256("MetaCompleteOperation(address user,uint256 operationId,uint256 nonce)");

    /// Nonce EIP-712 por usuario (anti-replay de meta-transacciones).
    mapping(address => uint256) public metaNonces;

    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                _DOMAIN_TYPEHASH, keccak256(bytes("Escrow")), keccak256(bytes("1")), block.chainid, address(this)
            )
        );
    }

    function _verifyMetaSignature(bytes32 structHash, address user, bytes calldata signature) internal view {
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
        address recovered = ECDSA.recover(digest, signature);
        require(recovered == user, "Invalid signature");
    }

    /// @notice Crea una operación SIN gas para el usuario: el relayer (msg.sender)
    ///         paga el gas. El usuario firma un permit EIP-2612 del tokenA y una
    ///         intención EIP-712; ambas se incluyen en una sola transacción.
    function metaCreateOperation(
        address user,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature,
        uint256 permitDeadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) external nonReentrant onlyAllowedToken(tokenA) onlyAllowedToken(tokenB) returns (uint256) {
        _verifyCreateIntent(user, tokenA, tokenB, amountA, amountB, deadline, nonce, signature);
        _applyPermit(tokenA, user, amountA, permitDeadline, permitV, permitR, permitS);
        IERC20(tokenA).transferFrom(user, address(this), amountA);

        return _createOperationRecord(user, tokenA, tokenB, amountA, amountB, deadline);
    }

    /// @notice Registra una operación nueva (struct, push, evento).
    function _createOperationRecord(
        address user,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 deadline
    ) internal returns (uint256) {
        _checkActiveTradeQuota(user);
        activeTradesCount[user]++;

        uint256 operationId = nextOperationId++;
        operations[operationId] = Operation({
            id: operationId,
            user1: user,
            user2: address(0),  // se llena al completar la operación
            tokenA: tokenA,
            tokenB: tokenB,
            amountA: amountA,
            amountB: amountB,
            status: Status.Active,
            createdAt: block.timestamp,
            deadline: deadline,
            closedAt: 0
        });

        emit OperationCreated(operationId, user, tokenA, tokenB, amountA, amountB, deadline);
        return operationId;
    }

    /// @notice Validación de la intención de crear (EIP-712 + nonce anti-replay).
    function _verifyCreateIntent(
        address user,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature
    ) internal {
        require(metaNonces[user] == nonce, "Invalid nonce");
        require(tokenA != tokenB, "Tokens must be different");
        require(amountA > 0 && amountB > 0, "Amounts must be greater than 0");
        require(deadline == 0 || deadline > block.timestamp, "Deadline must be in the future");

        bytes32 structHash =
            keccak256(abi.encode(_CREATE_TYPEHASH, user, tokenA, tokenB, amountA, amountB, deadline, nonce));
        _verifyMetaSignature(structHash, user, signature);
        metaNonces[user] = nonce + 1;
    }

    /// @notice Aplica una aprobación EIP-2612 (permit) sin que el usuario pague gas.
    function _applyPermit(
        address token,
        address owner,
        uint256 value,
        uint256 permitDeadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) internal {
        IERC20Permit(token).permit(owner, address(this), value, permitDeadline, permitV, permitR, permitS);
    }

    /// @notice Completa una operación SIN gas para el usuario: el relayer paga
    ///         el gas; el usuario firma permit del tokenB + intención EIP-712.
    function metaCompleteOperation(
        address user,
        uint256 operationId,
        uint256 nonce,
        bytes calldata signature,
        uint256 permitDeadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) external nonReentrant {
        Operation storage operation = operations[operationId];
        require(operation.id != 0, "Operation does not exist");
        require(operation.status == Status.Active, "Operation is not active");
        require(operation.user1 != user, "Cannot complete your own operation");
        require(operation.deadline == 0 || block.timestamp <= operation.deadline, "Operation expired");
        require(metaNonces[user] == nonce, "Invalid nonce");

        _checkActiveTradeQuota(user);

        bytes32 structHash = keccak256(abi.encode(_COMPLETE_TYPEHASH, user, operationId, nonce));
        _verifyMetaSignature(structHash, user, signature);
        metaNonces[user] = nonce + 1;

        _applyPermit(operation.tokenB, user, operation.amountB, permitDeadline, permitV, permitR, permitS);
        IERC20(operation.tokenB).transferFrom(user, operation.user1, operation.amountB);
        IERC20(operation.tokenA).transfer(user, operation.amountA);

        operation.user2 = user;  // A1.1: registrar la contraparte on-chain
        operation.status = Status.Completed;
        operation.closedAt = block.timestamp;

        if (activeTradesCount[operation.user1] > 0) {
            activeTradesCount[operation.user1]--;
        }

        emit OperationCompleted(operationId, user, operation.amountA, operation.amountB, block.timestamp);
    }

    // ------------------------------------------------------------ queries

    event TokenAdded(address indexed token);
    event ArbiterSet(address indexed arbiter);
    event OperationCreated(
        uint256 indexed operationId,
        address indexed user1,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 deadline
    );
    event OperationCompleted(
        uint256 indexed operationId, address indexed user2, uint256 amountA, uint256 amountB, uint256 completedAt
    );
    event OperationCancelled(uint256 indexed operationId, uint256 amountA, uint256 cancelledAt);
    event OperationDisputed(uint256 indexed operationId, address indexed disputer, uint256 disputedAt);
    event DisputeResolved(uint256 indexed operationId, bool favorUser1, uint256 resolvedAt);
    event OperationExpired(uint256 indexed operationId, address indexed user1, uint256 amountA, uint256 expiredAt);

    constructor() Ownable(msg.sender) {
        nextOperationId = 1;
    }

    modifier onlyAllowedToken(address token) {
        require(allowedTokens[token], "Token not allowed");
        _;
    }

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Only arbiter can call");
        _;
    }

    // ---------------------------------------------------------------- admin

    /// @notice Autoriza un token ERC20. Valida que la dirección tenga código
    ///         y que implemente `symbol()` (mínimo para ser considerado ERC20).
    function addToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!allowedTokens[token], "Token already added");

        uint256 size;
        assembly {
            size := extcodesize(token)
        }
        require(size > 0, "Token address is not a contract");

        try IERC20Metadata(token).symbol() returns (
            string memory
        ) {
        // Dirección con contrato que responde a symbol(): candidata ERC20.
        }
        catch {
            revert("Address is not an ERC20 token");
        }

        allowedTokens[token] = true;
        tokenList.push(token);
        emit TokenAdded(token);
    }

    function getAllowedTokens() external view returns (address[] memory) {
        return tokenList;
    }

    function getAllowedTokensCount() external view returns (uint256) {
        return tokenList.length;
    }

    /// @notice Designa el árbitro que resolverá disputas (0 = deshabilita).
    function setArbiter(address _arbiter) external onlyOwner {
        arbiter = _arbiter;
        emit ArbiterSet(_arbiter);
    }

    /// @notice Configura el contrato UserRegistry para validar cuotas por nivel.
    function setUserRegistry(address _registry) external onlyOwner {
        userRegistry = _registry;
        emit UserRegistrySet(_registry);
    }

    /// @notice Valida el límite de operaciones concurrentes activas según el nivel de identificación.
    function _checkActiveTradeQuota(address user) internal view {
        if (userRegistry != address(0)) {
            try IUserRegistryEscrow(userRegistry).getIdentificationLevel(user) returns (uint8 level) {
                if (level == 0) {
                    // Inscrito (Nivel 1 = 0 en enum): máximo 1 intercambio activo a la vez
                    require(activeTradesCount[user] < 1, "Inscrito limit: max 1 active trade");
                } else if (level == 1) {
                    // Verificado (Nivel 2 = 1 en enum): máximo 3 intercambios activos a la vez
                    require(activeTradesCount[user] < 3, "Verificado limit: max 3 active trades");
                }
                // Certificado (Nivel 3 = 2 en enum): Ilimitados
            } catch {}
        }
    }

    // ------------------------------------------------------------- lifecycle

    /// @notice User1 deposita amountA de tokenA pidiendo amountB de tokenB.
    /// @param deadline Timestamp UNIX de expiración (0 = sin expiración).
    function createOperation(address tokenA, address tokenB, uint256 amountA, uint256 amountB, uint256 deadline)
        external
        onlyAllowedToken(tokenA)
        onlyAllowedToken(tokenB)
        nonReentrant
        returns (uint256)
    {
        require(tokenA != tokenB, "Tokens must be different");
        require(amountA > 0 && amountB > 0, "Amounts must be greater than 0");
        require(deadline == 0 || deadline > block.timestamp, "Deadline must be in the future");

        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);

        return _createOperationRecord(msg.sender, tokenA, tokenB, amountA, amountB, deadline);
    }

    /// @notice User2 deposita amountB de tokenB y recibe al instante amountA
    ///         de tokenA; User1 recibe amountB de tokenB (intercambio atómico).
    function completeOperation(uint256 operationId) external nonReentrant {
        Operation storage operation = operations[operationId];
        require(operation.id != 0, "Operation does not exist");
        require(operation.status == Status.Active, "Operation is not active");
        require(operation.user1 != msg.sender, "Cannot complete your own operation");
        require(operation.deadline == 0 || block.timestamp <= operation.deadline, "Operation expired");

        _checkActiveTradeQuota(msg.sender);

        IERC20(operation.tokenB).transferFrom(msg.sender, operation.user1, operation.amountB);
        IERC20(operation.tokenA).transfer(msg.sender, operation.amountA);

        operation.user2 = msg.sender;
        operation.status = Status.Completed;
        operation.closedAt = block.timestamp;

        if (activeTradesCount[operation.user1] > 0) {
            activeTradesCount[operation.user1]--;
        }

        emit OperationCompleted(operationId, msg.sender, operation.amountA, operation.amountB, block.timestamp);
    }

    /// @notice User1 recupera su tokenA cancelando la operación.
    function cancelOperation(uint256 operationId) external nonReentrant {
        Operation storage operation = operations[operationId];
        require(operation.id != 0, "Operation does not exist");
        require(operation.status == Status.Active, "Operation is not active");
        require(operation.user1 == msg.sender, "Only creator can cancel");

        IERC20(operation.tokenA).transfer(msg.sender, operation.amountA);

        operation.status = Status.Cancelled;
        operation.closedAt = block.timestamp;

        if (activeTradesCount[operation.user1] > 0) {
            activeTradesCount[operation.user1]--;
        }

        emit OperationCancelled(operationId, operation.amountA, block.timestamp);
    }

    /// @notice Tras vencer el deadline sin contraparte, User1 recupera su tokenA.
    function refundAfterExpiry(uint256 operationId) external nonReentrant {
        Operation storage operation = operations[operationId];
        require(operation.id != 0, "Operation does not exist");
        require(operation.status == Status.Active, "Operation is not active");
        require(operation.user1 == msg.sender, "Only creator can refund");
        require(operation.deadline != 0, "Operation has no deadline");
        require(block.timestamp > operation.deadline, "Deadline not reached yet");

        IERC20(operation.tokenA).transfer(msg.sender, operation.amountA);

        operation.status = Status.Cancelled;
        operation.closedAt = block.timestamp;

        if (activeTradesCount[operation.user1] > 0) {
            activeTradesCount[operation.user1]--;
        }

        emit OperationExpired(operationId, msg.sender, operation.amountA, block.timestamp);
    }

    // ------------------------------------------------------------- disputes

    /// @notice Abre una disputa mientras la operación está activa y no ha vencido.
    function disputeOperation(uint256 operationId) external {
        Operation storage operation = operations[operationId];
        require(operation.id != 0, "Operation does not exist");
        require(operation.status == Status.Active, "Operation is not active");
        require(arbiter != address(0), "No arbiter set");
        require(operation.deadline == 0 || block.timestamp <= operation.deadline, "Operation expired");

        if (msg.sender != operation.user1 && operation.user2 == address(0)) {
            operation.user2 = msg.sender;
        }

        operation.status = Status.Disputed;
        emit OperationDisputed(operationId, msg.sender, block.timestamp);
    }

    /// @notice El árbitro resuelve la disputa.
    function resolveDispute(uint256 operationId, bool favorUser1) external onlyArbiter nonReentrant {
        Operation storage operation = operations[operationId];
        require(operation.id != 0, "Operation does not exist");
        require(operation.status == Status.Disputed, "Operation is not disputed");

        address winner;
        if (favorUser1) {
            winner = operation.user1;
        } else {
            require(
                operation.user2 != address(0),
                "No counterpart on-chain: disputa abierta antes de que user2 completara"
            );
            winner = operation.user2;
        }

        IERC20(operation.tokenA).transfer(winner, operation.amountA);

        operation.status = Status.Completed;
        operation.closedAt = block.timestamp;

        if (activeTradesCount[operation.user1] > 0) {
            activeTradesCount[operation.user1]--;
        }

        emit DisputeResolved(operationId, favorUser1, block.timestamp);
    }

    // ------------------------------------------------------------ queries

    function getOperation(uint256 operationId) external view returns (Operation memory) {
        return operations[operationId];
    }

    function getNextOperationId() external view returns (uint256) {
        return nextOperationId;
    }

    /// @notice Número total de operaciones creadas (para paginación).
    /// A1.2: usa nextOperationId — IDs secuenciales desde 1, sin array auxiliar.
    function getOperationsCount() external view returns (uint256) {
        return nextOperationId > 0 ? nextOperationId - 1 : 0;
    }

    /// @notice Paginación: devuelve `limit` operaciones desde `offset` (base-0).
    /// A1.2: itera por rango de IDs secuenciales en lugar del array eliminado.
    function getOperations(uint256 offset, uint256 limit) external view returns (Operation[] memory) {
        uint256 count = nextOperationId > 0 ? nextOperationId - 1 : 0;
        if (offset >= count) return new Operation[](0);

        uint256 end = offset + limit;
        if (end > count) end = count;

        uint256 resultLength = end - offset;
        Operation[] memory result = new Operation[](resultLength);
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = operations[offset + 1 + i]; // IDs empiezan en 1
        }
        return result;
    }
}
