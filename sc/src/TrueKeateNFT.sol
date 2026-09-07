// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrueKeate NFT
 * @notice NFT oficial de la plataforma: cada Bien/Servicio/Artículo del inventario se
 *         mintea como un TrueKeateNFT al publicarse (lógica maestra del director, punto 1).
 *         El mint lo ejecuta SOLO la plataforma (rol `minter`, típicamente la cuenta
 *         operativa/relayer — RF-09), en nombre del usuario propietario.
 *
 * @dev Categorías (punto 4 de la lógica maestra): ARTICULO, SERVICIO, BIEN, CRIPTO.
 *      Cada token guarda su categoría (leíble on-chain para el Mercado y el tipo de
 *      trueque) y su URI de metadatos (título, descripción, imágenes certificadas D23).
 *
 * Trazabilidad: lógica maestra puntos 1 y 4; RF-09; D23.
 */
contract TrueKeateNFT is ERC721, ERC721URIStorage, Ownable {
    // ------------------------------------------------------------------ estado
    uint256 private _siguienteTokenId;
    /// @dev Cuenta de la plataforma autorizada a mintear (relayer — RF-09).
    address public minter;

    /// @dev Categoría del ítem por tokenId (ARTICULO|SERVICIO|BIEN|CRIPTO).
    mapping(uint256 => string) public categoriaDe;

    // ------------------------------------------------------------------ eventos
    event ArticuloMinteado(uint256 indexed tokenId, address cuenta, string categoria, string uri);
    event ArticuloUsado(uint256 indexed tokenId, address cuenta);

    // ------------------------------------------------------------------ errores
    error SoloMinter();
    error CategoriaInvalida();
    error SoloPropietario();

    // ------------------------------------------------------------------ constructor
    constructor(
        string memory nombre_,
        string memory simbolo_,
        address minter_
    ) ERC721(nombre_, simbolo_) Ownable(msg.sender) {
        minter = minter_;
    }

    // ------------------------------------------------------------------ configuración
    function setMinter(address minter_) external onlyOwner {
        minter = minter_;
    }

    // ------------------------------------------------------------------ vistas
    function siguienteTokenId() external view returns (uint256) {
        return _siguienteTokenId;
    }

    // ------------------------------------------------------------------ mint (solo plataforma)
    /**
     * @notice Mintea el ítem del inventario como NFT para `cuenta` (solo `minter`).
     * @param cuenta    propietario del ítem (usuario de la plataforma).
     * @param categoria categoría: ARTICULO | SERVICIO | BIEN | CRIPTO.
     * @param uri       URI de metadatos (título, descripción, imágenes D23).
     */
    function mint(address cuenta, string calldata categoria, string calldata uri)
        external
        returns (uint256 tokenId)
    {
        if (msg.sender != minter) revert SoloMinter();
        if (!_esCategoriaValida(categoria)) revert CategoriaInvalida();

        tokenId = ++_siguienteTokenId;
        _mint(cuenta, tokenId);
        _setTokenURI(tokenId, uri);
        categoriaDe[tokenId] = categoria;
        emit ArticuloMinteado(tokenId, cuenta, categoria, uri);
    }

    function _esCategoriaValida(string calldata c) private pure returns (bool) {
        bytes32 h = keccak256(bytes(c));
        return h == keccak256("ARTICULO")
            || h == keccak256("SERVICIO")
            || h == keccak256("BIEN")
            || h == keccak256("CRIPTO");
    }

    // ------------------------------------------------------------------ usar (quemar — punto 2 de la lógica post-trueke)
    /**
     * @notice El DUEÑO actual del NFT lo consume: se quema on-chain (_burn) porque el
     *         ítem fue usado y ya no existe (p. ej. un servicio ya prestado o un bien
     *         consumible). Solo el propietario del token puede ejecutarlo.
     * @param tokenId token a quemar.
     */
    function usar(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) revert SoloPropietario();
        _burn(tokenId);
        delete categoriaDe[tokenId];
        emit ArticuloUsado(tokenId, msg.sender);
    }

    // ------------------------------------------------------------------ overrides (doble herencia ERC721 + URIStorage)
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
