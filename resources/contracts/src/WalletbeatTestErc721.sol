// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "../lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

contract WalletbeatTestErc721 is ERC721, Ownable {
    error WalletbeatTestErc20__Soulbound();

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    function mint(address receiver) external onlyOwner {
        uint256 tokensToMint = block.number % 4;
        if (tokensToMint == 0) {
            tokensToMint = 1;
        }
        super._mint(receiver, tokensToMint);
    }

    function _beforeTokenTransfer(address from, address to, uint256 firstTokenId, uint256 batchSize)
        internal
        virtual
        override
    {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);

        if (from == address(0) || to == address(0)) {
            return;
        }

        revert WalletbeatTestErc20__Soulbound();
    }
}
