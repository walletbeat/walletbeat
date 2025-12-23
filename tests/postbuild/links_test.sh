#!/bin/bash

set -euo pipefail

log() {
	if [[ "${QUIET:-}" != true ]]; then
		echo "$@" >&2
	fi
}

process_link() {
	local original_href
	local raw_url
	original_href="$1"
	if echo "$original_href" | grep -q '^https://'; then
		return 0  # Full external URL; no sanitization.
	fi
	raw_url="$(echo "$original_href" | cut -d'"' -f2 | sed -r 's/#.*$//')"
	if [[ "$raw_url" == '' ]]; then
		return 0 # Anchor-only URL; OK.
	fi
	if [[ "$raw_url" == '/' ]]; then
		return 0 # Link to site root; OK.
	fi
	if echo "$raw_url" | grep -q '^(https://|data:)'; then
		return 0  # Full external or data URL; no sanitization.
	fi
	if echo "$raw_url" | grep -q "\\\$\\{"; then
		return 0  # Probably part of inline JavaScript code; ignore.
	fi
	if ! echo "$raw_url" | grep -q '^/'; then
		echo "Unexpected link format. All site URLs should either start with '#' for same-page anchor-only links, or '/' for site-internal links."
		return 1
	fi
	if echo "$raw_url" | grep -q '^//'; then
		echo "Unexpected link format. Protocol-relative URLs are not allowed."
		return 1
	fi
	if ! echo "$raw_url" | grep -q "/([^/]*\\.(svg|png|jpg|ico|css|js))?\$"; then
		echo "Links to pages must end in a slash."
		return 1
	fi
	return 0
}

success=true
while IFS= read -r f; do
	if echo "$f" | grep -qi '\.(ico|png|jpg)$'; then
		continue  # Skip some file types.
	fi
	log "  > File: $f"
	while IFS= read -r href; do
		log "    > Link: $href"
		output="$(process_link "$href" || true)"
		if [[ -z "$output" ]]; then
			log "      > OK: ${href}"
		else
			if [[ "${QUIET:-}" != true ]]; then
				log "      > Fail: ${href}: ${output}"
			else
				echo "  > File ${f}: ${href}: ${output}" >&2
			fi
			success=false
		fi
	done < <(grep -io "(href|src)=\"[^'\"]*\"" "$f" 2>/dev/null || true)
done < <(find "$DIST_DIR" -type f)
if [[ "$success" == false ]]; then
	echo 'Rationale: Site-internal links must end in slashes to make navigation faster when the site is served from an IPFS gateways.' >&2
	exit 1
fi
exit 0
