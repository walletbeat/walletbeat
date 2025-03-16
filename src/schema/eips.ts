/**
 * The set of all EIP numbers tracked by Walletbeat.
 */
export type EipNumber = '1193' | '2700' | '4337' | '6963' | '7702' | '7828' | '7831'

/**
 * The status of an Ethereum Improvement Proposal (EIP).
 */
export enum EipStatus {
	DRAFT = 'DRAFT',
	FINAL = 'FINAL',
	LIVING = 'LIVING',
}

/**
 * The prefix of an Ethereum Improvement Proposal (EIP).
 */
export enum EipPrefix {
	EIP = 'EIP',
	ERC = 'ERC',
}

/**
 * Data about a single Ethereum Improvement Proposal (EIP).
 */
export interface Eip {
	/** EIP prefix (EIP or ERC) */
	prefix: EipPrefix

	/** Number of the EIP, as a string. */
	number: EipNumber

	/** Walletbeat-specific friendly name. */
	friendlyName: string

	/** Formal title as from the EIP repository. */
	formalTitle: string

	/** EIP status as from the EIP repository. */
	status: EipStatus

	/** EIP summary, as from the EIP repository with some minor tweaks if needed. */
	summaryMarkdown: string

	/** Walletbeat-specific explanation of why this EIP matters. */
	whyItMattersMarkdown: string

	/** Walletbeat-specific notes (e.g. precedent/alternative EIPs). */
	noteMarkdown?: string
}

/** Return a short label for an EIP (example: "ERC-20"). */
export function eipShortLabel(eip: Eip): string {
	return `${eip.prefix}-${eip.number}`
}

/** Return a label for an EIP (example: "ERC-20 (fungible tokens)"). */
export function eipLabel(eip: Eip): string {
	return `${eipShortLabel(eip)}: ${eip.friendlyName}`
}

/** Return the eips.ethereum.org URL for an EIP. */
export function eipEthereumDotOrgUrl(eip: EipNumber | Eip): string {
	return `https://eips.ethereum.org/EIPS/eip-${typeof eip === 'string' ? eip : eip.number}`
}

/** Return a magic URL which the Markdown parser can turn into an EIP link. */
function markdownMagicUrl(eip: EipNumber | Eip, format: 'long' | 'short'): string {
	return `${eipEthereumDotOrgUrl(eip)}#wb-format=${format}`
}

/**  Return a markdown link for an EIP. */
export function eipMarkdownLink(eip: Eip): string {
	return `[${eipLabel(eip)}](${markdownMagicUrl(eip, 'short')})`
}

/** Return a markdown link and a title for an EIP. */
export function eipMarkdownLinkAndTitle(eip: Eip): string {
	return `[${eipShortLabel(eip)} ${eip.friendlyName}](${markdownMagicUrl(eip, 'long')})`
}
