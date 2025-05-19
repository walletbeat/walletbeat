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
if [[ -z "${BLUMEN_PK:-}" ]]; then
	echo 'Missing BLUMEN_PK' >&2
	exit 1
fi

DIRECTORY_CID="$(pnpm --silent ipfs add -Qr --only-hash --cid-version 1 "$DEPLOY_DIRECTORY")"
pnpm blumen ens "$DIRECTORY_CID" "$ENS_DOMAIN"
