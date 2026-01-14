#!/bin/bash

# Wrap a command with a Helios-verified RPC endpoint.

set -euo pipefail
set +x

if [[ -n "${DEBUG:-}" ]]; then
	set -x
fi

if [[ -z "${1:-}" ]]; then
	echo "Usage: $0 <command> [command args...]" >&2
	echo 'Helios will be started and its endpoint will be populated' >&2
	echo 'under the HELIOS_RPC_ENDPOINT environment variable.' >&2
	echo 'Arguments containing a literal "$HELIOS_RPC_ENDPOINT" will also' >&2
	echo 'be replaced with the actual Helios RPC endpoint value.' >&2
	exit 2
fi
ETHEREUM_MAINNET_CONSENSUS_RPC_ENDPOINT="${ETHEREUM_MAINNET_CONSENSUS_RPC_ENDPOINT:-https://ethereum.operationsolarstorm.org}"
ETHEREUM_MAINNET_EXECUTION_RPC_ENDPOINT="${ETHEREUM_MAINNET_EXECUTION_RPC_ENDPOINT:-https://eth-mainnet.g.alchemy.com/v2/demo}"
HELIOS_STARTUP_PROBE_SECONDS="${HELIOS_STARTUP_PROBE_SECONDS:-10}"
if ! hash wget; then
	echo 'wget not installed.' >&2
	exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELIOS_IP='127.0.0.1'
HELIOS_PORT='8546'
HELIOS_URL="http://${HELIOS_IP}:${HELIOS_PORT}"
COMMAND=()
for arg; do
	COMMAND+=("$(echo "$arg" | sed "s,\\\$HELIOS_RPC_ENDPOINT,${HELIOS_URL},g")")
done
echo '[Helios] Starting Helios...' >&2
"${SCRIPT_DIR}/helios.sh" ethereum \
	--network=mainnet \
	--rpc-bind-ip="$HELIOS_IP" \
	--rpc-port="$HELIOS_PORT" \
	--consensus-rpc="$ETHEREUM_MAINNET_CONSENSUS_RPC_ENDPOINT" \
	--execution-rpc="$ETHEREUM_MAINNET_EXECUTION_RPC_ENDPOINT" \
	--strict-checkpoint-age \
	--data-dir="${SCRIPT_DIR}/data" &
HELIOS_PID="$!"

probe() {
	if [[ ! -e "/proc/${HELIOS_PID}" ]]; then
	  echo '[Helios] Helios is dead.' >&2
		exit 1
	fi
	wget -qO- --header "Content-Type: application/json" --post-data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' "$HELIOS_URL" | grep -qF 'result'
}

maybe_kill() {
	if [[ -e "/proc/${HELIOS_PID}" ]]; then
	  kill "${1:--TERM}" "${HELIOS_PID}"
		wait "${HELIOS_PID}"
	fi
}

sleep 10
for i in $(seq 1 "$HELIOS_STARTUP_PROBE_SECONDS"); do
	if probe; then
	  break
	fi
	sleep 1
done
if ! probe; then
	echo '[Helios] Helios failed to start.' >&2
	maybe_kill -TERM
	exit 1
fi
echo "[Helios] Helios synced and responsive on ${HELIOS_URL}, running command:" >&2
echo "[Helios]   $ HELIOS_RPC_ENDPOINT=${HELIOS_URL}" "${COMMAND[@]}" >&2
echo '' >&2

set +e
ETHEREUM_MAINNET_RPC_ENDPOINT='' HELIOS_RPC_ENDPOINT="$HELIOS_URL" "${COMMAND[@]}"
EXIT_CODE="$?"
set -e

echo '' >&2
if ! probe; then
	echo '[Helios] Helios died while the command was running.' >&2
	maybe_kill -KILL
	exit 1
fi
echo "[Helios] Command exited with code $EXIT_CODE; terminating Helios."
maybe_kill -TERM || true
maybe_kill -KILL || true
exit "$EXIT_CODE"
