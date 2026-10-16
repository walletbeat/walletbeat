#!/bin/bash

# If Coinspect vendored data changed according to git, push it.

set -euo pipefail
set +x

if [[ -z "${GIT_REMOTE_URL:-}" ]]; then
	echo 'Missing GIT_REMOTE_URL' >&2
	exit 1
fi

if [[ -z "${GIT_REMOTE_BRANCH:-}" ]]; then
	echo 'Missing GIT_REMOTE_BRANCH' >&2
	exit 1
fi

if ! git status --porcelain data/coinspect/ | grep -q .; then
	echo 'Coinspect data is unchanged.' >&2
	exit 0
fi

# COINSPECT_NOTES_FILE, when set and non-empty, is a second commit
# paragraph of non-blocking findings: platform conflicts (Android and
# iOS disagree, so the mobile field stays empty), reports for platforms
# Walletbeat does not track, and researched values that disagree with
# Coinspect.
commit_args=(-m 'Automated Coinspect snapshot update.')
if [[ -n "${COINSPECT_NOTES_FILE:-}" ]] && [[ -s "$COINSPECT_NOTES_FILE" ]]; then
	commit_args+=(-m "$(cat "$COINSPECT_NOTES_FILE")")
fi

echo 'Pushing updated Coinspect snapshot.' >&2
git add data/coinspect/
git commit "${commit_args[@]}"
git push "$GIT_REMOTE_URL" "$GIT_REMOTE_BRANCH"
