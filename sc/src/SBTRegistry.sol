// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface ITruekeSBT {
    function mint(address to, string calldata originProvider) external returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
}

/**
 * @title SBTRegistry
 * @notice Hub descentralizado de verificación de identidad para TrueKeate.
 *
 * Gestiona el SBT nativo y la lista blanca de proveedores de SBT externos
 * (ej. Binance BABT, WorldID, Gitcoin Passport, Proof of Humanity, SBTs gremiales/BarloVentas).
 * Permite a cualquier contrato de la plataforma verificar si un usuario cuenta con
 * certificación Nivel 3 sin obligarlo a repetir un proceso de KYC.
 */
contract SBTRegistry is Ownable {
    enum TokenStandard {
        ERC721,
        ERC1155
    }

    struct ExternalProvider {
        address contractAddress;
        string name;
        uint8 minTier; // Nivel de confianza inicial (3 = Certificado estándar)
        bool active;
        TokenStandard standard;
        uint256 specificTokenId; // Para ERC-1155 o tokens específicos (0 si no aplica)
    }

    address public nativeSBT;
    mapping(address => ExternalProvider) public providers;
    address[] private providerList;

    // Registro de certificación activa: usuario => nombre del proveedor que certificó
    mapping(address => string) public userCertificationOrigin;

    event NativeSBTSet(address indexed nativeSBT);
    event ExternalProviderAdded(address indexed contractAddress, string name, uint8 minTier, TokenStandard standard);
    event ExternalProviderStatusUpdated(address indexed contractAddress, bool active);
    event UserCertifiedViaExternal(address indexed user, address indexed provider, string providerName);
    event NativeSBTClaimed(address indexed user, uint256 tokenId, string origin);

    constructor() Ownable(msg.sender) {}

    // -------------------------------------------------------- administración (owner)

    /// @notice Configura la dirección del contrato TruekeSBT nativo.
    function setNativeSBT(address _nativeSBT) external onlyOwner {
        require(_nativeSBT != address(0), "Invalid address");
        nativeSBT = _nativeSBT;
        emit NativeSBTSet(_nativeSBT);
    }

    /// @notice Agrega o actualiza un proveedor de SBT externo en la lista blanca.
    function addProvider(
        address _contractAddress,
        string calldata _name,
        uint8 _minTier,
        TokenStandard _standard,
        uint256 _specificTokenId
    ) external onlyOwner {
        require(_contractAddress != address(0), "Invalid provider address");
        require(bytes(_name).length > 0, "Provider name required");

        if (providers[_contractAddress].contractAddress == address(0)) {
            providerList.push(_contractAddress);
        }

        providers[_contractAddress] = ExternalProvider({
            contractAddress: _contractAddress,
            name: _name,
            minTier: _minTier,
            active: true,
            standard: _standard,
            specificTokenId: _specificTokenId
        });

        emit ExternalProviderAdded(_contractAddress, _name, _minTier, _standard);
    }

    /// @notice Habilita o deshabilita un proveedor de SBT de la lista blanca.
    function setProviderStatus(address _contractAddress, bool _active) external onlyOwner {
        require(providers[_contractAddress].contractAddress != address(0), "Provider not found");
        providers[_contractAddress].active = _active;
        emit ExternalProviderStatusUpdated(_contractAddress, _active);
    }

    // -------------------------------------------------------- consultas de identidad

    /// @notice Verifica si un usuario posee el SBT nativo o algún SBT externo válido.
    /// @param user Dirección de la billetera a consultar.
    /// @return isValid True si posee al menos una credencial válida.
    /// @return providerName Nombre del emisor de la credencial (ej. "TrueKeate Native SBT", "Binance BABT").
    /// @return tier Nivel de confianza otorgado (por defecto 3 para Certificados).
    function hasValidIdentity(address user)
        external
        view
        returns (bool isValid, string memory providerName, uint8 tier)
    {
        if (user == address(0)) return (false, "", 0);

        // 1. Verificar si tiene el SBT nativo
        if (nativeSBT != address(0)) {
            try ITruekeSBT(nativeSBT).balanceOf(user) returns (uint256 bal) {
                if (bal > 0) {
                    string memory origin = bytes(userCertificationOrigin[user]).length > 0
                        ? userCertificationOrigin[user]
                        : "TrueKeate Native SBT";
                    return (true, origin, 3);
                }
            } catch {}
        }

        // 2. Verificar contra la lista blanca de SBTs externos
        uint256 total = providerList.length;
        for (uint256 i = 0; i < total; i++) {
            ExternalProvider memory p = providers[providerList[i]];
            if (!p.active) continue;

            bool hasToken = _checkExternalBalance(user, p);
            if (hasToken) {
                return (true, p.name, p.minTier);
            }
        }

        return (false, "", 0);
    }

    /// @notice Consulta interna segura del balance de un token externo.
    function _checkExternalBalance(address user, ExternalProvider memory p) internal view returns (bool) {
        if (p.standard == TokenStandard.ERC721) {
            try IERC721(p.contractAddress).balanceOf(user) returns (uint256 bal) {
                return bal > 0;
            } catch {
                return false;
            }
        } else if (p.standard == TokenStandard.ERC1155) {
            try IERC1155(p.contractAddress).balanceOf(user, p.specificTokenId) returns (uint256 bal) {
                return bal > 0;
            } catch {
                return false;
            }
        }
        return false;
    }

    /// @notice Permite a un usuario que posee un SBT de terceros solicitar la emisión
    ///         gratuita de su credencial nativa TruekeSBT vinculada a su proveedor.
    function claimNativeSBTFromExternal(address providerAddress) external returns (uint256) {
        require(nativeSBT != address(0), "Native SBT contract not set");
        ExternalProvider memory p = providers[providerAddress];
        require(p.active, "Provider not active or not whitelisted");

        bool hasToken = _checkExternalBalance(msg.sender, p);
        require(hasToken, "User does not hold the specified external SBT");

        require(ITruekeSBT(nativeSBT).balanceOf(msg.sender) == 0, "User already has a native SBT");

        userCertificationOrigin[msg.sender] = p.name;
        uint256 tokenId = ITruekeSBT(nativeSBT).mint(msg.sender, p.name);

        emit UserCertifiedViaExternal(msg.sender, providerAddress, p.name);
        emit NativeSBTClaimed(msg.sender, tokenId, p.name);

        return tokenId;
    }

    /// @notice Devuelve el número total de proveedores externos registrados.
    function getProvidersCount() external view returns (uint256) {
        return providerList.length;
    }

    /// @notice Lista todos los proveedores externos registrados.
    function getProviders() external view returns (ExternalProvider[] memory) {
        uint256 total = providerList.length;
        ExternalProvider[] memory list = new ExternalProvider[](total);
        for (uint256 i = 0; i < total; i++) {
            list[i] = providers[providerList[i]];
        }
        return list;
    }
}
