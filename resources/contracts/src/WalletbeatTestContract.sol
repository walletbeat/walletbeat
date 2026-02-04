// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title WalletbeatTestContract
 * @author Walletbeat
 * @notice A test contract used to evaluate how wallets simulate and display transactions
 * @dev This contract mints ERC20 and ERC721 tokens via external calls to test wallet transaction simulation
 */
contract WalletbeatTestContract {
    event Transfer(address indexed from, address indexed to, uint256 value);

    error WalletbeatTestContract__ERC20CallFailed();
    error WalletbeatTestContract__ERC721CallFailed();

    uint256 public constant FAKE_TOKENS_TO_CLAIM = 1e18;
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
    function simulateFunctionV1() external {
        (bool success,) = i_erc20Token.call(abi.encodeWithSignature("mint(address)", msg.sender));
        if (!success) {
            revert WalletbeatTestContract__ERC20CallFailed();
        }
        (success,) = i_erc721Token.call(abi.encodeWithSignature("mint(address)", msg.sender));
        if (!success) {
            revert WalletbeatTestContract__ERC721CallFailed();
        }
    }

    /**
     * @notice Simulates a malicious claim with unpredictable behavior
     * @dev Calls `claim(address)` on the ERC20 token, which mints tokens if block.number
     * is even, or burns the user's entire balance if odd.
     */
    function simulateFunctionV2() external {
        (bool success,) = i_erc20Token.call(abi.encodeWithSignature("claim(address)", msg.sender));
        if (!success) {
            revert WalletbeatTestContract__ERC20CallFailed();
        }
    }

    /**
     * @notice Identical to simulateFunction but uses the common transfer(address,uint256) selector
     * @dev This function has the same implementation as simulateFunction but uses a well-known
     * function signature to test how wallets handle and simulate transactions when presented
     * with a familiar selector like `transfer`. This helps evaluate whether wallets correctly
     * simulate the actual behavior or make assumptions based on the function name/selector.
     * * A `Transfer` event is also emitted to mislead transaction simulations.
     */
    function transfer(address to, uint256 amount) external {
        (bool success,) = i_erc20Token.call(abi.encodeWithSignature("mint(address", msg.sender));
        if (!success) {
            revert WalletbeatTestContract__ERC20CallFailed();
        }
        (success,) = i_erc721Token.call(abi.encodeWithSignature("mint(address)", msg.sender));
        if (!success) {
            revert WalletbeatTestContract__ERC721CallFailed();
        }
        emit Transfer(msg.sender, to, amount);
    }

    /**
     * @notice Replicates malicious airdrop claims that drain a user's assets.
     * @dev This function simulates a malicious call to `burn(address)` on the ERC20 token,
     * which burns all tokens held by the user.
     * A `Transfer` event is also emitted to mislead transaction simulations.
     */
    function claim() external {
        (bool success,) = i_erc20Token.call(abi.encodeWithSignature("burn(address)", msg.sender));
        if (!success) {
            revert WalletbeatTestContract__ERC20CallFailed();
        }
        emit Transfer(address(0), msg.sender, FAKE_TOKENS_TO_CLAIM);
    }
}
