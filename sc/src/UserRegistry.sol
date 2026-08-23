// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title UserRegistry
 * @notice Registro on-chain de usuarios de la plataforma.
 *
 * Para acceder a la interfaz de la plataforma (operaciones, balances, etc.)
 * la billetera debe estar conectada Y inscrita aquí. La inscripción es un
 * registro público y gratuito con un nombre de usuario único.
 */
contract UserRegistry {
    struct UserProfile {
        address wallet;
        string username;
        uint256 registeredAt;
        bool isRegistered;
    }

    mapping(address => UserProfile) public profiles;
    mapping(string => address) public usernameToWallet;
    address[] private registeredWallets;

    event UserRegistered(address indexed wallet, string username, uint256 registeredAt);
    event UsernameUpdated(address indexed wallet, string newUsername);

    /// @notice Inscribe la billetera del llamador con un nombre de usuario único.
    /// @param username 3-20 caracteres; no puede estar ya en uso.
    function register(string calldata username) external {
        require(bytes(username).length >= 3 && bytes(username).length <= 20, "Username must be between 3 and 20 chars");
        require(!profiles[msg.sender].isRegistered, "Already registered");
        require(usernameToWallet[username] == address(0), "Username already taken");

        profiles[msg.sender] =
            UserProfile({wallet: msg.sender, username: username, registeredAt: block.timestamp, isRegistered: true});

        usernameToWallet[username] = msg.sender;
        registeredWallets.push(msg.sender);

        emit UserRegistered(msg.sender, username, block.timestamp);
    }

    /// @notice Permite al usuario inscrito cambiar su nombre de usuario.
    function updateUsername(string calldata newUsername) external {
        require(profiles[msg.sender].isRegistered, "Not registered");
        require(
            bytes(newUsername).length >= 3 && bytes(newUsername).length <= 20, "Username must be between 3 and 20 chars"
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

    function getUserProfile(address wallet) external view returns (UserProfile memory) {
        return profiles[wallet];
    }

    /// @notice Total de usuarios inscritos (estadística de comunidad).
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
