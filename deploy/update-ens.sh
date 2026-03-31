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

DIRECTORY_CID="$(pnpm omnipin pack --only-hash "$DEPLOY_DIRECTORY")"
SUBCOMMAND="${BLUMEN_OR_OMNIPIN:-blumen}"
if [[ "${SKIP_HELIOS:-false}" == true ]]; then
	exec pnpm "$SUBCOMMAND" ens "$DIRECTORY_CID" "$ENS_DOMAIN"
else
	exec pnpm helios:wrap pnpm "$SUBCOMMAND" ens --rpc-url='$HELIOS_RPC_ENDPOINT' "$DIRECTORY_CID" "$ENS_DOMAIN"
fi
