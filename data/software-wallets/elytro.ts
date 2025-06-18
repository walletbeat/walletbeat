import { nconsigny } from '@/data/contributors/nconsigny';
import { AccountType, TransactionGenerationCapability } from '@/schema/features/account-support';
import { WalletProfile } from '@/schema/features/profile';
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification';
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission';
import { notSupported, supported } from '@/schema/features/support';
import { Variant } from '@/schema/variants';
import type { SoftwareWallet } from '@/schema/wallet';
import { paragraph } from '@/types/content';

export const elytro: SoftwareWallet = {
  metadata: {
    id: 'elytro',
    displayName: 'Elytro',
    tableName: 'Elytro',
    blurb: paragraph(
      'Coming soon. We build secured and decentralized public infra for humanity on Ethereum. We believe in a free, open and self-own internet. We start by building a smart contract account.',
    ),
    contributors: [nconsigny],
    iconExtension: 'svg',
    lastUpdated: '2025-03-12',
    repoUrl: 'https://github.com/Elytro-eth',
    url: 'https://elytro.com',
  },
  features: {
    accountSupport: {
      defaultAccountType: AccountType.rawErc4337,
      eip7702: notSupported,
      eoa: notSupported,
      mpc: notSupported,
      rawErc4337: supported({
        contract: 'UNKNOWN',
        controllingSharesInSelfCustodyByDefault: 'YES',
        keyRotationTransactionGeneration:
          TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
        ref: {
          explanation: 'Elytro supports ERC-4337 smart contract wallets',
          url: 'https://github.com/Elytro-eth/soul-wallet-contract',
        },
        tokenTransferTransactionGeneration:
          TransactionGenerationCapability.USING_OPEN_SOURCE_STANDALONE_APP,
      }),
    },
    addressResolution: {
      chainSpecificAddressing: {
        erc7828: null,
        erc7831: null,
      },
      nonChainSpecificEnsResolution: null,
      ref: null,
    },
    chainAbstraction: null,
    chainConfigurability: null,
    integration: {
      browser: {
        '1193': null,
        '2700': null,
        '6963': null,
        ref: null,
      },
      eip5792: null,
    },
    license: null,
    monetization: {
      ref: null,
      revenueBreakdownIsPublic: false,
      strategies: {
        donations: null,
        ecosystemGrants: null,
        governanceTokenLowFloat: null,
        governanceTokenMostlyDistributed: null,
        hiddenConvenienceFees: null,
        publicOffering: null,
        selfFunded: null,
        transparentConvenienceFees: null,
        ventureCapital: null,
      },
    },
    multiAddress: null,
    privacy: {
      dataCollection: null,
      privacyPolicy: 'https://github.com/Elytro-eth',
      transactionPrivacy: {
        defaultFungibleTokenTransferMode: 'PUBLIC',
        stealthAddresses: notSupported,
      },
    },
    profile: WalletProfile.GENERIC,
    security: {
      bugBountyProgram: null,
      hardwareWalletSupport: {
        ref: undefined,
        supportedWallets: {},
      },
      lightClient: {
        ethereumL1: null,
      },
      passkeyVerification: {
        details: 'Elytro uses FreshCryptoLib for passkey verification in their WebAuthn library.',
        library: PasskeyVerificationLibrary.OPEN_ZEPPELIN_P256_VERIFIER,
        libraryUrl:
          'https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol',
        ref: [
          {
            explanation:
              'Elytro implements P256 verification using openzeppelin p256 verifier in their WebAuthn library.',
            url: 'https://github.com/Elytro-eth/Elytro-wallet-contract/blob/develop/contracts/libraries/WebAuthn.sol',
          },
        ],
      },
      publicSecurityAudits: null,
      scamAlerts: null,
    },
    selfSovereignty: {
      transactionSubmission: {
        l1: {
          selfBroadcastViaDirectGossip: null,
          selfBroadcastViaSelfHostedNode: null,
        },
        l2: {
          [TransactionSubmissionL2Type.arbitrum]: null,
          [TransactionSubmissionL2Type.opStack]: null,
        },
      },
    },
    transparency: {
      feeTransparency: null,
    },
  },
  variants: {
    [Variant.MOBILE]: true,
    [Variant.BROWSER]: true,
  },
};
