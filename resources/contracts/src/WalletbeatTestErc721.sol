// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {LibZip} from "@solady/utils/LibZip.sol";

/**
 * @title WalletbeatTestErc721
 * @author Walletbeat
 * @notice A test ERC721 token used to evaluate how wallets simulate and display NFT transactions
 * @dev This token is soulbound and can only be minted or burned. Transfers between non-zero addresses revert.
 */
contract WalletbeatTestErc721 is ERC721 {
    error WalletbeatTestErc721__Soulbound();

    event ImageDataUpdated();
    event ImageDataAppended();

    uint256 private s_tokenId;
    bytes[] private s_imageDataChunks;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    /**
     * @notice Replaces the stored image data with new compressed SVG data
     * @dev Clears all existing chunks and stores `data` as the sole chunk. Emits {ImageDataUpdated}.
     * @param data FLZ-compressed SVG bytes to store as the token image
     */
    function setImageData(bytes calldata data) external {
        delete s_imageDataChunks;
        s_imageDataChunks.push(data);
        emit ImageDataUpdated();
    }

    /**
     * @notice Appends an additional chunk of compressed image data
     * @dev Allows the full image to be uploaded across multiple transactions when it exceeds
     * the calldata size of a single transaction. Emits {ImageDataAppended}.
     * @param chunk The next FLZ-compressed SVG byte chunk to append
     */
    function appendImageData(bytes calldata chunk) external {
        s_imageDataChunks.push(chunk);
        emit ImageDataAppended();
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
                            _getImageUri(),
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
     * @notice Enforces soulbound behavior by preventing token transfers
     * @dev Allows minting (from == address(0)) and burning (to == address(0)) but reverts
     * on any other transfer attempt.
     */
    function _beforeTokenTransfer(address from, address to, uint256 firstTokenId, uint256 batchSize)
        internal
        virtual
        override
    {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);

        if (from == address(0) || to == address(0)) {
            return;
        }

        revert WalletbeatTestErc721__Soulbound();
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

    /**
     * @notice Assembles, decompresses, and base64-encodes the stored SVG image data
     * @dev Concatenates all stored chunks, runs FLZ decompression via {LibZip.flzDecompress},
     * then base64-encodes the result and prepends the SVG data URI scheme.
     * @return A `data:image/svg+xml;base64,` URI ready to embed in JSON metadata
     */
    function _getImageUri() private view returns (string memory) {
        bytes memory compressed;
        uint256 imageDataChunksLength = s_imageDataChunks.length;
        for (uint256 i = 0; i < imageDataChunksLength; i++) {
            compressed = bytes.concat(compressed, s_imageDataChunks[i]);
        }
        return string(abi.encodePacked("data:image/svg+xml;base64,", Base64.encode(LibZip.flzDecompress(compressed))));
    }
}
