#!/bin/bash

set -euo pipefail

# Compare the size of the production build (`dist`) between the current
# revision (HEAD) and the closest reference revision.
#
# The reference revision is the tip of whichever "known reference" branch
# (see REFERENCES below) is an ancestor of HEAD and is closest to it. For a
# pull-request head, this is normally the branch the PR was based on.
#
# Fails if the current build is much larger OR much smaller than the previous
# build. Intended to catch unintended additional bloat, or accidental deletion
# of large portions of the site.
#
# If either revision's build fails, or no reference branch is an ancestor of
# HEAD, the test passes vacuously.
#
# This test is intentionally NOT part of the default `check:all` runs.
# It is invoked only by a dedicated CI workflow on pull requests.
# It can be invoked manually with: pnpm run check:build:size-delta

# Known reference branches, in priority order.
REFERENCES=('beta' 'main')

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

CURRENT_HEAD="$(git -C "$ROOT" rev-parse HEAD)"

# Print the reference commit to compare against: the tip of the reference
# branch that is an ancestor of HEAD and is closest to it (fewest commits
# between the branch tip and HEAD). Returns non-zero if no such branch exists.
find_reference_commit() {
	local best_commit=''
	local best_count=''
	local ref
	local commit
	local count
	for ref in "${REFERENCES[@]}"; do
		commit=''
		if ! commit="$(git -C "$ROOT" rev-parse --verify -q "refs/remotes/origin/$ref" 2>/dev/null)" &&
			! commit="$(git -C "$ROOT" rev-parse --verify -q "refs/heads/$ref" 2>/dev/null)"; then
			continue
		fi
		if ! git -C "$ROOT" merge-base --is-ancestor "$commit" HEAD 2>/dev/null; then
			continue
		fi
		count="$(git -C "$ROOT" rev-list --count "$commit..HEAD" 2>/dev/null)"
		if [[ -z "$best_count" ]] || { [[ -n "$count" ]] && [[ "$count" -lt "$best_count" ]]; }; then
			best_commit="$commit"
			best_count="$count"
		fi
	done
	if [[ -z "$best_commit" ]]; then
		return 1
	fi
	echo "$best_commit"
}

if ! REFERENCE_HEAD="$(find_reference_commit)"; then
	echo "dist-size: no reference branch (${REFERENCES[*]}) is an ancestor of HEAD; passing vacuously." >&2
	exit 0
fi

WORKTREE_ROOT="$(mktemp -d)"
cleanup() {
	git -C "$ROOT" worktree remove --force "$WORKTREE_ROOT/current" 2>/dev/null || true
	git -C "$ROOT" worktree remove --force "$WORKTREE_ROOT/reference" 2>/dev/null || true
	rm -rf "$WORKTREE_ROOT"
}
trap cleanup EXIT

# Build the given revision in a fresh worktree and print the size of `dist` in
# bytes on stdout. Returns non-zero if anything goes wrong; the caller then
# treats the test as passing vacuously.
measure_revision() {
	local rev="$1"
	local name="$2"
	local dir="$WORKTREE_ROOT/$name"

	if ! git -C "$ROOT" worktree add --force "$dir" "$rev" >/dev/null 2>&1; then
		echo "dist-size: could not create worktree at $rev ($name)." >&2
		return 1
	fi

	(
		cd "$dir" || exit 1
		if ! pnpm install --frozen-lockfile >/dev/null 2>&1; then
			echo "dist-size: \`pnpm install\` failed for $name." >&2
			exit 1
		fi
		if ! pnpm build >/dev/null 2>&1; then
			echo "dist-size: \`pnpm build\` failed for $name." >&2
			exit 1
		fi
	)
	local status=$?
	if [[ $status -ne 0 ]]; then
		return 1
	fi

	if [[ ! -d "$dir/dist" ]]; then
		echo "dist-size: no \`dist\` directory produced for $name." >&2
		return 1
	fi
	du -sb "$dir/dist" | awk '{print $1}'
}

echo "Building reference ($REFERENCE_HEAD)..." >&2
if ! REFERENCE_SIZE="$(measure_revision "$REFERENCE_HEAD" "reference")"; then
	echo "dist-size: reference build failed; passing vacuously." >&2
	exit 0
fi

echo "Building current ($CURRENT_HEAD)..." >&2
if ! CURRENT_SIZE="$(measure_revision "$CURRENT_HEAD" "current")"; then
	echo "dist-size: current build failed; passing vacuously." >&2
	exit 0
fi

echo "Reference dist size: $REFERENCE_SIZE bytes" >&2
echo "Current dist size: $CURRENT_SIZE bytes" >&2

awk -v cur="$CURRENT_SIZE" -v ref="$REFERENCE_SIZE" 'BEGIN {
	increase = (cur - ref) / ref;
	decrease = (ref - cur) / ref;
	if (increase > 0.10) {
		printf "FAIL: current build is %.2f%% larger than reference (limit +10%%).\n", increase * 100;
		exit 1;
	}
	if (decrease > 0.90) {
		printf "FAIL: current build is %.2f%% smaller than reference (limit -90%%).\n", decrease * 100;
		exit 1;
	}
	printf "OK: size delta within bounds (%.2f%%).\n", increase * 100;
	exit 0;
}'
