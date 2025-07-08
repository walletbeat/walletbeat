import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { notSupported } from '@/schema/features/support'
import { AccountType, supportsOnlyAccountType } from '@/schema/features/account-support'
import type { DappConnectionMethodDetails } from '@/schema/features/ecosystem/hw-dapp-connection-support'
import {
	DappConnectionMethod,
	SoftwareWalletType,
	cannotConnectToDapps,
	countAllConnectionMethods,
	getSupportedSoftwareWallets,
	singleConnectionMethod,
} from '@/schema/features/ecosystem/hw-dapp-connection-support'
import { isSupported, supported } from '@/schema/features/support'
import type { Support, Supported } from '@/schema/features/support'
import { refs } from '@/schema/reference'
import { type AtLeastOneVariant } from '@/schema/variants'
import { WalletType } from '@/schema/wallet-types'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'
import type { DappConnectionSupport } from '@/schema/features/ecosystem/hw-dapp-connection-support'

import { exempt, pickWorstRating, unrated } from '../common'

const brand = 'attributes.security.dapp_connection_support'

export type DappConnectionSupportValue = Value & {
	connectionDetails: Support<DappConnectionMethodDetails>
	__brand: 'attributes.security.dapp_connection_support'
}

function noDappConnectionSupport(): Evaluation<DappConnectionSupportValue> {
	return {
		value: {
			id: 'no_dapp_connection',
			rating: Rating.FAIL,
			displayName: 'No dApp connection support',
			shortExplanation: sentence('{{WALLET_NAME}} cannot connect to dApps.'),
			connectionDetails: notSupported,
			__brand: brand,
		},
		details: paragraph(
			"{{WALLET_NAME}} does not support connecting to decentralized applications (dApps). This severely limits the wallet's functionality, as users cannot interact with DeFi protocols, NFT marketplaces, or other Web3 applications. Without dApp connectivity, the wallet can only be used for basic sending and receiving of assets.",
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should implement at least one method of connecting to dApps such as support through popular software wallets.',
		),
	}
}

function limitedDappConnectionSupport(
	connectionDetails: Supported<DappConnectionMethodDetails>,
): Evaluation<DappConnectionSupportValue> {
	const hasOnlyClosedSource =
		connectionDetails.supportedConnections[DappConnectionMethod.VENDOR_CLOSED_SOURCE_APP] ===
			true && countAllConnectionMethods(connectionDetails) === 1

	return {
		value: {
			id: 'limited_dapp_connection',
			rating: Rating.PARTIAL,
			displayName: 'Limited dApp connection support',
			shortExplanation: sentence(
				hasOnlyClosedSource
					? '{{WALLET_NAME}} can only connect to dApps through its proprietary closed-source application.'
					: '{{WALLET_NAME}} has limited options for connecting to dApps.',
			),
			connectionDetails,
			__brand: brand,
		},
		details: paragraph(
			hasOnlyClosedSource
				? "{{WALLET_NAME}} can connect to dApps, but only through its own proprietary closed-source application. This creates vendor lock-in and requires users to trust the wallet provider's software without the ability to verify its security. Users cannot use their preferred software wallet or standard protocols."
				: '{{WALLET_NAME}} supports connecting to dApps but with limited options. While functional, the restricted connection methods may limit user choice and flexibility in how they interact with Web3 applications.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should expand its dApp connection options by supporting standard protocols and enabling connections through popular software wallets. If using a proprietary app, consider open-sourcing it for transparency.',
		),
	}
}

function goodDappConnectionSupport(
	connectionDetails: Supported<DappConnectionMethodDetails>,
): Evaluation<DappConnectionSupportValue> {
	return {
		value: {
			id: 'good_dapp_connection',
			rating: Rating.PASS,
			displayName: 'Good dApp connection support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} provides multiple secure methods for connecting to dApps.',
			),
			connectionDetails,
			__brand: brand,
		},
		details: mdParagraph(
			"{{WALLET_NAME}} offers good dApp connectivity with multiple connection methods. Users have flexibility in choosing how to interact with decentralized applications, whether through software wallet integrations, or the wallet's own application.",
		),
	}
}

function excellentDappConnectionSupport(
	connectionDetails: Supported<DappConnectionMethodDetails>,
): Evaluation<DappConnectionSupportValue> {
	const hasOpenSource =
		connectionDetails.supportedConnections[DappConnectionMethod.VENDOR_OPEN_SOURCE_APP] === true

	return {
		value: {
			id: 'excellent_dapp_connection',
			rating: Rating.PASS,
			displayName: 'Excellent dApp connection support',
			shortExplanation: sentence(
				'{{WALLET_NAME}} provides comprehensive dApp connectivity with maximum user choice.',
			),
			connectionDetails,
			__brand: brand,
		},
		details: mdParagraph(
			'{{WALLET_NAME}} excels in dApp connectivity by supporting multiple connection methods. ' +
				(hasOpenSource
					? 'The wallet also provides its own open-source application, ensuring transparency and security. '
					: '') +
				'This comprehensive support gives users maximum flexibility and choice in how they interact with Web3 applications.',
		),
	}
}

export const dappConnectionSupport: Attribute<DappConnectionSupportValue> = {
	id: 'dappConnectionSupport',
	icon: '\u{1F517}', // Link symbol
	displayName: 'dApp Connection Support',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a hardware wallet's dApp connection support evaluated?",
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do to improve dApp connection support?',
		),
	},
	question: sentence('Can the hardware wallet connect to decentralized applications (dApps)?'),
	why: markdown(`
		The ability to connect to decentralized applications (dApps) is crucial for hardware wallet 
		users who want to interact with DeFi protocols, NFT marketplaces, and other Web3 services 
		while maintaining the security of their private keys on a hardware device.
		
		Hardware wallets face unique challenges in connecting to dApps because they must maintain 
		an air gap for security while still enabling complex interactions. The methods available 
		for connection significantly impact both security and user experience.
		
		Wallets that only offer proprietary closed-source solutions create vendor lock-in and 
		require users to trust unverifiable software. In contrast, wallets supporting standard 
		protocols or integration with popular software wallets give users 
		more choice and transparency.
	`),
	methodology: markdown(`
		Hardware wallets are evaluated based on their dApp connection capabilities and the 
		variety of methods they support.
		
		A wallet receives a passing rating if it supports multiple connection methods, especially 
		if it includes standard protocols or integration with well-known 
		software wallets. Excellent ratings are given to wallets that also provide open-source 
		solutions.
		
		A wallet receives a partial rating if it can connect to dApps but with limitations, such 
		as only supporting a proprietary closed-source application or having very few connection 
		options.
		
		A hardware wallet fails this attribute if it cannot connect to dApps at all, severely 
		limiting its utility in the modern Web3 ecosystem.
		
		This attribute only applies to hardware wallets. Software wallets and smart contract 
		wallets are exempt as they inherently support dApp connections.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				paragraph(`
					The wallet provides excellent dApp connectivity with support 
					multiple software wallet integrations, and its own open-source application.
				`),
				excellentDappConnectionSupport(
					supported({
						supportedConnections: {
							[DappConnectionMethod.VENDOR_OPEN_SOURCE_APP]: true,
							[DappConnectionMethod.VENDOR_CLOSED_SOURCE_APP]: true,
							[SoftwareWalletType.METAMASK]: true,
							[SoftwareWalletType.RABBY]: true,
						},
					}),
				).value,
			),
			exampleRating(
				paragraph(`
					The wallet supports multiple connection methods including 
					several popular software wallets.
				`),
				goodDappConnectionSupport(
					supported({
						supportedConnections: {
							[DappConnectionMethod.VENDOR_OPEN_SOURCE_APP]: true,
							[SoftwareWalletType.METAMASK]: true,
						},
					}),
				).value,
			),
		],
		partial: [
			exampleRating(
				paragraph(`
					The wallet can only connect to dApps through its proprietary closed-source 
					application, limiting user choice and requiring trust in unverifiable software.
				`),
				limitedDappConnectionSupport(
					supported(singleConnectionMethod(DappConnectionMethod.VENDOR_CLOSED_SOURCE_APP)),
					[],
				).value,
			),
			exampleRating(
				paragraph(`
					The wallet has limited dApp connection options, supporting only one or two 
					methods with restrictions.
				`),
				limitedDappConnectionSupport(
					supported({
						supportedConnections: {
							[DappConnectionMethod.VENDOR_CLOSED_SOURCE_APP]: true,
							[SoftwareWalletType.METAMASK]: true,
						},
					}),
				).value,
			),
		],
		fail: exampleRating(
			paragraph(`
				The wallet cannot connect to dApps, severely limiting its functionality in the 
				Web3 ecosystem.
			`),
			noDappConnectionSupport().value,
		),
	},
	evaluate: (features: ResolvedFeatures): Evaluation<DappConnectionSupportValue> => {
		// Check for ERC-4337 smart wallet
		if (supportsOnlyAccountType(features.accountSupport, AccountType.rawErc4337)) {
			return exempt(
				dappConnectionSupport,
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
						'This attribute evaluates hardware wallet dApp connection capabilities and is not applicable for software wallets.',
					),
					connectionDetails: notSupported,
					__brand: brand,
				},
				details: paragraph(
					'As {{WALLET_NAME}} is a software wallet, this attribute which evaluates hardware wallet dApp connection capabilities is not applicable. Software wallets inherently support dApp connections.',
				),
			}
		}

		// Check if dApp connection support feature exists - rename variable to avoid shadowing
		const dappSupport = features.dappConnectionSupport

		if (!dappSupport) {
			return unrated(dappConnectionSupport, brand, {
				connectionDetails: notSupported,
			})
		}


		// Extract references if supported
		const references = isSupported(dappSupport) ? refs(dappSupport) : []

		// If not supported, cannot connect to dApps
		if (!isSupported(dappSupport)) {
			return noDappConnectionSupport()
		}

		// Get all supported software wallets
		const supportedSoftwareWallets = getSupportedSoftwareWallets(dappSupport)

		// Count the total number of connection methods
		const totalMethodCount = countAllConnectionMethods(dappSupport)

		// Determine rating based on connection methods
		if (totalMethodCount === 0) {
			return noDappConnectionSupport()
		}

		// Check for only closed-source proprietary app
		const hasOnlyClosedSource =
			totalMethodCount === 1 &&
			dappSupport.supportedConnections[DappConnectionMethod.VENDOR_CLOSED_SOURCE_APP] === true

		if (hasOnlyClosedSource) {
			return limitedDappConnectionSupport(dappSupport)
		}

		const hasOpenSource =
			dappSupport.supportedConnections[DappConnectionMethod.VENDOR_OPEN_SOURCE_APP] === true
		if (totalMethodCount <= 2 && !hasOpenSource) {
			return limitedDappConnectionSupport(dappSupport)
		}

		if (totalMethodCount <= 2 && hasOpenSource) {
			return goodDappConnectionSupport(dappSupport)
		}

		// Check for excellent support (3+ methods or includes open source app + others)
		const hasSoftwareWallets = supportedSoftwareWallets.length > 0

		if (totalMethodCount >= 3 || (hasOpenSource && hasSoftwareWallets)) {
			return {
				...excellentDappConnectionSupport(dappSupport),
				references,
			}
		}

		return {
			...goodDappConnectionSupport(dappSupport),
			references,
		}
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<DappConnectionSupportValue>>) =>
		pickWorstRating<DappConnectionSupportValue>(perVariant),
}
