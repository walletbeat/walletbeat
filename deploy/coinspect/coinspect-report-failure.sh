#!/bin/bash

# Maintain the single tracking issue for a Coinspect import that needs a human.
# A failed check run replaces the issue body. A run that passes the checks
# closes the issue.

set -euo pipefail
set +x

for var in GH_TOKEN COINSPECT_RESULT RUN_URL; do
	if [[ -z "${!var:-}" ]]; then
		echo "Missing $var" >&2
		exit 1
	fi
done

LABEL='coinspect-import'
TITLE='Coinspect import needs attention'
CHECK_TAIL_LINES=80

# Safe to re-run. Do not pass --force: that would reset a color or description
# set on the label after it was created.
gh label create "$LABEL" \
	--color 'B60205' \
	--description 'Automated Coinspect import is blocked' \
	2>/dev/null || true

existing="$(gh issue list --label "$LABEL" --state open --json number --jq '.[0].number // empty')"
upstream_commit="$(sed -n 's/.*"commit": *"\([0-9a-f]*\)".*/\1/p' data/coinspect/upstream-commit.json)"

if [[ "$COINSPECT_RESULT" == 'clear' ]]; then
	if [[ -n "$existing" ]]; then
		gh issue comment "$existing" \
			--body "Checks passed for upstream commit \`${upstream_commit}\`. The snapshot was pushed. Closing."
		gh issue close "$existing"
		echo "Closed issue #${existing}." >&2
	else
		echo 'Checks passed; no open import issue.' >&2
	fi
	exit 0
fi

case "$COINSPECT_RESULT" in
	classification)
		summary='failed classification'
		if [[ -z "${COINSPECT_CLASSIFICATION_OUTPUT:-}" ]] || [[ ! -f "$COINSPECT_CLASSIFICATION_OUTPUT" ]]; then
			echo 'Missing COINSPECT_CLASSIFICATION_OUTPUT' >&2
			exit 1
		fi
		detail="$(cat "$COINSPECT_CLASSIFICATION_OUTPUT")"
		;;
	audit)
		summary='left wallet data out of step with the new snapshot'
		if [[ -z "${COINSPECT_AUDIT_OUTPUT:-}" ]] || [[ ! -f "$COINSPECT_AUDIT_OUTPUT" ]]; then
			echo 'Missing COINSPECT_AUDIT_OUTPUT' >&2
			exit 1
		fi
		detail="$(cat "$COINSPECT_AUDIT_OUTPUT")"
		;;
	checks)
		summary='failed the repository checks on the new snapshot'
		if [[ -z "${COINSPECT_CHECK_OUTPUT:-}" ]] || [[ ! -f "$COINSPECT_CHECK_OUTPUT" ]]; then
			echo 'Missing COINSPECT_CHECK_OUTPUT' >&2
			exit 1
		fi
		detail="$(tail -n "$CHECK_TAIL_LINES" "$COINSPECT_CHECK_OUTPUT")"
		;;
	*)
		echo "Unknown COINSPECT_RESULT: $COINSPECT_RESULT" >&2
		exit 1
		;;
esac

body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT
{
	echo "The Coinspect refresh to upstream commit \`$upstream_commit\` ${summary}, so nothing was pushed."
	echo
	echo "Run: $RUN_URL"
	echo
	if [[ "$COINSPECT_RESULT" != 'checks' ]]; then
		echo '```'
		echo "$detail"
		echo '```'
	else
		echo '<details><summary>Check output (tail)</summary>'
		echo
		echo '```'
		echo "$detail"
		echo '```'
		echo
		echo '</details>'
	fi
} > "$body_file"

if [[ -n "$existing" ]]; then
	gh issue edit "$existing" --body-file "$body_file"
	echo "Updated issue #${existing}." >&2
else
	gh issue create --title "$TITLE" --label "$LABEL" --body-file "$body_file"
fi
