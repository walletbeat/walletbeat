import type { ResolvedFeatures } from '@/beta/schema/features';
import {
  Rating,
  type Value,
  type Attribute,
  type Evaluation,
  exampleRating,
} from '@/beta/schema/attributes';
import { pickWorstRating, unrated } from '../common';
import { markdown, mdParagraph, paragraph, sentence } from '@/beta/types/content';
import type { WalletMetadata } from '@/beta/schema/wallet';
import { isNonEmptyArray, type NonEmptyArray, nonEmptyEntries } from '@/beta/types/utils/non-empty';
import { EthereumL1LightClient } from '../../features/security/light-client';
import {
  RpcEndpointConfiguration,
  type ChainConfigurability,
} from '../../features/chain-configurability';
import { type FullyQualifiedReference, popRefs } from '../../reference';
import { chainVerificationDetailsContent } from '@/beta/types/content/chain-verification-details';

const brand = 'attributes.security.chain_verification';
export type ChainVerificationValue = Value & {
  __brand: 'attributes.security.chain_verification';
};

function supportsChainVerification(
  lightClients: NonEmptyArray<EthereumL1LightClient>,
  refs: FullyQualifiedReference[]
): Evaluation<ChainVerificationValue> {
  return {
    value: {
      id: `chain_verification_l1_${lightClients.join('_')}`,
      rating: Rating.PASS,
      displayName: 'L1 chain state verification',
      shortExplanation: sentence(
        (walletMetadata: WalletMetadata) => `
          ${walletMetadata.displayName} verifies chain integrity of the
          Ethereum L1.
        `
      ),
      __brand: brand,
    },
    details: chainVerificationDetailsContent({ lightClients, refs }),
  };
}

function noChainVerification(
  chainConfigurability: ChainConfigurability | null
): Evaluation<ChainVerificationValue> {
  return {
    value: {
      id: 'no_chain_verification',
      rating: Rating.FAIL,
      icon: '\u{1f648}', // See-no-evil monkey
      displayName: 'No L1 chain state verification',
      shortExplanation: sentence(
        (walletMetadata: WalletMetadata) => `
          ${walletMetadata.displayName} does not verify chain integrity of the Ethereum L1.
        `
      ),
      __brand: brand,
    },
    details: markdown(({ wallet }) => {
      const l1Configurability = chainConfigurability?.l1RpcEndpoint ?? RpcEndpointConfiguration.NO;
      const canConfigureL1 =
        l1Configurability === RpcEndpointConfiguration.YES_BEFORE_ANY_REQUEST ||
        l1Configurability === RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS;
      return `
          ${wallet.metadata.displayName} does not verify the integrity of the
          Ethereum L1 blockchain when retrieving chain state or simulating
          transactions.

          ${
            canConfigureL1
              ? `
          Users may work around this by setting a custom RPC endpoint for the
          L1 chain and running their own node or external light client.
          `
              : ''
          }
        `;
    }),
    howToImprove: mdParagraph(
      ({ wallet }) => `
        ${wallet.metadata.displayName} should integrate
        [light client functionality](https://ethereum.org/en/developers/docs/nodes-and-clients/light-clients/)
        to verify the integrity of Ethereum chain data.
      `
    ),
  };
}

export const chainVerification: Attribute<ChainVerificationValue> = {
  id: 'chainVerification',
  icon: '\u{2693}', // Anchor
  displayName: 'Chain verification',
  midSentenceName: 'chain verification',
  question: sentence(`
    Does the wallet verify the integrity of the chain(s) it interacts with?
  `),
  why: markdown(`
    "Trust but verify" is one of the foundational principles of blockchains.
    It refers to the ability for participants to verify that the chain data
    is valid when they interact with it.

    Without such verification, users rely on trusted third-parties to tell
    them what the state of the blockchain is, similar to the web2 trust model.
    This allows such third-parties to trick wallet users into signing
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
      mdParagraph(`
        The wallet verifies the integrity of the Ethereum L1 chain using a
        [light client](https://ethereum.org/en/developers/docs/nodes-and-clients/light-clients/).
      `),
      supportsChainVerification([EthereumL1LightClient.helios], []).value
    ),
    fail: exampleRating(
      paragraph(`
        The wallet does not verify the integrity of the Ethereum L1 chain,
        relying on the honesty of third-party RPC providers instead.
      `),
      noChainVerification(null).value
    ),
  },
  evaluate: (features: ResolvedFeatures): Evaluation<ChainVerificationValue> => {
    if (features.security.lightClient.ethereumL1 === null) {
      return unrated(chainVerification, brand, null);
    }
    if (features.security.lightClient.ethereumL1 === false) {
      return noChainVerification(features.chainConfigurability);
    }
    const { withoutRefs, refs } = popRefs(features.security.lightClient.ethereumL1);
    let allUnrated = true;
    const supportedLightClients: EthereumL1LightClient[] = [];
    for (const [lightClient, supported] of nonEmptyEntries<EthereumL1LightClient, boolean | null>(
      withoutRefs
    )) {
      if (supported !== null) {
        allUnrated = false;
      }
      if (supported === true) {
        supportedLightClients.push(lightClient);
      }
    }
    if (isNonEmptyArray(supportedLightClients)) {
      return supportsChainVerification(supportedLightClients, refs);
    }
    if (allUnrated) {
      return unrated(chainVerification, brand, null);
    }
    return noChainVerification(features.chainConfigurability);
  },
  aggregate: pickWorstRating<ChainVerificationValue>,
};
