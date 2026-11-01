#!/bin/bash

set -euo pipefail
set +x

if [[ -n "${DEBUG:-}" ]]; then
	set -x
fi

if [[ -z "${ENS_DOMAIN:-}" ]]; then
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

# Keep submission state outside the Helios process so wrapper failures cannot
# turn an uncertain broadcast into another signed transaction.
ENS_TRANSACTION_STATE_FILE="$(mktemp)"
export ENS_TRANSACTION_STATE_FILE
trap 'rm -f "$ENS_TRANSACTION_STATE_FILE"' EXIT

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

echo "Updating ENS domain name record to CID: ${DIRECTORY_CID}" >&2

while IFS= read -r RPC_URL; do
	echo "Trying RPC URL: ${RPC_URL}..."
	STATUS=0
	if [[ "${SKIP_HELIOS:-false}" == true ]]; then
		pnpm deploy:ens update "$ENS_DOMAIN" "$DIRECTORY_CID" --rpc-url "$RPC_URL" || STATUS=$?
	else
		ETHEREUM_MAINNET_EXECUTION_RPC_ENDPOINT="$RPC_URL" pnpm helios:wrap pnpm deploy:ens update "$ENS_DOMAIN" "$DIRECTORY_CID" --rpc-url='$HELIOS_RPC_ENDPOINT' --pending-rpc-url "$RPC_URL" || STATUS=$?
	fi
	if [[ "$STATUS" == 0 ]]; then
		exit 0
	fi
	if [[ -s "$ENS_TRANSACTION_STATE_FILE" || "$STATUS" != 1 ]]; then
		echo 'ENS transaction requires reconciliation; stopping automatic retries.' >&2
		exit 2
	fi
done < <(echo "${RPC_URLS[@]}" | fmt -1 | shuf)

echo "Failed to update and verify ENS domain ${ENS_DOMAIN} after exhausting RPC attempts." >&2
exit 1
