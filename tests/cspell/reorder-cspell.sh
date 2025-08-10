#!/bin/bash

set -euo pipefail
set +x

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

CSPELL_JSON="$REPOSITORY_DIR/.cspell.json"
if [[ ! -f "$CSPELL_JSON" ]]; then
	echo "Error: $CSPELL_JSON not found." >&2
	exit 1
fi

set +e
pnpm exec ts-node "tests/cspell/reorder-cspell.ts"
RETURN_CODE="$?"
if [[ "$RETURN_CODE" == 0 ]]; then
	# Already in order.
	exit 0
fi

# Exit code 55 indicates that the file was not in order.
# Anything else is an error, stop here.
if [[ "$RETURN_CODE" != 55 ]]; then
	exit "$RETURN_CODE"
fi

if ! pnpm prettier --write "$CSPELL_JSON" &>/dev/null; then
	pnpm prettier --write "$CSPELL_JSON"
	exit 1
fi

echo "Vocabulary words in $CSPELL_JSON automatically fixed." >&2
exit 0
