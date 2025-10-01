#!/bin/bash

set -euo pipefail
set +x

echo 'Starting Helios CORS proxy...' >&2
HTTP_PROXY='' HTTPS_PROXY='' lcp \
	--proxyUrl="$HELIOS_RPC_ENDPOINT" \
	--proxyPartial='/' \
	--port=8010 \
	--origin='*' &
echo "$!" > /tmp/pids/helios-cors.pid

URL_PARAMS=(
	chainId='1'
	chain='Ethereum'
	shortName='eth'
	rpc="$(echo "http://127.0.0.1:${EXTERNAL_HELIOS_PORT}" | jq -Rr @uri)"
	currency='ETH'
	symbol='ETH'
	expAddr="$(echo -n 'https://eth.blockscout.com/address/{{address}}' | jq -Rr @uri)"
	expTx="$(echo -n 'https://eth.blockscout.com/tx/{{hash}}' | jq -Rr @uri)"
	l2='false'
	testnet='false'
)
QUERY_STRING=''
for url_param in "${URL_PARAMS[@]}"; do
	if [[ -n "$QUERY_STRING" ]]; then
		QUERY_STRING="${QUERY_STRING}&"
	fi
	QUERY_STRING="${QUERY_STRING}${url_param}"
done

echo 'Starting Eternal Safe frontend...' >&2
pushd /eternalsafe
yarn dev &
YARN_PID="$!"
echo "$YARN_PID" > /tmp/pids/external-safe.pid
popd

for endpoint in / /welcome/ /imprint/ /settings/; do
	while ! wget -qO /dev/null --tries=1 --timeout=1 "http://127.0.0.1:3000${endpoint}?${QUERY_STRING}"; do
		echo "[$(date +'%H:%M:%S')] Waiting for Eternal Safe to come up, this may take a few minutes..." >&2
		sleep 1
	done
done
echo 'Eternal Safe is up!' >&2
echo 'Access it at the following URL, preconfigured to use Helios:' >&2
echo '' >&2
echo "  http://127.0.0.1:${EXTERNAL_ETERNAL_SAFE_PORT}/welcome?${QUERY_STRING}" >&2
echo '' >&2
echo 'If you have Chromium installed, here is a command-line that will prevent it from accessing anything other than this interface:' >&2
echo '' >&2
echo "  \$ chromium --user-data-dir=\$(mktemp -d) --proxy-server=127.0.0.1:1 --proxy-bypass-list=127.0.0.1:${EXTERNAL_ETERNAL_SAFE_PORT} 'http://127.0.0.1:${EXTERNAL_ETERNAL_SAFE_PORT}/welcome?${QUERY_STRING}'" >&2
echo '' >&2

wait "$YARN_PID"
