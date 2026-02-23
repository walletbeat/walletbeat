// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title WalletbeatTestErc20
 * @author Walletbeat
 * @notice A test ERC20 token used to evaluate how wallets simulate and display token transactions
 * @dev This token is soulbound and can be minted or burned by anyone. This is intentional
 * to test how wallets handle permissionless token manipulation.
 */
contract WalletbeatTestErc20 is ERC20 {
    error WalletbeatTestErc20__Soulbound();

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    /**
     * @notice Mints a variable amount of tokens to the specified user
     * @dev The amount minted is determined by `(1 + (block.number % 100)) * 1e18` to introduce
     * unpredictability in transaction simulations. Amounts are scaled to 18 decimals.
     * Anyone can mint to any address. This is intentional to allow unrestricted testing.
     * @param user The address to receive the minted tokens
     */
    function mint(address user) external {
        uint256 tokensToMint = (1 + (block.number % 100)) * 1e18;
        super._mint(user, tokensToMint);
    }

    /**
     * @notice Replicates a malicious claim function with unpredictable behavior
     * @dev Mints tokens if block.number is even, burns the user's entire balance if odd.
     * This simulates unpredictable drain behavior that wallets should detect.
     * Anyone can call this on behalf of any address. This is intentional to simulate
     * malicious contracts that manipulate other users' balances.
     * @param user The address to receive minted tokens or have their balance burned
     */
    function claim(address user) external {
        if (block.number % 2 == 0) {
            uint256 tokensToMint = (1 + (block.number % 100)) * 1e18;
            super._mint(user, tokensToMint);
        } else {
            uint256 userBalance = balanceOf(user);
            _burn(user, userBalance);
        }
    }

    /**
     * @notice Burns all tokens held by the specified user
     * @dev This function drains the user's entire token balance.
     * Anyone can burn any address' tokens. This is intentional to simulate
     * malicious drain behavior that wallets should detect and warn about.
     * @param user The address whose tokens will be burned
     */
    function burn(address user) external {
        uint256 userBalance = balanceOf(user);
        _burn(user, userBalance);
    }

    /**
     * @notice Enforces soulbound behavior by preventing token transfers
     * @dev Allows minting (from == address(0)) and burning (to == address(0)) but reverts
     * on any other transfer attempt.
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);

        if (from == address(0) || to == address(0)) {
            return;
        }

        revert WalletbeatTestErc20__Soulbound();
    }
}
