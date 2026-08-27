// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ISBTRegistry {
    function hasValidIdentity(address user) external view returns (bool isValid, string memory providerName, uint8 tier);
}

/**
 * @title TruekeRWA
 * @notice Tokenización de Bienes del Mundo Real (Real World Assets - RWA) mediante NFTs ERC-721.
 *
 * Características:
 * - Metadata inmutable almacenada en IPFS (imágenes, descripción, estado).
 * - "Compromiso de Estado": Hash SHA-256 del estado físico y fotos firmado por el creador.
 * - Trazabilidad histórica completa de propietarios on-chain.
 * - Restricción de emisión: Solo usuarios de Nivel 3 (Certificados con SBT nativo o de terceros).
 */
contract TruekeRWA is ERC721, Ownable {
    struct RWAItem {
        uint256 tokenId;
        address originalCreator;
        string title;
        string category;
        string ipfsMetadataCID;
        bytes32 conditionStateCommitment;
        uint256 mintedAt;
    }

    ISBTRegistry public sbtRegistry;
    uint256 private _nextTokenId;

    mapping(uint256 => RWAItem) public items;
    mapping(uint256 => address[]) private _ownershipHistory;
    mapping(uint256 => string) private _tokenURIs;

    event SBTRegistrySet(address indexed sbtRegistry);
    event RWAMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string title,
        string category,
        string ipfsMetadataCID,
        bytes32 conditionStateCommitment,
        uint256 mintedAt
    );

    constructor(address _sbtRegistry) ERC721("TrueKeate Real World Assets", "TRUEKE-RWA") Ownable(msg.sender) {
        sbtRegistry = ISBTRegistry(_sbtRegistry);
        _nextTokenId = 1;
    }

    function setSBTRegistry(address _sbtRegistry) external onlyOwner {
        require(_sbtRegistry != address(0), "Invalid address");
        sbtRegistry = ISBTRegistry(_sbtRegistry);
        emit SBTRegistrySet(_sbtRegistry);
    }

    /// @notice Acuña un bien físico RWA tokenizado.
    /// @param to Destinatario propietario inicial del bien.
    /// @param title Título representativo del bien.
    /// @param category Categoría comercial.
    /// @param ipfsMetadataCID Identificador CID de IPFS con fotos y descripción detallada.
    /// @param conditionStateCommitment Hash criptográfico que compromete el estado físico inicial.
    function mintRWA(
        address to,
        string calldata title,
        string calldata category,
        string calldata ipfsMetadataCID,
        bytes32 conditionStateCommitment
    ) external returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(bytes(title).length > 0, "Title required");
        require(bytes(ipfsMetadataCID).length > 0, "IPFS CID required");

        // Validación de Identidad Nivel 3 (Certificado)
        if (address(sbtRegistry) != address(0)) {
            (bool isValid,,) = sbtRegistry.hasValidIdentity(msg.sender);
            require(isValid, "Solo usuarios Nivel 3 (Certificados) pueden acunar bienes RWA");
        }

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        items[tokenId] = RWAItem({
            tokenId: tokenId,
            originalCreator: msg.sender,
            title: title,
            category: category,
            ipfsMetadataCID: ipfsMetadataCID,
            conditionStateCommitment: conditionStateCommitment,
            mintedAt: block.timestamp
        });

        _tokenURIs[tokenId] = string(abi.encodePacked("ipfs://", ipfsMetadataCID));
        _ownershipHistory[tokenId].push(to);

        emit RWAMinted(
            tokenId, msg.sender, title, category, ipfsMetadataCID, conditionStateCommitment, block.timestamp
        );

        return tokenId;
    }

    /// @dev Registra el historial de propiedad en cada transferencia.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        if (to != address(0) && from != address(0)) {
            _ownershipHistory[tokenId].push(to);
        }
        return from;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    /// @notice Consulta el historial de transferencias y anteriores dueños de un bien.
    function getOwnershipHistory(uint256 tokenId) external view returns (address[] memory) {
        _requireOwned(tokenId);
        return _ownershipHistory[tokenId];
    }

    function getItem(uint256 tokenId) external view returns (RWAItem memory) {
        _requireOwned(tokenId);
        return items[tokenId];
    }
}
