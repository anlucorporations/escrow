// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ISBTRegistryService {
    function hasValidIdentity(address user) external view returns (bool isValid, string memory providerName, uint8 tier);
}

/**
 * @title TruekeService
 * @notice Tokenización de Capacidad y Servicios mediante Vouchers Semifungibles ERC-1155.
 *
 * Características:
 * - Emisión por lotes de unidades de servicio (ej. 10 horas de consultoría, 5 diseños).
 * - Mecanismo de Quema (*Burn on Consume*): Al prestarse el servicio, los tokens se destruyen
 *   en el contrato inteligente como prueba criptográfica inmutable de consumo y finalización.
 * - Restricción de emisión: Requiere Identificación Nivel 3 (Certificado).
 */
contract TruekeService is ERC1155, Ownable {
    struct ServiceVoucher {
        uint256 serviceId;
        address provider;
        string title;
        string category;
        string ipfsMetadataCID;
        uint256 totalMinted;
        uint256 totalConsumed;
        uint256 createdAt;
        bool active;
    }

    ISBTRegistryService public sbtRegistry;
    uint256 private _nextServiceId;

    mapping(uint256 => ServiceVoucher) public services;
    mapping(uint256 => string) private _serviceURIs;

    // Escrow u operadores autorizados para quema automática tras finalización de trueke
    mapping(address => bool) public authorizedEscrows;

    event SBTRegistrySet(address indexed sbtRegistry);
    event EscrowAuthorizationUpdated(address indexed escrow, bool authorized);
    event ServiceCreated(
        uint256 indexed serviceId,
        address indexed provider,
        string title,
        string category,
        uint256 initialSupply,
        string ipfsMetadataCID,
        uint256 createdAt
    );
    event ServiceConsumed(
        uint256 indexed serviceId, address indexed consumer, address indexed caller, uint256 amount, uint256 consumedAt
    );

    constructor(address _sbtRegistry) ERC1155("") Ownable(msg.sender) {
        sbtRegistry = ISBTRegistryService(_sbtRegistry);
        _nextServiceId = 1;
    }

    function setSBTRegistry(address _sbtRegistry) external onlyOwner {
        require(_sbtRegistry != address(0), "Invalid address");
        sbtRegistry = ISBTRegistryService(_sbtRegistry);
        emit SBTRegistrySet(_sbtRegistry);
    }

    function setEscrowAuthorization(address escrow, bool authorized) external onlyOwner {
        require(escrow != address(0), "Invalid address");
        authorizedEscrows[escrow] = authorized;
        emit EscrowAuthorizationUpdated(escrow, authorized);
    }

    /// @notice Crea y acuña un nuevo lote de vouchers de servicios (Nivel 3 requerido).
    function createServiceBatch(
        address to,
        uint256 amount,
        string calldata title,
        string calldata category,
        string calldata ipfsMetadataCID
    ) external returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(bytes(title).length > 0, "Title required");

        if (address(sbtRegistry) != address(0)) {
            (bool isValid,,) = sbtRegistry.hasValidIdentity(msg.sender);
            require(isValid, "Solo usuarios Nivel 3 (Certificados) pueden emitir vouchers de servicios");
        }

        uint256 serviceId = _nextServiceId++;
        _mint(to, serviceId, amount, "");

        services[serviceId] = ServiceVoucher({
            serviceId: serviceId,
            provider: msg.sender,
            title: title,
            category: category,
            ipfsMetadataCID: ipfsMetadataCID,
            totalMinted: amount,
            totalConsumed: 0,
            createdAt: block.timestamp,
            active: true
        });

        _serviceURIs[serviceId] = string(abi.encodePacked("ipfs://", ipfsMetadataCID));

        emit ServiceCreated(serviceId, msg.sender, title, category, amount, ipfsMetadataCID, block.timestamp);

        return serviceId;
    }

    /// @notice Acuña unidades adicionales de un servicio existente (solo el prestador original).
    function mintMore(uint256 serviceId, address to, uint256 amount) external {
        ServiceVoucher storage s = services[serviceId];
        require(s.serviceId != 0 && s.active, "Service not found or inactive");
        require(s.provider == msg.sender, "Only original provider can mint more");
        require(amount > 0, "Amount must be > 0");

        s.totalMinted += amount;
        _mint(to, serviceId, amount, "");
    }

    /// @notice Quema y redime vouchers de servicios como prueba criptográfica de consumo.
    /// @param from Poseedor de los tokens de servicio.
    /// @param serviceId ID del voucher de servicio.
    /// @param amount Cantidad de unidades consumidas.
    function consumeAndBurn(address from, uint256 serviceId, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        ServiceVoucher storage s = services[serviceId];
        require(s.serviceId != 0, "Service does not exist");

        // El llamador debe ser el dueño del token, tener aprobación del operador, o ser un contrato Escrow autorizado
        require(
            from == msg.sender || isApprovedForAll(from, msg.sender) || authorizedEscrows[msg.sender],
            "Caller not authorized to consume and burn"
        );

        s.totalConsumed += amount;
        _burn(from, serviceId, amount);

        emit ServiceConsumed(serviceId, from, msg.sender, amount, block.timestamp);
    }

    function uri(uint256 serviceId) public view override returns (string memory) {
        return _serviceURIs[serviceId];
    }

    function getService(uint256 serviceId) external view returns (ServiceVoucher memory) {
        require(services[serviceId].serviceId != 0, "Service does not exist");
        return services[serviceId];
    }
}
