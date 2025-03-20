import type { ResolvedFeatures } from '@/schema/features'
import {
	Rating,
	type Value,
	type Attribute,
	type Evaluation,
	exampleRating,
} from '@/schema/attributes'
import { pickWorstRating, unrated } from '../common'
import { markdown, paragraph, sentence } from '@/types/content'
import type { WalletMetadata } from '@/schema/wallet'
import { RpcEndpointConfiguration } from '../../features/chain-configurability'

const brand = 'attributes.self_sovereignty.self_hosted_node'
export type SelfHostedNodeValue = Value & {
	__brand: 'attributes.self_sovereignty.self_hosted_node'
}

function supportsSelfHostedNode(): Evaluation<SelfHostedNodeValue> {
	return {
		value: {
			id: 'support_self_hosted_node',
			rating: Rating.PASS,
			icon: '\u{1f3e1}', // House with garden
			displayName: 'Supports self-hosted nodes',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} lets you use your own self-hosted
					Ethereum node to interact with the Ethereum chain.
				`,
			),
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} lets you use your own self-hosted
				Ethereum node to interact with the Ethereum chain.
			`,
		),
	}
}

function supportsSelfHostedNodeAfterRequests(): Evaluation<SelfHostedNodeValue> {
	return {
		value: {
			id: 'self_hosted_node_after_requests',
			rating: Rating.PARTIAL,
			displayName: 'Partially supports self-hosted nodes',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} contacts a third-party RPC endpoint
					before letting you configure a self-hosted node.
				`,
			),
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} lets you use a self-hosted Ethereum
				node, but you cannot configure this before a sensitive request is
				already made to a third-party RPC provider.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should modify the wallet creation flow
				to allow the user to configure the RPC endpoint for L1 before making
				any requests, or should avoid making any such requests until the
				user can access the RPC endpoint configuration options.
			`,
		),
	}
}

function customChainOnly(): Evaluation<SelfHostedNodeValue> {
	return {
		value: {
			id: 'self_hosted_node_via_custom_chain',
			rating: Rating.PARTIAL,
			displayName: 'Self-hosted node as custom chain',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} lets you use your own self-hosted
					Ethereum node if configured as a custom chain.
				`,
			),
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} lets you use a self-hosted Ethereum
				node, but it needs to be set up as a custom chain rather than
				replacing the wallet's default Ethereum L1 RPC configuration.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should let the user configure the
				endpoint used for Ethereum mainnet.
			`,
		),
	}
}

function noSelfHostedNode(): Evaluation<SelfHostedNodeValue> {
	return {
		value: {
			id: 'no_self_hosted_node',
			rating: Rating.FAIL,
			icon: '\u{1f3da}', // Derelict house
			displayName: 'Cannot use self-hosted node',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} does not let you use your own
					self-hosted node to interact with the Ethereum chain.
				`,
			),
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} does not let you use your own
				self-hosted Ethereum node when interacting with the Ethereum chain.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should let the user configure the
				endpoint used for Ethereum mainnet.
			`,
		),
	}
}

export const selfHostedNode: Attribute<SelfHostedNodeValue> = {
	id: 'selfHostedNode',
	icon: '\u{1f3e0}', // House
	displayName: 'Self-hosted node',
	wording: {
		midSentenceName: 'support for self-hosted nodes',
	},
	question: sentence(`
		Can the wallet be used with your own self-hosted Ethereum node?
	`),
	why: markdown(`
		Ethereum's design goes to painstaking lengths to ensure that users can
		run an Ethereum L1 node on commodity consumer-grade hardware and
		residential Internet connections. Running your own node gives you several
		important benefits:

		* **Privacy**: Because the wallet can work directly on your own hardware
			with no outside dependencies, the wallet can query data about the state
			of the chain without revealing private details such as your wallet
			address or IP address to a third-party RPC provider.
		* **Integrity**: Relying on a third-party RPC provider means that this
			provider may return incorrect data about the state of the chain,
			tricking you into signing a transaction that ends up having a different
			effect than the one you intended. Your own L1 node will verify the
			integrity of the chain, so such attacks cannot occur when using a
			self-hosted node.
		* **Censorship resistance**: Because an L1 node may broadcast transactions
			into a shared mempool directly to other nodes in the network, your
			transactions are not censorable by a third-party RPC provider that would
			otherwise act as an intermediary.
		* **No downtime**: Because the L1 node is running on your own hardware,
			you are not at risk of losing funds or opportunities due to downtime
			from a third-party RPC provider.
	`),
	methodology: markdown(`
		Wallets are rated based on whether they allow the user to configure the
		RPC endpoint used for Ethereum mainnet, and whether such configuration is
		possible before any request is made to a third-party RPC endpoint by
		default.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(`
				The wallet lets you configure the RPC endpoint used for Ethereum
				mainnet.
			`),
			supportsSelfHostedNode().value,
		),
		partial: [
			exampleRating(
				paragraph(`
					The wallet does not let you configure the RPC endpoint used for
					Ethereum mainnet, but lets you add a custom chain with your own
					self-hosted node as RPC endpoint.
				`),
				customChainOnly().value,
			),
			exampleRating(
				paragraph(`
					The wallet lets you configure the RPC endpoint used for Ethereum
					mainnet, but makes requests to a third-party RPC provider before
					the user has a chance to modify this RPC endpoint configuration.
				`),
				supportsSelfHostedNodeAfterRequests().value,
			),
		],
		fail: exampleRating(
			paragraph(`
				The wallet uses a third-party Ethereum node provider and does not
				let you change this setting.
		`),
			noSelfHostedNode().value,
		),
	},
	evaluate: (features: ResolvedFeatures): Evaluation<SelfHostedNodeValue> => {
		if (features.chainConfigurability === null) {
			return unrated(selfHostedNode, brand, null)
		}
		if (
			features.chainConfigurability.l1RpcEndpoint ===
			RpcEndpointConfiguration.YES_BEFORE_ANY_REQUEST
		) {
			return supportsSelfHostedNode()
		}
		if (
			features.chainConfigurability.l1RpcEndpoint ===
			RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS
		) {
			return supportsSelfHostedNodeAfterRequests()
		}
		if (features.chainConfigurability.customChains) {
			return customChainOnly()
		}
		return noSelfHostedNode()
	},
	aggregate: pickWorstRating<SelfHostedNodeValue>,
}
