import { abyscuit } from '@/data/contributors/abyscuit';
import { AccountType } from '@/schema/features/account-support';
import {
  Leak,
  MultiAddressPolicy,
  RegularEndpoint,
} from '@/schema/features/privacy/data-collection';
import { WalletProfile } from '@/schema/features/profile';
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program';
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification';
import { RpcEndpointConfiguration } from '@/schema/features/self-sovereignty/chain-configurability';
import {
  TransactionSubmissionL2Support,
  TransactionSubmissionL2Type,
} from '@/schema/features/self-sovereignty/transaction-submission';
import { featureSupported, notSupported, supported } from '@/schema/features/support';
import { FeeTransparencyLevel } from '@/schema/features/transparency/fee-transparency';
import { License } from '@/schema/features/transparency/license';
import { Variant } from '@/schema/variants';
import type { SoftwareWallet } from '@/schema/wallet';
import { paragraph } from '@/types/content';

import { myetherwalletEntity } from '../entities/myetherwallet';

export const mewmobile: SoftwareWallet = {
  metadata: {
    id: 'mewmobile',
    displayName: 'MEW Mobile',
    tableName: 'MEW Mobile',
    blurb: paragraph(`
      A non-custodial, open-source, client-side wallet
      that allows users to interact with EVM
      blockchains and manage their cryptocurrency assets.
    `),
    contributors: [abyscuit],
    iconExtension: 'svg',
    lastUpdated: '2025-06-26',
    repoUrl: 'https://github.com/MyEtherWallet/mew-wallet-android-kit',
    url: 'https://www.mewwallet.com/',
  },
  features: {
    accountSupport: {
      defaultAccountType: AccountType.eoa,
      eip7702: notSupported,
      eoa: supported({
        canExportPrivateKey: false,
        canExportSeedPhrase: true,
        keyDerivation: {
          type: 'BIP32',
          canExportSeedPhrase: true,
          derivationPath: 'BIP44',
          seedPhrase: 'BIP39',
        },
      }),
      mpc: notSupported,
      rawErc4337: notSupported,
    },
    addressResolution: {
      chainSpecificAddressing: {
        erc7828: notSupported,
        erc7831: notSupported,
      },
      nonChainSpecificEnsResolution: notSupported,
      ref: null,
    },
    chainAbstraction: {
      bridging: {
        builtInBridging: supported({
          feesLargerThan1bps: 'HIDDEN_BY_DEFAULT',
          risksExplained: 'VISIBLE_BY_DEFAULT',
        }),
        suggestedBridging: notSupported,
      },
      crossChainBalances: {
        ether: {
          crossChainSumView: notSupported,
          perChainBalanceViewAcrossMultipleChains: notSupported,
        },
        globalAccountValue: notSupported,
        perChainAccountValue: featureSupported,
        usdc: {
          crossChainSumView: notSupported,
          perChainBalanceViewAcrossMultipleChains: notSupported,
        },
      },
    },
    chainConfigurability: {
      customChains: false,
      l1RpcEndpoint: RpcEndpointConfiguration.NO,
      otherRpcEndpoints: RpcEndpointConfiguration.NO,
      ref: null,
    },
    integration: {
      browser: 'NOT_A_BROWSER_WALLET',
      eip5792: null,
    },
    license: {
      license: License.MIT,
      ref: [
        {
          explanation: 'MEW Mobile is licensed under the MIT license.',
          url: 'https://github.com/MyEtherWallet/mew-wallet-android-kit/blob/master/LICENSE',
        },
      ],
    },
    monetization: {
      ref: null,
      revenueBreakdownIsPublic: false,
      strategies: {
        donations: true,
        ecosystemGrants: true,
        governanceTokenLowFloat: false,
        governanceTokenMostlyDistributed: false,
        hiddenConvenienceFees: false,
        publicOffering: false,
        selfFunded: false,
        transparentConvenienceFees: true,
        ventureCapital: false,
      },
    },
    multiAddress: featureSupported,
    privacy: {
      dataCollection: {
        [Variant.MOBILE]: {
          collectedByEntities: [
            {
              entity: myetherwalletEntity,
              leaks: {
                cexAccount: Leak.NEVER,
                endpoint: RegularEndpoint,
                ipAddress: Leak.OPT_IN,
                mempoolTransactions: Leak.ALWAYS,
                multiAddress: {
                  type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
                },
                walletAddress: Leak.ALWAYS,
              },
            },
          ],
          onchain: {},
        },
      },
      privacyPolicy: 'https://www.myetherwallet.com/privacy-policy',
      transactionPrivacy: null,
    },
    profile: WalletProfile.GENERIC,
    security: {
      bugBountyProgram: {
        type: BugBountyProgramType.BASIC,
        upgradePathAvailable: false,
        url: 'https://hackenproof.com/programs/myetherwallet',
      },
      hardwareWalletSupport: null,
      lightClient: {
        ethereumL1: notSupported,
      },
      passkeyVerification: {
        library: PasskeyVerificationLibrary.NONE,
        ref: null,
      },
      publicSecurityAudits: null,
      scamAlerts: {
        contractTransactionWarning: supported({
          contractRegistry: true,
          leaksContractAddress: true,
          leaksUserAddress: false,
          leaksUserIp: false,
          previousContractInteractionWarning: false,
          recentContractWarning: false,
          ref: null,
        }),
        scamUrlWarning: notSupported,
        sendTransactionWarning: notSupported,
      },
    },
    selfSovereignty: {
      transactionSubmission: {
        l1: {
          selfBroadcastViaDirectGossip: notSupported,
          selfBroadcastViaSelfHostedNode: notSupported,
        },
        l2: {
          [TransactionSubmissionL2Type.arbitrum]:
            TransactionSubmissionL2Support.NOT_SUPPORTED_BY_WALLET_BY_DEFAULT,
          [TransactionSubmissionL2Type.opStack]:
            TransactionSubmissionL2Support.NOT_SUPPORTED_BY_WALLET_BY_DEFAULT,
        },
      },
    },
    transparency: {
      feeTransparency: {
        disclosesWalletFees: true,
        level: FeeTransparencyLevel.COMPREHENSIVE,
        showsTransactionPurpose: true,
      },
    },
  },
  variants: {
    [Variant.MOBILE]: true,
  },
};
