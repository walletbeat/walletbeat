import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { isSupported, type Support } from '@/schema/features/support'
import { WalletType } from '@/schema/wallet-types'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'
import { chainVerificationDetailsContent } from '@/types/content/chain-verification-details'
import { isNonEmptyArray, type NonEmptyArray, nonEmptyEntries } from '@/types/utils/non-empty'

import {
	EthereumL1LightClient,
	type EthereumL1LightClientSupport,
} from '../../features/security/light-client'
import {
	type ChainConfigurability,
	RpcEndpointConfiguration,
} from '../../features/self-sovereignty/chain-configurability'
import { type FullyQualifiedReference, popRefs } from '../../reference'
import { exempt, pickWorstRating, unrated } from '../common'

const brand = 'attributes.security.chain_verification'

export type ChainVerificationValue = Value & {
	__brand: 'attributes.security.chain_verification'
}

function supportsChainVerification(
	lightClients: NonEmptyArray<EthereumL1LightClient>,
	refs: FullyQualifiedReference[],
): Evaluation<ChainVerificationValue> {
	return {
		value: {
			id: `chain_verification_l1_${lightClients.join('_')}`,
			rating: Rating.PASS,
			displayName: 'L1 chain state verification',
			shortExplanation: sentence('{{WALLET_NAME}} verifies chain integrity of the Ethereum L1.'),
			__brand: brand,
		},
		details: chainVerificationDetailsContent({ lightClients, refs }),
		references: refs,
	}
}

function noChainVerification(
	chainConfigurability: Support<ChainConfigurability> | null,
): Evaluation<ChainVerificationValue> {
	const canConfigureL1 = (() => {
		const l1Configurability =
			chainConfigurability === null ||
			!isSupported(chainConfigurability) ||
			!isSupported(chainConfigurability.l1)
				? RpcEndpointConfiguration.NO
				: chainConfigurability.l1.rpcEndpointConfiguration

		return (
			l1Configurability === RpcEndpointConfiguration.YES_BEFORE_ANY_SENSITIVE_REQUEST ||
			l1Configurability === RpcEndpointConfiguration.YES_AFTER_OTHER_SENSITIVE_REQUESTS
		)
	})()

	return {
		value: {
			id: 'no_chain_verification',
			rating: Rating.FAIL,
			icon: '\u{1f648}', // See-no-evil monkey
			displayName: 'No L1 chain state verification',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not verify chain integrity of the Ethereum L1.',
			),
			__brand: brand,
		},
		details: markdown(`
			{{WALLET_NAME}} does not verify the integrity of the Ethereum L1 blockchain when retrieving chain state or simulating transactions.

			${canConfigureL1 ? 'Users may work around this by setting a custom RPC endpoint for the L1 chain and running their own node or external light client.' : ''}
		`),
		howToImprove: mdParagraph(
			'{{WALLET_NAME}} should integrate [light client functionality](https://ethereum.org/en/developers/docs/nodes-and-clients/light-clients/) to verify the integrity of Ethereum chain data.',
		),
		references: [],
	}
}

export const chainVerification: Attribute<ChainVerificationValue> = {
	id: 'chainVerification',
	icon: '\u{2693}', // Anchor
	displayName: 'Chain verification',
	wording: {
		midSentenceName: 'chain verification',
	},
	question: sentence('Does the wallet verify the integrity of the chain(s) it interacts with?'),
	why: markdown(`
		"Trust but verify" is one of the foundational principles of blockchains.
		It refers to the ability for participants to verify that the chain data
		is valid when they interact with it.

		Without such verification, users rely on trusted external providers to tell
		them what the state of the blockchain is, similar to the web2 trust model.
		This allows such external providers to trick wallet users into signing
		transactions that do not end up having the user's intended effect.

		To avoid this, Ethereum was designed to be verifiable on commodity
		hardware. Using a
		[light client](https://ethereum.org/en/developers/docs/nodes-and-clients/light-clients/),
		this verification is possible without having to download the entire
		blockchain.
	`),
	methodology: markdown(`
		Wallets are evaluated based on whether or not they integrate a light
		client for verification of Ethereum L1 state.

		*Note*: Walletbeat currently only considers L1 chain state verification
		for this criterion, not L2s. This is because L2 state verification is
		still in its infancy. As L2 technology matures, Walletbeat will also
		start requiring wallets to verify L2 chain state.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			mdParagraph(
				'The wallet verifies the integrity of the Ethereum L1 chain using a [light client](https://ethereum.org/en/developers/docs/nodes-and-clients/light-clients/).',
			),
			supportsChainVerification([EthereumL1LightClient.helios], []),
		),
		fail: exampleRating(
			paragraph(
				'The wallet does not verify the integrity of the Ethereum L1 chain, relying on the honesty of external RPC providers instead.',
			),
			noChainVerification(null),
		),
	},
	evaluate: (features: ResolvedFeatures): Evaluation<ChainVerificationValue> => {
		if (features.type === WalletType.HARDWARE) {
			return exempt(
				chainVerification,
				sentence('This attribute is not applicable for hardware wallets.'),
				brand,
				null,
			)
		}

		const l1Client = features.security.lightClient.ethereumL1

		if (l1Client === null) {
			return unrated(chainVerification, brand, null)
		}

		if (!isSupported(l1Client)) {
			return noChainVerification(features.chainConfigurability)
		}

		const { withoutRefs, refs } = popRefs<EthereumL1LightClientSupport>(l1Client)
		const supportedLightClients: EthereumL1LightClient[] = []

		for (const [lightClient, supported] of nonEmptyEntries<EthereumL1LightClient, Support>(
			withoutRefs,
		)) {
			if (isSupported(supported)) {
				supportedLightClients.push(lightClient)
			}
		}

		if (!isNonEmptyArray(supportedLightClients)) {
			throw new Error('No supported light clients found; this should be impossible per type system')
		}

		return supportsChainVerification(supportedLightClients, refs)
	},
	aggregate: pickWorstRating<ChainVerificationValue>,
}
