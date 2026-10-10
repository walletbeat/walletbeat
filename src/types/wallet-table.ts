/**
 * Ranks a wallet table by one attribute group instead of the overall rating,
 * with that group's attributes expanded.
 */
export type WalletTableFocus = {
	/** The attribute group to rank by. */
	attributeGroupId: string

	/** Link back to the unfocused overview of the same table. */
	summaryHref: string
}
