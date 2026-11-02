#!/bin/bash

# If the wallet usage statistics snapshot changed according to git, push it.

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

if ! git status --porcelain data/usage-stats.json | grep -q .; then
	echo 'Usage statistics are unchanged.' >&2
	exit 0
fi

echo 'Pushing updated usage statistics snapshot.' >&2
git add data/usage-stats.json
git commit -m 'Automated wallet usage statistics update.'
git push "$GIT_REMOTE_URL" "$GIT_REMOTE_BRANCH"
