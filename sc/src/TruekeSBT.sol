// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TruekeSBT
 * @notice Soulbound Token (SBT) intransferible que certifica el Nivel 3 de Identidad en TrueKeate.
 *
 * Implementa el estándar ERC-5192 (Minimal Soulbound Token).
 * - Intransferible: Cualquier intento de transferencia entre billeteras revierte.
 * - Acuñación: Controlada por el Módulo de Identidad (SBTRegistry / KYC / Owner).
 * - Revocación / Quema: Controlada por el Owner / Gobernanza ante sanciones justificadas.
 */
contract TruekeSBT is ERC721, Ownable {
    // ERC-5192 Interface ID: bytes4(keccak256("locked(uint256)")) == 0xb45a3c0e
    bytes4 private constant _ERC5192_INTERFACE_ID = 0xb45a3c0e;

    struct Credential {
        uint256 tokenId;
        string originProvider; // "KYC Nativo", "Binance BABT", "WorldID", etc.
        uint256 issuedAt;
        bool active;
    }

    uint256 private _nextTokenId;
    address public minter; // SBTRegistry o relayer autorizado de KYC

    mapping(uint256 => Credential) public credentials;
    mapping(address => uint256) public userToTokenId;

    // Eventos ERC-5192
    event Locked(uint256 indexed tokenId);
    event Unlocked(uint256 indexed tokenId);

    event MinterSet(address indexed minter);
    event CredentialIssued(address indexed user, uint256 indexed tokenId, string originProvider, uint256 issuedAt);
    event CredentialRevoked(address indexed user, uint256 indexed tokenId, string reason);

    modifier onlyMinterOrOwner() {
        require(msg.sender == minter || msg.sender == owner(), "Caller is not minter or owner");
        _;
    }

    constructor() ERC721("TrueKeate Identity Soulbound Token", "TRUEKE-SBT") Ownable(msg.sender) {
        _nextTokenId = 1;
    }

    function setMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "Invalid minter address");
        minter = _minter;
        emit MinterSet(_minter);
    }

    /// @notice Emite una credencial SBT de Nivel 3 a un usuario verificado.
    /// @param to Billetera receptora (debe tener balance 0 de SBT).
    /// @param originProvider Origen de la verificación (ej. "KYC Nativo", "Binance BABT").
    function mint(address to, string calldata originProvider) external onlyMinterOrOwner returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(balanceOf(to) == 0, "User already owns an SBT");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        credentials[tokenId] = Credential({
            tokenId: tokenId,
            originProvider: originProvider,
            issuedAt: block.timestamp,
            active: true
        });
        userToTokenId[to] = tokenId;

        emit Locked(tokenId);
        emit CredentialIssued(to, tokenId, originProvider, block.timestamp);

        return tokenId;
    }

    /// @notice Revoca (quema) una credencial SBT en caso de sanción de gobernanza o fraude.
    function revoke(uint256 tokenId, string calldata reason) external onlyOwner {
        address user = ownerOf(tokenId);
        require(credentials[tokenId].active, "Credential not active");

        credentials[tokenId].active = false;
        delete userToTokenId[user];

        _burn(tokenId);

        emit Unlocked(tokenId);
        emit CredentialRevoked(user, tokenId, reason);
    }

    /// @notice ERC-5192: Indica si un token está bloqueado a la billetera (siempre true para SBTs activos).
    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    /// @dev Bloqueo estricto de transferencias: solo permite minting (from == 0) y burning (to == 0).
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: Token is non-transferable");
        }
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == _ERC5192_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    /// @notice Devuelve la credencial asociada a un usuario.
    function getCredentialByUser(address user) external view returns (Credential memory) {
        uint256 tokenId = userToTokenId[user];
        require(tokenId != 0, "No SBT found for user");
        return credentials[tokenId];
    }
}
