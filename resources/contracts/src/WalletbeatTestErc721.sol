// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {LibZip} from "solady/utils/LibZip.sol";

/**
 * @title WalletbeatTestErc721
 * @author Walletbeat
 * @notice A test ERC721 token used to evaluate how wallets simulate and display NFT transactions
 * @dev This token is soulbound and can only be minted or burned. Transfers between non-zero addresses revert.
 */
contract WalletbeatTestErc721 is ERC721 {
    error WalletbeatTestErc721__Soulbound();

    uint256 private s_tokenId;
    bytes private s_compressedImage;

    constructor(string memory name, string memory symbol, bytes memory compressedImage) ERC721(name, symbol) {
        s_compressedImage = compressedImage;
    }

    /**
     * @notice Returns the metadata URI for a given token ID
     *
     * @dev The URI is a base64-encoded JSON data URI constructed inline from the contract name
     * and the stored image. Reverts if `tokenId` does not exist.
     *
     * @param tokenId The token whose metadata URI to retrieve
     * @return A URI containing the token's JSON metadata
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireMinted(tokenId);

        string memory imageUri = string(
            abi.encodePacked("data:image/svg+xml;base64,", Base64.encode(LibZip.flzDecompress(s_compressedImage)))
        );

        return string(
            abi.encodePacked(
                _baseURI(),
                Base64.encode(
                    bytes(
                        abi.encodePacked(
                            '{"name":"',
                            name(),
                            '", "description":"A test ERC721 token used solely for testing.", ',
                            '"attributes": [{"trait_type": "purpose", "value": "testing"}], "image":"',
                            imageUri,
                            '"}'
                        )
                    )
                )
            )
        );
    }

    /**
     * @notice Mints a variable number of NFTs to the specified receiver
     * @dev The amount minted is determined by `1 + (block.number % 4)` to introduce
     * unpredictability in transaction simulations.
     * Anyone can mint to any address.
     * @param receiver The address to receive the minted NFTs
     */
    function mint(address receiver) external {
        uint256 tokensToMint = 1 + (block.number % 4);
        for (uint256 i = 0; i < tokensToMint; i++) {
            s_tokenId++;
            super._mint(receiver, s_tokenId);
        }
    }

    /**
     * @notice Mints a single NFT to the msg.sender
     * @dev Unlike `mint(address receiver)`, this function intentionally mints exactly one token
     * to msg.sender.
     * Suitable for testing ERC721 transfers
     */
    function mintOne() external {
        s_tokenId++;
        super._mint(msg.sender, s_tokenId);
    }

    /**
     * @notice Returns the base data URI prefix used when constructing token metadata URIs
     * @dev Overrides the ERC721 default empty string so that `tokenURI()` produces a
     * self-contained `data:application/json;base64,` URI with no external dependencies.
     * @return The string `"data:application/json;base64,"`
     */
    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }
}
