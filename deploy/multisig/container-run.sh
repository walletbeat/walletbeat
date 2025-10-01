#!/bin/bash

set -euo pipefail
set +x

export USE_TOR="${USE_TOR:-true}"

mkdir /tmp/pids

if [[ ! -x /helios/helios-wrap.sh ]]; then
	echo 'Helios volume not mounted at /helios.' >&2
	exit 1
fi
cp -ar /helios /tmp/helios

CLEANUP=false
cleanup() {
	if [[ "$CLEANUP" == true ]]; then
	  return
	fi
	CLEANUP=true
	trap - EXIT
	for titled_pid in \
	  'Eternal Safe frontend:/tmp/pids/external-safe.pid' \
	  'consensus Tor proxy:/tmp/pids/consensus.pid' \
	  'execution Tor proxy:/tmp/pids/execution.pid' \
		'Helios CORS proxy:/tmp/pids/helios-cors.pid' \
	  'Tor:/tmp/pids/tor.pid' \
		'Helios wrapper:/tmp/pids/helios-wrapper.pid'; do
		title="$(echo "$titled_pid" | cut -d: -f1)"
		pid_file="$(echo "$titled_pid" | cut -d: -f2)"
		if [[ ! -f "$pid_file" ]]; then
			continue
		fi
		kill_pid="$(cat "$pid_file")"
		rm -f "$pid_file"
		if kill -0 "$kill_pid" 2>/dev/null; then
			echo "Terminating: ${title}..." >&2
			kill -TERM "$kill_pid"
			wait "$kill_pid" &>/dev/null || true
		fi
	done
}
trap cleanup SIGINT
trap cleanup SIGTERM
trap cleanup EXIT

if [[ "$USE_TOR" == true ]]; then
	tor --torrc-file /torrc &

	while [[ "$CLEANUP" == false ]] && [[ ! -f /tmp/pids/tor.pid ]]; do
		echo "[$(date +'%H:%M:%S')] Waiting for Tor to come up..." >&2
		sleep .2
	done

	while [[ "$CLEANUP" == false ]] && ! http_proxy=http://127.0.0.1:9980 https_proxy=http://127.0.0.1:9980 wget --tries=1 --timeout=10 -q -O /dev/null --post-data='{"method": "eth_chainId","params":[],"id":1,"jsonrpc":"2.0"}' "$ETHEREUM_MAINNET_EXECUTION_RPC_ENDPOINT"; do
		echo "[$(date +'%H:%M:%S')] Waiting for Tor circuit to be established..." >&2
		sleep 1
	done
	echo 'Tor is up and so are the consensus and execution RPC endpoints. Starting Helios.' >&2

	export HTTP_PROXY='http://127.0.0.1:9980'
	export HTTPS_PROXY='http://127.0.0.1:9980'
	export HELIOS_STARTUP_PROBE_SECONDS=120
fi
/tmp/helios/helios-wrap.sh /container-run-wrapped.sh &
HELIOS_WRAPPER_PID="$!"
echo "$HELIOS_WRAPPER_PID" > /tmp/pids/helios-wrapper.pid
wait "$HELIOS_WRAPPER_PID"
sleep .1
cleanup || true
