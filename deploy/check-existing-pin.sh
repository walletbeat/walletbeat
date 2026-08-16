#!/bin/bash

set -euo pipefail
set +x

if [[ -n "${DEBUG:-}" ]]; then
	set -x
fi

if [[ -z "${DEPLOY_DIRECTORY:-}" ]]; then
	echo 'Missing DEPLOY_DIRECTORY' >&2
	exit 1
fi

if [[ -z "${ACCESS_TOKEN_4EVERLAND:-}" ]]; then
	echo 'Missing ACCESS_TOKEN_4EVERLAND' >&2
	exit 1
fi

DIRECTORY_CID="$(pnpm omnipin pack --only-hash "$DEPLOY_DIRECTORY")"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	echo "cid=${DIRECTORY_CID}" >>"$GITHUB_OUTPUT"
fi

# A CID is considered already pinned when at least one matching pin record on
# 4EVERLAND has status `pinned`. Any other outcome (not pinned, or the status
# query failing) means we should go ahead and deploy/pin.
if pnpm deploy:4everland-pin-tool check-pin-status "${DIRECTORY_CID}" | awk -F'\t' '$2 == "pinned" { found = 1 } END { exit !found }'; then
	ALREADY_PINNED=true
	echo "CID ${DIRECTORY_CID} is already pinned on 4EVERLAND." >&2
else
	ALREADY_PINNED=false
	echo "CID ${DIRECTORY_CID} is not yet pinned on 4EVERLAND." >&2
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	echo "already-pinned=${ALREADY_PINNED}" >>"$GITHUB_OUTPUT"
fi
