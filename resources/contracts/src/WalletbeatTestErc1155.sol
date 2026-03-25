// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {LibZip} from "@solady/utils/LibZip.sol";

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
    bytes[] private s_imageDataChunks;

    constructor(string memory name) ERC1155("") {
        s_name = name;
    }

    event ImageDataUpdated();
    event ImageDataAppended();

    function setImageData(bytes calldata data) external {
        delete s_imageDataChunks;
        s_imageDataChunks.push(data);
        emit ImageDataUpdated();
    }

    function appendImageData(bytes calldata chunk) external {
        s_imageDataChunks.push(chunk);
        emit ImageDataAppended();
    }

    function _getImageUri() private view returns (string memory) {
        bytes memory compressed;
        uint256 imageDataChunksLength = s_imageDataChunks.length;
        for (uint256 i = 0; i < imageDataChunksLength; i++) {
            compressed = bytes.concat(compressed, s_imageDataChunks[i]);
        }
        return string(abi.encodePacked("data:image/svg+xml;base64,", Base64.encode(LibZip.flzDecompress(compressed))));
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
     * @notice Enforces soulbound behavior by preventing token transfers
     * @dev Allows minting (from == address(0)) and burning (to == address(0)) but reverts
     * on any other transfer attempt.
     */
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);

        if (from == address(0) || to == address(0)) {
            return;
        }

        revert WalletbeatTestErc1155__Soulbound();
    }

    function _baseURI() internal pure returns (string memory) {
        return "data:application/json;base64,";
    }

    function uri(
        uint256 /*tokenId*/
    )
        public
        view
        virtual
        override
        returns (string memory)
    {
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
                            _getImageUri(),
                            '"}'
                        )
                    )
                )
            )
        );
    }
}
