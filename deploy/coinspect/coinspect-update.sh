#!/bin/bash

# Refresh the vendored Coinspect current-reports/ snapshot and check definitions.

set -euo pipefail
set +x

if ! hash git; then
	echo 'git not installed.' >&2
	exit 1
fi
if ! hash rsync; then
	echo 'rsync not installed.' >&2
	exit 1
fi
if ! hash jq; then
	echo 'jq not installed.' >&2
	exit 1
fi

UPSTREAM_REPO='https://github.com/coinspect/wallet-security-ranking'
UPSTREAM_REF='main'
LOCAL_COMMIT_FILE='data/coinspect/upstream-commit.ts'
LOCAL_REPORTS_DIR='data/coinspect/current-reports'
LOCAL_CHECKS_FILE='data/coinspect/checks.json'

remote_sha="$(git ls-remote "$UPSTREAM_REPO" "$UPSTREAM_REF" | cut -f1)"
if [[ -z "$remote_sha" ]]; then
	echo "Failed to resolve $UPSTREAM_REPO $UPSTREAM_REF." >&2
	exit 1
fi

if [[ -f "$LOCAL_COMMIT_FILE" ]]; then
	local_sha="$(grep -oE '[0-9a-f]{40}' "$LOCAL_COMMIT_FILE" | head -n 1 || true)"
else
	local_sha=''
fi

if [[ "$local_sha" == "$remote_sha" ]]; then
	echo 'Coinspect upstream is unchanged.' >&2
	exit 0
fi

tmp="$(mktemp -d)"
cleanup() {
	# GNU rm supports --one-file-system; macOS BSD rm does not.
	rm -rf --one-file-system "$tmp" 2>/dev/null || rm -rf "$tmp"
}
trap cleanup EXIT

git clone --depth 1 --filter=blob:none --sparse \
	"$UPSTREAM_REPO" "$tmp"
git -C "$tmp" sparse-checkout set current-reports config
git -C "$tmp" fetch --depth 1 origin "$remote_sha"
git -C "$tmp" checkout "$remote_sha"

if [[ ! -f "$tmp/config/checks.json" ]]; then
	echo "Upstream config/checks.json is missing at $remote_sha." >&2
	exit 1
fi

if [[ ! -d "$tmp/current-reports" ]] || [[ -z "$(ls -A "$tmp/current-reports")" ]]; then
	echo "Upstream current-reports/ is missing or empty at $remote_sha; refusing to wipe $LOCAL_REPORTS_DIR/." >&2
	exit 1
fi

mkdir -p "$LOCAL_REPORTS_DIR"
rsync -a --delete \
	--exclude='images/' \
	--exclude='images.json' \
	"$tmp/current-reports/" "$LOCAL_REPORTS_DIR/"

# Only the check names and scoring criteria, which references to the reports use.
jq --sort-keys 'map_values({name, criteria})' "$tmp/config/checks.json" >"$LOCAL_CHECKS_FILE"

cat > "$LOCAL_COMMIT_FILE" <<EOF
// Written by deploy/coinspect/coinspect-update.sh; do not edit by hand.
export const coinspectUpstreamCommit = '$remote_sha'
EOF
echo "Updated Coinspect snapshot to $remote_sha." >&2
