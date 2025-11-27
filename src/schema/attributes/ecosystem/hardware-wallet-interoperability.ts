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
	hardwareWalletTypeToString,
	type SupportedHardwareWallet,
	supportsHardwareWalletTypesMarkdown,
} from '@/schema/features/security/hardware-wallet-support'
import { isSupported, notSupported, supported } from '@/schema/features/support'
import { popRefs, refNotNecessary } from '@/schema/reference'
import { WalletType } from '@/schema/wallet-types'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'
import type { NonEmptyArray } from '@/types/utils/non-empty'

import { exempt, pickWorstRating, unrated } from '../common'

const brand = 'attributes.security.hardware_wallet_interoperability'

export type HardwareWalletInteroperabilityValue = Value & {
	hardwareWalletSupport: HardwareWalletSupport
	__brand: 'attributes.security.hardware_wallet_interoperability'
}

const majorHardwareWalletManufacturers: NonEmptyArray<HardwareWalletType> = [
	HardwareWalletType.LEDGER,
	HardwareWalletType.TREZOR,
	HardwareWalletType.KEYSTONE,
	HardwareWalletType.GRIDPLUS,
	HardwareWalletType.IMKEY,
]

const minMajorHardwareWalletManufacturers: number = 3

function extraWalletsThroughWalletConnectText(
	hardwareWalletSupport: HardwareWalletSupport,
): string {
	const hasExtraWalletsThroughWalletConnect =
		Object.entries(
			hardwareWalletType.filterRecord(
				hardwareWalletSupport.wallets,
				(_, support) =>
					isSupported(support) &&
					hardwareWalletConnectionIsOnlyWalletConnect(support.connectionTypes),
			),
		).length !==
		Object.entries(
			hardwareWalletType.filterRecord(hardwareWalletSupport.wallets, (_, support) =>
				isSupported(support),
			),
		).length

	if (!hasExtraWalletsThroughWalletConnect) {
		return ''
	}

	return 'Other wallets may be used through WalletConnect; however, their use requires WalletConnect as an intermediary and the use of an external application, making it more error-prone and difficult to use over direct hardware wallet integration.'
}

function singleHardwareWalletManufacturerSupport(
	hardwareWalletSupport: HardwareWalletSupport,
): Evaluation<HardwareWalletInteroperabilityValue> {
	return {
		value: {
			id: 'single_hardware_wallet_support',
			rating: Rating.FAIL,
			displayName: 'Supports only one hardware wallet manufacturer',
			shortExplanation: sentence(`
				{{WALLET_NAME}} only supports hardware wallets from a single major manufacturer.
			`),
			hardwareWalletSupport,
			__brand: brand,
		},
		details: mdParagraph(`
{{WALLET_NAME}} ${supportsHardwareWalletTypesMarkdown(hardwareWalletSupport.wallets, false)}

${extraWalletsThroughWalletConnectText(hardwareWalletSupport)}
		`),
		impact: mdParagraph(`
			The support of hardware wallets from a single manufacturer hinders
			hardware wallet ecosystem interoperability.
		`),
		howToImprove: paragraph(`
			{{WALLET_NAME}} should add direct support for popular hardware wallets to improve security options for users.
		`),
	}
}

function insufficientHardwareWalletManufacturerSupport(
	hardwareWalletSupport: HardwareWalletSupport,
): Evaluation<HardwareWalletInteroperabilityValue> {
	return {
		value: {
			id: 'insufficient_hardware_wallet_interoperability',
			rating: Rating.PARTIAL,
			displayName: 'Limited hardware wallet interoperability',
			shortExplanation: sentence(`
				{{WALLET_NAME}} supports a limited selection of hardware wallets.
			`),
			hardwareWalletSupport,
			__brand: brand,
		},
		details: mdParagraph(`
{{WALLET_NAME}} ${supportsHardwareWalletTypesMarkdown(hardwareWalletSupport.wallets, false)}

${extraWalletsThroughWalletConnectText(hardwareWalletSupport)}
		`),
		howToImprove: paragraph(`
			{{WALLET_NAME}} should add direct support for more popular hardware wallets to improve security options for users.
		`),
	}
}

function comprehensiveHardwareWalletSupport(
	hardwareWalletSupport: HardwareWalletSupport,
): Evaluation<HardwareWalletInteroperabilityValue> {
	return {
		value: {
			id: 'comprehensive_hardware_wallet_interoperability',
			rating: Rating.PASS,
			displayName: 'Interoperable hardware wallet support',
			shortExplanation: sentence('{{WALLET_NAME}} supports a wide range of hardware wallets.'),
			hardwareWalletSupport,
			__brand: brand,
		},
		details: mdParagraph(`
			{{WALLET_NAME}} ${supportsHardwareWalletTypesMarkdown(hardwareWalletSupport.wallets, false)}
		`),
	}
}

export const hardwareWalletInteroperability: Attribute<HardwareWalletInteroperabilityValue> = {
	id: 'hardwareWalletInteroperability',
	icon: '\u{1f9e9}', // Puzzle piece
	displayName: 'Hardware wallet interoperability',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's hardware wallet support evaluated?",
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do to improve hardware wallet support?',
		),
	},
	question: sentence(`
		Does the wallet support directly connecting to hardware wallets from a plurality of manufacturers?
	`),
	why: markdown(`
		Hardware wallets are physical devices that store a user's private keys offline,
		providing an additional layer of security against online threats. By keeping
		private keys isolated from internet-connected devices, hardware wallets protect
		users from malware, phishing attacks, and other security vulnerabilities that
		could compromise their funds.

		Supporting multiple hardware wallet manufacturers preserves a healthy,
		open, competitive, interoperable market for hardware wallets. It also
		increases the total addressable market of users for the software wallet,
		as users that already own a specific hardware wallets will want to use a
		software wallet that supports it.
	`),
	methodology: markdown(`
		Wallets are evaluated based on whether they directly integrate with
		hardware wallets from a plurality of major hardware wallet manufacturers.

		A wallet receives a passing rating if it supports hardware wallets from
		at least ${minMajorHardwareWalletManufacturers} major hardware wallet
		manufacturers:

		${majorHardwareWalletManufacturers
			.map(
				m => `
		* ${hardwareWalletTypeToString(m, null)}`,
			)
			.join('')}

		Hardware wallets accessible only through WalletConnect are not counted,
		as they require relying on WalletConnect and external software beyond the
		wallet itself in order to function.

		A wallet receives a partial rating if it supports only two such
		hardware wallets manufacturers (without relying on WalletConnect or
		external software).

		A wallet fails this attribute if it only directly supports hardware wallets
		from a single manufacturer.

		Wallets that do not directly support hardware wallets at all are exempt,
		as this check is only about hardware wallet *interoperability*.
		General direct hardware wallet support is also part of Walletbeat's
		security criteria as a separate attribute.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(`
				The wallet directly supports ${minMajorHardwareWalletManufacturers}
				major hardware wallet manufacturers. No additional software is
				necessary to use these hardware wallets (i.e. no need for
				WalletConnect with an external application).
			`),
			comprehensiveHardwareWalletSupport({
				ref: refNotNecessary,
				wallets: {
					[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.USB],
					}),
					[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.USB],
					}),
					[HardwareWalletType.KEYSTONE]: supported<SupportedHardwareWallet>({
						connectionTypes: [HardwareWalletConnection.USB],
					}),
				},
			}),
		),
		partial: [
			exampleRating(
				paragraph(`
					The wallet directly supports two major hardware wallet manufacturers.
					Other major hardware wallets are either unsupported, or require
					additional software in order to use.
				`),
				insufficientHardwareWalletManufacturerSupport({
					ref: refNotNecessary,
					wallets: {
						[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.USB],
						}),
						[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.WALLET_CONNECT],
						}),
						[HardwareWalletType.KEYSTONE]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.USB],
						}),
					},
				}),
			),
		],
		fail: [
			exampleRating(
				paragraph(`
					The wallet only directly supports one major hardware wallet manufacturer.
					Other major hardware wallets are either unsupported, or require
					additional software in order to use.
				`),
				singleHardwareWalletManufacturerSupport({
					ref: refNotNecessary,
					wallets: {
						[HardwareWalletType.LEDGER]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.USB],
						}),
						[HardwareWalletType.TREZOR]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.WALLET_CONNECT],
						}),
						[HardwareWalletType.KEYSTONE]: supported<SupportedHardwareWallet>({
							connectionTypes: [HardwareWalletConnection.WALLET_CONNECT],
						}),
					},
				}),
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<HardwareWalletInteroperabilityValue> => {
		if (features.type === WalletType.HARDWARE) {
			return exempt(
				hardwareWalletInteroperability,
				sentence(
					'This attribute is not applicable for {{WALLET_NAME}} as it is a hardware wallet itself.',
				),
				brand,
				{ hardwareWalletSupport: { ref: refNotNecessary, wallets: {} } },
			)
		}

		if (features.security.hardwareWalletSupport === null) {
			return unrated(hardwareWalletInteroperability, brand, {
				hardwareWalletSupport: { ref: refNotNecessary, wallets: {} },
			})
		}

		// Extract references from the hardware wallet support feature
		const { withoutRefs, refs: extractedRefs } = popRefs(features.security.hardwareWalletSupport)

		const hwSupport = hardwareWalletType.fullRecord(withoutRefs.wallets, notSupported)
		let majorManufacturerSupported = 0

		for (const manufacturer of majorHardwareWalletManufacturers) {
			if (!isSupported(hwSupport[manufacturer])) {
				continue
			}

			if (!hardwareWalletConnectionIsOnlyWalletConnect(hwSupport[manufacturer].connectionTypes)) {
				majorManufacturerSupported++
			}
		}

		const evaluation = (() => {
			switch (majorManufacturerSupported) {
				case 0:
					return exempt(
						hardwareWalletInteroperability,
						sentence('{{WALLET_NAME}} does not support any hardware wallet'),
						brand,
						{ hardwareWalletSupport: features.security.hardwareWalletSupport },
					)
				case 1:
					return singleHardwareWalletManufacturerSupport(features.security.hardwareWalletSupport)
				default:
					if (majorManufacturerSupported < minMajorHardwareWalletManufacturers) {
						return insufficientHardwareWalletManufacturerSupport(
							features.security.hardwareWalletSupport,
						)
					}

					return comprehensiveHardwareWalletSupport(features.security.hardwareWalletSupport)
			}
		})()

		return {
			...evaluation,
			...(extractedRefs.length > 0 && { references: extractedRefs }),
		}
	},
	aggregate: pickWorstRating<HardwareWalletInteroperabilityValue>,
}
