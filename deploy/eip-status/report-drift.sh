#!/bin/bash

set -euo pipefail

# Runs the EIP status checker and maintains a single "EIP status drift" tracking
# issue: opens or updates it when drift is found, and closes it once everything
# is back in sync. Warning-only — this script never fails the workflow.
#
# Requires: gh (authenticated via the GH_TOKEN environment variable) and jq.

LABEL='eip-status-drift'
TITLE='EIP status drift detected'

report="$(pnpm --silent check:eip-status --json)"

total="$(jq '.summary.total' <<<"$report")"
drift="$(jq '.summary.drift' <<<"$report")"
unverifiable="$(jq '.summary.unverifiable' <<<"$report")"
checked_at="$(jq -r '.checkedAt' <<<"$report")"

echo "Checked ${total} EIPs: ${drift} drifted, ${unverifiable} unverifiable."

# Ensure the tracking label exists (safe to re-run).
gh label create "$LABEL" \
	--color 'B60205' \
	--description 'A tracked EIP status differs from its upstream spec' \
	2>/dev/null || true

existing="$(gh issue list --label "$LABEL" --state open --json number --jq '.[0].number // empty')"

if [[ "$drift" -gt 0 ]]; then
	body="$(mktemp)"
	{
		echo 'The scheduled `EIP status drift` workflow found tracked EIPs whose recorded fields differ from their upstream specs.'
		echo
		echo '| EIP | Field | Walletbeat | Upstream | Spec |'
		echo '| --- | --- | --- | --- | --- |'
		# One row per mismatch: an EIP can drift on both its status and its prefix.
		# `.upstream` is null for an upstream status Walletbeat does not model
		# (Stagnant, Withdrawn, …), so fall back to the raw frontmatter value.
		jq -r '.drift[] as $d | $d.mismatches[]
			| "| \($d.eip) | \(.field) | `\(.ours)` | `\(.upstream // .upstreamRaw)` | \($d.url) |"' \
			<<<"$report"

		if [[ "$unverifiable" -gt 0 ]]; then
			echo
			echo "<details><summary>Unverifiable (${unverifiable})</summary>"
			echo
			jq -r '.unverifiable[] | "- \(.eip): \(.note)"' <<<"$report"
			echo
			echo '</details>'
		fi

		echo
		echo "_Last checked: ${checked_at}. Update the drifted field in \`data/eips/\` to match upstream (or the upstream spec if Walletbeat is ahead)._"
	} >"$body"

	if [[ -n "$existing" ]]; then
		gh issue edit "$existing" --body-file "$body"
		echo "Updated existing drift issue #${existing}."
	else
		gh issue create --title "$TITLE" --label "$LABEL" --body-file "$body"
		echo 'Opened a new drift issue.'
	fi
else
	echo 'No drift detected.'

	if [[ -n "$existing" ]]; then
		gh issue comment "$existing" \
			--body "No drift as of ${checked_at}: tracked statuses are back in sync. Closing."
		gh issue close "$existing"
		echo "Closed drift issue #${existing}."
	fi
fi
