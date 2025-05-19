#!/bin/bash

# If the Helios checkpoint file changed according to git, push it.

set -euo pipefail
set +x

HELIOS_CHECKPOINT='deploy/helios/data/checkpoint'
if ! git status --porcelain "$HELIOS_CHECKPOINT" | grep -qF "$HELIOS_CHECKPOINT"; then
	echo 'Checkpoint is unchanged.' >&2
	exit 0
fi
echo 'Pushing updated checkpoint file.' >&2
git commit "$HELIOS_CHECKPOINT" -m 'Automated checkpoint update.'
git push
