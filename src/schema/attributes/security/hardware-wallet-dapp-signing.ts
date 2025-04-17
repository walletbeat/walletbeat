import type { ResolvedFeatures } from '@/schema/features'
import {
	Rating,
	type Value,
	type Attribute,
	type Evaluation,
	exampleRating,
} from '@/schema/attributes'
import { pickWorstRating, unrated, exempt } from '../common'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'
import type { WalletMetadata } from '@/schema/wallet'
import { DappSigningLevel } from '@/schema/features/security/hardware-wallet-dapp-signing'
import { Variant, type AtLeastOneVariant } from '@/schema/variants'
import { refs } from '@/schema/reference'
import { AccountType, supportsOnlyAccountType } from '@/schema/features/account-support'

const brand = 'attributes.security.hardware_wallet_dapp_signing'
export type HardwareWalletDappSigningValue = Value & {
	dappSigningLevel: DappSigningLevel
	__brand: 'attributes.security.hardware_wallet_dapp_signing'
}

function noHardwareWalletSupport(): Evaluation<HardwareWalletDappSigningValue> {
	return {
		value: {
			id: 'no_hardware_wallet_support',
			rating: Rating.FAIL,
			displayName: 'No dApp signing due to no hardware wallet support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} does not support hardware wallets, so dApp signing is not possible.
				`,
			),
			dappSigningLevel: DappSigningLevel.NONE,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} does not support connecting to any hardware wallets.
				Without hardware wallet support, dApp signing is not possible. dApp signing allows users to
				verify transaction details directly on the hardware wallet's screen before signing.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should add support for hardware wallets to enable dApp signing,
				which enhances security by allowing users to verify transaction details on a separate device.
			`,
		),
	}
}

function noDappSigning(): Evaluation<HardwareWalletDappSigningValue> {
	return {
		value: {
			id: 'no_dapp_signing',
			rating: Rating.FAIL,
			displayName: 'No dApp signing support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} supports hardware wallets but without dApp signing.
				`,
			),
			dappSigningLevel: DappSigningLevel.NONE,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} supports hardware wallets but does not implement
				dApp signing. dApp signing is important for security as it allows users to verify
				transaction details on their hardware wallet screen before signing.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should implement dApp signing support for hardware wallets
				to improve security by allowing users to verify transaction details on their hardware device.
			`,
		),
	}
}

function basicDappSigning(
	supportedWallets: string[] = [],
): Evaluation<HardwareWalletDappSigningValue> {
	const supportedWalletsText =
		supportedWallets.length > 0 ? ` through ${supportedWallets.join(', ')}` : ''

	return {
		value: {
			id: 'basic_dapp_signing',
			rating: Rating.PARTIAL,
			displayName: 'Basic dApp signing support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} supports hardware wallets with basic dApp signing${supportedWalletsText}.
				`,
			),
			dappSigningLevel: DappSigningLevel.BASIC,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} supports hardware wallets with basic dApp signing${supportedWalletsText},
				but the implementation does not provide full transparency for all transaction details.
				dApp signing allows users to verify transaction details on their hardware wallet screen
				before signing, which is crucial for security.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should improve its dApp signing implementation to provide
				full transparency for all transaction details on the hardware wallet screen.
			`,
		),
	}
}

function partialDappSigning(
	supportedWallets: string[] = [],
): Evaluation<HardwareWalletDappSigningValue> {
	const supportedWalletsText =
		supportedWallets.length > 0 ? ` through ${supportedWallets.join(', ')}` : ''

	return {
		value: {
			id: 'partial_dapp_signing',
			rating: Rating.PARTIAL,
			displayName: 'Partial dApp signing support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} supports hardware wallets with partial dApp signing${supportedWalletsText}.
				`,
			),
			dappSigningLevel: DappSigningLevel.PARTIAL,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} supports hardware wallets with partial dApp signing${supportedWalletsText}.
				Most transaction details are displayed on the hardware wallet screen for verification,
				but some complex transactions may not show all details. dApp signing is crucial for
				security as it allows users to verify transaction details before signing.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should extend its dApp signing implementation to cover
				all transaction types and ensure all details are clearly displayed on the hardware wallet screen.
			`,
		),
	}
}

function fullDappSigning(
	supportedWallets: string[] = [],
	refs: Array<{ url: string; explanation: string }> = [],
): Evaluation<HardwareWalletDappSigningValue> {
	const supportedWalletsText =
		supportedWallets.length > 0 ? ` through ${supportedWallets.join(', ')}` : ''

	return {
		value: {
			id: 'full_dapp_signing',
			rating: Rating.PASS,
			displayName: 'Full dApp signing support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} supports hardware wallets with full dApp signing${supportedWalletsText}.
				`,
			),
			dappSigningLevel: DappSigningLevel.FULL,
			__brand: brand,
		},
		details: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} supports hardware wallets with full dApp signing implementation${supportedWalletsText}.
				All transaction details are clearly displayed on the hardware wallet screen for verification
				before signing, providing maximum security and transparency for users.
			`,
		),
		// Include references if provided
		references: refs.length > 0 ? refs : undefined,
	}
}

export const hardwareWalletDappSigning: Attribute<HardwareWalletDappSigningValue> = {
	id: 'hardwareWalletDappSigning',
	icon: '\u{1F50F}', // Lock with pen
	displayName: 'Hardware Wallet dApp Signing',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's hardware wallet dApp signing support evaluated?",
		whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
			`What can ${walletMetadata.displayName} do to improve hardware wallet dApp signing support?`,
	},
	question: sentence(`
		Does the wallet support secure dApp signing with hardware wallets?
	`),
	why: markdown(`
		dApp Signing is a critical security feature for hardware wallets that allows users to verify
		transaction details directly on their hardware wallet's screen before signing. This verification
		step is crucial for preventing attacks where malicious software might attempt to trick users
		into signing transactions with different parameters than what they intended.
		
		Without dApp signing, users must trust that the software wallet is displaying the correct
		transaction details and not manipulating them. With dApp signing, the hardware wallet shows
		the actual transaction details that will be signed, providing an independent verification
		mechanism that significantly enhances security.
		
		Full dApp signing implementations ensure that all relevant transaction details (recipient
		address, amount, fees, etc.) are clearly displayed on the hardware wallet screen, allowing
		users to make informed decisions before authorizing transactions.
	`),
	methodology: markdown(`
		Hardware wallets are evaluated based on their implementation of dApp signing capabilities.
		
		A hardware wallet receives a passing rating if it implements full dApp signing, where all transaction
		details are clearly displayed on the hardware wallet screen for verification before signing. This includes
		support for standard transactions, ERC-20 token transfers, 712 messages and complex contract interactions. 

		The hardware should be able to **display clearly all transaction types on Safe, Aave and Uniswap.**
		To do so **the hardware MUST be able to connect directly to the dapp or allow the user to use at least two different software wallets independent from the hardware manufacturer**.
    
		
		A hardware wallet receives a partial rating if it implements dApp signing but with limitations, such
		as not displaying all transaction details or not supporting dApp signing for all transaction types. Or if the hardware supports only one independent software wallet. Or if the hardware supports only 1/3 of the dapps.
		
		A hardware wallet fails this attribute if it doesn't properly implement dApp signing functionality,
		requiring users to trust the connected software wallet without independent verification.
		
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(`
				The wallet implements full dApp signing with hardware wallets, displaying all
				transaction details on the hardware wallet screen for verification before signing.
			`),
			fullDappSigning().value,
		),
		partial: [
			exampleRating(
				paragraph(`
					The wallet implements partial dApp signing, where most but not all transaction
					details are displayed on the hardware wallet screen.
				`),
				partialDappSigning().value,
			),
			exampleRating(
				paragraph(`
					The wallet implements basic dApp signing, but the implementation is limited
					and doesn't provide full transparency for all transaction details.
				`),
				basicDappSigning().value,
			),
		],
		fail: [
			exampleRating(
				paragraph(`
					The wallet supports hardware wallets but does not implement dApp signing.
				`),
				noDappSigning().value,
			),
			exampleRating(
				paragraph(`
					The wallet does not support hardware wallets at all.
				`),
				noHardwareWalletSupport().value,
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<HardwareWalletDappSigningValue> => {
		// For hardware wallets themselves:
		// This evaluates the hardware wallet's own dApp signing capabilities
		switch (features.variant) {
			case Variant.HARDWARE:
				// Check if dApp signing feature exists
				if (!features.security.hardwareWalletDappSigning) {
					return unrated(hardwareWalletDappSigning, brand, {
						dappSigningLevel: DappSigningLevel.NONE,
					})
				}

				// Extract references from the hardware wallet dApp signing feature
				const references = refs(features.security.hardwareWalletDappSigning)

				const dappSigningLevel = features.security.hardwareWalletDappSigning.level

				// Combine extracted references with standard references if any

				let result: Evaluation<HardwareWalletDappSigningValue>

				switch (dappSigningLevel) {
					case DappSigningLevel.NONE:
						result = noDappSigning()
						break
					case DappSigningLevel.BASIC:
						result = basicDappSigning(['this hardware wallet'])
						break
					case DappSigningLevel.PARTIAL:
						result = partialDappSigning(['this hardware wallet'])
						break
					case DappSigningLevel.FULL:
						result = fullDappSigning(['this hardware wallet'])
						break
					default:
						return unrated(hardwareWalletDappSigning, brand, {
							dappSigningLevel: DappSigningLevel.NONE,
						})
				}

				// Return result with references
				return {
					references,
					...result,
				}

			default:
				// Check for ERC-4337 smart wallet
				if (supportsOnlyAccountType(features.accountSupport, AccountType.rawErc4337)) {
					return exempt(
						hardwareWalletDappSigning,
						sentence(
							(walletMetadata: WalletMetadata) =>
								`This attribute is not applicable for ${walletMetadata.displayName} as it is an ERC-4337 smart contract wallet.`,
						),
						brand,
						{ dappSigningLevel: DappSigningLevel.NONE },
					)
				}

				// For software wallets:
				// Make this attribute exempt as it should only apply to hardware wallets
				return {
					value: {
						id: 'exempt_software_wallet',
						rating: Rating.EXEMPT,
						displayName: 'Only applicable for hardware wallets',
						shortExplanation: sentence(
							'This attribute evaluates hardware wallet dApp signing capabilities and is not applicable for software wallets.',
						),
						dappSigningLevel: DappSigningLevel.NONE,
						__brand: brand,
					},
					details: paragraph(
						({ wallet }) => `
							As ${wallet.metadata.displayName} is a software wallet, this attribute which evaluates
							hardware wallet dApp signing capabilities is not applicable. Please see the hardware wallet
							integration attribute for how well this software wallet connects to hardware wallets.
						`,
					),
				}
		}
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<HardwareWalletDappSigningValue>>) =>
		pickWorstRating<HardwareWalletDappSigningValue>(perVariant),
}
