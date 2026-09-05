#!/bin/bash

# Refresh the vendored Coinspect current-reports/ snapshot.

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

UPSTREAM_REPO='https://github.com/coinspect/wallet-security-ranking'
UPSTREAM_REF='main'
LOCAL_COMMIT_FILE='data/coinspect/upstream-commit'
LOCAL_REPORTS_DIR='data/coinspect/current-reports'

remote_sha=$(git ls-remote "$UPSTREAM_REPO" "$UPSTREAM_REF" | cut -f1)
if [[ -z "$remote_sha" ]]; then
	echo "Failed to resolve $UPSTREAM_REPO $UPSTREAM_REF." >&2
	exit 1
fi

if [[ -f "$LOCAL_COMMIT_FILE" ]]; then
	local_sha=$(cat "$LOCAL_COMMIT_FILE")
else
	local_sha=''
fi

if [[ "$local_sha" == "$remote_sha" ]]; then
	echo 'Coinspect upstream is unchanged.' >&2
	exit 0
fi

tmp=$(mktemp -d)
cleanup() {
	# GNU rm supports --one-file-system; macOS BSD rm does not.
	rm -rf --one-file-system "$tmp" 2>/dev/null || rm -rf "$tmp"
}
trap cleanup EXIT

git clone --depth 1 --filter=blob:none --sparse \
	"$UPSTREAM_REPO" "$tmp"
git -C "$tmp" sparse-checkout set current-reports
git -C "$tmp" fetch --depth 1 origin "$remote_sha"
git -C "$tmp" checkout "$remote_sha"

if [[ ! -d "$tmp/current-reports" ]] || [[ -z "$(ls -A "$tmp/current-reports")" ]]; then
	echo "Upstream current-reports/ is missing or empty at $remote_sha; refusing to wipe $LOCAL_REPORTS_DIR/." >&2
	exit 1
fi

mkdir -p "$LOCAL_REPORTS_DIR"
rsync -a --delete \
	--exclude='images/' \
	--exclude='images.json' \
	"$tmp/current-reports/" "$LOCAL_REPORTS_DIR/"

echo "$remote_sha" > "$LOCAL_COMMIT_FILE"
echo "Updated Coinspect snapshot to $remote_sha." >&2
