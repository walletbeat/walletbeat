#!/bin/bash

set -euo pipefail
set +x

if [[ -n "${DEBUG:-}" ]]; then
	set -x
fi

if [[ -z "${DEPLOY_DIRECTORY:-}" ]]; then
	echo 'Missing DEPLOY_DIRECTORY' >&2
	exit 1
fi

if [[ -z "${OMNIPIN_4EVERLAND_TOKEN:-}" ]]; then
	echo 'Missing OMNIPIN_4EVERLAND_TOKEN' >&2
	exit 1
fi

export ACCESS_TOKEN_4EVERLAND="${OMNIPIN_4EVERLAND_TOKEN}"

TOOL=(pnpm deploy:4everland-pin-tool)

CURRENT_CID="$(pnpm omnipin pack --only-hash "${DEPLOY_DIRECTORY}")"

PREVIOUS_COMMIT_TS="$(git log -1 --format=%ct HEAD^ 2>/dev/null || true)"
if [[ -z "${PREVIOUS_COMMIT_TS}" ]]; then
	echo 'No previous commit found.' >&2
	exit 1
fi

SIX_HOURS=$((6 * 60 * 60))
THRESHOLD_TS=$((PREVIOUS_COMMIT_TS - SIX_HOURS))
THRESHOLD="$(date -u -d "@${THRESHOLD_TS}" +%Y-%m-%dT%H:%M:%SZ)"

# All pinned CIDs, oldest first, and how many there are in total.
ALL_CID_TEXT="$("${TOOL[@]}" list-pinned)"
mapfile -t ALL_CID_LIST < <(printf '%s\n' "${ALL_CID_TEXT}" | grep -v '^$')
TOTAL_PINS="${#ALL_CID_LIST[@]}"

# Candidate unpins: CIDs older than the threshold, excluding the current CID.
# The tool lists oldest-first, so this list is already oldest-to-newest.
OLDER_CID_TEXT="$("${TOOL[@]}" list-pinned --older-than "${THRESHOLD}")"
CANDIDATES_RAW="$(printf '%s\n' "${OLDER_CID_TEXT}" | grep -vx "${CURRENT_CID}" || true)"
mapfile -t CANDIDATES < <(printf '%s\n' "${CANDIDATES_RAW}" | grep -v '^$')

# Never unpin so many CIDs that fewer than 3 pins would remain in the account.
MAX_UNPINS=$((TOTAL_PINS - 3))
while ((${#CANDIDATES[@]} > MAX_UNPINS && ${#CANDIDATES[@]} > 0)); do
	unset 'CANDIDATES[-1]'
done

if ((${#CANDIDATES[@]} == 0)); then
	echo 'No CIDs to unpin.' >&2
	exit 0
fi

for cid in "${CANDIDATES[@]}"; do
	echo "Unpinning ${cid}" >&2
	pnpm omnipin unpin "${cid}"
done
echo 'All done!' >&2
