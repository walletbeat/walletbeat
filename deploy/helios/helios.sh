#!/bin/bash

# Helios command-line auto-installing wrapper script.

set -euo pipefail
set +x

if ! hash wget; then
	echo 'wget not installed.' >&2
	exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELIOS_VERSION="$(cat "$SCRIPT_DIR/helios.version")"
ARCH="$(uname -m)"
HELIOS_ARCHIVE=''
if [[ "$ARCH" == 'x86_64' ]] || [[ "$ARCH" == 'amd64' ]]; then
	HELIOS_ARCHIVE='helios_linux_amd64.tar.gz'
else
	echo "Unknown architecture: $ARCH" >&2
	exit 1
fi
if [[ -z "$HELIOS_ARCHIVE" ]]; then
	echo "Unknown architecture: $ARCH" >&2
	exit 1
fi
SHA512="$(grep -F "${HELIOS_ARCHIVE}" "${SCRIPT_DIR}/helios.sha512sums" | cut -d' ' -f1)"
EXPECTED_PATH="/tmp/.helios-${HELIOS_VERSION}-${ARCH}-${HELIOS_ARCHIVE}"
if [[ ! -f "$EXPECTED_PATH" ]]; then
	DOWNLOAD_URL="https://github.com/a16z/helios/releases/download/${HELIOS_VERSION}/${HELIOS_ARCHIVE}"
	if ! wget -q -O "$EXPECTED_PATH.tmp" "$DOWNLOAD_URL"; then
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
HELIOS_TEMP_DIR="$(mktemp -d "helios-${HELIOS_VERSION}-${ARCH}.XXXXXX")"
tar -C "$HELIOS_TEMP_DIR" -xf "$EXPECTED_PATH"
if [[ ! -x "$HELIOS_TEMP_DIR/helios" ]]; then
	echo "Missing executable in Helios archive." >&2
	rm -rf --one-file-system "$HELIOS_TEMP_DIR" || true
	exit 1
fi
set +e
"$HELIOS_TEMP_DIR/helios" "$@" &
HELIOS_PID="$!"
forward_sigint() {
	kill -INT "$HELIOS_PID"
}
forward_sigterm() {
	kill -TERM "$HELIOS_PID"
}
trap forward_sigint SIGINT
trap forward_sigterm SIGTERM
wait "$HELIOS_PID"
EXIT_CODE="$?"
set -e
rm -rf --one-file-system "$HELIOS_TEMP_DIR"
exit "$EXIT_CODE"
