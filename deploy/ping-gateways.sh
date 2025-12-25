#!/bin/bash

set -euo pipefail
set +x

GATEWAYS=(
	dweb.link
	w3s.link
	nftstorage.link
)

if [[ -z "${DEPLOY_DIRECTORY:-}" ]]; then
	echo 'Missing DEPLOY_DIRECTORY' >&2
	exit 1
fi

DIRECTORY_CID="$(pnpm --silent ipfs add -Qr --only-hash --cid-version 1 "$DEPLOY_DIRECTORY")"
DEADLINE="$(( "$(date +%s)" + 600 ))"
ONE_GOOD_GATEWAY=false
while true; do
	ALL_GOOD_GATEWAYS=true
	for GATEWAY in "${GATEWAYS[@]}"; do
		echo "[$(date '+%+4Y-%m-%d %H:%M:%S')] Trying to ping CID $DIRECTORY_CID on gateway $GATEWAY..." >&2
		if pnpm omnipin ping --max-retries=1 "$DIRECTORY_CID" "$GATEWAY"; then
			ONE_GOOD_GATEWAY=true
		else
			ALL_GOOD_GATEWAYS=false
		fi
	done
	if [[ "$ALL_GOOD_GATEWAYS" == true ]]; then
		echo "All gateways have the data. Success". >&2
		exit 0
	fi
	if [[ "$DEADLINE" -lt "$(date +%s)" ]]; then
		break
	fi
done
if [[ "$ONE_GOOD_GATEWAY" == false ]]; then
	echo "Failed to refresh any gateway. Failure." >&2
	exit 1
fi
echo 'At least one gateway has the data. Considering this a success'. >&2
exit 0
