import { type Attribute, type Evaluation, Rating, type Value } from '@/schema/attributes';
import type { ResolvedFeatures } from '@/schema/features';
import { licenseSourceIsVisible } from '@/schema/features/transparency/license';
import { type ReferenceArray, toFullyQualified } from '@/schema/reference';
import { paragraph, sentence } from '@/types/content';
import { sourceVisibilityDetailsContent } from '@/types/content/source-visibility-details';

import { pickWorstRating, unrated } from '../common';

const brand = 'attributes.transparency.source_visibility';

export type SourceVisibilityValue = Value & {
  __brand: 'attributes.transparency.source_visibility';
};

function sourcePublic(references: ReferenceArray): Evaluation<SourceVisibilityValue> {
  return {
    value: {
      id: 'public',
      rating: Rating.PASS,
      displayName: 'Source code publicly available',
      shortExplanation: sentence(`
				The source code for {{WALLET_NAME}} is public.
			`),
      __brand: brand,
    },
    details: sourceVisibilityDetailsContent(),
    references,
  };
}

function sourcePrivate(references: ReferenceArray): Evaluation<SourceVisibilityValue> {
  return {
    value: {
      id: 'private',
      rating: Rating.FAIL,
      displayName: 'Source code not publicly available',
      shortExplanation: sentence(`
				The source code for {{WALLET_NAME}} is not public.
			`),
      __brand: brand,
    },
    details: paragraph(`
			The source code for {{WALLET_NAME}} is not available
			to the public.
		`),
    howToImprove: paragraph(`
			{{WALLET_NAME}} should make its source code publicly
			viewable.
		`),
    references,
  };
}

export const sourceVisibility: Attribute<SourceVisibilityValue> = {
  id: 'sourceVisibility',
  icon: '\u{1f35d}', // Spaghetti
  displayName: 'Source visibility',
  wording: {
    midSentenceName: 'source visibility',
  },
  question: sentence('Is the source code for the wallet visible to the public?'),
  why: paragraph(`
		When using a wallet, users are entrusting it to preserve their funds
		safely. This requires a high level of trust in the wallet's source code
		and in the wallet's development team. By making the wallet's source code
		visible to the public, its source code can be more easily inspected for
		security vulnerabilities and for potential malicious code.
		This improves the wallet's security and trustworthiness.
	`),
  methodology: sentence(`
		Wallets are assessed based on whether or not their source code is
		publicly visible, irrespective of the license of the source code.
	`),
  ratingScale: {
    display: 'simple',
    content: paragraph(`
			If a wallet's source code is visible, it passes. If not, it fails.
		`),
  },
  evaluate: (features: ResolvedFeatures): Evaluation<SourceVisibilityValue> => {
    if (features.license === null) {
      return unrated(sourceVisibility, brand, null);
    }

    if (licenseSourceIsVisible(features.license.license)) {
      return sourcePublic(toFullyQualified(features.license.ref));
    }

    return sourcePrivate(toFullyQualified(features.license.ref));
  },
  aggregate: pickWorstRating<SourceVisibilityValue>,
};
