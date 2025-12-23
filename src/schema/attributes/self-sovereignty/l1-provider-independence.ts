import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { isSupported, notSupported } from '@/schema/features/support'
import { type ReferenceArray, refs } from '@/schema/reference'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'

import {
	RpcEndpointConfiguration,
	type SelfHostedNodeL1BasicOperationsSupport,
} from '../../features/self-sovereignty/chain-configurability'
import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.self_sovereignty.l1_provider_independence'

export type L1ProviderIndependence = Value & {
	__brand: 'attributes.self_sovereignty.l1_provider_independence'
}

function supportsSelfHostedNode(references: ReferenceArray): Evaluation<L1ProviderIndependence> {
	return {
		value: {
			id: 'support_self_hosted_node',
			rating: Rating.PASS,
			icon: '\u{1f3e1}', // House with garden
			displayName: 'Supports self-hosted node',
			shortExplanation: sentence(`
				{{WALLET_NAME}} lets you use your own self-hosted Ethereum node to interact with Ethereum mainnet.
			`),
			__brand: brand,
		},
		details: paragraph(`
			{{WALLET_NAME}} lets you use your own self-hosted Ethereum node to interact with Ethereum mainnet.
		`),
		references,
	}
}

function supportsSelfHostedNodeAfterRequests(
	references: ReferenceArray,
): Evaluation<L1ProviderIndependence> {
	return {
		value: {
			id: 'self_hosted_node_after_requests',
			rating: Rating.PARTIAL,
			displayName: 'Partially supports self-hosted nodes',
			shortExplanation: sentence(`
				{{WALLET_NAME}} contacts its default L1 RPC endpoint before letting you configure a self-hosted node.
			`),
			__brand: brand,
		},
		details: paragraph(`
			{{WALLET_NAME}} lets you use a self-hosted Ethereum node, but you cannot configure this before a sensitive request is already made to an external RPC provider.
		`),
		howToImprove: paragraph(`
			{{WALLET_NAME}} should modify the wallet setup flow to allow the user to configure the RPC endpoint for L1 before making any requests, or should avoid making any such requests until the user can access the RPC endpoint configuration options.
		`),
		references,
	}
}

function supportsSelfHostedNodeButCannotDoBasicOperations(
	support: SelfHostedNodeL1BasicOperationsSupport,
	references: ReferenceArray,
): Evaluation<L1ProviderIndependence> {
	return {
		value: {
			id: 'self_hosted_node_not_sufficient',
			rating: Rating.FAIL,
			displayName: 'Relies on non-Ethereum services',
			shortExplanation: sentence(`
				Even with your self-hosted node, {{WALLET_NAME}} depends on external
				services to perform basic tasks on Ethereum mainnet.
			`),
			__brand: brand,
		},
		details: mdParagraph(`
			While {{WALLET_NAME}} lets you use a self-hosted Ethereum node to
			interact with mainnet, it still critically depends on external
			services to perform the following basic operations:

			${isSupported(support.withNoConnectivityExceptL1RPCEndpoint.accountCreation) ? '' : '* Creating a new account'}
			${isSupported(support.withNoConnectivityExceptL1RPCEndpoint.accountImport) ? '' : '* Importing an existing account'}
			${isSupported(support.withNoConnectivityExceptL1RPCEndpoint.etherBalanceLookup) ? '' : '* Looking up your Ether balance'}
			${isSupported(support.withNoConnectivityExceptL1RPCEndpoint.erc20BalanceLookup) ? '' : '* Looking up your balance for an ERC-20 contract address'}
			${isSupported(support.withNoConnectivityExceptL1RPCEndpoint.erc20TokenSend) ? '' : '* Sending ERC-20 tokens'}
		`),
		howToImprove: paragraph(`
			{{WALLET_NAME}} should ensure that basic operations work with no
			other dependency than the user-configured L1 RPC endpoint.
		`),
		references,
	}
}

function noSelfHostedNode(references: ReferenceArray): Evaluation<L1ProviderIndependence> {
	return {
		value: {
			id: 'no_self_hosted_node',
			rating: Rating.FAIL,
			icon: '\u{1f3da}', // Derelict house
			displayName: 'Cannot use self-hosted node',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not let you use your own self-hosted node to interact with Ethereum mainnet.',
			),
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} does not let you use your own self-hosted Ethereum node when interacting with Ethereum mainnet.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should let the user configure the endpoint used for Ethereum mainnet.',
		),
		references,
	}
}

export const l1ProviderIndependence: Attribute<L1ProviderIndependence> = {
	id: 'l1ProviderIndependence',
	icon: '\u{1f3e0}', // House
	displayName: 'L1 provider independence',
	wording: {
		midSentenceName: 'L1 provider independence',
	},
	question: sentence(`
		Can you use the wallet without relying on its default provider for
		interacting with the L1 chain?
	`),
	why: markdown(`
		Ethereum's design goes to painstaking lengths to ensure that users can
		run an Ethereum L1 node on commodity consumer-grade hardware and
		residential Internet connections, and use it for interacting with L1.
		
		Running your own node gives you several important benefits:

		* **Privacy**: Because the wallet can work directly on your own hardware
			with no outside dependencies, the wallet can query chain data without
			revealing private details (wallet address, IP address, etc.) to an
			external RPC provider.
		* **Integrity**: Relying on an external RPC provider means that this
			provider may return incorrect data about the state of the chain,
			tricking you into signing a transaction that ends up having a different
			effect than intended. Your own L1 node will verify the integrity of the
			chain, so such attacks cannot occur when using a self-hosted node.
		* **Censorship resistance**: Because an L1 node may broadcast transactions
			into a shared mempool directly to other nodes in the network, your
			transactions are not censorable by an external RPC provider that would
			otherwise act as an intermediary.
		* **No downtime**: Because the L1 node is running on your own hardware,
			you are not at risk of losing funds or opportunities due to downtime
			from an external RPC provider.

		However, **these advantages only matter if wallet users can actually take
		advantage of them**. Thus, wallets must allow users to use a self-hosted
		node for these benefits to be realized in practice, and must not
		critically depend on external services to perform basic L1 interactions
		such as balance lookups and sending tokens.
	`),
	methodology: markdown(`
		In order to qualify for this attribute, wallets must:

		- Allow the user to configure the L1 RPC endpoint to a self-hosted node
		  before any user-data-carrying request is made to that endpoint.
		- Support basic functions (account creation/import, balance lookups,
		  token transfers) using nothing but the self-hosted node
			(no external services, no non-Ethereum-API calls), and whether
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph('The wallet lets you configure the RPC endpoint used for Ethereum mainnet.'),
			supportsSelfHostedNode([]),
		),
		partial: [
			exampleRating(
				paragraph(
					'The wallet supports configuring the RPC endpoint used for Ethereum mainnet, but makes requests to an external RPC provider before being able to modify the RPC endpoint configuration.',
				),
				supportsSelfHostedNodeAfterRequests([]),
			),
		],
		fail: [
			exampleRating(
				paragraph(
					'The wallet uses an external Ethereum node provider and does not let you change this setting.',
				),
				noSelfHostedNode([]),
			),
			exampleRating(
				paragraph(`
					The wallet lets you configure the RPC endpoint used for Ethereum mainnet,
					but account creation, account import, balance lookups or token transfers
					critically rely on additional external providers.
				`),
				supportsSelfHostedNodeButCannotDoBasicOperations(
					{
						withNoConnectivityExceptL1RPCEndpoint: {
							accountCreation: notSupported,
							accountImport: notSupported,
							etherBalanceLookup: notSupported,
							erc20BalanceLookup: notSupported,
							erc20TokenSend: notSupported,
						},
					},
					[],
				),
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<L1ProviderIndependence> => {
		if (features.chainConfigurability === null) {
			return unrated(l1ProviderIndependence, brand, null)
		}

		if (!isSupported(features.chainConfigurability)) {
			return noSelfHostedNode([])
		}

		const allRefs = refs(features.chainConfigurability)

		if (!isSupported(features.chainConfigurability.l1)) {
			return noSelfHostedNode([])
		}

		if (
			!isSupported(
				features.chainConfigurability.l1.withNoConnectivityExceptL1RPCEndpoint.accountCreation,
			) ||
			!isSupported(
				features.chainConfigurability.l1.withNoConnectivityExceptL1RPCEndpoint.etherBalanceLookup,
			) ||
			!isSupported(
				features.chainConfigurability.l1.withNoConnectivityExceptL1RPCEndpoint.erc20BalanceLookup,
			) ||
			!isSupported(
				features.chainConfigurability.l1.withNoConnectivityExceptL1RPCEndpoint.erc20TokenSend,
			)
		) {
			return supportsSelfHostedNodeButCannotDoBasicOperations(
				features.chainConfigurability.l1,
				allRefs,
			)
		}

		if (
			features.chainConfigurability.l1.rpcEndpointConfiguration ===
			RpcEndpointConfiguration.YES_BEFORE_ANY_SENSITIVE_REQUEST
		) {
			return supportsSelfHostedNode(allRefs)
		}

		if (
			features.chainConfigurability.l1.rpcEndpointConfiguration ===
			RpcEndpointConfiguration.YES_AFTER_OTHER_SENSITIVE_REQUESTS
		) {
			return supportsSelfHostedNodeAfterRequests(allRefs)
		}

		return noSelfHostedNode(allRefs)
	},
	aggregate: pickWorstRating<L1ProviderIndependence>,
}
