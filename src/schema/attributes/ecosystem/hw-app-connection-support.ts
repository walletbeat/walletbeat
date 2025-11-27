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

/**
 * Builds a description of the supported connection methods
 */
function describeConnectionMethods(
	connectionDetails: Supported<WithRef<AppConnectionMethodDetails>>,
): string {
	const methods: string[] = []
	const supported = connectionDetails.supportedConnections

	if (supported[AppConnectionMethod.VENDOR_CLOSED_SOURCE_APP] === true) {
		methods.push('its proprietary closed-source application')
	}

	if (supported[AppConnectionMethod.VENDOR_OPEN_SOURCE_APP] === true) {
		methods.push('its open-source application')
	}

	if (supported[SoftwareWalletType.METAMASK] === true) {
		methods.push('MetaMask')
	}

	if (supported[SoftwareWalletType.RABBY] === true) {
		methods.push('Rabby')
	}

	if (supported[SoftwareWalletType.FRAME] === true) {
		methods.push('Frame')
	}

	if (supported[SoftwareWalletType.AMBIRE] === true) {
		methods.push('Ambire')
	}

	if (supported[SoftwareWalletType.OTHER] === true) {
		methods.push('other software wallets')
	}

	if (methods.length === 0) {
		return 'no connection methods'
	}

	if (methods.length === 1) {
		return methods[0]!
	}

	if (methods.length === 2) {
		return `${methods[0]} and ${methods[1]}`
	}

	// 3 or more methods
	const last = methods.pop()!

	return `${methods.join(', ')}, and ${last}`
}

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

function unverifiableAppConnectionSupport(
	connectionDetails: Supported<WithRef<AppConnectionMethodDetails>>,
): Evaluation<AppConnectionSupportValue> {
	return {
		value: {
			id: 'unverifiable_app_connection',
			rating: Rating.PARTIAL,
			displayName: 'Unverifiable app connection support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} can connect to apps, but requires trusting unverifiable code.',
			),
			connectionDetails,
			__brand: brand,
		},
		details: paragraph(
			"{{WALLET_NAME}} can connect to apps, but only through its proprietary closed-source application. This requires users to trust the wallet provider's software without the ability to verify its security. While functional, this creates vendor lock-in and prevents users from using standard protocols or their preferred software wallets.",
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should support standard protocols and enable connections through popular software wallets, or open-source its application for transparency and verifiability.',
		),
	}
}

function limitedVerifiableAppConnectionSupport(
	connectionDetails: Supported<WithRef<AppConnectionMethodDetails>>,
): Evaluation<AppConnectionSupportValue> {
	return {
		value: {
			id: 'limited_verifiable_app_connection',
			rating: Rating.PARTIAL,
			displayName: 'Limited verifiable app connection support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} can connect to some apps using verifiable code or open standards, but with limitations.',
			),
			connectionDetails,
			__brand: brand,
		},
		details: paragraph(
			`{{WALLET_NAME}} supports connecting to apps through ${describeConnectionMethods(connectionDetails)}, which uses verifiable code or open standards. However, this connection method has limitations that prevent it from connecting to all apps, restricting the wallet's full utility in the Web3 ecosystem.`,
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should support standard protocols that enable connections to any app, such as integration with popular software wallets like MetaMask.',
		),
	}
}

function verifiableUniversalAppConnectionSupport(
	connectionDetails: Supported<WithRef<AppConnectionMethodDetails>>,
): Evaluation<AppConnectionSupportValue> {
	return {
		value: {
			id: 'verifiable_universal_app_connection',
			rating: Rating.PASS,
			displayName: 'Verifiable universal app connection support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} can connect to any app using entirely verifiable code or open standards.',
			),
			connectionDetails,
			__brand: brand,
		},
		details: mdParagraph(
			`{{WALLET_NAME}} supports connecting to any app through ${describeConnectionMethods(connectionDetails)}, which uses entirely verifiable code or open standards. This provides users with full access to the Web3 ecosystem while maintaining transparency and security through verifiable connection methods.`,
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
		whatCanWalletDoAboutIts: sentence('Can {{WALLET_NAME}} connect to web3 applications (apps)?'),
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
Hardware wallets are evaluated based on the reliability, openness, and breadth of their 
best app connection method, not the number of connection methods available.

A wallet receives a passing rating if it can connect to any app using entirely verifiable 
code or open standards, such as through integration with popular software wallets or 
open-source applications.

A wallet receives a partial rating if it can connect to apps but requires trusting 
unverifiable code (such as a proprietary closed-source application), or if it can only 
connect to some apps even when using verifiable code or open standards.

A hardware wallet fails this attribute if it cannot connect to apps at all, severely 
limiting its utility in the modern Web3 ecosystem.
`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				paragraph(`
			The wallet can connect to any app using entirely verifiable code or open 
			standards, such as through integration with popular software wallets like 
			MetaMask or Rabby.
		`),
				verifiableUniversalAppConnectionSupport(
					supported({
						ref: refTodo,
						supportedConnections: {
							[SoftwareWalletType.METAMASK]: true,
							[SoftwareWalletType.RABBY]: true,
						},
					}),
				),
			),
			exampleRating(
				paragraph(`
			The wallet can connect to any app through its open-source application, 
			providing verifiable and transparent connection methods.
		`),
				verifiableUniversalAppConnectionSupport(
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
			The wallet can connect to apps, but only through its proprietary closed-source 
			application, requiring users to trust unverifiable code.
		`),
				unverifiableAppConnectionSupport(
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
			The wallet can connect to some apps using verifiable code or open standards, 
			but has limitations that prevent it from connecting to all apps.
		`),
				limitedVerifiableAppConnectionSupport(
					supported({
						ref: refTodo,
						supportedConnections: {
							[AppConnectionMethod.VENDOR_OPEN_SOURCE_APP]: true,
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

			// Determine rating based on the best connection method available
			// Priority: software wallet integration (universal + verifiable) > 
			//           vendor open-source app (verifiable but potentially limited) > 
			//           vendor closed-source app (unverifiable)

			// Check if there's any software wallet integration (universal + verifiable)
			const hasSoftwareWalletIntegration = getSupportedSoftwareWallets(appSupport).length > 0

			if (hasSoftwareWalletIntegration) {
				// Can connect to any app using verifiable code/open standards → PASS
				return verifiableUniversalAppConnectionSupport(appSupport)
			}

			// Check for vendor open-source app
			const hasOpenSource =
				appSupport.supportedConnections[AppConnectionMethod.VENDOR_OPEN_SOURCE_APP] === true

			if (hasOpenSource) {
				// Can connect to some apps using verifiable code/open standards → PARTIAL
				// (We assume vendor apps are limited unless proven otherwise)
				return limitedVerifiableAppConnectionSupport(appSupport)
			}

			// Check for vendor closed-source app
			const hasClosedSource =
				appSupport.supportedConnections[AppConnectionMethod.VENDOR_CLOSED_SOURCE_APP] === true

			if (hasClosedSource) {
				// Can connect to apps but requires trusting unverifiable code → PARTIAL
				return unverifiableAppConnectionSupport(appSupport)
			}

			// Should not reach here if feature data is correct, but handle gracefully
			return noAppConnectionSupport()
		})()

		return { ...evaluation, references }
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<AppConnectionSupportValue>>) =>
		pickWorstRating<AppConnectionSupportValue>(perVariant),
}
