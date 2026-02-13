import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import {
	HardwareWalletConnection,
	hardwareWalletConnectionIsOnlyWalletConnect,
	type HardwareWalletSupport,
	HardwareWalletType,
	hardwareWalletType,
	type SupportedHardwareWallet,
	supportsHardwareWalletTypesMarkdown,
} from '@/schema/features/security/hardware-wallet-support'
import { isSupported, notSupported, supported } from '@/schema/features/support'
import { popRefs, refNotNecessary } from '@/schema/reference'
import { WalletType } from '@/schema/wallet-types'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

export type HardwareWalletSupportValue = Value & {
	hardwareWalletSupport: HardwareWalletSupport
}

function noHardwareWalletSupport(
	hardwareWalletSupport: HardwareWalletSupport,
): Evaluation<HardwareWalletSupportValue> {
	return {
		value: {
			id: 'no_hardware_wallet_support',
			rating: Rating.FAIL,
			displayName: 'No hardware wallet support',
			shortExplanation: sentence('{{WALLET_NAME}} does not support hardware wallets.'),
			hardwareWalletSupport,
		},
		details: paragraph(`
			{{WALLET_NAME}} does not support hardware wallets.
		`),
		impact: paragraph(`
			 Hardware wallets provide an additional layer of security by keeping private keys offline.
		`),
		howToImprove: paragraph(`
			{{WALLET_NAME}} should add support for popular hardware wallets to improve security options for users.
		`),
	}
}

function indirectHardwareWalletSupport(
	hardwareWalletSupport: HardwareWalletSupport,
): Evaluation<HardwareWalletSupportValue> {
	return {
		value: {
			id: 'indirect_hardware_wallet_support',
			rating: Rating.PARTIAL,
			displayName: 'Indirect hardware wallet support',
			shortExplanation: sentence(`
				Using a hardware wallet with {{WALLET_NAME}} requires additional software.
			`),
			hardwareWalletSupport,
		},
		details:
			paragraph(`{{WALLET_NAME}} supports ${supportsHardwareWalletTypesMarkdown(hardwareWalletSupport.wallets, true)}

Direct connection is not possible.`),
		impact: paragraph(`
			Hardware wallets provide an additional layer of security by keeping private keys offline.

			Since connecting hardware wallets through WalletConnect requires additional software,
			this makes adoption and everyday usage of hardware wallets less likely for users
			relative to direct hardware wallet integration straight in {{WALLET_NAME}}.
		`),
		howToImprove: paragraph(`
			{{WALLET_NAME}} should directly integrate hardware wallet support.
		`),
	}
}

function directHardwareWalletSupport(
	hardwareWalletSupport: HardwareWalletSupport,
): Evaluation<HardwareWalletSupportValue> {
	return {
		value: {
			id: 'direct_hardware_wallet_support',
			rating: Rating.PASS,
			displayName: 'Supports hardware wallets',
			shortExplanation: sentence('{{WALLET_NAME}} supports hardware wallets.'),
			hardwareWalletSupport,
		},
		details: mdParagraph(
			`{{WALLET_NAME}} supports ${supportsHardwareWalletTypesMarkdown(hardwareWalletSupport.wallets, true)}`,
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

		When a software wallet supports hardware wallets, users can enjoy the
		convenience and features of the software wallet while maintaining the
		security benefits of keeping their private keys offline. This combination
		offers the best of both worlds: a user-friendly interface with enhanced security.
	`),
	methodology: markdown(`
		Wallets are evaluated based on whether it is possible to use them in
		conjunction with any physically-separate hardware wallet.
		This means the software wallet must provide the same level of
		functionality as when not using a hardware wallet, and the private key
		must never leave the hardware wallet.

		Wallets that require the use of a separate software component (e.g.
		WalletConnect to an external desktop application that does the actual
		interfacing with the hardware device) in order to use the hardware wallet
		get a partial rating. The need for this additional software component
		means the user has to do more work to get the hardware wallet working,
		which decreases the likelihood that users will actually do so in practice.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(`
				The wallet integrates any type of hardware wallet.
			`),
			directHardwareWalletSupport({
				ref: refNotNecessary,
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.USB],
					}),
				},
			}),
		),
		partial: [
			exampleRating(
				paragraph(`
				The wallet integrates any type hardware wallet, but requires the use
				of an additional software component in order to do so
				(e.g. WalletConnect).
			`),
				indirectHardwareWalletSupport({
					ref: refNotNecessary,
					wallets: {
						[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.WALLET_CONNECT],
						}),
					},
				}),
			),
		],
		fail: [
			exampleRating(
				paragraph(`
					The wallet does not support any hardware wallets.
				`),
				noHardwareWalletSupport({ wallets: {}, ref: refNotNecessary }),
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<HardwareWalletSupportValue> => {
		// If this is a hardware wallet, mark as exempt since hardware wallets inherently support themselves
		if (features.type === WalletType.HARDWARE) {
			return exempt(
				hardwareWalletSupport,
				sentence(
					'This attribute is not applicable for {{WALLET_NAME}} as it is a hardware wallet itself.',
				),
				{ hardwareWalletSupport: { wallets: {}, ref: refNotNecessary } },
			)
		}

		// @NOTE: regardless if a wallet is EOA-, 4337- or 7702-only it should not be exempt from this statistic
		// 	all such wallets have the opportunity to support hardware wallets to provide better security for the user

		if (features.security.hardwareWalletSupport === null) {
			return unrated(hardwareWalletSupport, {
				hardwareWalletSupport: { wallets: {}, ref: refNotNecessary },
			})
		}

		// Extract references from the hardware wallet support feature
		const { withoutRefs, refs: extractedRefs } = popRefs(features.security.hardwareWalletSupport)

		const hwSupport = hardwareWalletType.fullRecord(withoutRefs.wallets, notSupported)
		const numSupported = Object.entries(
			hardwareWalletType.filterRecord(hwSupport, (_, support) => isSupported(support)),
		).length

		const result = (() => {
			if (numSupported === 0) {
				return noHardwareWalletSupport(features.security.hardwareWalletSupport)
			}

			if (
				Object.entries(
					hardwareWalletType.filterRecord(
						hwSupport,
						(_, support) =>
							isSupported(support) &&
							hardwareWalletConnectionIsOnlyWalletConnect(support.connectionTypes),
					),
				).length === numSupported
			) {
				return indirectHardwareWalletSupport(features.security.hardwareWalletSupport)
			}

			return directHardwareWalletSupport(features.security.hardwareWalletSupport)
		})()

		if (numSupported === 0) {
			return noHardwareWalletSupport(features.security.hardwareWalletSupport)
		}

		return {
			...result,
			...(extractedRefs.length > 0 && { references: extractedRefs }),
		}
	},
	aggregate: pickWorstRating<HardwareWalletSupportValue>,
}
