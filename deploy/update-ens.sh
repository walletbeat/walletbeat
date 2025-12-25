#!/bin/bash

set -euo pipefail
set +x

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

DIRECTORY_CID="$(pnpm --silent ipfs add -Qr --only-hash --cid-version 1 "$DEPLOY_DIRECTORY")"
pnpm helios:wrap pnpm blumen ens --rpc-url='$HELIOS_RPC_ENDPOINT' "$DIRECTORY_CID" "$ENS_DOMAIN"
