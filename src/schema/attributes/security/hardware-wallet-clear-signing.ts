import type { ResolvedFeatures } from '@/schema/features'
import {
	Rating,
	type Value,
	type Attribute,
	type Evaluation,
	exampleRating,
} from '@/schema/attributes'
import { pickWorstRating, unrated } from '../common'
import { markdown, paragraph, sentence } from '@/types/content'
import type { WalletMetadata } from '@/schema/wallet'
import { isSupported } from '@/schema/features/support'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import type { AtLeastOneVariant } from '@/schema/variants'

const brand = 'attributes.security.hardware_wallet_clear_signing'
export type HardwareWalletClearSigningValue = Value & {
	clearSigningLevel: ClearSigningLevel
	__brand: 'attributes.security.hardware_wallet_clear_signing'
}

function noHardwareWalletSupport(): Evaluation<HardwareWalletClearSigningValue> {
	return {
		value: {
			id: 'no_hardware_wallet_support',
			rating: Rating.FAIL,
			displayName: 'No hardware wallet support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} does not support hardware wallets.
				`,
			),
			clearSigningLevel: ClearSigningLevel.NONE,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} does not support connecting to hardware wallets.
				Hardware wallets provide an additional layer of security by keeping private keys offline.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should add support for hardware wallets to improve security options for users.
			`,
		),
	}
}

function noHardwareWalletClearSigning(): Evaluation<HardwareWalletClearSigningValue> {
	return {
		value: {
			id: 'no_clear_signing',
			rating: Rating.FAIL,
			displayName: 'No clear signing support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} supports hardware wallets but without clear signing.
				`,
			),
			clearSigningLevel: ClearSigningLevel.NONE,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} supports hardware wallets but does not implement
				clear signing. Clear signing is important for security as it allows users to verify
				transaction details on their hardware wallet screen before signing.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should implement clear signing support for hardware wallets
				to improve security by allowing users to verify transaction details on their hardware device.
			`,
		),
	}
}

function basicClearSigning(): Evaluation<HardwareWalletClearSigningValue> {
	return {
		value: {
			id: 'basic_clear_signing',
			rating: Rating.PARTIAL,
			displayName: 'Basic clear signing support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} supports hardware wallets with basic clear signing.
				`,
			),
			clearSigningLevel: ClearSigningLevel.BASIC,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} supports hardware wallets with basic clear signing,
				but the implementation does not provide full transparency for all transaction details.
				Clear signing allows users to verify transaction details on their hardware wallet screen
				before signing, which is crucial for security.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should improve its clear signing implementation to provide
				full transparency for all transaction details on the hardware wallet screen.
			`,
		),
	}
}

function partialClearSigning(): Evaluation<HardwareWalletClearSigningValue> {
	return {
		value: {
			id: 'partial_clear_signing',
			rating: Rating.PARTIAL,
			displayName: 'Partial clear signing support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} supports hardware wallets with partial clear signing.
				`,
			),
			clearSigningLevel: ClearSigningLevel.PARTIAL,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} supports hardware wallets with partial clear signing.
				Most transaction details are displayed on the hardware wallet screen for verification,
				but some complex transactions may not show all details. Clear signing is crucial for
				security as it allows users to verify transaction details before signing.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should extend its clear signing implementation to cover
				all transaction types and ensure all details are clearly displayed on the hardware wallet screen.
			`,
		),
	}
}

function fullClearSigning(): Evaluation<HardwareWalletClearSigningValue> {
	return {
		value: {
			id: 'full_clear_signing',
			rating: Rating.PASS,
			displayName: 'Full clear signing support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} supports hardware wallets with full clear signing.
				`,
			),
			clearSigningLevel: ClearSigningLevel.FULL,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} supports hardware wallets with full clear signing implementation.
				All transaction details are clearly displayed on the hardware wallet screen for verification
				before signing, providing maximum security and transparency for users.
			`,
		),
	}
}

export const hardwareWalletClearSigning: Attribute<HardwareWalletClearSigningValue> = {
	id: 'hardwareWalletClearSigning',
	icon: '\u{1F50F}', // Lock with pen
	displayName: 'Hardware wallet clear signing',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's hardware wallet clear signing support evaluated?",
		whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
			`What can ${walletMetadata.displayName} do to improve hardware wallet clear signing support?`,
	},
	question: sentence(`
		Does the wallet support clear signing with hardware wallets?
	`),
	why: markdown(`
		Clear signing is a critical security feature for hardware wallets that allows users to verify
		transaction details directly on their hardware wallet's screen before signing. This verification
		step is crucial for preventing attacks where malicious software might attempt to trick users
		into signing transactions with different parameters than what they intended.
		
		Without clear signing, users must trust that the software wallet is displaying the correct
		transaction details and not manipulating them. With clear signing, the hardware wallet shows
		the actual transaction details that will be signed, providing an independent verification
		mechanism that significantly enhances security.
		
		Full clear signing implementations ensure that all relevant transaction details (recipient
		address, amount, fees, etc.) are clearly displayed on the hardware wallet screen, allowing
		users to make informed decisions before authorizing transactions.
	`),
	methodology: markdown(`
		Wallets are evaluated based on their implementation of clear signing with hardware wallets.
		
		A wallet receives a passing rating if it implements full clear signing, where all transaction
		details are clearly displayed on the hardware wallet screen for verification before signing.
		
		A wallet receives a partial rating if it implements clear signing but with limitations, such
		as not displaying all transaction details or not supporting clear signing for all transaction types.
		
		A wallet fails this attribute if it either doesn't support hardware wallets at all or supports
		hardware wallets but without implementing clear signing.
		
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(`
				The wallet implements full clear signing with hardware wallets, displaying all
				transaction details on the hardware wallet screen for verification before signing.
			`),
			fullClearSigning().value,
		),
		partial: [
			exampleRating(
				paragraph(`
					The wallet implements partial clear signing, where most but not all transaction
					details are displayed on the hardware wallet screen.
				`),
				partialClearSigning().value,
			),
			exampleRating(
				paragraph(`
					The wallet implements basic clear signing, but the implementation is limited
					and doesn't provide full transparency for all transaction details.
				`),
				basicClearSigning().value,
			),
		],
		fail: [
			exampleRating(
				paragraph(`
					The wallet supports hardware wallets but does not implement clear signing.
				`),
				noHardwareWalletClearSigning().value,
			),
			exampleRating(
				paragraph(`
					The wallet does not support hardware wallets at all.
				`),
				noHardwareWalletSupport().value,
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<HardwareWalletClearSigningValue> => {
		// Check if hardware wallet support feature exists
		if (!features.security.hardwareWalletSupport) {
			return noHardwareWalletSupport()
		}

		// Check if any hardware wallets are supported
		const hwSupport = features.security.hardwareWalletSupport.supportedWallets
		const hasHardwareWalletSupport = Object.values(hwSupport).some(support => support && isSupported(support))
		
		if (!hasHardwareWalletSupport) {
			return noHardwareWalletSupport()
		}

		// Check clear signing support
		if (!features.security.hardwareWalletClearSigning) {
			return unrated(hardwareWalletClearSigning, brand, { clearSigningLevel: ClearSigningLevel.NONE })
		}

		const clearSigningLevel = features.security.hardwareWalletClearSigning.clearSigningSupport.level

		switch (clearSigningLevel) {
			case ClearSigningLevel.NONE:
				return noHardwareWalletClearSigning()
			case ClearSigningLevel.BASIC:
				return basicClearSigning()
			case ClearSigningLevel.PARTIAL:
				return partialClearSigning()
			case ClearSigningLevel.FULL:
				return fullClearSigning()
			default:
				return unrated(hardwareWalletClearSigning, brand, { clearSigningLevel: ClearSigningLevel.NONE })
		}
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<HardwareWalletClearSigningValue>>) => {
		return pickWorstRating<HardwareWalletClearSigningValue>(perVariant)
	},
} 