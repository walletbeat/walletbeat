/**
 * Helper functions for extracting and generating references for wallet attributes
 */

import type { FullyQualifiedReference } from './reference'
import type { RatedWallet } from './wallet'

/**
 * Get references for a wallet's attribute
 */
export function getAttributeReferences(
	wallet: RatedWallet,
	attributeCategory: string,
	attributeId: string,
): FullyQualifiedReference[] {
	// Get the variant data to access features
	const selectedVariant = Object.keys(wallet.variants)[0]
	const variantData = wallet.variants[selectedVariant]

	if (!variantData) {
		return []
	}

	const features = variantData.features
	return []
}
