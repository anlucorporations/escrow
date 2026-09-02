// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @notice ERC721 de prueba para los tests del escrow (representa NFTs ofrecidos en trueque).
 */
contract TrueKeateNFT is ERC721 {
    uint256 private _siguienteTokenId;

    constructor(string memory nombre, string memory simbolo) ERC721(nombre, simbolo) {}

    function mint(address cuenta) external returns (uint256 tokenId) {
        tokenId = ++_siguienteTokenId;
        _mint(cuenta, tokenId);
    }
}
