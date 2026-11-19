---
title: 'Walletbeat wallet testing: Chain verification'
description: "A guide explaining how to verify a wallet's behavior when it comes to chain verification."
---

# Testing Chain Verification

_This guide describes how to set up the L1 Lying RPC Proxy and use it to evaluate whether a wallet verifies the integrity of chain data using a light client._

## Why?

This analysis is necessary to ensure that the wallet meets the **Chain Verification** attribute in Walletbeat: does the wallet independently verify that the data returned by its RPC provider is consistent with the actual chain?

Most wallets blindly trust whatever their configured RPC provider returns. This matters because a dishonest RPC provider is a real attack vector — not just a theoretical one. A well-known scam works as follows: a scammer gives out the seed phrase to a wallet that holds funds locked in Tether, and asks a victim to "help move the crypto out" in exchange for a cut. The victim imports the seed phrase, sees a large token balance in their wallet, and believes the story — not realizing the funds are frozen. With a lying RPC provider, this scam works even without any real locked funds at all: the provider simply reports a large fake balance for any address the scammer chooses. A wallet that integrates a light client can detect this by verifying balance data against the actual chain state, making this class of scam impossible.

More generally, a dishonest or compromised RPC provider could:

- Report a fake ERC-20 token balance, tricking you into believing you own funds you do not.
- Lie about transaction receipts or contract state to manipulate your decisions.
- Hide pending or confirmed transactions from you.

A wallet that integrates a light client (e.g. [Helios](https://github.com/a16z/helios)) can detect such lies by independently verifying block headers against a trusted beacon checkpoint and rechecking `eth_call` results against Merkle proofs. The goal of this test: determining whether the wallet under test does any such verification, or whether it can be trivially deceived.

## High-level guide

To test wallets on this, we will:

- Run the **L1 Lying RPC Proxy**, a local HTTP server that forwards all Ethereum JSON-RPC calls to a real upstream provider but silently inflates the result of every `eth_call` whose selector matches `balanceOf(address)` (ERC-20 balance lookups).
- Point the wallet at this proxy as its custom RPC endpoint.
- Observe whether the wallet displays the inflated balance without complaint, warns the user, or refuses to display the balance at all.

> **Note:** Some wallets (e.g. Rabby) do **not** use `eth_call` / `balanceOf` for ERC-20 balance lookups; they rely on proprietary indexer APIs instead. If the wallet you are testing falls into this category, either select a different wallet or adjust the proxy to lie about a different RPC method that the wallet does exercise (e.g. `eth_getBalance` for native ETH). Record this in the wallet's feature data accordingly.

## Step-by-step

### Step 0: Prerequisites

- The repo's dependencies installed (use `pnpm i`)
- A wallet with a funded test address (some Ether and at least one ERC-20 token such as USDC)
- An Ethereum Mainnet JSON-RPC URL. Any public endpoint works, as does one from your own RPC provider account.

### Step 1: Start the L1 Lying RPC Proxy

```bash
export UPSTREAM_RPC='<your_ethereum_rpc_url>'
pnpm l1-lying-rpc-proxy
```

You should see:

```
[l1-lying-rpc-proxy] Listening on http://localhost:8545
[l1-lying-rpc-proxy] Upstream: <origin_of_your_rpc_url>
[l1-lying-rpc-proxy] ERC-20 balance multiplier: ×1000000
```

The proxy shows only the origin of the upstream URL, so that API keys in the URL path do not appear in screenshots of the terminal.

Leave this running in a dedicated terminal for the duration of the test. The proxy prints one line for each JSON-RPC call it receives, each balance it inflates, and each error:

```
[l1-lying-rpc-proxy] Request: eth_blockNumber
[l1-lying-rpc-proxy] Request: eth_call
[l1-lying-rpc-proxy] LYING: balanceOf on 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 changed 1000 to 1000000000
[l1-lying-rpc-proxy] Upstream responded with HTTP 525
```

> **Note:** If the upstream responds with an HTTP error or is unreachable, choose a different RPC URL.

**Flags:**

| Flag           | Environment variable | Default      | Description                                  |
| -------------- | -------------------- | ------------ | -------------------------------------------- |
| `--upstream`   | `UPSTREAM_RPC`       | _(required)_ | Real upstream Ethereum JSON-RPC URL          |
| `--port`       | `PROXY_PORT`         | `8545`       | Local port to listen on                      |
| `--multiplier` |                      | `1000000`    | Factor by which ERC-20 balances are inflated |

### Step 2: Verify the proxy is lying (sanity check)

Pick any Ethereum address that holds a known ERC-20 token. The example below uses the USDC contract (`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`) and Vitalik's public address.

**Query the real upstream directly:**

```bash
curl -s -X POST "$UPSTREAM_RPC" \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "eth_call",
    "params": [
      {
        "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "data": "0x70a082310000000000000000000000000d8775f648430679a709e98d2b0cb6250d2887ef"
      },
      "latest"
    ]
  }' | python3 -m json.tool
```

**Query the proxy:**

```bash
curl -s -X POST http://localhost:8545 \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "eth_call",
    "params": [
      {
        "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "data": "0x70a082310000000000000000000000000d8775f648430679a709e98d2b0cb6250d2887ef"
      },
      "latest"
    ]
  }' | python3 -m json.tool
```

The two responses should differ. The proxy log also prints the original and inflated balances:

```
[l1-lying-rpc-proxy] Request: eth_call
[l1-lying-rpc-proxy] LYING: balanceOf on 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 changed <real_balance> to <inflated_balance>
```

### Step 3: Create a dedicated browser or device for wallet testing

Follow the same process as described in the [L1 Provider Independence guide](/resources/docs/wallet-testing/l1-provider-independence/l1-provider-independence.md#step-2-create-a-dedicated-browser-or-device-for-wallet-testing). Using a clean, dedicated browser profile or emulated Android device eliminates noise and ensures the wallet is not using cached balance data from a previous session.

### Step 4: Install the wallet and configure it to use the proxy

Install the wallet as normal. Navigate to the wallet's **Settings → Networks** (exact path varies by wallet) and set the Ethereum Mainnet RPC URL to:

```
http://localhost:8545
```

Save the setting and switch to that network. The proxy terminal then shows `Request:` lines for the calls that the wallet makes. If no lines appear, the wallet does not use the proxy.

### Step 5: Import a funded account

Import (or connect) an account that holds a nonzero ERC-20 balance. It is important to use a nonzero balance. A zero balance multiplied by any factor is still displayed as zero (the proxy invents a small nonzero value in this case, but it may fall below the wallet's display threshold).

Use a separate wallet or browser that is **not** pointing at the proxy to confirm the real balance beforehand.

### Step 6: Observe what the wallet displays

Navigate to the token balance screen for the ERC-20 token. Compare what the wallet shows against the real balance you noted in Step 5. Record the observed behavior in `WalletBaseFeatures.security.lightClient` using the appropriate enum value.

### Step 7: Attempt an ERC-20 token send

Try to send a small amount of the ERC-20 token to a different address you own. Observe whether the wallet uses the inflated proxy balance to calculate available funds, and whether it shows any indication that it is suspicious of the balance. Record the observed behavior in the same field as the previous step.

## Video demonstrations

### Video 1 — Wallet tricked by lying proxy (fake USDC balance)

https://www.loom.com/share/cb1f9af969424f9b8d45c238cff463d1

### Video 2 — Helios light client detecting the lie (warning banner)

https://www.loom.com/share/f461dca60e32429db81b19fc2dc28897

## Helios integration PR

Proof-of-concept Helios light client integration for Enkrypt wallet:
https://github.com/enkryptcom/enKrypt/pull/792
