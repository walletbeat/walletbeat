import type { ResolvedFeatures } from '@/schema/features'
import {
	Rating,
	type Value,
	type Attribute,
	type Evaluation,
	exampleRating,
} from '@/schema/attributes'
import { pickWorstRating, exempt, unrated, isErc4337SmartWallet } from '../common'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'
import type { WalletMetadata } from '@/schema/wallet'
import { isSupported } from '@/schema/features/support'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import type { AtLeastOneVariant } from '@/schema/variants'
import { WalletProfile } from '@/schema/features/profile'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { WalletTypeCategory, SmartWalletStandard } from '@/schema/features/wallet-type'
import { popRefs } from '@/schema/reference'

const brand = 'attributes.security.software_hw_integration'
export type SoftwareHWIntegrationValue = Value & {
	integrationLevel: number // 0 = none, 1 = basic, 2 = good, 3 = excellent
	__brand: 'attributes.security.software_hw_integration'
}

function noHardwareWalletSupport(): Evaluation<SoftwareHWIntegrationValue> {
	return {
		value: {
			id: 'no_hardware_wallet_support',
			rating: Rating.FAIL,
			displayName: 'No hardware wallet integration',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} does not support hardware wallets integration.
				`,
			),
			integrationLevel: 0,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} does not support connecting to any hardware wallets.
				Without hardware wallet support, users cannot leverage the security benefits of hardware wallets
				for transaction signing and key management.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should add support for hardware wallets, starting with popular options
				like Ledger and Trezor. This would allow users to keep their private keys secure on separate hardware
				devices while using the software interface.
			`,
		),
	}
}

function basicHardwareWalletIntegration(supportedWallets: string[] = []): Evaluation<SoftwareHWIntegrationValue> {
	const supportedWalletsText = supportedWallets.length > 0 
		? ` with ${supportedWallets.join(', ')}`
		: '';
	
	return {
		value: {
			id: 'basic_hw_integration',
			rating: Rating.PARTIAL,
			displayName: 'Basic hardware wallet integration',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} has basic hardware wallet integration${supportedWalletsText} but lacks full EIP-712 clear signing support on important dApps.
				`,
			),
			integrationLevel: 1,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} supports hardware wallet integration${supportedWalletsText}, but with limited
				functionality. It lacks full EIP-712 clear signing support when connecting to important DeFi applications like
				Safe or Aave. This means users cannot fully verify complex transaction details on their hardware device screens,
				which could potentially compromise security for advanced DeFi operations.
			`,
		),
		howToImprove: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should implement full EIP-712 clear signing support for transactions with
				Safe, Aave, and other major DeFi platforms. This would ensure users can verify all transaction details on
				their hardware devices before signing. ${wallet.metadata.displayName} should make sure to support the lastest hardware sdk such as  [Gridplus's](https://github.com/GridPlus/gridplus-sdk) or [Ledger's device management kit](https://developers.ledger.com/docs/device-interaction/getting-started).
			`,
		),
	}
}

function goodHardwareWalletIntegration(supportedWallets: string[] = [], supportedDApps: string[] = []): Evaluation<SoftwareHWIntegrationValue> {
	const supportedWalletsText = supportedWallets.length > 0 
		? ` with ${supportedWallets.join(', ')}`
		: '';
	
	const supportedDAppsText = supportedDApps.length > 0
		? supportedDApps.join(' or ')
		: 'one major DeFi platform';
	
	return {
		value: {
			id: 'good_hw_integration',
			rating: Rating.PARTIAL,
			displayName: 'Good hardware wallet integration',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} has good hardware wallet integration${supportedWalletsText} with EIP-712 clear signing support on ${supportedDAppsText}.
				`,
			),
			integrationLevel: 2,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} has solid hardware wallet integration${supportedWalletsText} with EIP-712 clear signing
				support on ${supportedDAppsText}. This means users can verify transaction details on their hardware
				device screens when using these specific platforms, but full integration across all major DeFi applications
				is not yet available.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should extend its EIP-712 clear signing support to include both Safe and Aave
				integrations with at least two different hardware wallet brands. This comprehensive support would provide users
				with maximum security across major DeFi platforms.
			`,
		),
	}
}

function excellentHardwareWalletIntegration(supportedWallets: string[] = []): Evaluation<SoftwareHWIntegrationValue> {
	const supportedWalletsText = supportedWallets.length > 0 
		? ` with ${supportedWallets.join(', ')}`
		: '';
	
	return {
		value: {
			id: 'excellent_hw_integration',
			rating: Rating.PASS,
			displayName: 'Excellent hardware wallet integration',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} has excellent hardware wallet integration${supportedWalletsText} with full EIP-712 clear signing on both Safe and Aave.
				`,
			),
			integrationLevel: 3,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} provides comprehensive hardware wallet integration${supportedWalletsText} with full 
				EIP-712 clear signing support on both Safe and Aave. Users can verify all transaction details directly on their 
				hardware wallet screens when interacting with these major DeFi platforms, providing the highest level of security
				for complex DeFi operations.
			`,
		),
	}
}

export const softwareHWIntegration: Attribute<SoftwareHWIntegrationValue> = {
	id: 'softwareHWIntegration',
	icon: '\u{1F517}', // Chain link
	displayName: 'Hardware wallet integration',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a software wallet's hardware wallet integration evaluated?",
		whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
			`What can ${walletMetadata.displayName} do to improve its hardware wallet integration?`,
	},
	question: sentence(`
		How well does the software wallet integrate with hardware wallets for clear signing?
	`),
	why: markdown(`
		Software wallets that integrate well with hardware wallets provide users with the best of both worlds:
		the convenience and feature-rich interface of software wallets, combined with the security of hardware
		key storage and transaction signing.
		
		EIP-712 clear signing is particularly important for DeFi applications like Safe (formerly Gnosis Safe)
		and Aave, where complex transaction parameters need to be verified to prevent attacks like blind signing
		exploits or transaction parameter manipulation.
		
		When a software wallet properly integrates with hardware wallets for clear signing on these platforms,
		users can confidently verify exactly what they're approving on their hardware device screen, even for
		complex smart contract interactions.
		
		Without proper integration, users may be forced to blind sign transactions or use less secure methods,
		significantly increasing security risks when interacting with DeFi protocols.
	`),
	methodology: markdown(`
		Software wallets are evaluated based on their integration with hardware wallets, particularly focusing
		on EIP-712 clear signing support with major DeFi platforms like Safe and Aave.
		
		A wallet receives a passing rating if it implements full EIP-712 clear signing support with at least
		two different hardware wallet brands (e.g., Ledger, Trezor) on both Safe and Aave. This means users can
		clearly verify all transaction details on their hardware wallet screens when interacting with these platforms.
		
		A wallet receives a partial rating if it implements EIP-712 clear signing but with limitations, such as
		supporting only one hardware wallet brand or only one of the major DeFi platforms (either Safe or Aave but not both).
		
		A wallet fails this attribute if it either doesn't support hardware wallets at all or supports hardware
		wallets but without implementing proper EIP-712 clear signing for DeFi applications.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(`
				The wallet implements full EIP-712 clear signing support with at least two different hardware
				wallet brands on both Safe and Aave platforms.
			`),
			excellentHardwareWalletIntegration().value,
		),
		partial: [
			exampleRating(
				paragraph(`
					The wallet implements EIP-712 clear signing support on either Safe or Aave (but not both),
					or supports only one hardware wallet brand for these integrations.
				`),
				goodHardwareWalletIntegration().value,
			),
			exampleRating(
				paragraph(`
					The wallet supports hardware wallet integration but lacks proper EIP-712 clear signing
					support for major DeFi platforms like Safe and Aave.
				`),
				basicHardwareWalletIntegration().value,
			),
		],
		fail: [
			exampleRating(
				paragraph(`
					The wallet does not support hardware wallet integration at all.
				`),
				noHardwareWalletSupport().value,
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<SoftwareHWIntegrationValue> => {
		// For hardware wallets, this evaluation doesn't apply
		if (features.profile === WalletProfile.HARDWARE) {
			return {
				value: {
					id: 'exempt_hardware_wallet',
					rating: Rating.EXEMPT,
					displayName: 'Not applicable for hardware wallets',
					shortExplanation: sentence(
						(walletMetadata: WalletMetadata) => `
							This attribute evaluates software wallet integration with hardware wallets, which is not applicable for ${walletMetadata.displayName} as it is a hardware wallet.
						`,
					),
					integrationLevel: 0,
					__brand: brand,
				},
				details: paragraph(
					({ wallet }) => `
						As ${wallet.metadata.displayName} is a hardware wallet itself, this attribute which evaluates
						how software wallets integrate with hardware wallets is not applicable.
					`,
				),
			}
		}
	
		// Check for ERC-4337 smart wallet
		if (isErc4337SmartWallet(features)) {
			return exempt(
				softwareHWIntegration, 
				sentence((walletMetadata: WalletMetadata) => 
					`This attribute is not applicable for ${walletMetadata.displayName} as it is an ERC-4337 smart contract wallet.`
				),
				brand,
				{ integrationLevel: 0 }
			)
		}

		// Check if hardware wallet support feature exists
		if (!features.security.hardwareWalletSupport) {
			return noHardwareWalletSupport()
		}
		
		// Extract references from hardware wallet support feature
		const { withoutRefs: hwSupportWithoutRefs, refs: hwSupportRefs } = 
			popRefs(features.security.hardwareWalletSupport);

		// Extract references from hardware wallet clear signing feature if it exists
		let hwClearSigningRefs = [];
		if (features.security.hardwareWalletClearSigning) {
			const { refs: extractedRefs } = popRefs(features.security.hardwareWalletClearSigning);
			hwClearSigningRefs = extractedRefs;
		}
		
		// Combine all references
		const allReferences = [...hwSupportRefs, ...hwClearSigningRefs];

		// Check if any hardware wallets are supported
		const hwSupport = hwSupportWithoutRefs.supportedWallets
		const hasHardwareWalletSupport = Object.values(hwSupport).some(support => support && isSupported(support))
		
		if (!hasHardwareWalletSupport) {
			return {
				...noHardwareWalletSupport(),
				...(allReferences.length > 0 && { references: allReferences }),
			}
		}
		
		// Get list of supported hardware wallets for display
		const supportedHardwareWallets = Object.entries(hwSupport)
			.filter(([_, support]) => support && isSupported(support))
			.map(([walletType]) => {
				switch(walletType) {
					case HardwareWalletType.LEDGER: return 'Ledger';
					case HardwareWalletType.TREZOR: return 'Trezor';
					case HardwareWalletType.GRIDPLUS: return 'GridPlus';
					case HardwareWalletType.KEYSTONE: return 'Keystone';
					case HardwareWalletType.KEEPKEY: return 'KeepKey';
					default: return 'Other hardware wallets';
				}
			});

		// Check for EIP-712 clear signing support on Safe and Aave
		// This would need to be added to the features schema to track this data
		// For now we'll use a placeholder implementation
		
		// Placeholder for checking if Safe integration exists with clear signing
		const hasSafeIntegration = features.security.hardwareWalletClearSigning?.clearSigningSupport?.details?.includes('Safe') || false;
		
		// Placeholder for checking if Aave integration exists with clear signing
		const hasAaveIntegration = features.security.hardwareWalletClearSigning?.clearSigningSupport?.details?.includes('Aave') || false;
		
		// Check how many hardware wallet brands are supported for these integrations
		const supportedHWBrands = supportedHardwareWallets.length;
		
		// Generate base evaluation result
		let result: Evaluation<SoftwareHWIntegrationValue>;
		
		// Determine integration level based on support
		if (hasSafeIntegration && hasAaveIntegration && supportedHWBrands >= 2) {
			result = excellentHardwareWalletIntegration(supportedHardwareWallets);
		} else if ((hasSafeIntegration || hasAaveIntegration) && supportedHWBrands >= 1) {
			const supportedDApps = [];
			if (hasSafeIntegration) supportedDApps.push('Safe');
			if (hasAaveIntegration) supportedDApps.push('Aave');
			result = goodHardwareWalletIntegration(supportedHardwareWallets, supportedDApps);
		} else {
			result = basicHardwareWalletIntegration(supportedHardwareWallets);
		}
		
		// Return result with references if any
		return {
			...result,
			...(allReferences.length > 0 && { references: allReferences }),
		};
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<SoftwareHWIntegrationValue>>) => {
		return pickWorstRating<SoftwareHWIntegrationValue>(perVariant)
	},
} 