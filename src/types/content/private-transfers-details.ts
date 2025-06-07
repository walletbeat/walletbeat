import type { EvaluationData } from '@/schema/attributes'
import type { PrivateTransfersValue } from '@/schema/attributes/privacy/private-transfers'
import type { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'

import {
	component,
	type ComponentAndProps,
	type Content,
	isCustomContent,
	type Paragraph,
} from '../content'
import type { Strings } from '../utils/string-templates'

interface PrivateTokenTransferDetails {
	sendingDetails: Paragraph
	receivingDetails: Paragraph
	spendingDetails: Paragraph
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
): Map<PrivateTransferTechnology, PrivateTokenTransferDetails> | null {
	if (!isCustomContent(content)) {
		return null
	}

	if (!isPrivateTransferDetailsContent(content.component)) {
		return null
	}

	return content.component.componentProps.privateTransferDetails
}

export function mergePrivateTransferDetails(
	map1: Map<PrivateTransferTechnology, PrivateTokenTransferDetails> | null,
	map2: Map<PrivateTransferTechnology, PrivateTokenTransferDetails>,
): Map<PrivateTransferTechnology, PrivateTokenTransferDetails> {
	if (map1 === null) {
		return map2
	}

	const mergedMap = new Map<PrivateTransferTechnology, PrivateTokenTransferDetails>()

	for (const [key, value] of map1) {
		mergedMap.set(key, value)
	}

	for (const [key, value] of map2) {
		if (!mergedMap.has(key)) {
			mergedMap.set(key, value)
		}
	}

	return mergedMap
}

export function privateTransfersDetailsContent(
	bakedProps: Omit<PrivateTransfersDetailsProps, keyof EvaluationData<PrivateTransfersValue>>,
): Content<{ WALLET_NAME: string }> {
	return component<PrivateTransfersDetailsContent, keyof typeof bakedProps>(
		'PrivateTransfersDetails',
		bakedProps,
	)
}
