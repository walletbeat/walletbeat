#!/bin/bash

set -euo pipefail
set +x

if [[ -z "${DEPLOY_DIRECTORY:-}" ]]; then
	echo 'Missing DEPLOY_DIRECTORY' >&2
	exit 1
fi

DIRECTORY_CID="$(pnpm omnipin pack --only-hash "$DEPLOY_DIRECTORY")"
exec pnpm deploy:ipfs-availability-check check "$DIRECTORY_CID" "$DEPLOY_DIRECTORY"
