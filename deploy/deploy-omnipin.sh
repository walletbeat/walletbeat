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

pnpm omnipin deploy --strict "${DEPLOY_DIRECTORY}"
