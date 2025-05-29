import type { Entity } from '@/schema/entity';
import type { WithRef } from '@/schema/reference';

import type { Support, Supported } from '../support';
import type { MultiAddressHandling, MultiAddressPolicy } from './data-collection';

export enum PrivateTransferTechnology {
  STEALTH_ADDRESSES = 'stealthAddresses',
}

/** Type predicate for `PrivateTransferTechnology`. */
export function isPrivateTransferTechnology(obj: unknown): obj is PrivateTransferTechnology {
  if (typeof obj !== 'string') {
    return false;
  }

  switch (obj) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- Safe because this is exactly what we are trying to establish
    case PrivateTransferTechnology.STEALTH_ADDRESSES:
      return true;
    default:
      return false;
  }
}

export type FungibleTokenTransferMode =
  /**
   * The wallet has no default token transfer mode; the user must make an
   * explicit selection of which transfer mode to use.
   */
  | 'EXPLICIT_CHOICE'

  /**
   * Tokens are sent in a public token transaction,
   * revealing both sender and recipient.
   */
  | 'PUBLIC'

  /**
   * Tokens are sent using a specific private transfer technology.
   */
  | PrivateTransferTechnology;

type IfDefaultTransferMode<T extends PrivateTransferTechnology, IfDefault> =
  | ({
      defaultFungibleTokenTransferMode: T;
    } & IfDefault)
  | {
      defaultFungibleTokenTransferMode: Exclude<FungibleTokenTransferMode, T>;
    };

/**
 * Support for various types of transactional privacy.
 */
export type TransactionPrivacy = {
  /**
   * When sending Ether or ERC-20, which transfer mode is the default?
   * If the wallet uses a different mode for transfers of Ether vs ERC-20
   * tokens, this field should be set to the least private of the two.
   */
  defaultFungibleTokenTransferMode: FungibleTokenTransferMode;

  /** Support for stealth addresses. */
  [PrivateTransferTechnology.STEALTH_ADDRESSES]: Support<StealthAddressSupport>;

  // TODO: Add other forms of transaction privacy here,
  // e.g. Privacy Pools, Tornado Cash etc.
} & IfDefaultTransferMode<
  PrivateTransferTechnology.STEALTH_ADDRESSES,
  {
    [PrivateTransferTechnology.STEALTH_ADDRESSES]: Supported<StealthAddressSupport>;
  }
>;

/** Support for ERC-5564 stealth addresses. */
export interface StealthAddressSupport {
  /**
   * When sending funds to a stealth meta-address, how is the resolution of
   * that stealth meta-address to a specific stealth address done?
   * (ERC-5564: `generateStealthAddress`)
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

        /** The third party that does the resolution. */
        thirdParty: Entity;

        /** What does this third party learn? */
        learns: {
          senderIpAddress: boolean;
          senderMetaAddress: boolean;
          recipientMetaAddress: boolean;
          recipientGeneratedStealthAddress: boolean;
        };
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
         * Cannot be "ACTIVE_ADDRESS_ONLY" because stealth addresses mean
         * there are inherently multiple effective active addresses.
         */
        multiAddressHandling: Exclude<
          MultiAddressHandling,
          { type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY }
        >;
      }
    | {
        type: 'THIRD_PARTY_SERVICE';

        /** The third party that does the balance lookup. */
        thirdParty: Entity;

        /** What does this third party learn? */
        learns: {
          /** The user's stealth meta-address. */
          userMetaAddress: boolean;

          /** The user's generated stealth addresses. */
          generatedStealthAddresses: boolean;
        };
      }
  >;

  /**
   * When needing to spend funds from stealth addresses, how does the owner
   * derive the private key for each stealth address?
   * (ERC-5564: `computeStealthKey`)
   */
  privateKeyDerivation: WithRef<
    | {
        /** The wallet calls `computeStealthKey` with the chain RPC provider. */
        type: 'DEFAULT_CHAIN_PROVIDER';
      }
    | {
        /** A third-party service provides private key data to the wallet. */
        type: 'THIRD_PARTY_SERVICE';

        /** The third party that provides this. */
        thirdParty: Entity;
      }
    | {
        /** Private key derivation is done locally. */
        type: 'LOCALLY';
      }
  >;

  /**
   * Can the user label their stealth addresses into distinct buckets, such
   * that two addresses from different buckets may never appear in the same
   * transaction?
   */
  userLabeling: Support<
    WithRef<{
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
