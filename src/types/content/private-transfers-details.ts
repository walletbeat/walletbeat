import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'

import type { InlineText } from './inline'

/** Human-readable name of a private transfer technology. */
export const privateTransferTechnologyName: Record<PrivateTransferTechnology, string> = {
	[PrivateTransferTechnology.STEALTH_ADDRESSES]: 'ERC-5564 Stealth Addresses',
	[PrivateTransferTechnology.TORNADO_CASH_NOVA]: 'Tornado Cash Nova',
	[PrivateTransferTechnology.PRIVACY_POOLS]: 'Privacy Pools',
	[PrivateTransferTechnology.RAILGUN]: 'Railgun',
}

/** What one private transfer technology means for each phase of a transfer. */
export interface PrivateTransferTechnologyDetail {
	technology: PrivateTransferTechnology

	/** Privacy of sending funds with this technology. */
	sending: InlineText

	/** Privacy of receiving funds with this technology. */
	receiving: InlineText

	/** Privacy of spending received funds with this technology. */
	spending: InlineText

	/** Caveats that apply to this technology as a whole. */
	notes: InlineText[]
}

/**
 * Canonical detail model for private token transfers.
 *
 * Technologies are an ordered array rather than a `Map`, so the model is
 * directly serializable and every adapter sees the same order. A note about
 * the wallet's default transfer mode belongs to the evaluation as a whole and
 * is therefore top-level, never attached to whichever technology happens to
 * come first.
 */
export interface PrivateTransfersDetails {
	type: 'privateTransfers'

	/** Supported technologies, in evaluation order. Empty when none is supported. */
	technologies: PrivateTransferTechnologyDetail[]

	/**
	 * A statement about the wallet's overall token transfer mode, such as
	 * transfers being public by default. It belongs to the evaluation as a
	 * whole, never to one technology.
	 */
	defaultModeNote?: InlineText
}

/** Type predicate for private transfer details. */
export function isPrivateTransfersDetails(details: unknown): details is PrivateTransfersDetails {
	return (
		typeof details === 'object' &&
		details !== null &&
		'type' in details &&
		details.type === 'privateTransfers'
	)
}

/** Build details carrying only a wallet-wide transfer mode note. */
export function privateTransfersModeNote(note: InlineText): PrivateTransfersDetails {
	return { type: 'privateTransfers', technologies: [], defaultModeNote: note }
}

/** Build details for a single technology. */
export function privateTransfersDetails(
	detail: PrivateTransferTechnologyDetail,
): PrivateTransfersDetails {
	return { type: 'privateTransfers', technologies: [detail] }
}

/**
 * Merge two private-transfer details, keeping the first occurrence of each
 * technology. Used when two variants of the same wallet support different
 * technologies and their evaluations are merged.
 */
export function mergePrivateTransfersDetails(
	first: PrivateTransfersDetails,
	second: PrivateTransfersDetails,
): PrivateTransfersDetails {
	const technologies = [...first.technologies]

	for (const detail of second.technologies) {
		if (!technologies.some(existing => existing.technology === detail.technology)) {
			technologies.push(detail)
		}
	}

	const defaultModeNote = first.defaultModeNote ?? second.defaultModeNote

	return {
		type: 'privateTransfers',
		technologies,
		...(defaultModeNote !== undefined && { defaultModeNote }),
	}
}
