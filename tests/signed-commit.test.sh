#!/bin/bash

set -euo pipefail

# Verify that the latest commit on the current branch is GPG-signed.
# Checks for the presence of a `gpgsig` field in the commit object.

commit_object="$(git cat-file -p HEAD)"

if ! echo "$commit_object" | grep -q '^gpgsig '; then
	echo "The latest commit is not signed." >&2
	echo 'Please sign your commits.' >&2
	exit 1
fi

if ! echo "$@" | grep -q quiet; then
	echo 'The latest commit is signed.' >&2
fi
exit 0
