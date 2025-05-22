import { type Attribute, type Evaluation, Rating, type Value } from '@/schema/attributes';
import { exampleRating } from '@/schema/attributes';
import type { ResolvedFeatures } from '@/schema/features';
import { type ReputationSupport, ReputationType } from '@/schema/features/transparency/reputation';
import { popRefs } from '@/schema/reference';
import type { AtLeastOneVariant } from '@/schema/variants';
import { Variant } from '@/schema/variants';
import type { WalletMetadata } from '@/schema/wallet';
import { markdown, paragraph, sentence } from '@/types/content';

import { exempt, pickWorstRating, unrated } from '../common';

const brand = 'attributes.reputation';

export type ReputationValue = Value & {
  originalProduct: ReputationType;
  availability: ReputationType;
  warrantySupportRisk: ReputationType;
  disclosureHistory: ReputationType;
  bugBounty: ReputationType;
  __brand: 'attributes.reputation';
};

function evaluateReputation(features: ReputationSupport): Rating {
  const ratings = [
    features.originalProduct,
    features.availability,
    features.warrantySupportRisk,
    features.disclosureHistory,
    features.bugBounty,
  ];
  const passCount = ratings.filter(r => r === ReputationType.PASS).length;

  if (passCount >= 4) {
    return Rating.PASS;
  }

  if (passCount >= 2) {
    return Rating.PARTIAL;
  }

  return Rating.FAIL;
}

export const reputation: Attribute<ReputationValue> = {
  id: 'reputation',
  icon: '🌟',
  displayName: 'Reputation',
  wording: {
    midSentenceName: null,
    howIsEvaluated: "How is a wallet's reputation evaluated?",
    whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
      `What can ${walletMetadata.displayName} do to improve its reputation?`,
  },
  question: sentence(
    (walletMetadata: WalletMetadata) =>
      `Does ${walletMetadata.displayName} have a strong reputation for reliability and transparency?`,
  ),
  why: markdown(
    `A manufacturer's reputation reflects its track record in product design, long-term availability and support, handling of vulnerabilities, and engagement with the security community.
		A strong reputation builds user trust in the reliability and security of the hardware wallet.`,
  ),
  methodology: markdown(
    `Evaluated based on an aggregate of factors:

- **Product Originality:** Degree of original design versus reliance on third-party components.

- **Availability & Support:** History of product availability, risk of discontinuation, and perceived ability to honor warranty/support.

- **Vulnerability History:** Track record of security vulnerabilities, their severity, and the transparency/quality of documentation and fixes.

- **Bug Bounty Program:** Scope and rewards of the manufacturer's bug bounty program compared to industry standards.
	`,
  ),
  ratingScale: {
    display: 'pass-fail',
    exhaustive: true,
    pass: [
      exampleRating(
        sentence(() => 'The wallet passes most reputation sub-criteria.'),
        (v: ReputationValue) => v.rating === Rating.PASS,
      ),
    ],
    partial: [
      exampleRating(
        sentence(() => 'The wallet passes some reputation sub-criteria.'),
        (v: ReputationValue) => v.rating === Rating.PARTIAL,
      ),
    ],
    fail: [
      exampleRating(
        sentence(() => 'The wallet fails most or all reputation sub-criteria.'),
        (v: ReputationValue) => v.rating === Rating.FAIL,
      ),
    ],
  },
  aggregate: (perVariant: AtLeastOneVariant<Evaluation<ReputationValue>>) =>
    pickWorstRating<ReputationValue>(perVariant),
  evaluate: (features: ResolvedFeatures): Evaluation<ReputationValue> => {
    if (features.variant !== Variant.HARDWARE) {
      return exempt(reputation, sentence('Only rated for hardware wallets'), brand, {
        originalProduct: ReputationType.FAIL,
        availability: ReputationType.FAIL,
        warrantySupportRisk: ReputationType.FAIL,
        disclosureHistory: ReputationType.FAIL,
        bugBounty: ReputationType.FAIL,
      });
    }

    const reputationFeature = features.transparency.reputation;

    if (reputationFeature === null) {
      return unrated(reputation, brand, {
        originalProduct: ReputationType.FAIL,
        availability: ReputationType.FAIL,
        warrantySupportRisk: ReputationType.FAIL,
        disclosureHistory: ReputationType.FAIL,
        bugBounty: ReputationType.FAIL,
      });
    }

    const { withoutRefs, refs: extractedRefs } = popRefs<ReputationSupport>(reputationFeature);
    const rating = evaluateReputation(withoutRefs);

    return {
      value: {
        id: 'reputation',
        rating,
        displayName: 'Reputation',
        shortExplanation: sentence(
          (walletMetadata: WalletMetadata) =>
            `${walletMetadata.displayName} has ${rating.toLowerCase()} reputation.`,
        ),
        ...withoutRefs,
        __brand: brand,
      },
      details: paragraph(
        ({ wallet }) =>
          `${wallet.metadata.displayName} reputation evaluation is ${rating.toLowerCase()}.`,
      ),
      howToImprove: paragraph(
        ({ wallet }) =>
          `${wallet.metadata.displayName} should improve sub-criteria rated PARTIAL or FAIL.`,
      ),
      ...(extractedRefs.length > 0 && { references: extractedRefs }),
    };
  },
};
