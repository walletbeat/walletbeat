import type { Entity } from '@/schema/entity';
import type { WithRef } from '@/schema/reference';

import type { Support } from '../support';
import type { MultiAddressHandling } from './data-collection';

/**
 * Support for various types of transactional privacy.
 */
export interface TransactionPrivacy {
  /** Support for stealth addresses. */
  stealthAddresses: Support<StealthAddressSupport>;

  // TODO: Add other forms of transaction privacy here,
  // e.g. Privacy Pools, Tornado Cash etc.
}

/** Support for ERC-5564 stealth addresses. */
export interface StealthAddressSupport {
  /**
   * When sending funds to a stealth meta-address, how is the resolution of
   * that stealth meta-address to a specific stealth address done?
   */
  recipientAddressResolution: WithRef<
    | {
        /**
         * Resolution is done exclusively with the default chain provider,
         * inheriting its privacy properties (or lack thereof).
         */
        type: 'DEFAULT_CHAIN_PROVIDER';
      }
    | {
        /**
         * Resolution is done exclusively with a specific third-party provider.
         */
        type: 'THIRD_PARTY_RESOLVER';
        thirdParty: Entity;
        thirdPartyLearnsRecipientMetaAddress: boolean;
        thirdPartyLearnsRecipientGeneratedStealthAddress: boolean;
      }
  >;

  /**
   * When a user wants to look at the funds they own across their stealth
   * addresses, how is this lookup done?
   */
  balanceLookup: WithRef<
    | {
        /**
         * Resolution is done exclusively with the default chain provider,
         * inheriting its privacy properties (or lack thereof).
         */
        type: 'DEFAULT_CHAIN_PROVIDER';

        /**
         * How requests for multiple stealth addresses are handled.
         */
        multiAddressHandling: MultiAddressHandling;
      }
    | {
        type: 'THIRD_PARTY_SERVICE';

        /** The third party that does the balance lookup. */
        thirdParty: Entity;

        /**
         * Whether the third party learns the correlation between multiple
         * stealth addresses belonging to the same user.
         */
        thirdPartyLearnsMultipleUserStealthAddresses: boolean;
      }
  >;

  /**
   * Can the user label their stealth addresses into distinct buckets, such
   * that two addresses from different buckets may never appear in the same
   * transaction?
   */
  userLabeling: WithRef<
    Support<{
      /**
       * When funds are received to a new unlabeled address, and the user
       * attempts to spend from it, what happens?
       */
      unlabeledBehavior: StealthAddressUnlabeledBehavior;
    }>
  >;
}

/**
 * When funds are received to a new unlabeled address, and the user
 * attempts to spend from it, what happens?
 */
export enum StealthAddressUnlabeledBehavior {
  /** All unlabeled addresses are treated as a single bucket to spend from. */
  TREAT_ALL_UNLABELED_AS_SINGLE_BUCKET = 'TREAT_ALL_UNLABELED_AS_SINGLE_BUCKET',

  /** Each unlabeled address is treated as its own bucket. */
  TREAT_EACH_UNLABELED_AS_OWN_BUCKET = 'TREAT_EACH_UNLABELED_AS_OWN_BUCKET',

  /** Users cannot spend from unlabeled addresses; must label them first. */
  MUST_LABEL_BEFORE_SPENDING = 'MUST_LABEL_BEFORE_SPENDING',
}
