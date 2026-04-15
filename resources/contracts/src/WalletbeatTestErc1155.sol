// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {LibZip} from "solady/utils/LibZip.sol";

/**
 * @title WalletbeatTestErc1155
 * @author Walletbeat
 * @notice A test ERC1155 token used to evaluate how wallets simulate and display NFT transactions
 * @dev This token is soulbound and can only be minted or burned. Transfers between non-zero addresses revert.
 */
contract WalletbeatTestErc1155 is ERC1155 {
    error WalletbeatTestErc1155__Soulbound();

    uint256 private s_tokenId;
    string private s_name;
    bytes private s_compressedImage;

    constructor(string memory name, bytes memory compressedImage) ERC1155("") {
        s_name = name;
        s_compressedImage = compressedImage;
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
            super._mint(receiver, s_tokenId, 1, "");
        }
    }

    /**
     * @notice Mints a single NFT to the msg.sender
     * @dev Unlike `mint(address receiver)`, this function intentionally mints exactly one token
     * to msg.sender, producing a deterministic outcome. This makes it suitable for testing
     * wallet simulation accuracy without the non-determinism introduced by block.number in `mint`.
     */
    function mintOne() external {
        s_tokenId++;
        super._mint(msg.sender, s_tokenId, 1, "");
    }

    /**
     * @notice Returns the metadata URI for a given token ID
     * @dev All token IDs share identical metadata. The URI is a base64-encoded JSON data URI
     * constructed inline from the contract name and the stored image. The `tokenId` parameter
     * is ignored because every token in this test collection is equivalent.
     * @return A `data:application/json;base64,` URI containing the token's JSON metadata
     */
    function uri(
        uint256 /*tokenId*/
    )
        public
        view
        virtual
        override
        returns (string memory)
    {
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
                            s_name,
                            '", "description":"A test ERC1155 token used solely for testing.", ',
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
     * @notice Returns the base data URI prefix used when constructing token metadata URIs
     * @dev Overrides the default empty string so that `uri()` produces a self-contained
     * `data:application/json;base64,` URI with no external dependencies.
     * @return The string `"data:application/json;base64,"`
     */
    function _baseURI() internal pure returns (string memory) {
        return "data:application/json;base64,";
    }
}
