#!/bin/bash

# If the Helios checkpoint file changed according to git, push it.

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

HELIOS_CHECKPOINT='deploy/helios/data/checkpoint'
if ! git status --porcelain "$HELIOS_CHECKPOINT" | grep -qF "$HELIOS_CHECKPOINT"; then
	echo 'Checkpoint is unchanged.' >&2
	exit 0
fi
echo 'Pushing updated checkpoint file.' >&2
git commit "$HELIOS_CHECKPOINT" -m 'Automated checkpoint update.'
git push "$GIT_REMOTE_URL" "$GIT_REMOTE_BRANCH"
