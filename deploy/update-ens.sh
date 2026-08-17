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

run_ens_check() {
	local rpc_url="$1"
	if [[ "${SKIP_HELIOS:-false}" == true ]]; then
		pnpm deploy:ens-content-hash-check check "$ENS_DOMAIN" "$DIRECTORY_CID" --rpc-url "$rpc_url"
	else
		ETHEREUM_MAINNET_EXECUTION_RPC_ENDPOINT="$rpc_url" pnpm helios:wrap pnpm deploy:ens-content-hash-check check "$ENS_DOMAIN" "$DIRECTORY_CID" --rpc-url='$HELIOS_RPC_ENDPOINT'
	fi
}

# Before writing anything on-chain, check whether the ENS domain already points
# at the current CID.
while IFS= read -r RPC_URL; do
	echo "Checking whether ${ENS_DOMAIN} already points at ${DIRECTORY_CID} (using RPC: ${RPC_URL})..." >&2
	CHECK_OUTPUT="$(run_ens_check "$RPC_URL" 2>/dev/null || true)"
	if [[ "$CHECK_OUTPUT" == match* ]]; then
		echo "ENS domain ${ENS_DOMAIN} already points at ${DIRECTORY_CID}; nothing to update." >&2
		exit 0
	fi
	if [[ "$CHECK_OUTPUT" == no-match* ]]; then
		echo "ENS domain ${ENS_DOMAIN} points at a different content-hash; updating." >&2
		break
	fi
	echo "Could not verify the ENS content-hash via ${RPC_URL}." >&2
done < <(echo "${RPC_URLS[@]}" | fmt -1 | shuf)

echo "Updating ENS domain name record to CID: ${DIRECTORY_CID}" >&2

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
