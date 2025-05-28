import { AccountType } from '@/schema/features/account-support';
import { WalletProfile } from '@/schema/features/profile';
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support';
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification';
import { RpcEndpointConfiguration } from '@/schema/features/self-sovereignty/chain-configurability';
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission';
import { featureSupported, notSupported, supported } from '@/schema/features/support';
import { Variant } from '@/schema/variants';
import type { SoftwareWallet } from '@/schema/wallet';
import { paragraph } from '@/types/content';

import { lucemans } from '../contributors/lucemans';
import { nconsigny } from '../contributors/nconsigny';
import { polymutex } from '../contributors/polymutex';

export const frame: SoftwareWallet = {
  metadata: {
    id: 'frame',
    displayName: 'Frame',
    tableName: 'Frame',
    blurb: paragraph('Frame...'),
    contributors: [polymutex, nconsigny, lucemans],
    iconExtension: 'svg',
    lastUpdated: '2025-03-13',
    repoUrl: null,
    url: 'https://frame.sh',
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
    chainConfigurability: {
      customChains: true,
      l1RpcEndpoint: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
      otherRpcEndpoints: RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS,
      ref: [
        {
          explanation: 'Frame allows connecting to your own Ethereum node',
          urls: [
            {
              label: 'Frame node connection documentation',
              url: 'https://docs.frame.sh/docs/Getting%20Started/Basics/Configuring%20Chains',
            },
          ],
        },
      ],
    },
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
        stealthAddresses: notSupported,
      },
    },
    profile: WalletProfile.GENERIC,
    security: {
      bugBountyProgram: null,
      hardwareWalletSupport: {
        ref: null,
        supportedWallets: {
          [HardwareWalletType.LEDGER]: featureSupported,
          [HardwareWalletType.TREZOR]: featureSupported,
          [HardwareWalletType.KEYSTONE]: featureSupported,
          [HardwareWalletType.GRIDPLUS]: featureSupported,
          [HardwareWalletType.OTHER]: featureSupported,
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
    [Variant.BROWSER]: true,
    [Variant.DESKTOP]: true,
  },
};
