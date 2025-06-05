# Adding a New Feature Criteria to WalletBeat

This document outlines the steps required to add a new feature criteria to the WalletBeat codebase, using the Bug Bounty Program implementation as a reference example. Follow these steps when adding any new evaluation criteria.

## 1. Create Feature Schema Definition

First, create a TypeScript file defining the feature's schema in the appropriate location:

```typescript
// src/schema/features/security/new-feature-name.ts
import type { WithRef } from '@/schema/reference';

/**
 * Define an enum for the different levels/types of the feature
 */
export enum NewFeatureType {
  COMPREHENSIVE = 'COMPREHENSIVE',
  BASIC = 'BASIC',
  MINIMAL = 'MINIMAL',
  NONE = 'NONE',
}

/**
 * Define an interface for the feature's implementation details
 */
export interface NewFeatureSupport {
  /**
   * The type/level of the feature implementation
   */
  type: NewFeatureType;

  /**
   * URL to more information about the feature
   */
  url?: string;

  /**
   * Additional details about the implementation
   */
  details?: string;

  /**
   * Any other relevant properties
   */
  additionalProperty: boolean;
}

/**
 * Define the complete feature implementation type
 */
export type NewFeatureImplementation = WithRef<NewFeatureSupport>;
```

## 2. Create Attribute Evaluation Logic

Next, create the attribute evaluation logic that will assess wallets based on the new feature:

```typescript
// src/schema/attributes/security/new-feature-name.ts
import type { ResolvedFeatures } from '@/schema/features';
import {
  Rating,
  type Value,
  type Attribute,
  type Evaluation,
  exampleRating,
} from '@/schema/attributes';
import { pickWorstRating, unrated, exempt } from '../common';
import { markdown, mdParagraph, paragraph, sentence, mdSentence } from '@/types/content';
import type { WalletMetadata } from '@/schema/wallet';
import type { AtLeastOneVariant } from '@/schema/variants';
import {
  NewFeatureType,
  type NewFeatureSupport,
} from '@/schema/features/security/new-feature-name';
import { popRefs } from '@/schema/reference';

// Define the brand for this attribute
const brand = 'attributes.security.new_feature_name';

// Define the value type for this attribute
export type NewFeatureValue = Value & {
  featureType: NewFeatureType;
  additionalProperty: boolean;
  __brand: 'attributes.security.new_feature_name';
};

// Create evaluation functions for different levels of implementation
function noFeatureImplementation(): Evaluation<NewFeatureValue> {
  return {
    value: {
      id: 'no_implementation',
      rating: Rating.FAIL,
      displayName: 'No implementation',
      shortExplanation: sentence(`{{WALLET_NAME}} does not implement this feature.`),
      featureType: NewFeatureType.NONE,
      additionalProperty: false,
      __brand: brand,
    },
    details: paragraph(`{{WALLET_NAME}} does not implement this feature.`),
    howToImprove: paragraph(`{{WALLET_NAME}} should implement this feature to improve security.`),
  };
}

// Add more evaluation functions for other levels of implementation

// Define the attribute with all its properties
export const newFeature: Attribute<NewFeatureValue> = {
  id: 'newFeature',
  icon: '\u{1F4A1}', // Icon representing the feature
  displayName: 'New Feature Name',
  wording: {
    midSentenceName: null,
    howIsEvaluated: "How is a wallet's new feature evaluated?",
    whatCanWalletDoAboutIts: sentence(`What can {{WALLET_NAME}} do to improve its new feature?`),
  },
  question: sentence(`Does {{WALLET_NAME}} implement this new feature?`),
  why: markdown(`
    Explanation of why this feature is important.
  `),
  methodology: markdown(`
    Description of how wallets are evaluated on this feature.
  `),
  ratingScale: {
    display: 'pass-fail',
    exhaustive: true,
    pass: [
      // Define example ratings for PASS
    ],
    partial: [
      // Define example ratings for PARTIAL
    ],
    fail: [
      // Define example ratings for FAIL
    ],
  },
  aggregate: (perVariant: AtLeastOneVariant<Evaluation<NewFeatureValue>>) => {
    return pickWorstRating<NewFeatureValue>(perVariant);
  },
  evaluate: (features: ResolvedFeatures): Evaluation<NewFeatureValue> => {
    // Add logic to check if this feature applies to the wallet type
    // Return exempt if not applicable

    // Check if the feature is defined in the wallet
    if (features.security.newFeature === null || features.security.newFeature === undefined) {
      return unrated(newFeature, brand, {
        featureType: NewFeatureType.NONE,
        additionalProperty: false,
      });
    }

    // Extract references if any
    const { withoutRefs, refs: extractedRefs } = popRefs<NewFeatureSupport>(
      features.security.newFeature,
    );

    // Determine the evaluation based on the implementation type
    let result: Evaluation<NewFeatureValue>;

    switch (withoutRefs.type) {
      case NewFeatureType.COMPREHENSIVE:
        // Return comprehensive implementation evaluation
        break;
      case NewFeatureType.BASIC:
        // Return basic implementation evaluation
        break;
      case NewFeatureType.MINIMAL:
        // Return minimal implementation evaluation
        break;
      default:
        result = noFeatureImplementation();
        break;
    }

    // Return result with references if any
    return {
      ...result,
      ...(extractedRefs.length > 0 && { references: extractedRefs }),
    };
  },
};
```

## 3. Add the New Attribute to Security Attribute Group

Update the attribute-groups.ts file to include the new feature in the appropriate attribute group:

```typescript
// src/schema/attribute-groups.ts

// Add import
import { newFeature, type NewFeatureValue } from './attributes/security/new-feature-name';

/** A ValueSet for security Values. */
type SecurityValues = Dict<{
  securityAudits: SecurityAuditsValue;
  chainVerification: ChainVerificationValue;
  hardwareWalletClearSigning: HardwareWalletClearSigningValue;
  hardwareWalletSupport: HardwareWalletSupportValue;
  softwareHWIntegration: SoftwareHWIntegrationValue;
  passkeyImplementation: PasskeyImplementationValue;
  newFeature: NewFeatureValue; // Add the new feature value type
}>;

/** Security attributes. */
export const securityAttributeGroup: AttributeGroup<SecurityValues> = {
  id: 'security',
  icon: '\u{1f512}', // Lock
  displayName: 'Security',
  perWalletQuestion: sentence(`How secure is {{WALLET_NAME}}?`),
  attributes: {
    securityAudits,
    chainVerification,
    hardwareWalletClearSigning,
    hardwareWalletSupport,
    softwareHWIntegration,
    passkeyImplementation,
    newFeature, // Add the new feature attribute
  },
  score: scoreGroup<SecurityValues>({
    securityAudits: 1.0,
    chainVerification: 1.0,
    hardwareWalletClearSigning: 1.0,
    hardwareWalletSupport: 1.0,
    softwareHWIntegration: 1.0,
    passkeyImplementation: 1.0,
    newFeature: 1.0, // Add scoring weight for the new feature
  }),
};

// Also update the SecurityEvaluations interface, evaluateAttributes function,
// and aggregateAttributes function to include the new feature
```

## 4. Update the Features.ts File

Add the new feature to the WalletFeatures and ResolvedFeatures interfaces:

```typescript
// src/schema/features.ts

// Add import
import { type NewFeatureImplementation } from './features/security/new-feature-name';

/**
 * A set of features about a wallet.
 */
export interface WalletFeatures {
  // ... existing code ...

  /** Security features. */
  security: {
    // ... existing security features ...

    /** New feature implementation */
    newFeature?: VariantFeature<NewFeatureImplementation>;
  };

  // ... existing code ...
}

/**
 * A set of features about a specific wallet variant.
 * All features are resolved to a single variant here.
 */
export interface ResolvedFeatures {
  // ... existing code ...

  security: {
    // ... existing security features ...
    newFeature?: ResolvedFeature<NewFeatureImplementation>;
  };

  // ... existing code ...
}

/** Resolve a set of features according to the given variant. */
export function resolveFeatures(features: WalletFeatures, variant: Variant): ResolvedFeatures {
  // ... existing code ...

  return {
    // ... existing code ...
    security: {
      // ... existing security features ...
      newFeature: features.security.newFeature ? feat(features.security.newFeature) : undefined,
    },
    // ... existing code ...
  };
}
```

## 5. Add the New Feature to Example Wallets

Implement the new feature in example wallet files to demonstrate its usage:

```typescript
// data/wallets/example-wallet.ts or data/hardware wallets/example-wallet.ts

// Add import
import { NewFeatureType } from '@/schema/features/security/new-feature-name';

export const exampleWallet: Wallet = {
  // ... existing wallet definition ...

  features: {
    // ... existing features ...

    security: {
      // ... existing security features ...

      newFeature: {
        type: NewFeatureType.COMPREHENSIVE,
        url: 'https://example.com/feature-details',
        details: 'This wallet implements the new feature comprehensively with these benefits...',
        additionalProperty: true,
        ref: [
          {
            url: 'https://example.com/feature-documentation',
            explanation: 'Detailed documentation of how this wallet implements the new feature.',
          },
        ],
      },
    },

    // ... other features ...
  },

  // ... rest of wallet definition ...
};
```

## 6. Update WalletRatingCell for Targeted Display

If the feature should only be displayed for certain wallet types, update the WalletRatingCell component:

```typescript
// src/ui/molecules/WalletRatingCell.tsx

// Add necessary imports
import { NewFeatureType } from '@/schema/features/security/new-feature-name';

export function WalletRatingCell<Vs extends ValueSet>({
  row,
  attrGroup,
  evalGroupFn,
}: {
  row: WalletRowStateHandle;
  attrGroup: AttributeGroup<Vs>;
  evalGroupFn: (tree: EvaluationTree) => EvaluatedGroup<Vs>;
}): React.JSX.Element {
  const evalGroup = evalGroupFn(row.evalTree);

  // Check if this wallet is of the relevant type (e.g., hardware wallet)
  const isRelevantWalletType = row.wallet.variants.relevantType !== undefined;

  // Filter out EXEMPT attributes and include new feature only for relevant wallet types
  const evalEntries = evaluatedAttributesEntries(evalGroup).filter(([attrId, evalAttr]) => {
    // Always exclude EXEMPT attributes
    if (evalAttr.evaluation.value.rating === Rating.EXEMPT) {
      return false;
    }

    // Only include new feature for relevant wallet types
    if (attrId === 'newFeature') {
      return isRelevantWalletType;
    }

    // Include all other attributes
    return true;
  });

  // ... rest of component implementation ...
}
```

## 7. Handling Optional Features

If the feature is optional for certain wallet types, ensure proper handling:

1. Make the feature field optional in interfaces
2. Add appropriate null/undefined checks in evaluation logic
3. Update wallet examples to show different feature implementations
4. Test with wallets that both have and don't have the feature

## 8. Additional Considerations

- **Testing**: Test the feature with various wallet types to ensure proper evaluation
- **Documentation**: Update documentation to include the new feature criteria
- **UI Integration**: Ensure the feature displays correctly in the UI and pie charts
- **Linting**: Fix any TypeScript/linting errors that arise from adding the new feature
- **Example Files**: Create example implementation files to demonstrate different levels of the feature

## Example Implementation: Bug Bounty Program

For a complete example, see the Bug Bounty Program implementation:

- Schema: `src/schema/features/security/bug-bounty-program.ts`
- Attribute: `src/schema/attributes/security/bug-bounty-program.ts`
- Integration: Updated in `src/schema/attribute-groups.ts`
- Features: Updated in `src/schema/features.ts`
- Example wallets: Updated in hardware wallet files
- Display: Updated in `src/ui/molecules/WalletRatingCell.tsx`

This implementation demonstrates how to add a feature that only applies to hardware wallets, with different rating levels based on the comprehensiveness of the bug bounty program.
