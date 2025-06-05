import {
	type Attribute,
	type Evaluation,
	Rating,
	type Value,
	exampleRating,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { AccountType, supportsOnlyAccountType } from '@/schema/features/account-support'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { isSupported } from '@/schema/features/support'
import { popRefs } from '@/schema/reference'
import { type AtLeastOneVariant, Variant } from '@/schema/variants'
import { markdown, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

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
			shortExplanation: sentence('{{WALLET_NAME}} does not support any hardware wallets.'),
			supportedHardwareWallets: [],
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} does not support connecting to any hardware wallets. Hardware wallets provide an additional layer of security by keeping private keys offline.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should add support for popular hardware wallets to improve security options for users.',
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
				'{{WALLET_NAME}} supports a limited selection of hardware wallets.',
			),
			supportedHardwareWallets: supportedWallets,
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} supports some hardware wallets, but not all major ones. Hardware wallets provide an additional layer of security by keeping private keys offline.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should expand support to include more popular hardware wallets to provide users with more security options.',
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
			shortExplanation: sentence('{{WALLET_NAME}} supports a wide range of hardware wallets.'),
			supportedHardwareWallets: supportedWallets,
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} supports a comprehensive range of hardware wallets, including the most popular options. Hardware wallets provide an additional layer of security by keeping private keys offline.',
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
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do to improve hardware wallet support?',
		),
	},
	question: sentence('Does the wallet support connecting to hardware wallets?'),
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
		
		A wallet receives a passing rating if it supports 3 out of 4 major hardware
		wallet brands: Ledger, Trezor, Keystone, and GridPlus. Allowing users to perform all
		essential operations using these hardware wallets.
		
		A wallet receives a partial rating if it supports at least one hardware wallet
		brand but doesn't support 3 out of 4 major brands mentioned above.
		
		A wallet fails this attribute if it doesn't support any hardware wallets.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(`  
				The wallet supports 3 out of 4 major hardware wallet brands: Ledger, Trezor, 
				Keystone, and GridPlus.
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
		if (features.variant === Variant.HARDWARE) {
			return exempt(
				hardwareWalletSupport,
				sentence(
					'This attribute is not applicable for {{WALLET_NAME}} as it is a hardware wallet itself.',
				),
				brand,
				{ supportedHardwareWallets: [] },
			)
		}

		// @NOTE: regardless if a wallet is EOA-, 4337- or 7702-only it is should not be exempt from this statistic
		// 	all such wallet have the opportunity to support hardware wallet to provide better security for the user
		// Check for ERC-4337 smart wallet support
		if (supportsOnlyAccountType(features.accountSupport, AccountType.rawErc4337)) {
			return exempt(
				hardwareWalletSupport,
				sentence(
					'This attribute is not applicable for {{WALLET_NAME}} as it is an ERC-4337 smart contract wallet.',
				),
				brand,
				{ supportedHardwareWallets: [] },
			)
		}

		if (features.security.hardwareWalletSupport === null) {
			return unrated(hardwareWalletSupport, brand, {
				supportedHardwareWallets: [],
			})
		}

		// Extract references from the hardware wallet support feature
		const { withoutRefs, refs: extractedRefs } = popRefs(features.security.hardwareWalletSupport)

		const supportedWallets: HardwareWalletType[] = []
		const hwSupport = withoutRefs.supportedWallets

		// Check which hardware wallets are supported
		Object.entries(hwSupport).forEach(([walletType, support]) => {
			if (isSupported(support)) {
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
		const hasGridplus = supportedWallets.includes(HardwareWalletType.GRIDPLUS)

		// Used for future expansion
		// const hasKeepkey = supportedWallets.includes(HardwareWalletType.KEEPKEY)

		// Generate the base evaluation result
		const result: Evaluation<HardwareWalletSupportValue> =
			hasLedger && hasTrezor && hasKeystone && hasGridplus
				? comprehensiveHardwareWalletSupport(supportedWallets)
				: limitedHardwareWalletSupport(supportedWallets)

		// Return result with references if any
		return {
			...result,
			...(extractedRefs.length > 0 && { references: extractedRefs }),
		}
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
