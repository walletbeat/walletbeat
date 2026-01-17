// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title WalletbeatTestContract
 * @author Walletbeat
 * @notice A test contract used to evaluate how wallets simulate and display transactions
 * @dev This contract mints ERC20 and ERC721 tokens via external calls to test wallet transaction simulation
 */
contract WalletbeatTestContract {
    error WalletbeatTestContract__ERC20CallFailed();
    error WalletbeatTestContract__ERC721CallFailed();
    address private immutable i_erc20Token;
    address private immutable i_erc721Token;

    constructor(address erc20, address erc721) {
        i_erc20Token = erc20;
        i_erc721Token = erc721;
    }

    /**
     * @notice Mints ERC20 and ERC721 tokens to the caller
     * @dev Calls mint() on both the ERC20 and ERC721 token contracts
     */
    function simulateFunction() external {
        (bool success,) = i_erc20Token.call(abi.encodeWithSignature("mint()"));
        if (!success) {
            revert WalletbeatTestContract__ERC20CallFailed();
        }
        (success,) = i_erc721Token.call(abi.encodeWithSignature("mint()"));
        if (!success) {
            revert WalletbeatTestContract__ERC721CallFailed();
        }
    }

    /**
     * @notice Identical to simulateFunction but uses the common transfer(address,uint256) selector
     * @dev This function has the same implementation as simulateFunction but uses a well-known
     * function signature to test how wallets handle and simulate transactions when presented
     * with a familiar selector like `transfer`. This helps evaluate whether wallets correctly
     * simulate the actual behavior or make assumptions based on the function name/selector.
     */
    function transfer(address, uint256) external {
        (bool success,) = i_erc20Token.call(abi.encodeWithSignature("mint()"));
        if (!success) {
            revert WalletbeatTestContract__ERC20CallFailed();
        }
        (success,) = i_erc721Token.call(abi.encodeWithSignature("mint()"));
        if (!success) {
            revert WalletbeatTestContract__ERC721CallFailed();
        }
    }

    function burnTokens() external {
        (bool success,) = i_erc20Token.call(abi.encodeWithSignature("burn()"));
        if (!success) {
            revert WalletbeatTestContract__ERC20CallFailed();
        }
    }
}
