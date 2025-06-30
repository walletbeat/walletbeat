import { nconsigny } from '@/data/contributors/nconsigny';
import { AccountType } from '@/schema/features/account-support';
import { WalletProfile } from '@/schema/features/profile';
import {
  HardwareWalletConnection,
  HardwareWalletType,
} from '@/schema/features/security/hardware-wallet-support';
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification';
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission';
import { featureSupported, notSupported, supported } from '@/schema/features/support';
import { Variant } from '@/schema/variants';
import type { SoftwareWallet } from '@/schema/wallet';
import { paragraph } from '@/types/content';

export const phantom: SoftwareWallet = {
  metadata: {
    id: 'phantom',
    displayName: 'Phantom',
    tableName: 'Phantom',
    blurb: paragraph(`
			Phantom is a user-friendly Ethereum and Solana wallet. It focuses
			on ease of use, easy swapping of tokens and NFTs, and integration
			with popular DeFi and NFT exchange protocols within the wallet.
		`),
    contributors: [nconsigny],
    iconExtension: 'svg',
    lastUpdated: '2025-02-08',
    repoUrl: null,
    url: 'https://www.phantom.com',
  },
  features: {
    accountSupport: {
      defaultAccountType: AccountType.eoa,
      eip7702: notSupported,
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
      privacyPolicy: 'https://www.phantom.com/privacy',
      transactionPrivacy: {
        defaultFungibleTokenTransferMode: 'PUBLIC',
        stealthAddresses: notSupported,
      },
    },
    profile: WalletProfile.GENERIC,
    security: {
      bugBountyProgram: null,
      hardwareWalletSupport: {
        ref: null,
        supportedWallets: {
          [HardwareWalletType.LEDGER]: supported({
            [HardwareWalletConnection.webUSB]: featureSupported,
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
    [Variant.BROWSER]: true,
  },
};
