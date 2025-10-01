#!/bin/bash

set -euo pipefail
set +x

ETERNAL_SAFE_PORT="${ETERNAL_SAFE_PORT:-8088}"
HELIOS_PORT="${HELIOS_PORT:-8546}"
ETHEREUM_MAINNET_CONSENSUS_RPC_ENDPOINT="${ETHEREUM_MAINNET_CONSENSUS_RPC_ENDPOINT:-https://www.lightclientdata.org}"
ETHEREUM_MAINNET_EXECUTION_RPC_ENDPOINT="${ETHEREUM_MAINNET_EXECUTION_RPC_ENDPOINT:-https://eth-mainnet.g.alchemy.com/v2/demo}"
USE_TOR="${USE_TOR:-true}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! hash podman; then
	echo 'podman not installed.' >&2
	exit 1
fi
podman build -t localhost/eternalsafe:walletbeat -f "${SCRIPT_DIR}/eternalsafe.Containerfile" "$SCRIPT_DIR"
podman run \
	--name=eternalsafe-walletbeat \
	--replace \
	--publish="$ETERNAL_SAFE_PORT:3000" \
	--publish="$HELIOS_PORT:8010" \
	--volume="${SCRIPT_DIR}/../helios:/helios:ro" \
	-e ETHEREUM_MAINNET_CONSENSUS_RPC_ENDPOINT="$ETHEREUM_MAINNET_CONSENSUS_RPC_ENDPOINT" \
	-e ETHEREUM_MAINNET_EXECUTION_RPC_ENDPOINT="$ETHEREUM_MAINNET_EXECUTION_RPC_ENDPOINT" \
	-e EXTERNAL_HELIOS_PORT="$HELIOS_PORT" \
	-e EXTERNAL_ETERNAL_SAFE_PORT="$ETERNAL_SAFE_PORT" \
	-e USE_TOR="$USE_TOR" \
	localhost/eternalsafe:walletbeat
