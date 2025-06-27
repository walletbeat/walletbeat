import { AccountType } from '@/schema/features/account-support';
import { Leak, RegularEndpoint } from '@/schema/features/privacy/data-collection';
import { WalletProfile } from '@/schema/features/profile';
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program';
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support';
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

import { abyscuit } from '../contributors/abyscuit';
import { myetherwalletEntity } from '../entities/myetherwallet';

export const mewportfolio: SoftwareWallet = {
  metadata: {
    id: 'mewportfolio',
    displayName: 'MEW Portfolio',
    tableName: 'MEW Portfolio',
    blurb: paragraph(`
      Trusted by millions of users, MyEtherWallet is the first
      and best open source Ethereum wallet.
      Create a secure crypto wallet, buy, sell, stake and swap.
    `),
    contributors: [abyscuit],
    iconExtension: 'svg',
    lastUpdated: '2025-06-26',
    repoUrl: 'https://github.com/MyEtherWallet/MyEtherWallet',
    url: 'https://myetherwallet.com',
  },
  features: {
    accountSupport: {
      defaultAccountType: AccountType.eoa,
      eip7702: notSupported,
      eoa: supported({
        canExportPrivateKey: true,
        canExportSeedPhrase: false,
        keyDerivation: {
          type: 'BIP32',
          canExportSeedPhrase: false,
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
          risksExplained: 'NOT_IN_UI',
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
      browser: {
        '1193': notSupported,
        '2700': notSupported,
        '6963': notSupported,
        ref: null,
      },
      eip5792: null,
    },
    license: {
      license: License.MIT,
      ref: [
        {
          explanation: 'MyEtherWallet is licensed under the MIT license.',
          url: 'https://github.com/MyEtherWallet/MyEtherWallet/blob/main/LICENSE',
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
    multiAddress: notSupported,
    privacy: {
      dataCollection: {
        [Variant.BROWSER]: {
          collectedByEntities: [
            {
              entity: myetherwalletEntity,
              leaks: {
                cexAccount: Leak.NEVER,
                endpoint: RegularEndpoint,
                ipAddress: Leak.OPT_IN,
                mempoolTransactions: Leak.ALWAYS,
                ref: [
                  {
                    explanation: 'MyEtherWallet uses Amplitude Analytics to track user actions.',
                    url: 'https://github.com/search?q=repo%3AMyEtherWallet%2FMyEtherWallet%20amplitude&type=code',
                  },
                ],
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
      hardwareWalletSupport: {
        [Variant.BROWSER]: {
          ref: [
            {
              explanation: 'Enkrypt fully supports Ledger and Trezor hardware wallets.',
              url: 'https://enkrypt.com/download',
            },
          ],
          supportedWallets: {
            [HardwareWalletType.KEEPKEY]: featureSupported,
            [HardwareWalletType.OTHER]: featureSupported,
            [HardwareWalletType.LEDGER]: featureSupported,
            [HardwareWalletType.TREZOR]: featureSupported,
          },
        },
      },
      lightClient: {
        ethereumL1: null,
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
          selfBroadcastViaDirectGossip: featureSupported,
          selfBroadcastViaSelfHostedNode: null,
        },
        l2: {
          [TransactionSubmissionL2Type.arbitrum]:
            TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
          [TransactionSubmissionL2Type.opStack]:
            TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
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
    [Variant.BROWSER]: true,
  },
};
