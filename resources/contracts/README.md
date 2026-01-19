# Walletbeat Test Contracts

Smart contracts designed to test how Ethereum wallets process transactions. These contracts help evaluate wallet behavior in scenarios that are often handled inconsistently across different wallet implementations.

## Testing Scenarios

- **Batch Transactions**: How wallets handle multiple transactions in a single batch
- **Transaction Simulation with Volatile State**: How wallets simulate transactions that produce different results based on changing on-chain state (e.g., block number, timestamp)
- **Function Selector Interpretation**: How wallets interpret and display common function selectors like `transfer(address, uint256)` that may appear in both ERC-20 tokens and custom contracts

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed

## Installation

```shell
make install
```

This installs the required dependencies:

- OpenZeppelin Contracts v4.8.3
- Forge Standard Library

## Usage

### Build

```shell
forge build
```

### Test

```shell
forge test
```
