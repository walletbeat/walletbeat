import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { isSupported } from '@/schema/features/support'
import { type ReferenceArray, refs } from '@/schema/reference'
import { markdown, paragraph, sentence } from '@/types/content'

import { RpcEndpointConfiguration } from '../../features/self-sovereignty/chain-configurability'
import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.self_sovereignty.self_hosted_node'

export type SelfHostedNodeValue = Value & {
	__brand: 'attributes.self_sovereignty.self_hosted_node'
}

function supportsSelfHostedNode(references: ReferenceArray): Evaluation<SelfHostedNodeValue> {
	return {
		value: {
			id: 'support_self_hosted_node',
			rating: Rating.PASS,
			icon: '\u{1f3e1}', // House with garden
			displayName: 'Supports self-hosted nodes',
			shortExplanation: sentence(
				'{{WALLET_NAME}} lets you use your own self-hosted Ethereum node to interact with the Ethereum chain.',
			),
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} lets you use your own self-hosted Ethereum node to interact with the Ethereum chain.',
		),
		references,
	}
}

function supportsSelfHostedNodeAfterRequests(
	references: ReferenceArray,
): Evaluation<SelfHostedNodeValue> {
	return {
		value: {
			id: 'self_hosted_node_after_requests',
			rating: Rating.PARTIAL,
			displayName: 'Partially supports self-hosted nodes',
			shortExplanation: sentence(
				'{{WALLET_NAME}} contacts an external RPC endpoint before letting you configure a self-hosted node.',
			),
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} lets you use a self-hosted Ethereum node, but you cannot configure this before a sensitive request is already made to an external RPC provider.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should modify the wallet creation flow to allow the user to configure the RPC endpoint for L1 before making any requests, or should avoid making any such requests until the user can access the RPC endpoint configuration options.',
		),
		references,
	}
}

function customChainOnly(references: ReferenceArray): Evaluation<SelfHostedNodeValue> {
	return {
		value: {
			id: 'self_hosted_node_via_custom_chain',
			rating: Rating.PARTIAL,
			displayName: 'Self-hosted node as custom chain',
			shortExplanation: sentence(
				'{{WALLET_NAME}} lets you use your own self-hosted Ethereum node if configured as a custom chain.',
			),
			__brand: brand,
		},
		details: paragraph(
			"{{WALLET_NAME}} lets you use a self-hosted Ethereum node, but it needs to be set up as a custom chain rather than replacing the wallet's default Ethereum L1 RPC configuration.",
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should let the user configure the endpoint used for Ethereum mainnet.',
		),
		references,
	}
}

function noSelfHostedNode(references: ReferenceArray): Evaluation<SelfHostedNodeValue> {
	return {
		value: {
			id: 'no_self_hosted_node',
			rating: Rating.FAIL,
			icon: '\u{1f3da}', // Derelict house
			displayName: 'Cannot use self-hosted node',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not let you use your own self-hosted node to interact with the Ethereum chain.',
			),
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} does not let you use your own self-hosted Ethereum node when interacting with the Ethereum chain.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should let the user configure the endpoint used for Ethereum mainnet.',
		),
		references,
	}
}

export const selfHostedNode: Attribute<SelfHostedNodeValue> = {
	id: 'selfHostedNode',
	icon: '\u{1f3e0}', // House
	displayName: 'Self-hosted node',
	wording: {
		midSentenceName: 'support for self-hosted nodes',
	},
	question: sentence('Can the wallet be used with your own self-hosted Ethereum node?'),
	why: markdown(`
		Ethereum's design goes to painstaking lengths to ensure that users can
		run an Ethereum L1 node on commodity consumer-grade hardware and
		residential Internet connections. Running your own node gives you several
		important benefits:

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
	`),
	methodology: markdown(`
		Wallets are rated based on whether they allow the user to configure the
		RPC endpoint used for Ethereum mainnet, and whether such configuration is
		possible before any request is made to an external RPC provider by
		default.
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
					'The wallet does not let you configure the RPC endpoint used for Ethereum mainnet, but lets you add a custom chain with your own self-hosted node as RPC endpoint.',
				),
				customChainOnly([]),
			),
			exampleRating(
				paragraph(
					'The wallet lets you configure the RPC endpoint used for Ethereum mainnet, but makes requests to an external RPC provider before the user has a chance to modify this RPC endpoint configuration.',
				),
				supportsSelfHostedNodeAfterRequests([]),
			),
		],
		fail: exampleRating(
			paragraph(
				'The wallet uses an external Ethereum node provider and does not let you change this setting.',
			),
			noSelfHostedNode([]),
		),
	},
	evaluate: (features: ResolvedFeatures): Evaluation<SelfHostedNodeValue> => {
		if (features.chainConfigurability === null) {
			return unrated(selfHostedNode, brand, null)
		}

		if (!isSupported(features.chainConfigurability)) {
			return noSelfHostedNode([])
		}

		const allRefs = refs(features.chainConfigurability)

		if (!isSupported(features.chainConfigurability.l1)) {
			return noSelfHostedNode([])
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

		if (isSupported(features.chainConfigurability.customChainRpcEndpoint)) {
			return customChainOnly(allRefs)
		}

		return noSelfHostedNode(allRefs)
	},
	aggregate: pickWorstRating<SelfHostedNodeValue>,
}
