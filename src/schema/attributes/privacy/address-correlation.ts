import {
  type Attribute,
  type Evaluation,
  type EvaluationData,
  exampleRating,
  exampleRatingUnimplemented,
  Rating,
  type Value,
} from '@/schema/attributes';
import type { ResolvedFeatures } from '@/schema/features';
import {
  compareLeakedInfo,
  type Endpoint,
  inferLeaks,
  Leak,
  type LeakedInfo,
  leakedInfoName,
  leakedInfos,
  LeakedInfoType,
  leakedInfoType,
  LeakedPersonalInfo,
  type Leaks,
  leaksByDefault,
} from '@/schema/features/privacy/data-collection';
import type { WalletMetadata } from '@/schema/wallet';
import { markdown, paragraph, type RenderableTypography, sentence } from '@/types/content';
import { addressCorrelationDetailsContent } from '@/types/content/address-correlation-details';
import { isNonEmptyArray, type NonEmptyArray, nonEmptyFirst } from '@/types/utils/non-empty';

import type { Entity } from '../../entity';
import { type FullyQualifiedReference, type ReferenceArray, refs } from '../../reference';
import { pickWorstRating, unrated } from '../common';

const brand = 'attributes.privacy.address_correlation';

export type AddressCorrelationValue = Value & {
  worstLeak: WalletAddressLinkableBy | null;
  __brand: 'attributes.privacy.address_correlation';
};

const uncorrelated: AddressCorrelationValue = {
  id: 'no_correlation',
  rating: Rating.PASS,
  icon: '\u{26d3}', // Broken chain
  displayName: 'Wallet address is kept private',
  shortExplanation: sentence(
    (walletMetadata: WalletMetadata) => `
			${walletMetadata.displayName} keeps your wallet address private.
		`,
  ),
  worstLeak: null,
  __brand: brand,
};

export interface WalletAddressLinkableTo {
  info: LeakedInfo;
  leak: Leak;
  refs: FullyQualifiedReference[];
}

export type WalletAddressLinkableBy = WalletAddressLinkableTo & {
  by: Entity | 'onchain';
};

function linkable(
  linkables: NonEmptyArray<WalletAddressLinkableBy>,
  references: ReferenceArray,
): Evaluation<AddressCorrelationValue> {
  const worstLeak = nonEmptyFirst(
    linkables,
    (linkableA: WalletAddressLinkableBy, linkableB: WalletAddressLinkableBy) =>
      compareLeakedInfo(linkableA.info, linkableB.info),
    true,
  );
  const { rating, howToImprove } = ((): {
    rating: Rating;
    howToImprove: RenderableTypography<EvaluationData<AddressCorrelationValue>>;
  } => {
    const leakName = leakedInfoName(worstLeak.info).long;
    const { by } = worstLeak;

    switch (worstLeak.info) {
      case LeakedPersonalInfo.PSEUDONYM:
        if (by === 'onchain') {
          return {
            rating: Rating.PARTIAL,
            howToImprove: paragraph(
              ({ wallet }) => `
								The onchain registry for
								${wallet.metadata.pseudonymType?.plural ?? `${wallet.metadata.displayName} ${leakName}s`}
								should either not exist onchain, or should be structured such
								that a user's main wallet address may not be derived from it.
								The latter may be implemented using a stealth address
								registry.
							`,
            ),
          };
        }

        return {
          rating: Rating.PARTIAL,
          howToImprove: paragraph(
            ({ wallet }) => `
							${wallet.metadata.displayName} should require user consent
							before allowing your
							${wallet.metadata.pseudonymType?.singular ?? leakName}
							to be linkable to your wallet address, and make it clear that
							this association will be known to ${by.name}.
						`,
          ),
        };
      case LeakedPersonalInfo.IP_ADDRESS:
        return {
          rating: Rating.PARTIAL,
          howToImprove: paragraph(
            ({ wallet }) => `
							${wallet.metadata.displayName} should not perform requests
							containing your wallet address without using some form of
							proxying such as Oblivious HTTP, Tor, or other similar
							techniques to decouple request content from request origin.
						`,
          ),
        };
      default:
        return {
          rating: Rating.FAIL,
          howToImprove: paragraph(
            ({ wallet }) => `
							${wallet.metadata.displayName} should require user consent
							before allowing personal information such as your ${leakName}
							to be linkable to your wallet address.
						`,
          ),
        };
    }
  })();

  return {
    value: {
      id: `address_and_${worstLeak.info}`,
      rating,
      displayName: `Wallet address linkable to ${leakedInfoName(worstLeak.info).short}`,
      shortExplanation: sentence((walletMetadata: WalletMetadata) => {
        if (worstLeak.by === 'onchain') {
          return `
						${walletMetadata.displayName} publishes your
						${leakedInfoName(worstLeak.info, walletMetadata).short}
						onchain.
					`;
        }

        return `
					${walletMetadata.displayName} allows ${worstLeak.by.name}
					to link your wallet address with your
					${leakedInfoName(worstLeak.info, walletMetadata).short}.
				`;
      }),
      worstLeak,
      __brand: brand,
    },
    details: addressCorrelationDetailsContent({ linkables }),
    howToImprove,
    references,
  };
}

/**
 * Checks whether the given endpoint is running in a secure enclave such that
 * the code running it known, verifiable and verified by the client, and does
 * not log any data outside of the enclave.
 */
function isSealedSecureEnclave(endpoint?: Endpoint): boolean {
  if (endpoint === undefined) {
    return false;
  }

  if (endpoint.type === 'REGULAR') {
    return false;
  }

  if (endpoint.externalLogging.type !== 'NO') {
    return false;
  }

  if (endpoint.endToEndEncryption.type !== 'TERMINATED_INSIDE_ENCLAVE') {
    // End-to-end encryption not terminated inside enclave, so can be MitM'd.
    return false;
  }

  if (!endpoint.verifiability.sourceAvailable || !endpoint.verifiability.reproducibleBuilds) {
    // Server can be running any code, so all bets are off.
    return false;
  }

  if (endpoint.verifiability.clientVerification.type === 'NOT_VERIFIED') {
    // Client does not check that the server is actually running in an
    // enclave, so all bets are off.
    return false;
  }

  if (endpoint.verifiability.clientVerification.type === 'VERIFIED_BUT_NO_SOURCE_AVAILABLE') {
    // Client checks but we can't check that the client is checking. Heh.
    return false;
  }

  return true;
}

export function linkableToWalletAddress(leaks: Leaks): WalletAddressLinkableTo[] {
  const qualLeaks = inferLeaks(leaks);

  if (!leaksByDefault(qualLeaks.walletAddress)) {
    return [];
  }

  const linkables: WalletAddressLinkableTo[] = [];
  const qualRefs = refs(leaks);

  for (const info of leakedInfos) {
    if (leakedInfoType(info) !== LeakedInfoType.PERSONAL_DATA) {
      continue;
    }

    if (!leaksByDefault(qualLeaks[info])) {
      continue;
    }

    if (info === LeakedPersonalInfo.IP_ADDRESS) {
      // Check if the server is running in a secure enclave with all
      // desirable properties to shield the IP address from being a
      // privacy leak.
      if (isSealedSecureEnclave(leaks.endpoint)) {
        continue;
      }
    }

    linkables.push({ info, leak: qualLeaks[info], refs: qualRefs });
  }

  return linkables;
}

export const addressCorrelation: Attribute<AddressCorrelationValue> = {
  id: 'addressCorrelation',
  icon: '\u{1f517}', // Link
  displayName: 'Wallet address privacy',
  wording: {
    midSentenceName: 'wallet address privacy',
  },
  question: sentence(`
		Is your wallet address linkable to other information about yourself?
	`),
  why: paragraph(`
		Your wallet address is unique and permanent, which makes it easy for
		applications and companies like Chainalysis to track your activity.
		In web-privacy terms, it is worse than cookies: its record is permanent,
		publicly visible, and even tracks across multiple devices and websites.
		The more personal information is linkable to your wallet address, the
		more effective such tracking can be.
		It is therefore important to use a wallet that does its best to protect
		your information from being linked to your wallet address.
	`),
  methodology: markdown(`
		In order to qualify for a perfect rating on wallet address privacy, a
		wallet must not, *by default*, allow any third-party to link your wallet
		address to any personal information.

		As Walletbeat only considers the wallet's *default* behavior, wallets may
		still choose to offer features that allow third-parties to link wallet
		addresses with personal information, so long as this is done with explicit
		user opt-in.

		To determine this, Walletbeat looks at the network requests made by
		wallets in their default configuration, and the contents of such requests.
		If a request contains the user's wallet address, we look at whether it
		also contains any other personal information, such as the user's name,
		pseudonym, email address, phone number, CEX account information, etc.

		Additionally, if such a request is not proxied, then it inherently reveals
		the user's IP address and ties it with the user's wallet address, which is
		also personal information.
	`),
  ratingScale: {
    display: 'fail-pass',
    exhaustive: false,
    fail: [
      exampleRating(
        paragraph(`
					The wallet requires user information (other than IP address and
					pseudonyms) by default, and uploads this data to a third-party
					or records it onchain in a publicly-viewable manner.
				`),
        Rating.FAIL,
      ),
    ],
    partial: [
      exampleRating(
        paragraph(`
					The wallet allows a third party to learn the relationship between a
					user's wallet address and their IP address by default. This is treated
					as a partial rating because users may mitigate against this by forcing
					wallet requests to be proxied on their own.
				`),
        (value: AddressCorrelationValue) =>
          value.rating === Rating.PARTIAL &&
          value.worstLeak?.info === LeakedPersonalInfo.IP_ADDRESS,
      ),
      exampleRating(
        paragraph(`
					The wallet requires the user to identify themselves via a pseudonym
					which is sent to a third-party or recorded onchain. This is treated as
					a partial rating because users may choose an arbitrary pseudonym for
					each of their wallet address to mitigate this privacy issue.
				`),
        (value: AddressCorrelationValue) =>
          value.rating === Rating.PARTIAL && value.worstLeak?.info === LeakedPersonalInfo.PSEUDONYM,
      ),
    ],
    pass: [
      exampleRating(
        paragraph(`
					The wallet does not require any user information to function by
					default, and proxies all network requests carrying the user's
					wallet address.
				`),
        uncorrelated,
      ),
      exampleRating(
        paragraph(`
					The wallet relies exclusively on a user's self-hosted node,
					involving no third parties.
				`),
        exampleRatingUnimplemented,
      ),
    ],
  },
  evaluate: (features: ResolvedFeatures): Evaluation<AddressCorrelationValue> => {
    if (features.privacy.dataCollection === null) {
      return unrated(addressCorrelation, brand, { worstLeak: null });
    }

    const linkables: WalletAddressLinkableBy[] = [];
    const allRefs: ReferenceArray = refs(features.privacy.dataCollection.onchain);

    for (const collected of features.privacy.dataCollection.collectedByEntities) {
      allRefs.push(...refs(collected.leaks));

      for (const linkable of linkableToWalletAddress(collected.leaks)) {
        linkables.push({ by: collected.entity, ...linkable });
      }
    }

    for (const linkable of linkableToWalletAddress({
      ...features.privacy.dataCollection.onchain,
      walletAddress: Leak.ALWAYS,
    })) {
      linkables.push({ by: 'onchain', ...linkable });
    }

    if (isNonEmptyArray(linkables)) {
      return linkable(linkables, allRefs);
    }

    return {
      value: uncorrelated,
      details: paragraph(
        ({ wallet }) => `
					${wallet.metadata.displayName} does not allow any third-party to link
					your wallet address to any personal information.
				`,
      ),
      references: allRefs,
    };
  },
  aggregate: pickWorstRating<AddressCorrelationValue>,
};
