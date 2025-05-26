import { type Attribute, type Evaluation, Rating, type Value } from '@/schema/attributes';
import { exampleRating } from '@/schema/attributes';
import type { ResolvedFeatures } from '@/schema/features';
import {
  type InteroperabilitySupport,
  InteroperabilityType,
} from '@/schema/features/self-sovereignty/interoperability';
import { popRefs } from '@/schema/reference';
import type { AtLeastOneVariant } from '@/schema/variants';
import { Variant } from '@/schema/variants';
import type { WalletMetadata } from '@/schema/wallet';
import { markdown, paragraph, sentence } from '@/types/content';

import { exempt, pickWorstRating, unrated } from '../common';

const brand = 'attributes.interoperability';

export type InteroperabilityValue = Value & {
  thirdPartyCompatibility: InteroperabilityType;
  noSupplierLinkage: InteroperabilityType;
  __brand: 'attributes.interoperability';
};

function evaluateInteroperability(features: InteroperabilitySupport): Rating {
  const ratings = [features.thirdPartyCompatibility, features.noSupplierLinkage];
  const passCount = ratings.filter(r => r === InteroperabilityType.PASS).length;

  if (passCount === 2) {
    return Rating.PASS;
  }

  if (passCount === 1) {
    return Rating.PARTIAL;
  }

  return Rating.FAIL;
}

export const interoperability: Attribute<InteroperabilityValue> = {
  id: 'interoperability',
  icon: '🔗',
  displayName: 'Interoperability',
  wording: {
    midSentenceName: null,
    howIsEvaluated: "How is a wallet's interoperability evaluated?",
    whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
      `What can ${walletMetadata.displayName} do to improve its interoperability?`,
  },
  question: sentence(
    (walletMetadata: WalletMetadata) =>
      `Does ${walletMetadata.displayName} work well with third-party wallets and avoid supplier linkage?`,
  ),
  why: markdown(
    'Interoperability ensures the wallet can be used with independent third-party wallets and does not leak identifying metadata to the supplier.',
  ),
  methodology: markdown(
    'Evaluated based on third-party wallet compatibility and supplier independence.',
  ),
  ratingScale: {
    display: 'pass-fail',
    exhaustive: true,
    pass: [
      exampleRating(
        sentence(() => 'The wallet passes both interoperability sub-criteria.'),
        (v: InteroperabilityValue) => v.rating === Rating.PASS,
      ),
    ],
    partial: [
      exampleRating(
        sentence(() => 'The wallet passes one interoperability sub-criteria.'),
        (v: InteroperabilityValue) => v.rating === Rating.PARTIAL,
      ),
    ],
    fail: [
      exampleRating(
        sentence(() => 'The wallet fails one or both interoperability sub-criteria.'),
        (v: InteroperabilityValue) => v.rating === Rating.FAIL,
      ),
    ],
  },
  aggregate: (perVariant: AtLeastOneVariant<Evaluation<InteroperabilityValue>>) =>
    pickWorstRating<InteroperabilityValue>(perVariant),
  evaluate: (features: ResolvedFeatures): Evaluation<InteroperabilityValue> => {
    if (features.variant !== Variant.HARDWARE) {
      return exempt(interoperability, sentence('Only rated for hardware wallets'), brand, {
        thirdPartyCompatibility: InteroperabilityType.FAIL,
        noSupplierLinkage: InteroperabilityType.FAIL,
      });
    }

    const interoperabilityFeature = features.selfSovereignty.interoperability;

    if (interoperabilityFeature === null) {
      return unrated(interoperability, brand, {
        thirdPartyCompatibility: InteroperabilityType.FAIL,
        noSupplierLinkage: InteroperabilityType.FAIL,
      });
    }

    const { withoutRefs, refs: extractedRefs } =
      popRefs<InteroperabilitySupport>(interoperabilityFeature);
    const rating = evaluateInteroperability(withoutRefs);

    return {
      value: {
        id: 'interoperability',
        rating,
        displayName: 'Interoperability',
        shortExplanation: sentence(
          (walletMetadata: WalletMetadata) =>
            `${walletMetadata.displayName} has ${rating.toLowerCase()} interoperability.`,
        ),
        ...withoutRefs,
        __brand: brand,
      },
      details: paragraph(
        ({ wallet }) =>
          `${wallet.metadata.displayName} interoperability evaluation is ${rating.toLowerCase()}.`,
      ),
      howToImprove: paragraph(
        ({ wallet }) =>
          `${wallet.metadata.displayName} should improve sub-criteria rated PARTIAL or FAIL.`,
      ),
      ...(extractedRefs.length > 0 && { references: extractedRefs }),
    };
  },
};
