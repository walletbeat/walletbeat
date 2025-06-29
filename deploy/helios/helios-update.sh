#!/bin/bash

# Update Helios binary hashes and checkpoint.

set -euo pipefail
set +x

if [[ -z "${1:-}" ]]; then
	echo "Usage: $0 <version | --checkpoint-only>" >&2
	exit 1
fi
if ! hash wget; then
	echo 'wget not installed.' >&2
	exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$1" != "--checkpoint-only" ]]; then
	HELIOS_VERSION="$1"
	RELEASE_ARTIFACTS=(
		helios_linux_amd64.tar.gz
		helios_linux_arm64.tar.gz
		helios_linux_armv7.tar.gz
		helios_linux_riscv64gc.tar.gz 
	)
	HELIOS_TEMP_DIR="$(mktemp -d --tmpdir=/dev/shm "helios.XXXXXX")"
	for artifact in "${RELEASE_ARTIFACTS[@]}"; do
		wget -O "${HELIOS_TEMP_DIR}/${artifact}" "https://github.com/a16z/helios/releases/download/${HELIOS_VERSION}/${artifact}"
	done
	pushd "$HELIOS_TEMP_DIR" >/dev/null
		sha512sum "${RELEASE_ARTIFACTS[@]}" > "${SCRIPT_DIR}/helios.sha512sums"
	popd >/dev/null
	rm -rf --one-file-system "$HELIOS_TEMP_DIR"
	echo "$HELIOS_VERSION" > "$SCRIPT_DIR/helios.version"
fi

# Wait for a few blocks. This refreshes the checkpoint as a side effect.
"${SCRIPT_DIR}/helios-wrap.sh" sleep 30
