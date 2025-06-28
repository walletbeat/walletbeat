import { lucemans } from '@/data/contributors/lucemans';
import { AccountType } from '@/schema/features/account-support';
import { WalletProfile } from '@/schema/features/profile';
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support';
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification';
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission';
import { notSupported, supported } from '@/schema/features/support';
import { Variant } from '@/schema/variants';
import type { SoftwareWallet } from '@/schema/wallet';
import { paragraph } from '@/types/content';

export const zerion: SoftwareWallet = {
  metadata: {
    id: 'zerion',
    displayName: 'Zerion',
    tableName: 'Zerion',
    blurb: paragraph(''),
    contributors: [lucemans],
    iconExtension: 'svg',
    lastUpdated: '2025-04-22',
    repoUrl: null,
    url: 'https://www.zerion.io',
  },
  features: {
    accountSupport: {
      defaultAccountType: AccountType.eoa,
      eip7702: notSupported,
      // BIP support is not verified
      eoa: supported({
        canExportPrivateKey: true,
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
      privacyPolicy: null,
      transactionPrivacy: {
        defaultFungibleTokenTransferMode: 'PUBLIC',
        stealthAddresses: notSupported,
      },
    },
    profile: WalletProfile.GENERIC,
    security: {
      bugBountyProgram: null,
      hardwareWalletSupport: {
        ref: [
          {
            explanation:
              'Right now Ledger is the lone first-class citizen in Zerion, but the WalletConnect & external-wallet routes mean you can still sign (or at least track) with Trezor, Keystone, GridPlus, and practically any other cold-storage solution—just with one extra hop.',
            url: ['https://www.ledger.com/zerion'],
          },
        ],
        supportedWallets: {
          [HardwareWalletType.LEDGER]: supported({
            ref: {
              explanation: 'Ledger has native first-class support in Zerion.',
              url: 'https://www.ledger.com/zerion',
            },
          }),
          [HardwareWalletType.TREZOR]: supported({
            ref: {
              explanation:
                'Trezor can be used with Zerion via WalletConnect and external-wallet routes, with one extra hop.',
              url: 'https://www.ledger.com/zerion',
            },
          }),
          [HardwareWalletType.KEYSTONE]: supported({
            ref: {
              explanation:
                'Keystone can be used with Zerion via WalletConnect and external-wallet routes, with one extra hop.',
              url: 'https://www.ledger.com/zerion',
            },
          }),
          [HardwareWalletType.GRIDPLUS]: supported({
            ref: {
              explanation:
                'GridPlus can be used with Zerion via WalletConnect and external-wallet routes, with one extra hop.',
              url: 'https://www.ledger.com/zerion',
            },
          }),
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
  },
};
