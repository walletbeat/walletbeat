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

echo 'Pushing updated Coinspect snapshot.' >&2
git add data/coinspect/
git commit -m 'Automated Coinspect snapshot update.'
git push "$GIT_REMOTE_URL" "$GIT_REMOTE_BRANCH"
