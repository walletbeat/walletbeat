import type { ResolvedFeatures } from '@/schema/features'
import {
	Rating,
	type Value,
	type Attribute,
	type Evaluation,
	exampleRating,
} from '@/schema/attributes'
import { pickWorstRating, unrated, isErc4337SmartWallet, exempt } from '../common'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'
import type { WalletMetadata } from '@/schema/wallet'
import { isSupported } from '@/schema/features/support'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import type { AtLeastOneVariant } from '@/schema/variants'
import { WalletProfile } from '@/schema/features/profile'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { WalletTypeCategory, SmartWalletStandard } from '@/schema/features/wallet-type'
import { popRefs } from '@/schema/reference'

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
			displayName: 'No clear signing due to no hardware wallet support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} does not support hardware wallets, so clear signing is not possible.
				`,
			),
			clearSigningLevel: ClearSigningLevel.NONE,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} does not support connecting to any hardware wallets.
				Without hardware wallet support, clear signing is not possible. Clear signing allows users to
				verify transaction details directly on the hardware wallet's screen before signing.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should add support for hardware wallets to enable clear signing,
				which enhances security by allowing users to verify transaction details on a separate device.
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

function basicClearSigning(supportedWallets: string[] = []): Evaluation<HardwareWalletClearSigningValue> {
	const supportedWalletsText = supportedWallets.length > 0 
		? ` through ${supportedWallets.join(', ')}`
		: '';
	
	return {
		value: {
			id: 'basic_clear_signing',
			rating: Rating.PARTIAL,
			displayName: 'Basic clear signing support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} supports hardware wallets with basic clear signing${supportedWalletsText}.
				`,
			),
			clearSigningLevel: ClearSigningLevel.BASIC,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} supports hardware wallets with basic clear signing${supportedWalletsText},
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

function partialClearSigning(supportedWallets: string[] = []): Evaluation<HardwareWalletClearSigningValue> {
	const supportedWalletsText = supportedWallets.length > 0 
		? ` through ${supportedWallets.join(', ')}`
		: '';
	
	return {
		value: {
			id: 'partial_clear_signing',
			rating: Rating.PARTIAL,
			displayName: 'Partial clear signing support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} supports hardware wallets with partial clear signing${supportedWalletsText}.
				`,
			),
			clearSigningLevel: ClearSigningLevel.PARTIAL,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} supports hardware wallets with partial clear signing${supportedWalletsText}.
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

function fullClearSigning(
	supportedWallets: string[] = [], 
	refs: Array<{ url: string, explanation: string }> = []
): Evaluation<HardwareWalletClearSigningValue> {
	const supportedWalletsText = supportedWallets.length > 0 
		? ` through ${supportedWallets.join(', ')}`
		: '';
	
	return {
		value: {
			id: 'full_clear_signing',
			rating: Rating.PASS,
			displayName: 'Full clear signing support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} supports hardware wallets with full clear signing${supportedWalletsText}.
				`,
			),
			clearSigningLevel: ClearSigningLevel.FULL,
			__brand: brand,
		},
		details: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} supports hardware wallets with full clear signing implementation${supportedWalletsText}.
				All transaction details are clearly displayed on the hardware wallet screen for verification
				before signing, providing maximum security and transparency for users.
			`,
		),
		// Include references if provided
		references: refs.length > 0 ? refs : undefined,
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
		Hardware wallets are evaluated based on their implementation of clear signing capabilities.
		
		A hardware wallet receives a passing rating if it implements full clear signing, where all transaction
		details are clearly displayed on the hardware wallet screen for verification before signing. This includes
		support for standard transactions, ERC-20 token transfers, 712 messages and complex contract interactions. 

		The hardware should be able to clear sign all transaction types on Safe and Aave.
		To do so the hardware should be able to connect directly to the dapp or allow the user to use at least two different software wallets independent from the hardware manufacturer.
    
		
		A hardware wallet receives a partial rating if it implements clear signing but with limitations, such
		as not displaying all transaction details or not supporting clear signing for all transaction types.
		
		A hardware wallet fails this attribute if it doesn't properly implement clear signing functionality,
		requiring users to trust the connected software wallet without independent verification.
		
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
		// For hardware wallets themselves:
		// This evaluates the hardware wallet's own clear signing capabilities
		if (features.profile === WalletProfile.HARDWARE) {
			// Check if clear signing feature exists
			if (!features.security.hardwareWalletClearSigning) {
				return unrated(hardwareWalletClearSigning, brand, { clearSigningLevel: ClearSigningLevel.NONE })
			}
			
			// Extract references from the hardware wallet clear signing feature
			const { withoutRefs, refs: extractedRefs } = popRefs(features.security.hardwareWalletClearSigning);

			const clearSigningLevel = withoutRefs.clearSigningSupport.level;
			
			// Use a simpler approach for now - we'll just include a standard reference for devices with full clear signing
			let standardRefs = [];
			if (clearSigningLevel === ClearSigningLevel.FULL) {
				standardRefs = [
					{
						url: "https://ethereum.org/en/security/#hardware-wallets",
						explanation: "More information about hardware wallet security"
					}
				];
			}
			
			// Combine extracted references with standard references if any
			const allReferences = [...extractedRefs, ...standardRefs];

			let result: Evaluation<HardwareWalletClearSigningValue>;
			
			switch (clearSigningLevel) {
				case ClearSigningLevel.NONE:
					result = noHardwareWalletClearSigning();
					break;
				case ClearSigningLevel.BASIC:
					result = basicClearSigning(['this hardware wallet']);
					break;
				case ClearSigningLevel.PARTIAL:
					result = partialClearSigning(['this hardware wallet']);
					break;
				case ClearSigningLevel.FULL:
					result = fullClearSigning(['this hardware wallet']);
					break;
				default:
					return unrated(hardwareWalletClearSigning, brand, { clearSigningLevel: ClearSigningLevel.NONE });
			}
			
			// Return result with references
			return {
				...result,
				...(allReferences.length > 0 && { references: allReferences }),
			};
		}
		
		// Check for ERC-4337 smart wallet
		if (isErc4337SmartWallet(features)) {
			return exempt(
				hardwareWalletClearSigning, 
				sentence((walletMetadata: WalletMetadata) => 
					`This attribute is not applicable for ${walletMetadata.displayName} as it is an ERC-4337 smart contract wallet.`
				),
				brand,
				{ clearSigningLevel: ClearSigningLevel.NONE }
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
					(walletMetadata: WalletMetadata) => `
						This attribute evaluates hardware wallet clear signing capabilities and is not applicable for software wallets.
					`,
				),
				clearSigningLevel: ClearSigningLevel.NONE,
				__brand: brand,
			},
			details: paragraph(
				({ wallet }) => `
					As ${wallet.metadata.displayName} is a software wallet, this attribute which evaluates
					hardware wallet clear signing capabilities is not applicable. Please see the hardware wallet 
					integration attribute for how well this software wallet connects to hardware wallets.
				`,
			),
		}
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<HardwareWalletClearSigningValue>>) => {
		return pickWorstRating<HardwareWalletClearSigningValue>(perVariant)
	},
} 