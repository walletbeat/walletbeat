# Eternal Safe setup

This directory contains the necessary bits to run a local [Eternal Safe frontend](https://github.com/eternalsafe/wallet), with Helios as light client and Tor as proxy for all RPC connections.
All packages are locally downloaded and bundled in a container image running with `podman`.

## System diagram

```
┌──Local─computer──────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌──Web─browser─────────────────────────────────────────────────────┐        │
│  │                                                                  │        │
│  │                                                                  │        │
│  │   Eternal Safe frontend                                          │        │
│  │                                                                  │        │
│  │                                                                  │        │
│  └───────────────────────┬──────────────────────────────────┬───────┘        │
│                          │                                  │                │
│                     HTTP │                    Ethereum RPCs │                │
│                          │                                  │                │
│                          │                                  │                │
│  ┌──Podman─container─────┼──────────────────────────────────┼───────┐        │
│  │                       │                                  │       │        │
│  │  ┌──Yarn──────────────▼──────┐    ┌──Helios─CORS─proxy───▼────┐  │        │
│  │  │                           │    │                           │  │        │
│  │  │  Eternal Safe web server  │    │ Allow local CORS requests │  │        │
│  │  │                           │    │                           │  │        │
│  │  └───────────────────────────┘    └─────────────┬─────────────┘  │        │
│  │                                                 │                │        │
│  │  ┌──Tor─────────┐                               │                │        │
│  │  │              │ Consensus RPCs  ┌──Helios─────▼─────────────┐  │        │
│  │  │  Anonymizing ◄─────────────────┤                           │  │        │
│  │  │              │                 │  Chain verification       │  │        │
│  │  │  TCP proxy   ◄─────────────────┤                           │  │        │
│  │  │              │ Execution RPCs  └───────────────────────────┘  │        │
│  │  └───┬──────┬───┘                                                │        │
│  │      │      │                                                    │        │
│  └──────┼──────┼────────────────────────────────────────────────────┘        │
│         │      │                                                             │
└─────────┼──────┼─────────────────────────────────────────────────────────────┘
          │      │
Consensus │      │ Execution
     RPCs │      │ RPCs
          │      │
   ┌──────▼──────▼──────┐
   │                    │
   │  Outside Internet  │
   │                    │
   └────────────────────┘
```

## How to run

Run the `run-multisig-ui.sh` script in this directory. All other files are used as part of the container image.

You can set the following environment variables prior to running the script:

- `ETHEREUM_MAINNET_CONSENSUS_RPC_ENDPOINT`: RPC endpoint for consensus data (default: `https://www.lightclientdata.org`).
- `ETHEREUM_MAINNET_EXECUTION_RPC_ENDPOINT`: RPC endpoint for execution data (default: `https://eth-mainnet.g.alchemy.com/v2/demo`).
- `USE_TOR`: Whether to use Tor for the above two endpoints (default: `true`).
- `ETERNAL_SAFE_PORT`: Port number on which the Eternal Safe frontend will be available on your computer (default: `8088`).
- `HELIOS_PORT`: Port number on which the Helios RPC endpoint will be available on your computer (default: `8546`).

The script will build a local container image with `podman` (which must be installed) under the image name `localhost/eternalsafe:walletbeat`, then run it.

At the end of the script, you should see something like:

```
Eternal Safe is up!
Access it at the following URL, preconfigured to use Helios:

  http://127.0.0.1:8088/welcome?chainId=1&chain=Ethereum&shortName=eth&rpc=http%3A%2F%2F127.0.0.1%3A8546&currency=ETH&symbol=ETH&expAddr=https%3A%2F%2Feth.blockscout.com%2Faddress%2F%7B%7Baddress%7D%7D&expTx=https%3A%2F%2Feth.blockscout.com%2Ftx%2F%7B%7Bhash%7D%7D&l2=false&testnet=false

If you have Chromium installed, here is a command-line that will prevent it from accessing anything other than this interface:

  $ chromium --user-data-dir=$(mktemp -d) --proxy-server=127.0.0.1:1 --proxy-bypass-list=127.0.0.1:8088 'http://127.0.0.1:8088/welcome?chainId=1&chain=Ethereum&shortName=eth&rpc=http%3A%2F%2F127.0.0.1%3A8546&currency=ETH&symbol=ETH&expAddr=https%3A%2F%2Feth.blockscout.com%2Faddress%2F%7B%7Baddress%7D%7D&expTx=https%3A%2F%2Feth.blockscout.com%2Ftx%2F%7B%7Bhash%7D%7D&l2=false&testnet=false'
```
