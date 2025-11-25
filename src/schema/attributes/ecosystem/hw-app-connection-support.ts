import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { AccountType, supportsOnlyAccountType } from '@/schema/features/account-support'
import type { AppConnectionMethodDetails } from '@/schema/features/ecosystem/hw-app-connection-support'
import {
	countAllConnectionMethods,
	AppConnectionMethod,
	getSupportedSoftwareWallets,
	SoftwareWalletType,
} from '@/schema/features/ecosystem/hw-app-connection-support'
import type { Support, Supported } from '@/schema/features/support'
import { isSupported, notSupported, supported } from '@/schema/features/support'
import { refs, refTodo, type WithRef } from '@/schema/reference'
import { type AtLeastOneVariant } from '@/schema/variants'
import { WalletType } from '@/schema/wallet-types'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

const brand = 'attributes.security.app_connection_support'

export type AppConnectionSupportValue = Value & {
	connectionDetails: Support<WithRef<AppConnectionMethodDetails>>
	__brand: 'attributes.security.app_connection_support'
}

function noAppConnectionSupport(): Evaluation<AppConnectionSupportValue> {
	return {
		value: {
			id: 'no_app_connection',
			rating: Rating.FAIL,
			displayName: 'No app connection support',
			shortExplanation: sentence('{{WALLET_NAME}} cannot connect to apps.'),
			connectionDetails: notSupported,
			__brand: brand,
		},
		details: paragraph(
			"{{WALLET_NAME}} does not support connecting to web3 applications. This severely limits the wallet's functionality, as users cannot interact with DeFi protocols, NFT marketplaces, or other Web3 applications. Without app connectivity, the wallet can only be used for basic sending and receiving of assets.",
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should implement at least one method of connecting to apps such as support through popular software wallets.',
		),
	}
}

function limitedAppConnectionSupport(
	connectionDetails: Supported<WithRef<AppConnectionMethodDetails>>,
): Evaluation<AppConnectionSupportValue> {
	const hasOnlyClosedSource =
		connectionDetails.supportedConnections[AppConnectionMethod.VENDOR_CLOSED_SOURCE_APP] ===
			true && countAllConnectionMethods(connectionDetails) === 1

	return {
		value: {
			id: 'limited_app_connection',
			rating: Rating.PARTIAL,
			displayName: 'Limited app connection support',
			shortExplanation: sentence(
				hasOnlyClosedSource
					? '{{WALLET_NAME}} can only connect to apps through its proprietary closed-source application.'
					: '{{WALLET_NAME}} has limited options for connecting to apps.',
			),
			connectionDetails,
			__brand: brand,
		},
		details: paragraph(
			hasOnlyClosedSource
				? "{{WALLET_NAME}} can connect to apps, but only through its own proprietary closed-source application. This creates vendor lock-in and requires users to trust the wallet provider's software without the ability to verify its security. Users cannot use their preferred software wallet or standard protocols."
				: '{{WALLET_NAME}} supports connecting to apps but with limited options. While functional, the restricted connection methods may limit user choice and flexibility in how they interact with Web3 applications.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should expand its app connection options by supporting standard protocols and enabling connections through popular software wallets. If using a proprietary app, consider open-sourcing it for transparency.',
		),
	}
}

function goodAppConnectionSupport(
	connectionDetails: Supported<WithRef<AppConnectionMethodDetails>>,
): Evaluation<AppConnectionSupportValue> {
	return {
		value: {
			id: 'good_app_connection',
			rating: Rating.PASS,
			displayName: 'Good app connection support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} provides multiple secure methods for connecting to apps.',
			),
			connectionDetails,
			__brand: brand,
		},
		details: mdParagraph(
			"{{WALLET_NAME}} offers good app connectivity with multiple connection methods. Users have flexibility in choosing how to interact with web3 applications, whether through software wallet integrations, or the wallet's own application.",
		),
	}
}

function excellentAppConnectionSupport(
	connectionDetails: Supported<WithRef<AppConnectionMethodDetails>>,
): Evaluation<AppConnectionSupportValue> {
	const hasOpenSource =
		connectionDetails.supportedConnections[AppConnectionMethod.VENDOR_OPEN_SOURCE_APP] === true

	return {
		value: {
			id: 'excellent_app_connection',
			rating: Rating.PASS,
			displayName: 'Excellent app connection support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} provides comprehensive app connectivity with maximum user choice.',
			),
			connectionDetails,
			__brand: brand,
		},
		details: mdParagraph(
			'{{WALLET_NAME}} excels in app connectivity by supporting multiple connection methods. ' +
				(hasOpenSource
					? 'The wallet also provides its own open-source application, ensuring transparency and security. '
					: '') +
				'This comprehensive support gives users maximum flexibility and choice in how they interact with Web3 applications.',
		),
	}
}

export const appConnectionSupport: Attribute<AppConnectionSupportValue> = {
	id: 'appConnectionSupport',
	icon: '\u{1F517}', // Link symbol
	displayName: 'app Connection Support',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a hardware wallet's app connection support evaluated?",
		whatCanWalletDoAboutIts: sentence(
			'Can {{WALLET_NAME}} connect to web3 applications (apps)?',
		),
	},
	question: sentence('Can the hardware wallet connect to web3 applications?'),
	why: markdown(`
The ability to connect to web3 applications is crucial for hardware wallet 
users who want to interact with DeFi protocols, NFT marketplaces, and other Web3 services 
while maintaining the security of their private keys on a hardware device.

Hardware wallets face unique challenges in connecting to apps because they must maintain 
an air gap for security while still enabling complex interactions. The methods available 
for connection significantly impact both security and user experience.

Wallets that only offer proprietary closed-source solutions create vendor lock-in and 
require users to trust unverifiable software. In contrast, wallets supporting standard 
protocols or integration with popular software wallets give users 
more choice and transparency.
`),
	methodology: markdown(`
Hardware wallets are evaluated based on their app connection capabilities and the 
variety of methods they support.

A wallet receives a passing rating if it supports multiple connection methods, especially 
if it includes standard protocols or integration with well-known 
software wallets. Excellent ratings are given to wallets that also provide open-source 
solutions.

A wallet receives a partial rating if it can connect to apps but with limitations, such 
as only supporting a proprietary closed-source application or having very few connection 
options.

A hardware wallet fails this attribute if it cannot connect to apps at all, severely 
limiting its utility in the modern Web3 ecosystem.
`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				paragraph(`
			The wallet provides excellent app connectivity with support 
			multiple software wallet integrations, and its own open-source application.
		`),
				excellentAppConnectionSupport(
					supported({
						ref: refTodo,
						supportedConnections: {
							[AppConnectionMethod.VENDOR_OPEN_SOURCE_APP]: true,
							[AppConnectionMethod.VENDOR_CLOSED_SOURCE_APP]: true,
							[SoftwareWalletType.METAMASK]: true,
							[SoftwareWalletType.RABBY]: true,
						},
					}),
				),
			),
			exampleRating(
				paragraph(`
			The wallet supports multiple connection methods including 
			several popular software wallets.
		`),
				goodAppConnectionSupport(
					supported({
						ref: refTodo,
						supportedConnections: {
							[AppConnectionMethod.VENDOR_OPEN_SOURCE_APP]: true,
							[SoftwareWalletType.METAMASK]: true,
						},
					}),
				),
			),
		],
		partial: [
			exampleRating(
				paragraph(`
			The wallet can only connect to apps through its proprietary closed-source 
			application, limiting user choice and requiring trust in unverifiable software.
		`),
				limitedAppConnectionSupport(
					supported({
						ref: refTodo,
						supportedConnections: {
							[AppConnectionMethod.VENDOR_CLOSED_SOURCE_APP]: true,
						},
					}),
				),
			),
			exampleRating(
				paragraph(`
			The wallet has limited app connection options, supporting only one or two 
			methods with restrictions.
		`),
				limitedAppConnectionSupport(
					supported({
						ref: refTodo,
						supportedConnections: {
							[AppConnectionMethod.VENDOR_CLOSED_SOURCE_APP]: true,
							[SoftwareWalletType.METAMASK]: true,
						},
					}),
				),
			),
		],
		fail: exampleRating(
			paragraph(`
		The wallet cannot connect to apps, severely limiting its functionality in the 
		Web3 ecosystem.
	`),
			noAppConnectionSupport(),
		),
	},
	evaluate: (features: ResolvedFeatures): Evaluation<AppConnectionSupportValue> => {
		// Check for ERC-4337 smart wallet
		if (supportsOnlyAccountType(features.accountSupport, AccountType.rawErc4337)) {
			return exempt(
				appConnectionSupport,
				sentence(
					'This attribute is not applicable for {{WALLET_NAME}} as it is an ERC-4337 smart contract wallet.',
				),
				brand,
				{
					connectionDetails: notSupported,
				},
			)
		}

		// Only evaluate hardware wallets
		if (features.type !== WalletType.HARDWARE) {
			// For software wallets:
			return {
				value: {
					id: 'exempt_software_wallet',
					rating: Rating.EXEMPT,
					displayName: 'Only applicable for hardware wallets',
					shortExplanation: sentence(
						'This attribute evaluates hardware wallet app connection capabilities and is not applicable for software wallets.',
					),
					connectionDetails: notSupported,
					__brand: brand,
				},
				details: paragraph(
					'As {{WALLET_NAME}} is a software wallet, this attribute which evaluates hardware wallet app connection capabilities is not applicable. Software wallets inherently support app connections.',
				),
			}
		}

		// Check if app connection support feature exists - rename variable to avoid shadowing
		const appSupport = features.appConnectionSupport

		if (!appSupport) {
			return unrated(appConnectionSupport, brand, {
				connectionDetails: notSupported,
			})
		}

		// Extract references if supported
		const references = isSupported(appSupport) ? refs(appSupport) : []

		const evaluation = (() => {
			// If not supported, cannot connect to apps
			if (!isSupported(appSupport)) {
				return noAppConnectionSupport()
			}

			// Get all supported software wallets
			const supportedSoftwareWallets = getSupportedSoftwareWallets(appSupport)

			// Count the total number of connection methods
			const totalMethodCount = countAllConnectionMethods(appSupport)

			// Determine rating based on connection methods
			if (totalMethodCount === 0) {
				return noAppConnectionSupport()
			}

			// Check for only closed-source proprietary app
			const hasOnlyClosedSource =
				totalMethodCount === 1 &&
				appSupport.supportedConnections[AppConnectionMethod.VENDOR_CLOSED_SOURCE_APP] === true

			if (hasOnlyClosedSource) {
				return limitedAppConnectionSupport(appSupport)
			}

			const hasOpenSource =
				appSupport.supportedConnections[AppConnectionMethod.VENDOR_OPEN_SOURCE_APP] === true

			if (totalMethodCount <= 2 && !hasOpenSource) {
				return limitedAppConnectionSupport(appSupport)
			}

			if (totalMethodCount <= 2 && hasOpenSource) {
				return goodAppConnectionSupport(appSupport)
			}

			// Check for excellent support (3+ methods or includes open source app + others)
			const hasSoftwareWallets = supportedSoftwareWallets.length > 0

			if (totalMethodCount >= 3 || (hasOpenSource && hasSoftwareWallets)) {
				return excellentAppConnectionSupport(appSupport)
			}

			return goodAppConnectionSupport(appSupport)
		})()

		return { ...evaluation, references }
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<AppConnectionSupportValue>>) =>
		pickWorstRating<AppConnectionSupportValue>(perVariant),
}
