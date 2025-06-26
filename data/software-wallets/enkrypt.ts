import { AccountType } from '@/schema/features/account-support';
import {
  Leak,
  MultiAddressPolicy,
  RegularEndpoint,
} from '@/schema/features/privacy/data-collection';
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

export const enkrypt: SoftwareWallet = {
  metadata: {
    id: 'enkrypt',
    displayName: 'Enkrypt',
    tableName: 'Enkrypt',
    blurb: paragraph(`
      A multichain crypto wallet hold, buy, send,
      receive, and swap tokens. Manage your NFTs. 
      Access web3 apps across multiple blockchains.
    `),
    contributors: [abyscuit],
    iconExtension: 'svg',
    lastUpdated: '2025-06-25',
    repoUrl: 'https://github.com/enkryptcom/enKrypt',
    url: 'https://enkrypt.com',
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
      nonChainSpecificEnsResolution: supported({ medium: 'CHAIN_CLIENT' }),
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
      customChains: true,
      l1RpcEndpoint: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
      otherRpcEndpoints: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
      ref: null,
    },
    integration: {
      browser: {
        '1193': featureSupported,
        '2700': featureSupported,
        '6963': featureSupported,
        ref: null,
      },
      eip5792: null,
    },
    license: {
      license: License.MIT,
      ref: [
        {
          explanation: 'Enkrypt is licensed under the MIT license.',
          url: 'https://github.com/enkryptcom/enKrypt/blob/main/LICENSE',
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
        [Variant.BROWSER]: {
          collectedByEntities: [
            {
              // Enkrypt is owned by MyEtherWallet.
              entity: myetherwalletEntity,
              leaks: {
                cexAccount: Leak.NEVER,
                endpoint: RegularEndpoint,
                ipAddress: Leak.OPT_IN,
                mempoolTransactions: Leak.ALWAYS,
                multiAddress: {
                  type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY,
                },
                ref: [
                  {
                    explanation: 'Enkrypt uses Amplitude Analytics to track user actions.',
                    url: 'https://github.com/search?q=repo%3Aenkryptcom%2FenKrypt+amplitude&type=commits',
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
            [HardwareWalletType.LEDGER]: featureSupported,
            [HardwareWalletType.TREZOR]: featureSupported,
          },
        },
      },
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
        sendTransactionWarning: supported({
          leaksRecipient: false,
          leaksUserAddress: false,
          leaksUserIp: false,
          newRecipientWarning: false,
          ref: null,
          userWhitelist: true,
        }),
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
            TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
          [TransactionSubmissionL2Type.opStack]:
            TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION,
        },
      },
    },
    transparency: {
      feeTransparency: {
        disclosesWalletFees: true,
        level: FeeTransparencyLevel.DETAILED,
        showsTransactionPurpose: true,
      },
    },
  },
  variants: {
    [Variant.BROWSER]: true,
  },
};
