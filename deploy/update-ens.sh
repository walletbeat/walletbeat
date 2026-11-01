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
	CHECK_OUTPUT="$(run_ens_check "$RPC_URL")" || continue
	if [[ "$CHECK_OUTPUT" == "match"$'\t'"$DIRECTORY_CID" ]]; then
		echo "ENS domain ${ENS_DOMAIN} already points at ${DIRECTORY_CID}; nothing to update." >&2
		exit 0
	fi
	if [[ "$CHECK_OUTPUT" == "no-match"$'\t'* ]]; then
		echo "ENS domain ${ENS_DOMAIN} points at a different content-hash; updating." >&2
		break
	fi
	echo "Could not verify the ENS content-hash via ${RPC_URL}." >&2
done < <(echo "${RPC_URLS[@]}" | fmt -1 | shuf)

echo "Updating ENS domain name record to CID: ${DIRECTORY_CID}" >&2

while IFS= read -r RPC_URL; do
	echo "Trying RPC URL: ${RPC_URL}..."
	STATUS=0
	if [[ "${SKIP_HELIOS:-false}" == true ]]; then
		pnpm deploy:ens-update update "$ENS_DOMAIN" "$DIRECTORY_CID" --rpc-url "$RPC_URL" || STATUS=$?
	else
		ETHEREUM_MAINNET_EXECUTION_RPC_ENDPOINT="$RPC_URL" pnpm helios:wrap pnpm deploy:ens-update update "$ENS_DOMAIN" "$DIRECTORY_CID" --rpc-url='$HELIOS_RPC_ENDPOINT' --pending-rpc-url "$RPC_URL" || STATUS=$?
	fi
	if [[ "$STATUS" == 0 ]]; then
		break
	fi
	if [[ -s "$ENS_TRANSACTION_STATE_FILE" || "$STATUS" != 1 ]]; then
		echo 'ENS transaction requires reconciliation; stopping automatic retries.' >&2
		exit 2
	fi
done < <(echo "${RPC_URLS[@]}" | fmt -1 | shuf)

# A command may report success before the record is visible, or fail after its
# transaction was submitted. Only the resolver determines deployment success.
while IFS= read -r RPC_URL; do
	echo "Verifying ${ENS_DOMAIN} points at ${DIRECTORY_CID} (using RPC: ${RPC_URL})..." >&2
	CHECK_OUTPUT="$(run_ens_check "$RPC_URL")" || continue
	if [[ "$CHECK_OUTPUT" == "match"$'\t'"$DIRECTORY_CID" ]]; then
		echo "Verified ENS domain ${ENS_DOMAIN} points at ${DIRECTORY_CID}." >&2
		exit 0
	fi
done < <(echo "${RPC_URLS[@]}" | fmt -1 | shuf)

echo "Failed to verify ENS domain ${ENS_DOMAIN} points at ${DIRECTORY_CID} after exhausting RPC attempts." >&2
exit 1
