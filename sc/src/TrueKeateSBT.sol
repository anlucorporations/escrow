// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrueKeate SBT — Credencial no transferible de certificación
 * @notice Soulbound token (ERC-721 + ERC-5192) que representa la CERTIFICACIÓN
 *         de identidad (D28, etapa 2) de un usuario TrueKeate. Decisión del
 *         director (2026-09): la certificación de la suite puede hacerse de
 *         forma automática si la wallet posee un SBT válido (nativo u externo
 *         reconocido); en ese caso la plataforma mintea este SBT nativo como
 *         credencial propia.
 *
 * - 1 SBT por wallet (mapeo 1:1 `sbtDe`) — sin re-minteo.
 * - NO transferible: transferencias y aprobaciones revierten (soulbound).
 * - Solo el rol `minter` (plataforma/relayer) puede emitir.
 * - `locked()` siempre true (ERC-5192, selector 0xb45a3c0e).
 *
 * Trazabilidad: D28 / CU-02 / RF-01.5 / RF-18.4.
 */
contract TrueKeateSBT is ERC721, Ownable {
    // ------------------------------------------------------------------ estado
    address public minter;
    uint256 public siguienteTokenId = 1;

    mapping(address => uint256) public sbtDe;      // wallet -> tokenId (1:1)
    mapping(uint256 => string) private _uris;

    // ------------------------------------------------------------------ eventos
    event SbtMinteado(uint256 indexed tokenId, address cuenta, string uri);
    event MinterActualizado(address minter);
    // ERC-5192
    event Locked(uint256 indexed tokenId);

    // ------------------------------------------------------------------ errores
    error SoloMinter();
    error YaTieneSbt(address cuenta);
    error Soulbound(uint256 tokenId);

    // ------------------------------------------------------------------ constructor
    constructor(address minter_) ERC721("TrueKeate SBT", "TKSBT") Ownable(msg.sender) {
        minter = minter_;
    }

    // ------------------------------------------------------------------ admin
    function setMinter(address minter_) external onlyOwner {
        minter = minter_;
        emit MinterActualizado(minter_);
    }

    // ------------------------------------------------------------------ minteo
    /**
     * @notice Emite la credencial SBT de certificación para `cuenta` (1 por wallet).
     *         Solo el `minter` (plataforma). URI = metadatos de la certificación.
     */
    function mint(address cuenta, string calldata uri) external returns (uint256 tokenId) {
        if (msg.sender != minter) revert SoloMinter();
        if (sbtDe[cuenta] != 0) revert YaTieneSbt(cuenta);
        tokenId = siguienteTokenId++;
        _mint(cuenta, tokenId);
        _uris[tokenId] = uri;
        sbtDe[cuenta] = tokenId;
        emit SbtMinteado(tokenId, cuenta, uri);
        emit Locked(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token inexistente");
        return _uris[tokenId];
    }

    // ------------------------------------------------------------------ ERC-5192
    function locked(uint256 tokenId) external view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Token inexistente");
        return true;
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }

    // ------------------------------------------------------------------ soulbound: sin transferencias ni aprobaciones
    // OZ v5: se bloquea desde los hooks internos (solo mint/burn mueven el token).
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound(tokenId);
        return super._update(to, tokenId, auth);
    }
}
