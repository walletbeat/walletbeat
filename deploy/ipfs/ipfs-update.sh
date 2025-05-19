#!/bin/bash

# Update Kubo dist.json file.

set -euo pipefail
set +x

if [[ -z "${1:-}" ]]; then
	echo "Usage: $0 <version>" >&2
	exit 1
fi
if ! hash wget; then
	echo 'wget not installed.' >&2
	exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KUBO_VERSION="$1"
wget -qO "${SCRIPT_DIR}/dist.json" "https://dist.ipfs.tech/go-ipfs/${KUBO_VERSION}/dist.json"
