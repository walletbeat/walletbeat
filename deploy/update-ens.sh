#!/bin/bash

set -euo pipefail
set +x

if [[ -n "${DEBUG:-}" ]]; then
	set -x
fi

if [[ -z "$ENS_DOMAIN" ]]; then
	echo 'Missing ENS_DOMAIN' >&2
	exit 1
fi
if [[ -z "${DEPLOY_DIRECTORY:-}" ]]; then
	echo 'Missing DEPLOY_DIRECTORY' >&2
	exit 1
fi
if [[ -z "${OMNIPIN_PK:-}" ]]; then
	echo 'Missing OMNIPIN_PK' >&2
	exit 1
fi

RPC_URLS=(
	'https://public.1rpc.io/eth'
	'https://ethereum-rpc.publicnode.com'
	'https://rpc.flashbots.net'
	'https://0xrpc.io/eth'
	'https://eth.drpc.org'
	'https://eth.blockrazor.xyz'
	'https://rpc.mevblocker.io'
)

DIRECTORY_CID="$(pnpm omnipin pack --only-hash "$DEPLOY_DIRECTORY")"
while IFS= read -r RPC_URL; do
	echo "Trying RPC URL: ${RPC_URL}..."
	if [[ "${SKIP_HELIOS:-false}" == true ]]; then
		if pnpm omnipin ens --rpc-url "$RPC_URL" "$DIRECTORY_CID" "$ENS_DOMAIN"; then
			exit 0
		fi
	else
		if ETHEREUM_MAINNET_EXECUTION_RPC_ENDPOINT="$RPC_URL" pnpm helios:wrap pnpm omnipin ens --rpc-url='$HELIOS_RPC_ENDPOINT' "$DIRECTORY_CID" "$ENS_DOMAIN"; then
			exit 0
		fi
	fi
done < <(echo "${RPC_URLS[@]}" | fmt -1 | shuf)
