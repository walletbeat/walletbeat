/** Compare wallet names alphabetically, resolving equal names by wallet ID. */
export function compareWalletNames(
	a: { displayName: string; id: string },
	b: { displayName: string; id: string },
): number {
	return a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id)
}
