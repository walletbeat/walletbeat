#!/bin/bash

# Installs the macOS packages listed in macos-packages.txt.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGES_FILE="$SCRIPT_DIR/macos-packages.txt"

# Directory in which a verified download is kept so it can be reused (and
# cached by the CI workflow) across runs.
CACHE_DIR="${WALLETBEAT_MACOS_CACHE_DIR:-$HOME/.cache/walletbeat-macos}"

log() {
	echo "[install-macos]" "$@" >&2
}

fail() {
	echo "[install-macos] ERROR: $*" >&2
	exit 1
}

# Download a URL to a path, retrying transient failures with backoff.
download_with_retry() {
	local url="$1" dest="$2" attempt=1 max_attempts=5 delay=5
	mkdir -p "$(dirname "$dest")"
	while [[ "$attempt" -le "$max_attempts" ]]; do
		log "Downloading $url (attempt $attempt/$max_attempts)..."
		if curl -fL --http1.1 --retry 3 --retry-all-errors \
			--retry-delay 5 --connect-timeout 30 --max-time 600 \
			-o "$dest" "$url"; then
			return 0
		fi
		log "Download attempt $attempt failed. Retrying in ${delay}s..."
		rm -f "$dest"
		sleep "$delay"
		attempt=$((attempt + 1))
		delay=$((delay * 2))
	done
	return 1
}

# Verify that a file matches the expected SHA256.
verify_sha256() {
	local file="$1" expected="$2" actual
	actual="$(shasum -a 256 "$file" 2>/dev/null | awk '{print $1}')"
	[[ "$actual" == "$expected" ]]
}

# Install a package via Homebrew cask.
install_with_brew() {
	local name="$1"
	brew install --cask "$name"
}

main() {
	[[ "$(uname -s)" == "Darwin" ]] || fail "This script is only for macOS."
	[[ -f "$PACKAGES_FILE" ]] || fail "Package list not found: $PACKAGES_FILE"

	local line name version handler
	while IFS= read -r line; do
		[[ -z "$line" || "$line" == \#* ]] && continue

		name="${line%%:*}"
		version=""
		if [[ "$line" == *:* ]]; then
			version="${line#*:}"
		fi

		handler="install_${name}"
		if declare -F "$handler" >/dev/null 2>&1; then
			log "Installing $name via specialized handler."
			"$handler" "$version"
		else
			log "Installing $name via brew."
			install_with_brew "$name"
		fi
	done <"$PACKAGES_FILE"

	log "All macOS packages installed."
}

main "$@"
