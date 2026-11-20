---
name: walletbeat-authoring
description: Apply Walletbeat's authoring principles when designing, editing, or reviewing a change in this repository.
---

# Walletbeat authoring

Read the [authoring principles](../../../resources/docs/contribute/authoring/authoring.md) before choosing an implementation or reviewing a diff. Follow its links for the affected areas.

Trace the required behavior to the existing code that owns it. Before adding a shared primitive or dependency, verify which requirement the existing options cannot meet. Check the final diff and its consumers against the guide even when a reviewer raises no issue.

For a new rendered guide, use a holding directory so the guide gets its own URL and the parent directory keeps its cards. Check the emitted index, leaf, and inbound links. For links to existing pages, confirm the emitted destination. A repository path can resolve to a different URL, and a fragment on a link to a non-served file can disappear during rewriting.

When two changes share a file, compare their actual hunks and compose them against the same base. Preserve independently owned edits and verify the resulting tree in both orders when claiming either change can land first.
