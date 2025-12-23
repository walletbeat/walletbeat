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
import type { Supported } from '@/schema/features/support'
import { isSupported, supported } from '@/schema/features/support'
import { refs, refTodo, type WithRef } from '@/schema/reference'
import { WalletType } from '@/schema/wallet-types'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'
import { setItems } from '@/types/utils/non-empty'
import { commaListFormat } from '@/types/utils/text'

import { exempt, pickWorstRating, unrated } from '../common'

const brand = 'attributes.security.app_connection_support'

/**
 * Converts a connection method enum value to its string representation
 */
function connectionMethodToString(
	connectionMethod: AppConnectionMethod | SoftwareWalletType,
): string {
	switch (connectionMethod) {
		case AppConnectionMethod.VENDOR_CLOSED_SOURCE_APP:
			return 'its proprietary closed-source application'
		case AppConnectionMethod.VENDOR_OPEN_SOURCE_APP:
			return 'its open-source application'
		case SoftwareWalletType.METAMASK:
			return 'MetaMask'
		case SoftwareWalletType.RABBY:
			return 'Rabby'
		case SoftwareWalletType.FRAME:
			return 'Frame'
		case SoftwareWalletType.AMBIRE:
			return 'Ambire'
		case SoftwareWalletType.OTHER:
			return 'other software wallets'
	}
}
/**
 * Builds a description of the supported connection methods
 */
function describeConnectionMethods(
	connectionDetails: Supported<WithRef<AppConnectionMethodDetails>>,
): string {
	const supported = connectionDetails.supportedConnections
	const methods = setItems(supported).map(connectionMethodToString)

	if (methods.length === 0) {
		return 'no connection methods'
	}

	return commaListFormat(methods)
}

export type AppConnectionSupportValue = Value & {
	__brand: 'attributes.security.app_connection_support'
}

function noAppConnectionSupport(): Evaluation<AppConnectionSupportValue> {
	return {
		value: {
			id: 'no_app_connection',
			rating: Rating.FAIL,
			displayName: 'No app connection support',
			shortExplanation: sentence('{{WALLET_NAME}} cannot connect to apps.'),
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} does not provide any supported way to connect to Web3 applications. This prevents users from approving transactions, signing messages, or interacting with DeFi, NFT marketplaces, and other onchain apps. In practice, the wallet is limited to basic asset management (send/receive) and cannot be used as a primary Web3 wallet.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should add at least one widely adopted, standards-based app connection method and/or support connection through popular software wallets. Ideally, this support should be permissionless and rely on open standards so apps can integrate without vendor approval.',
		),
	}
}

function unverifiableAppConnectionSupport(): Evaluation<AppConnectionSupportValue> {
	return {
		value: {
			id: 'unverifiable_app_connection',
			rating: Rating.PARTIAL,
			displayName: 'Unverifiable app connection support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} can connect to apps, but requires trusting unverifiable code.',
			),
			__brand: brand,
		},
		details: paragraph(
			"{{WALLET_NAME}} can connect to apps, but only through its proprietary closed-source application. This requires users to trust the wallet provider's software without the ability to verify its security. This increases supply-chain risk, creates vendor lock-in, and limits interoperability with the broader Web3 ecosystem.",
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should support open standards that enable connection via software wallets and apps. If the wallet relies on a vendor app, open-sourcing the app and connection components (or publishing verifiable builds and specs) would materially improve transparency and verifiability.',
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
			__brand: brand,
		},
		details: paragraph(
			`{{WALLET_NAME}} supports connecting to apps through ${describeConnectionMethods(connectionDetails)}, which uses verifiable code and/or open standards. However, this support is not universal—users may be restricted to specific apps, specific connection flows, or a limited compatibility surface. As a result, some apps, or software wallets may not work reliably with {{WALLET_NAME}}.`,
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should expand standards-based, permissionless integration so it can connect broadly across the Web3 ecosystem. Concretely: support widely adopted protocols, avoid manufacturer approval gates, and ensure apps can integrate without proprietary dependencies.',
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
			__brand: brand,
		},
		details: mdParagraph(
			`{{WALLET_NAME}} supports connecting to apps through ${describeConnectionMethods(connectionDetails)} using open standards and verifiable components. This enables broad compatibility with Web3 apps while maintaining transparency—integrations can be inspected and do not depend on trusting closed, proprietary connection software.`,
		),
	}
}

function restrictedAppConnectionSupport(
	connectionDetails: Supported<WithRef<AppConnectionMethodDetails>>,
): Evaluation<AppConnectionSupportValue> {
	return {
		value: {
			id: 'restricted_app_connection',
			rating: Rating.PARTIAL,
			displayName: 'Restricted app connection support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} can connect to apps, but requires manufacturer approval for integrations.',
			),
			__brand: brand,
		},
		details: paragraph(
			`{{WALLET_NAME}} supports connecting to apps through ${describeConnectionMethods(connectionDetails)}. However, integrating {{WALLET_NAME}} into software wallets or apps requires manufacturer consent. This creates friction for developers, limits ecosystem growth, and gives the manufacturer gatekeeping power over which apps and wallets can support {{WALLET_NAME}}.`,
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should adopt permissionless integration standards that allow any software wallet or app to integrate without requiring manufacturer approval. This would enable broader ecosystem support and reduce dependency on vendor cooperation.',
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

Hardware wallets must maintain an air gap for security while still enabling complex interactions. 
Connection methods significantly impact security and user experience.

Wallets with only proprietary closed-source solutions force vendor lock-in and trust in unverifiable software. 
Supporting standard protocols or popular wallet integrations offers users more choice and transparency.
`),
	methodology: markdown(`
Hardware wallets are evaluated based on the reliability, openness, and breadth of their 
best app connection method.

A wallet receives a passing rating if it can connect to any app using verifiable 
code or open standards.

A wallet receives a partial rating if it can connect to apps but requires trusting 
unverifiable code (proprietary closed-source), or if it can only connect to some apps 
even when using verifiable code or open standards.

A hardware wallet fails this attribute if it cannot connect to apps at all, severely 
limiting its utility.
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
						requiresManufacturerConsent: {
							type: 'ALL_FEATURES_PERMISSIONLESSLY_INTEGRABLE',
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
						requiresManufacturerConsent: {
							type: 'FEATURES_GATED_BY_MANUFACTURER',
							ref: {
								explanation: 'The wallet requires manufacturer consent to connect to apps.',
								url: 'https://example.com',
							},
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
				unverifiableAppConnectionSupport(),
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
						requiresManufacturerConsent: {
							type: 'FEATURES_GATED_BY_MANUFACTURER',
							ref: {
								explanation: 'The wallet requires manufacturer consent to connect to apps.',
								url: 'https://example.com',
							},
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
				null,
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
			return unrated(appConnectionSupport, brand, null)
		}

		// Extract references if supported
		const references = isSupported(appSupport)
			? [
					...refs(appSupport),
					...(appSupport.requiresManufacturerConsent !== null &&
					appSupport.requiresManufacturerConsent.type === 'FEATURES_GATED_BY_MANUFACTURER'
						? refs(appSupport.requiresManufacturerConsent)
						: []),
				]
			: []

		const evaluation = (() => {
			// If not supported, cannot connect to apps
			if (!isSupported(appSupport)) {
				return noAppConnectionSupport()
			}

			if (appSupport.requiresManufacturerConsent === null) {
				return unrated(appConnectionSupport, brand, null)
			}

			// Determine rating based on the best connection method available
			// Priority: software wallet integration (universal + verifiable) >
			//           vendor open-source app (verifiable but potentially limited) >
			//           vendor closed-source app (unverifiable)

			// Check if there's any software wallet integration (universal + verifiable)
			const hasSoftwareWalletIntegration = getSupportedSoftwareWallets(appSupport).length > 0
			const consentType = appSupport.requiresManufacturerConsent.type
			const permissionless = consentType === 'ALL_FEATURES_PERMISSIONLESSLY_INTEGRABLE'

			if (hasSoftwareWalletIntegration && permissionless) {
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

			if (!permissionless) {
				// New applications need manufacturer permission to integrate, regardless of the manufacturer's own integration work.
				return restrictedAppConnectionSupport(appSupport)
			}

			if (hasClosedSource) {
				// Has closed-source manufacturer app but is permissionless.
				return unverifiableAppConnectionSupport()
			}

			// Should not reach here if feature data is correct, but handle gracefully
			return noAppConnectionSupport()
		})()

		return { ...evaluation, references }
	},
	aggregate: pickWorstRating<AppConnectionSupportValue>,
}
