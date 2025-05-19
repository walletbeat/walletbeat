#!/bin/bash

# Kubo command-line auto-installing wrapper script.

set -euo pipefail
set +x

if ! hash wget; then
	echo 'wget not installed.' >&2
	exit 1
fi
if ! hash jq; then
	echo 'jq not installed.' >&2
	exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_JSON="$SCRIPT_DIR/dist.json"
KUBO_VERSION="$(jq -r '.version' "$DIST_JSON")"
ARCH="$(uname -m)"
QUERY_PATH=''
if [[ "$ARCH" == 'x86_64' ]] || [[ "$ARCH" == 'amd64' ]]; then
	QUERY_PATH='.platforms.linux.archs.amd64'
else
	echo "Unknown architecture: $ARCH" >&2
	exit 1
fi
if [[ -z "$QUERY_PATH" ]]; then
	echo "Unknown architecture: $ARCH" >&2
	exit 1
fi
URL_SUFFIX="$(jq -r "${QUERY_PATH}.link" "$DIST_JSON")"
SHA512="$(jq -r "${QUERY_PATH}.sha512" "$DIST_JSON")"
EXPECTED_PATH="/tmp/.kubo-${KUBO_VERSION}-${ARCH}-$(basename "$URL_SUFFIX")"
if [[ ! -f "$EXPECTED_PATH" ]]; then
	DOWNLOAD_URL="https://dist.ipfs.tech/go-ipfs/${KUBO_VERSION}${URL_SUFFIX}"
	if ! wget -qO "$EXPECTED_PATH.tmp" "$DOWNLOAD_URL"; then
	  echo "Download of '$DOWNLOAD_URL' failed." >&2
		rm -f "$EXPECTED_PATH.tmp" || true
		exit 1
	fi
	mv "$EXPECTED_PATH.tmp" "$EXPECTED_PATH"
fi
GOT_HASH="$(sha512sum "$EXPECTED_PATH" | cut -d' ' -f1)"
if [[ "$GOT_HASH" != "$SHA512" ]]; then
	echo "Corrupt or malicious archive at '$EXPECTED_PATH'." >&2
	exit 1
fi
KUBO_TEMP_DIR="$(mktemp -d --tmpdir=/dev/shm "kubo-${KUBO_VERSION}-${ARCH}.XXXXXX")"
tar -C "$KUBO_TEMP_DIR" -xf "$EXPECTED_PATH"
if [[ ! -x "$KUBO_TEMP_DIR/go-ipfs/ipfs" ]]; then
	echo "Missing executable in Kubo archive." >&2
	rm -rf --one-file-system "$KUBO_TEMP_DIR" || true
	exit 1
fi
export IPFS_PATH="${IPFS_PATH:-"$HOME/.ipfs"}"
if [[ ! -d "$IPFS_PATH" ]]; then
	"$KUBO_TEMP_DIR/go-ipfs/ipfs" init &> /dev/null || true
fi
set +e
"$KUBO_TEMP_DIR/go-ipfs/ipfs" "$@"
EXIT_CODE="$?"
set -e
rm -rf --one-file-system "$KUBO_TEMP_DIR"
exit "$EXIT_CODE"
