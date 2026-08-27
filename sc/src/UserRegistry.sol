// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UserRegistry
 * @notice Registro on-chain de usuarios y niveles de identificación de TrueKeate.
 *
 * Administra los 3 niveles de identificación progresivos:
 * 1. Inscrito: Registro básico con nombre de usuario y aceptación de acuerdos de convivencia.
 * 2. Verificado: Correo electrónico, teléfono y 2FA confirmados.
 * 3. Certificado: KYC avanzado completado (SBT nativo) o SBT de terceros verificado.
 */
contract UserRegistry is Ownable {
    enum IdentificationLevel {
        Inscrito,
        Verificado,
        Certificado
    }

    struct UserProfile {
        address wallet;
        string username;
        uint256 registeredAt;
        bool isRegistered;
        IdentificationLevel identificationLevel;
        bool termsAccepted;
    }

    mapping(address => UserProfile) public profiles;
    mapping(string => address) public usernameToWallet;
    address[] private registeredWallets;

    // Relayer autorizado para actualizar niveles tras validaciones 2FA / KYC
    address public identityAdmin;

    event UserRegistered(address indexed wallet, string username, uint256 registeredAt, IdentificationLevel level);
    event UsernameUpdated(address indexed wallet, string newUsername);
    event IdentificationLevelUpdated(address indexed wallet, IdentificationLevel newLevel);
    event IdentityAdminSet(address indexed admin);

    modifier onlyIdentityAdminOrOwner() {
        require(msg.sender == identityAdmin || msg.sender == owner(), "Caller is not identity admin or owner");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setIdentityAdmin(address _admin) external onlyOwner {
        identityAdmin = _admin;
        emit IdentityAdminSet(_admin);
    }

    /// @notice Inscribe la billetera del llamador (Nivel 1: Inscrito) aceptando los acuerdos de convivencia.
    /// @param username 3-20 caracteres alfanuméricos únicos.
    function register(string calldata username) external {
        require(bytes(username).length >= 3 && bytes(username).length <= 20, "Username must be between 3 and 20 chars");
        require(!profiles[msg.sender].isRegistered, "Already registered");
        require(usernameToWallet[username] == address(0), "Username already taken");

        profiles[msg.sender] = UserProfile({
            wallet: msg.sender,
            username: username,
            registeredAt: block.timestamp,
            isRegistered: true,
            identificationLevel: IdentificationLevel.Inscrito,
            termsAccepted: true
        });

        usernameToWallet[username] = msg.sender;
        registeredWallets.push(msg.sender);

        emit UserRegistered(msg.sender, username, block.timestamp, IdentificationLevel.Inscrito);
    }

    /// @notice Actualiza el nivel de identificación de un usuario (Inscrito -> Verificado -> Certificado).
    function setUserIdentificationLevel(address wallet, IdentificationLevel level) external onlyIdentityAdminOrOwner {
        require(profiles[wallet].isRegistered, "User is not registered");
        profiles[wallet].identificationLevel = level;
        emit IdentificationLevelUpdated(wallet, level);
    }

    /// @notice Permite al usuario inscrito cambiar su nombre de usuario.
    function updateUsername(string calldata newUsername) external {
        require(profiles[msg.sender].isRegistered, "Not registered");
        require(
            bytes(newUsername).length >= 3 && bytes(newUsername).length <= 20,
            "Username must be between 3 and 20 chars"
        );
        require(usernameToWallet[newUsername] == address(0), "Username already taken");

        string memory oldUsername = profiles[msg.sender].username;
        delete usernameToWallet[oldUsername];

        profiles[msg.sender].username = newUsername;
        usernameToWallet[newUsername] = msg.sender;

        emit UsernameUpdated(msg.sender, newUsername);
    }

    function isRegistered(address wallet) external view returns (bool) {
        return profiles[wallet].isRegistered;
    }

    function getIdentificationLevel(address wallet) external view returns (IdentificationLevel) {
        return profiles[wallet].identificationLevel;
    }

    function getUserProfile(address wallet) external view returns (UserProfile memory) {
        return profiles[wallet];
    }

    /// @notice Total de usuarios inscritos en la plataforma.
    function getRegisteredWalletsCount() external view returns (uint256) {
        return registeredWallets.length;
    }

    function getRegisteredWalletsPaged(uint256 offset, uint256 limit) external view returns (UserProfile[] memory) {
        uint256 total = registeredWallets.length;
        if (offset >= total) {
            return new UserProfile[](0);
        }
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        uint256 resultSize = end - offset;
        UserProfile[] memory page = new UserProfile[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) {
            page[i] = profiles[registeredWallets[offset + i]];
        }
        return page;
    }
}
