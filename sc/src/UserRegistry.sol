// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UserRegistry
 * @notice Registro on-chain de usuarios, coordenadas UTM y niveles de identificación de TrueKeate.
 *
 * Administra los 3 niveles de identificación progresivos:
 * 1. Inscrito: Registro obligatorio con Username, Correo, Teléfono y Ubicación UTM (únicos on-chain).
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
        string email;
        string phone;
        string physicalAddress;
        int32 utmEasting;
        int32 utmNorthing;
        uint8 utmZone;
        bool isNorthernHemisphere;
        uint256 registeredAt;
        bool isRegistered;
        IdentificationLevel identificationLevel;
        bool termsAccepted;
    }

    mapping(address => UserProfile) public profiles;
    mapping(string => address) public usernameToWallet;
    mapping(bytes32 => address) public emailHashToWallet;
    mapping(bytes32 => address) public phoneHashToWallet;
    mapping(bytes32 => address) public locationHashToWallet;
    address[] private registeredWallets;

    // Relayer autorizado para actualizar niveles tras validaciones 2FA / KYC
    address public identityAdmin;

    event UserRegistered(
        address indexed wallet,
        string username,
        string email,
        string phone,
        string physicalAddress,
        int32 utmEasting,
        int32 utmNorthing,
        uint8 utmZone,
        bool isNorthernHemisphere,
        uint256 registeredAt,
        IdentificationLevel level
    );
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

    /// @notice Inscribe la billetera del llamador (Nivel 1: Inscrito) con datos únicos obligatorios y coordenadas UTM.
    function register(
        string calldata username,
        string calldata email,
        string calldata phone,
        string calldata physicalAddress,
        int32 utmEasting,
        int32 utmNorthing,
        uint8 utmZone,
        bool isNorthernHemisphere
    ) external {
        require(bytes(username).length >= 3 && bytes(username).length <= 20, "Username must be between 3 and 20 chars");
        require(bytes(email).length >= 5, "Email is required");
        require(bytes(phone).length >= 7, "Phone is required");
        require(bytes(physicalAddress).length >= 3, "Address is required");
        require(utmZone >= 1 && utmZone <= 60, "Invalid UTM zone (1-60)");
        require(!profiles[msg.sender].isRegistered, "Already registered");

        bytes32 emailHash = keccak256(bytes(email));
        bytes32 phoneHash = keccak256(bytes(phone));
        bytes32 locHash = keccak256(abi.encodePacked(physicalAddress, utmEasting, utmNorthing, utmZone, isNorthernHemisphere));

        require(usernameToWallet[username] == address(0), "Username already taken");
        require(emailHashToWallet[emailHash] == address(0), "Email already registered");
        require(phoneHashToWallet[phoneHash] == address(0), "Phone already registered");
        require(locationHashToWallet[locHash] == address(0), "Location already registered");

        profiles[msg.sender] = UserProfile({
            wallet: msg.sender,
            username: username,
            email: email,
            phone: phone,
            physicalAddress: physicalAddress,
            utmEasting: utmEasting,
            utmNorthing: utmNorthing,
            utmZone: utmZone,
            isNorthernHemisphere: isNorthernHemisphere,
            registeredAt: block.timestamp,
            isRegistered: true,
            identificationLevel: IdentificationLevel.Inscrito,
            termsAccepted: true
        });

        usernameToWallet[username] = msg.sender;
        emailHashToWallet[emailHash] = msg.sender;
        phoneHashToWallet[phoneHash] = msg.sender;
        locationHashToWallet[locHash] = msg.sender;
        registeredWallets.push(msg.sender);

        emit UserRegistered(
            msg.sender,
            username,
            email,
            phone,
            physicalAddress,
            utmEasting,
            utmNorthing,
            utmZone,
            isNorthernHemisphere,
            block.timestamp,
            IdentificationLevel.Inscrito
        );
    }

    mapping(address => uint256) public completedTradesCount;
    mapping(address => uint256) public disputesLostCount;

    event ReputationUpdated(address indexed wallet, uint256 completed, uint256 lost, uint8 rank);

    /// @notice Registra el resultado de un trueke para computar reputación.
    function recordTradeOutcome(address user, bool isCompleted, bool isDisputeLost) external onlyIdentityAdminOrOwner {
        if (isCompleted) {
            completedTradesCount[user]++;
        }
        if (isDisputeLost) {
            disputesLostCount[user]++;
        }
        emit ReputationUpdated(user, completedTradesCount[user], disputesLostCount[user], getReputationRank(user));
    }

    /// @notice Calcula el rango de reputación: 1: Bronce, 2: Plata, 3: Oro.
    function getReputationRank(address wallet) public view returns (uint8) {
        uint256 completed = completedTradesCount[wallet];
        uint256 lost = disputesLostCount[wallet];
        uint256 total = completed + lost;

        if (total == 0 || completed < 50) {
            return 1; // Bronce
        }

        uint256 eff = (completed * 100) / total;
        if (completed >= 1000 && eff >= 90) {
            return 3; // Oro
        } else if (completed >= 50 && eff >= 80) {
            return 2; // Plata
        }
        return 1; // Bronce
    }

    /// @notice Devuelve el resumen completo de reputación de un usuario.
    function getReputation(address wallet)
        external
        view
        returns (uint256 completed, uint256 lost, uint256 effectiveness, uint8 rank)
    {
        completed = completedTradesCount[wallet];
        lost = disputesLostCount[wallet];
        uint256 total = completed + lost;
        effectiveness = total > 0 ? (completed * 100) / total : 100;
        rank = getReputationRank(wallet);
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

