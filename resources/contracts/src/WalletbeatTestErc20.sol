// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

contract WalletbeatTestErc20 is ERC20, Ownable {
    error WalletbeatTestErc20__Soulbound();

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address user) external onlyOwner {
        uint256 tokensToMint = 1 + (block.number % 100);
        super._mint(user, tokensToMint);
    }

    function claim(address user) external onlyOwner {
        uint256 userBalance = balanceOf(user);
        if (block.number % 2 == 0) {
            _burn(user, userBalance);
        } else {
            _burn(user, 1);
        }
    }

    function burn(address user) external onlyOwner {
        uint256 userBalance = balanceOf(user);
        _burn(user, userBalance);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);

        if (from == address(0) || to == address(0)) {
            return;
        }

        revert WalletbeatTestErc20__Soulbound();
    }
}
