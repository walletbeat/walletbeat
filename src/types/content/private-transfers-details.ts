import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'

import type { InlineText } from './inline'

export const privateTransferTechnologyName: Record<PrivateTransferTechnology, string> = {
	[PrivateTransferTechnology.STEALTH_ADDRESSES]: 'ERC-5564 Stealth Addresses',
	[PrivateTransferTechnology.TORNADO_CASH_NOVA]: 'Tornado Cash Nova',
	[PrivateTransferTechnology.PRIVACY_POOLS]: 'Privacy Pools',
	[PrivateTransferTechnology.RAILGUN]: 'Railgun',
}

export interface PrivateTransferTechnologyDetail {
	technology: PrivateTransferTechnology

	sending: InlineText

	receiving: InlineText

	spending: InlineText

	notes: InlineText[]
}

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

export function isPrivateTransfersDetails(details: unknown): details is PrivateTransfersDetails {
	return (
		typeof details === 'object' &&
		details !== null &&
		'type' in details &&
		details.type === 'privateTransfers'
	)
}

export function privateTransfersModeNote(note: InlineText): PrivateTransfersDetails {
	return { type: 'privateTransfers', technologies: [], defaultModeNote: note }
}

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
