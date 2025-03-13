import type { ResolvedFeatures } from '@/schema/features'
import {
	Rating,
	type Value,
	type Attribute,
	type Evaluation,
	exampleRating,
} from '@/schema/attributes'
import { pickWorstRating, unrated, exempt } from '../common'
import { markdown, paragraph, sentence } from '@/types/content'
import type { WalletMetadata } from '@/schema/wallet'
import { isSupported } from '@/schema/features/support'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import type { AtLeastOneVariant } from '@/schema/variants'
import { WalletProfile } from '@/schema/features/profile'
import { isAccountTypeSupported } from '@/schema/features/account-support'

const brand = 'attributes.security.hardware_wallet_support'
export type HardwareWalletSupportValue = Value & {
	supportedHardwareWallets: HardwareWalletType[]
	__brand: 'attributes.security.hardware_wallet_support'
}

function noHardwareWalletSupport(): Evaluation<HardwareWalletSupportValue> {
	return {
		value: {
			id: 'no_hardware_wallet_support',
			rating: Rating.FAIL,
			displayName: 'No hardware wallet support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} does not support any hardware wallets.
				`,
			),
			supportedHardwareWallets: [],
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} does not support connecting to any hardware wallets.
				Hardware wallets provide an additional layer of security by keeping private keys offline.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should add support for popular hardware wallets to improve security options for users.
			`,
		),
	}
}

function limitedHardwareWalletSupport(
	supportedWallets: HardwareWalletType[],
): Evaluation<HardwareWalletSupportValue> {
	return {
		value: {
			id: 'limited_hardware_wallet_support',
			rating: Rating.PARTIAL,
			displayName: 'Limited hardware wallet support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} supports a limited selection of hardware wallets.
				`,
			),
			supportedHardwareWallets: supportedWallets,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} supports some hardware wallets, but not all major ones.
				Hardware wallets provide an additional layer of security by keeping private keys offline.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should expand support to include more popular hardware wallets
				to provide users with more security options.
			`,
		),
	}
}

function comprehensiveHardwareWalletSupport(
	supportedWallets: HardwareWalletType[],
): Evaluation<HardwareWalletSupportValue> {
	return {
		value: {
			id: 'comprehensive_hardware_wallet_support',
			rating: Rating.PASS,
			displayName: 'Comprehensive hardware wallet support',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} supports a wide range of hardware wallets.
				`,
			),
			supportedHardwareWallets: supportedWallets,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} supports a comprehensive range of hardware wallets,
				including the most popular options. Hardware wallets provide an additional layer of
				security by keeping private keys offline.
			`,
		),
	}
}

export const hardwareWalletSupport: Attribute<HardwareWalletSupportValue> = {
	id: 'hardwareWalletSupport',
	icon: '\u{1F5DD}', // Key emoji
	displayName: 'Hardware wallet support',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's hardware wallet support evaluated?",
		whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
			`What can ${walletMetadata.displayName} do to improve hardware wallet support?`,
	},
	question: sentence(`
		Does the wallet support connecting to hardware wallets?
	`),
	why: markdown(`
		Hardware wallets are physical devices that store a user's private keys offline,
		providing an additional layer of security against online threats. By keeping
		private keys isolated from internet-connected devices, hardware wallets protect
		users from malware, phishing attacks, and other security vulnerabilities that
		could compromise their funds.
		
		When a software wallet supports hardware wallet integration, users can enjoy
		the convenience and features of the software wallet while maintaining the
		security benefits of keeping their private keys offline. This combination
		offers the best of both worlds: a user-friendly interface with enhanced security.
		
		Supporting multiple hardware wallet options gives users flexibility to choose
		the hardware solution that best fits their needs and preferences.
	`),
	methodology: markdown(`
		Wallets are evaluated based on their support for popular hardware wallet devices.
		
		A wallet receives a passing rating if it supports all four major hardware
		wallet brands: Ledger, Trezor, Keystone, and GridPlus, allowing users to perform all
		essential operations using these hardware wallets.
		
		A wallet receives a partial rating if it supports at least one hardware wallet
		brand but doesn't support all four major brands mentioned above.
		
		A wallet fails this attribute if it doesn't support any hardware wallets.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(`
				The wallet supports all four major hardware wallet brands: Ledger, Trezor, 
				Keystone, and GridPlus, with full functionality.
			`),
			comprehensiveHardwareWalletSupport([
				HardwareWalletType.LEDGER,
				HardwareWalletType.TREZOR,
				HardwareWalletType.KEYSTONE,
				HardwareWalletType.GRIDPLUS,
			]).value,
		),
		partial: [
			exampleRating(
				paragraph(`
					The wallet supports at least one hardware wallet brand, but not multiple
					major brands or has limited functionality.
				`),
				limitedHardwareWalletSupport([HardwareWalletType.LEDGER]).value,
			),
		],
		fail: [
			exampleRating(
				paragraph(`
					The wallet does not support any hardware wallets.
				`),
				noHardwareWalletSupport().value,
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<HardwareWalletSupportValue> => {
		// If this is a hardware wallet, mark as exempt since hardware wallets inherently support themselves
		if (features.profile === WalletProfile.HARDWARE) {
			return exempt(
				hardwareWalletSupport, 
				sentence((walletMetadata: WalletMetadata) => 
					`This attribute is not applicable for ${walletMetadata.displayName} as it is a hardware wallet itself.`
				),
				brand,
				{ supportedHardwareWallets: [] }
			)
		}

        // Check for ERC-4337 smart wallet support in accountSupport
        if (features.accountSupport !== null && 
            features.accountSupport.rawErc4337 !== undefined && 
            isAccountTypeSupported(features.accountSupport.rawErc4337)) {
            return exempt(
				hardwareWalletSupport, 
				sentence((walletMetadata: WalletMetadata) => 
					`This attribute is not applicable for ${walletMetadata.displayName} as it is an ERC-4337 smart contract wallet.`
				),
				brand,
				{ supportedHardwareWallets: [] }
			)
        }

		if (features.security.hardwareWalletSupport === undefined || features.security.hardwareWalletSupport === null) {
			return unrated(hardwareWalletSupport, brand, { supportedHardwareWallets: [] })
		}

		const supportedWallets: HardwareWalletType[] = []
		const hwSupport = features.security.hardwareWalletSupport.supportedWallets

		// Check which hardware wallets are supported
		Object.entries(hwSupport).forEach(([walletType, support]) => {
			if (support && isSupported(support)) {
				// Type assertion is safe because we're iterating over keys of hwSupport
				// which are HardwareWalletType values
				// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we're iterating over hwSupport keys
				supportedWallets.push(walletType as HardwareWalletType)
			}
		})

		if (supportedWallets.length === 0) {
			return noHardwareWalletSupport()
		}

		const hasLedger = supportedWallets.includes(HardwareWalletType.LEDGER)
		const hasTrezor = supportedWallets.includes(HardwareWalletType.TREZOR)
		const hasKeystone = supportedWallets.includes(HardwareWalletType.KEYSTONE)
		// Used for future expansion
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Kept for future use
		const hasKeepkey = supportedWallets.includes(HardwareWalletType.KEEPKEY)
		const hasGridplus = supportedWallets.includes(HardwareWalletType.GRIDPLUS)

		if (hasLedger && hasTrezor && hasKeystone && hasGridplus) {
			return comprehensiveHardwareWalletSupport(supportedWallets)
		}

		return limitedHardwareWalletSupport(supportedWallets)
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<HardwareWalletSupportValue>>) => {
		const worstEvaluation = pickWorstRating<HardwareWalletSupportValue>(perVariant)
		
		// Combine all supported hardware wallets across variants
		const allSupportedWallets = new Set<HardwareWalletType>()
		
		Object.values(perVariant).forEach(evaluation => {
			evaluation.value.supportedHardwareWallets.forEach(wallet => {
				allSupportedWallets.add(wallet)
			})
		})
		
		worstEvaluation.value.supportedHardwareWallets = Array.from(allSupportedWallets)
		return worstEvaluation
	},
}