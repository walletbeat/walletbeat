import type { ResolvedFeatures } from '@/beta/schema/features';
import { licenseSourceIsVisible } from '@/beta/schema/features/license';
import { Rating, type Value, type Attribute, type Evaluation } from '@/beta/schema/attributes';
import { pickWorstRating, unrated } from '../common';
import { paragraph, sentence } from '@/beta/types/content';
import type { WalletMetadata } from '@/beta/schema/wallet';
import { sourceVisibilityDetailsContent } from '@/beta/types/content/source-visibility-details';

const brand = 'attributes.transparency.source_visibility';
export type SourceVisibilityValue = Value & {
  __brand: 'attributes.transparency.source_visibility';
};

const sourcePublic: Evaluation<SourceVisibilityValue> = {
  value: {
    id: 'public',
    rating: Rating.PASS,
    displayName: 'Source code publicly available',
    shortExplanation: sentence(
      (walletMetadata: WalletMetadata) => `
        The source code for ${walletMetadata.displayName} is public.
      `
    ),
    __brand: brand,
  },
  details: sourceVisibilityDetailsContent(),
};

const sourcePrivate: Evaluation<SourceVisibilityValue> = {
  value: {
    id: 'private',
    rating: Rating.FAIL,
    displayName: 'Source code not publicly available',
    shortExplanation: sentence(
      (walletMetadata: WalletMetadata) => `
        The source code for ${walletMetadata.displayName} is not public.
      `
    ),
    __brand: brand,
  },
  details: paragraph(
    ({ wallet }) => `
      The source code for ${wallet.metadata.displayName} is not available
      to the public.
    `
  ),
  howToImprove: paragraph(
    ({ wallet }) => `
      ${wallet.metadata.displayName} should make its source code publicly
      viewable.
    `
  ),
};

export const sourceVisibility: Attribute<SourceVisibilityValue> = {
  id: 'sourceVisibility',
  icon: '\u{1f35d}', // Spaghetti
  displayName: 'Source visibility',
  midSentenceName: 'source visibility',
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
    if (licenseSourceIsVisible(features.license)) {
      return sourcePublic;
    }
    return sourcePrivate;
  },
  aggregate: pickWorstRating<SourceVisibilityValue>,
};
