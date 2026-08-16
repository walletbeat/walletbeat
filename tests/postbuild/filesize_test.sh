#!/bin/bash

set -euo pipefail

# Maximum allowed size for any single text file, in bytes (4 MiB).
MAX_BYTES=$((4 * 1024 * 1024))

# Text files that are intentionally larger than MAX_BYTES and so are tolerated.
# Paths are relative to DIST_DIR.
KNOWN_TOO_LARGE=(
	'wallet/7702/index.html'
)

log() {
	if [[ "${QUIET:-}" != true ]]; then
		echo "$@" >&2
	fi
}

is_text_file() {
	local f="$1"
	# A file is text if its contents are valid UTF-8.
	iconv -f UTF-8 -t UTF-8 "$f" >/dev/null 2>&1
}

is_known_too_large() {
	local f="$1"
	local rel="${f#"$DIST_DIR"/}"
	local known
	for known in "${KNOWN_TOO_LARGE[@]}"; do
		if [[ "$rel" == "$known" ]]; then
			return 0
		fi
	done
	return 1
}

success=true
while IFS= read -r f; do
	if [[ ! -f "$f" ]]; then
		continue
	fi
	rel="${f#"$DIST_DIR"/}"
	if ! is_text_file "$f"; then
		log "  > File: $f (binary, skipping)"
		continue
	fi
	size="$(stat -c '%s' "$f")"
	if ((size <= MAX_BYTES)); then
		log "  > File: $f (${size} bytes, OK)"
		continue
	fi
	if is_known_too_large "$f"; then
		log "  > File: $f (${size} bytes, known too large, tolerated)"
		continue
	fi
	echo "  > File: ${rel} is ${size} bytes, which exceeds the ${MAX_BYTES}-byte (4 MiB) limit for text files." >&2
	success=false
done < <(find "$DIST_DIR" -type f)
if [[ "$success" == false ]]; then
	echo 'Rationale: No text file in the build output should exceed 4 MiB; oversized files slow down the site and its IPFS gateway serving.' >&2
	exit 1
fi
exit 0
