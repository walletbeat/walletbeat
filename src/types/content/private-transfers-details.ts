import type { EvaluationData, WalletNameStrings } from '@/schema/attributes'
import type { PrivateTransfersValue } from '@/schema/attributes/privacy/private-transfers'
import type { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'

import {
	component,
	type ComponentAndProps,
	type Content,
	isCustomContent,
	type MarkdownParagraph,
} from '../content'
import type { Strings } from '../utils/string-templates'

interface PrivateTokenTransferDetails {
	sendingDetails: MarkdownParagraph<WalletNameStrings>
	receivingDetails: MarkdownParagraph<WalletNameStrings>
	spendingDetails: MarkdownParagraph<WalletNameStrings>
	extraNotes: MarkdownParagraph<WalletNameStrings>[]
}

export interface PrivateTransfersDetailsProps extends EvaluationData<PrivateTransfersValue> {
	privateTransferDetails: Map<PrivateTransferTechnology, PrivateTokenTransferDetails>
}

export interface PrivateTransfersDetailsContent {
	component: 'PrivateTransfersDetails'
	componentProps: PrivateTransfersDetailsProps
}

/** Type predicate for PrivateTransfersDetailsContent. */
function isPrivateTransferDetailsContent(
	componentAndProps: ComponentAndProps,
): componentAndProps is PrivateTransfersDetailsContent {
	return componentAndProps.component === 'PrivateTransfersDetails'
}

export function extractPrivateTransferDetails<S extends Strings>(
	content: Content<S>,
): PrivateTransfersDetailsProps | null {
	if (!isCustomContent(content)) {
		return null
	}

	if (!isPrivateTransferDetailsContent(content.component)) {
		return null
	}

	return content.component.componentProps
}

export function mergePrivateTransferDetails(
	details1: PrivateTransfersDetailsProps | null,
	details2: PrivateTransfersDetailsProps,
): Pick<PrivateTransfersDetailsProps, 'privateTransferDetails'> {
	if (details1 === null) {
		return details2
	}

	const mergedMap = new Map<PrivateTransferTechnology, PrivateTokenTransferDetails>()

	for (const [key, value] of details1.privateTransferDetails) {
		mergedMap.set(key, value)
	}

	for (const [key, value] of details2.privateTransferDetails) {
		if (!mergedMap.has(key)) {
			mergedMap.set(key, value)
		}
	}

	return {
		privateTransferDetails: mergedMap,
	}
}

export function privateTransfersDetailsContent(
	bakedProps: Omit<PrivateTransfersDetailsProps, keyof EvaluationData<PrivateTransfersValue>>,
): Content<{ WALLET_NAME: string }> {
	return component<PrivateTransfersDetailsContent, keyof typeof bakedProps>(
		'PrivateTransfersDetails',
		bakedProps,
	)
}
