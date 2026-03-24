// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title WalletbeatTestErc721
 * @author Walletbeat
 * @notice A test ERC721 token used to evaluate how wallets simulate and display NFT transactions
 * @dev This token is soulbound and can only be minted or burned. Transfers between non-zero addresses revert.
 */
contract WalletbeatTestErc721 is ERC721 {
    error WalletbeatTestErc721__Soulbound();
    error WalletbeatTestErc721__URI_QueryFor_NonExistentToken();

    uint256 private s_tokenId;
    string[] private s_imageUriChunks;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    function setImageUri(string memory tokenSvgUri) external {
        delete s_imageUriChunks;
        s_imageUriChunks.push(tokenSvgUri);
    }

    function appendImageUri(string memory chunk) external {
        s_imageUriChunks.push(chunk);
    }

    function _getImageUri() private view returns (string memory) {
        bytes memory result;
        for (uint256 i = 0; i < s_imageUriChunks.length; i++) {
            result = bytes.concat(result, bytes(s_imageUriChunks[i]));
        }
        return string(result);
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

    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        if (ownerOf(tokenId) == address(0)) {
            revert WalletbeatTestErc721__URI_QueryFor_NonExistentToken();
        }

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
}
