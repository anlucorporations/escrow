// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IServiceBurnable {
    function consumeAndBurn(address from, uint256 serviceId, uint256 amount) external;
}

/**
 * @title TruekeEscrow
 * @notice Custodia atómica multi-activo y acuerdos tokenizados (dNFTs) para TrueKeate.
 *
 * Soporta intercambios bilaterales de cualquier combinación de:
 * - ERC-20 (BRLT, USDT, stablecoins)
 * - ERC-721 (Bienes físicos RWA tokenizados)
 * - ERC-1155 (Vouchers de servicios con quema automática)
 *
 * Ciclo de Vida:
 * 1. Pending: User1 deposita Activo A pidiendo Activo B.
 * 2. InTransit: Una de las partes despacha el producto y carga la guía de seguimiento.
 * 3. Completed: User2 deposita Activo B y ambos reciben instantáneamente su contraprestación.
 * 4. Disputed -> Completed: Mediación y resolución arbitral por Socios.
 */
contract TruekeEscrow is Ownable, ReentrancyGuard, IERC721Receiver, IERC1155Receiver {
    enum AssetType {
        ERC20,
        ERC721,
        ERC1155
    }

    enum TradeStatus {
        Pending,
        InTransit,
        Completed,
        Cancelled,
        Disputed
    }

    struct Asset {
        AssetType assetType;
        address tokenAddress;
        uint256 tokenId; // 0 para ERC-20
        uint256 amount; // monto para ERC-20 y ERC-1155; 1 para ERC-721
    }

    struct TradeOperation {
        uint256 id;
        address user1;
        address user2;
        Asset assetA;
        Asset assetB;
        TradeStatus status;
        string trackingInfo; // Guía de despacho / hash de recibo logístico
        uint256 createdAt;
        uint256 inTransitAt;
        uint256 deadline;
        uint256 closedAt;
        bool autoBurnService; // Quema automática de vouchers de servicios al completar
    }

    uint256 private _nextTradeId;
    mapping(uint256 => TradeOperation) public trades;
    address public arbiter;

    // Meta-transacciones EIP-712
    mapping(address => uint256) public nonces;
    bytes32 private constant _DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant _SET_IN_TRANSIT_TYPEHASH =
        keccak256("MetaSetInTransit(address user,uint256 tradeId,string trackingInfo,uint256 nonce)");

    event ArbiterSet(address indexed arbiter);
    event TradeCreated(
        uint256 indexed tradeId,
        address indexed user1,
        AssetType typeA,
        address tokenA,
        uint256 amountA,
        AssetType typeB,
        address tokenB,
        uint256 amountB,
        uint256 deadline
    );
    event TradeInTransit(uint256 indexed tradeId, address indexed caller, string trackingInfo, uint256 inTransitAt);
    event TradeCompleted(uint256 indexed tradeId, address indexed user2, uint256 completedAt);
    event TradeCancelled(uint256 indexed tradeId, uint256 cancelledAt);
    event TradeDisputed(uint256 indexed tradeId, address indexed caller, uint256 disputedAt);
    event TradeDisputeResolved(uint256 indexed tradeId, bool favorUser1, uint256 resolvedAt);

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Only arbiter can call");
        _;
    }

    constructor() Ownable(msg.sender) {
        _nextTradeId = 1;
    }

    function setArbiter(address _arbiter) external onlyOwner {
        arbiter = _arbiter;
        emit ArbiterSet(_arbiter);
    }

    // ------------------------------------------------------------- ciclo de vida

    /// @notice User1 deposita AssetA en custodia solicitando AssetB a cambio.
    function createTrade(
        Asset calldata assetA,
        Asset calldata assetB,
        uint256 deadline,
        bool autoBurnService
    ) external nonReentrant returns (uint256) {
        require(assetA.tokenAddress != address(0) && assetB.tokenAddress != address(0), "Invalid token address");
        require(assetA.amount > 0 && assetB.amount > 0, "Amounts must be > 0");
        require(deadline == 0 || deadline > block.timestamp, "Deadline must be in the future");

        uint256 tradeId = _nextTradeId++;

        // Transferir AssetA del llamador al contrato Escrow
        _depositAsset(msg.sender, assetA);

        trades[tradeId] = TradeOperation({
            id: tradeId,
            user1: msg.sender,
            user2: address(0),
            assetA: assetA,
            assetB: assetB,
            status: TradeStatus.Pending,
            trackingInfo: "",
            createdAt: block.timestamp,
            inTransitAt: 0,
            deadline: deadline,
            closedAt: 0,
            autoBurnService: autoBurnService
        });

        emit TradeCreated(
            tradeId,
            msg.sender,
            assetA.assetType,
            assetA.tokenAddress,
            assetA.amount,
            assetB.assetType,
            assetB.tokenAddress,
            assetB.amount,
            deadline
        );

        return tradeId;
    }

    /// @notice Marca el intercambio como 'En Tránsito', registrando la guía logística o comprobante de inicio.
    function setInTransit(uint256 tradeId, string calldata trackingInfo) external {
        TradeOperation storage trade = trades[tradeId];
        require(trade.id != 0, "Trade does not exist");
        require(
            trade.status == TradeStatus.Pending || trade.status == TradeStatus.InTransit,
            "Trade is not in valid status"
        );
        require(trade.deadline == 0 || block.timestamp <= trade.deadline, "Trade expired");
        require(bytes(trackingInfo).length > 0, "Tracking info required");

        if (msg.sender != trade.user1 && trade.user2 == address(0)) {
            trade.user2 = msg.sender;
        }

        trade.status = TradeStatus.InTransit;
        trade.trackingInfo = trackingInfo;
        trade.inTransitAt = block.timestamp;

        emit TradeInTransit(tradeId, msg.sender, trackingInfo, block.timestamp);
    }

    /// @notice User2 deposita AssetB en custodia y se ejecuta la liquidación atómica bilateral instantánea.
    function completeTrade(uint256 tradeId) external nonReentrant {
        TradeOperation storage trade = trades[tradeId];
        require(trade.id != 0, "Trade does not exist");
        require(
            trade.status == TradeStatus.Pending || trade.status == TradeStatus.InTransit,
            "Trade is not active or in transit"
        );
        require(trade.user1 != msg.sender, "Cannot complete your own trade");
        require(trade.deadline == 0 || block.timestamp <= trade.deadline, "Trade expired");

        trade.user2 = msg.sender;

        // 1. Recibir AssetB de User2 en custodia
        _depositAsset(msg.sender, trade.assetB);

        // 2. Liquidación atómica: entregar AssetA a User2 y AssetB a User1
        _transferOutAsset(trade.user2, trade.assetA, trade.autoBurnService);
        _transferOutAsset(trade.user1, trade.assetB, trade.autoBurnService);

        trade.status = TradeStatus.Completed;
        trade.closedAt = block.timestamp;

        emit TradeCompleted(tradeId, msg.sender, block.timestamp);
    }

    /// @notice Cancela el intercambio y devuelve AssetA a User1 (solo si aún está en estado Pending).
    function cancelTrade(uint256 tradeId) external nonReentrant {
        TradeOperation storage trade = trades[tradeId];
        require(trade.id != 0, "Trade does not exist");
        require(trade.status == TradeStatus.Pending, "Only pending trades can be cancelled");
        require(trade.user1 == msg.sender, "Only creator can cancel");

        trade.status = TradeStatus.Cancelled;
        trade.closedAt = block.timestamp;

        _transferOutAsset(trade.user1, trade.assetA, false);

        emit TradeCancelled(tradeId, block.timestamp);
    }

    /// @notice Reclama los fondos de vuelta tras vencer el plazo sin que el trueque se haya completado.
    function refundAfterExpiry(uint256 tradeId) external nonReentrant {
        TradeOperation storage trade = trades[tradeId];
        require(trade.id != 0, "Trade does not exist");
        require(
            trade.status == TradeStatus.Pending || trade.status == TradeStatus.InTransit,
            "Trade is not pending or in transit"
        );
        require(trade.user1 == msg.sender, "Only creator can refund");
        require(trade.deadline != 0 && block.timestamp > trade.deadline, "Deadline not reached yet");

        trade.status = TradeStatus.Cancelled;
        trade.closedAt = block.timestamp;

        _transferOutAsset(trade.user1, trade.assetA, false);

        emit TradeCancelled(tradeId, block.timestamp);
    }

    // ------------------------------------------------------------- disputas y arbitraje

    function disputeTrade(uint256 tradeId) external {
        TradeOperation storage trade = trades[tradeId];
        require(trade.id != 0, "Trade does not exist");
        require(
            trade.status == TradeStatus.Pending || trade.status == TradeStatus.InTransit,
            "Trade not eligible for dispute"
        );
        require(arbiter != address(0), "No arbiter set");

        if (msg.sender != trade.user1 && trade.user2 == address(0)) {
            trade.user2 = msg.sender;
        }

        trade.status = TradeStatus.Disputed;
        emit TradeDisputed(tradeId, msg.sender, block.timestamp);
    }

    function resolveDispute(uint256 tradeId, bool favorUser1) external onlyArbiter nonReentrant {
        TradeOperation storage trade = trades[tradeId];
        require(trade.id != 0, "Trade does not exist");
        require(trade.status == TradeStatus.Disputed, "Trade is not disputed");

        address winner;
        if (favorUser1) {
            winner = trade.user1;
        } else {
            require(trade.user2 != address(0), "No counterpart recorded on-chain");
            winner = trade.user2;
        }

        trade.status = TradeStatus.Completed;
        trade.closedAt = block.timestamp;

        _transferOutAsset(winner, trade.assetA, trade.autoBurnService);

        emit TradeDisputeResolved(tradeId, favorUser1, block.timestamp);
    }

    // ------------------------------------------------------------- transferencias internas

    function _depositAsset(address from, Asset memory asset) internal {
        if (asset.assetType == AssetType.ERC20) {
            IERC20(asset.tokenAddress).transferFrom(from, address(this), asset.amount);
        } else if (asset.assetType == AssetType.ERC721) {
            IERC721(asset.tokenAddress).safeTransferFrom(from, address(this), asset.tokenId);
        } else if (asset.assetType == AssetType.ERC1155) {
            IERC1155(asset.tokenAddress).safeTransferFrom(from, address(this), asset.tokenId, asset.amount, "");
        }
    }

    function _transferOutAsset(address to, Asset memory asset, bool autoBurn) internal {
        if (asset.assetType == AssetType.ERC20) {
            IERC20(asset.tokenAddress).transfer(to, asset.amount);
        } else if (asset.assetType == AssetType.ERC721) {
            IERC721(asset.tokenAddress).safeTransferFrom(address(this), to, asset.tokenId);
        } else if (asset.assetType == AssetType.ERC1155) {
            if (autoBurn) {
                try IServiceBurnable(asset.tokenAddress).consumeAndBurn(address(this), asset.tokenId, asset.amount) {}
                catch {
                    IERC1155(asset.tokenAddress).safeTransferFrom(address(this), to, asset.tokenId, asset.amount, "");
                }
            } else {
                IERC1155(asset.tokenAddress).safeTransferFrom(address(this), to, asset.tokenId, asset.amount, "");
            }
        }
    }

    // ------------------------------------------------------------- consultas

    function getTrade(uint256 tradeId) external view returns (TradeOperation memory) {
        require(trades[tradeId].id != 0, "Trade does not exist");
        return trades[tradeId];
    }

    function getTradesCount() external view returns (uint256) {
        return _nextTradeId > 0 ? _nextTradeId - 1 : 0;
    }

    // ------------------------------------------------------------- receptores ERC

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IERC721Receiver).interfaceId || interfaceId == type(IERC1155Receiver).interfaceId;
    }
}
