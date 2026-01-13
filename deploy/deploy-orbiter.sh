#!/bin/bash

set -euo pipefail
set +x

if [[ -n "${DEBUG:-}" ]]; then
	set -x
fi

if [[ -z "${ORBITER_DOMAIN:-}" ]]; then
	echo 'Missing ORBITER_DOMAIN' >&2
	exit 1
fi
if [[ -z "${DEPLOY_DIRECTORY:-}" ]]; then
	echo 'Missing DEPLOY_DIRECTORY' >&2
	exit 1
fi
if [[ -z "${ORBITER_ACCESS_TOKEN:-}" ]]; then
	echo 'Missing ORBITER_ACCESS_TOKEN' >&2
	exit 1
fi
if [[ -z "${ORBITER_ACCESS_TOKEN_CREATION_DATE:-}" ]]; then
	echo 'Missing ORBITER_ACCESS_TOKEN_CREATION_DATE' >&2
	exit 1
fi

cat > "$HOME/.orbiter.json" <<EOF
{
	"access_token": "${ORBITER_ACCESS_TOKEN}",
	"created_at": "${ORBITER_ACCESS_TOKEN_CREATION_DATE}",
	"keyType": "apikey"
}
EOF
pnpm orbiter update --domain "${ORBITER_DOMAIN}" "${DEPLOY_DIRECTORY}"
