#!/bin/bash

set -euo pipefail

TESTS=(
	postbuild/links_test.sh
	postbuild/filesize_test.sh
	postbuild/external_urls_test.sh
)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export REPO_DIR="$(dirname "$SCRIPT_DIR")"
export DIST_DIR="$REPO_DIR/dist"

log() {
	if [[ "${QUIET:-}" != true ]]; then
		echo "$@" >&2
	fi
}

log "> Building..."
WALLETBEAT_BUILD_TEST=true pnpm run build || exit 1

if [[ ! -d "$DIST_DIR" ]]; then
	echo "Build did not produce expected directory at '${DIST_DIR}'." >&2
	exit 1
fi

success=true
for test in "${TESTS[@]}"; do
	log "> Running post-build test: $(basename "$test")..."
	if "${SCRIPT_DIR}/${test}"; then
		log "  > PASS: $(basename "$test")" >&2
	else
		echo "  > FAIL: $(basename "$test")" >&2
		success=false
	fi
done
if [[ "$success" == false ]]; then
	exit 1
fi
exit 0
