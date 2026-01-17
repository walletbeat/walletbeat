// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {ERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

contract WalletbeatTestErc20 is ERC20, Ownable {
    error WalletbeatTestErc20__Soulbound();
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint() external onlyOwner {
        uint256 tokensToMint = block.number % 100;
        if (tokensToMint == 0) {
            tokensToMint = 1;
        }
        super._mint(msg.sender, tokensToMint);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);

        if (from == address(0) || to == address(0)) {
            return;
        }

        revert WalletbeatTestErc20__Soulbound();
    }
}
