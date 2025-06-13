import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile';
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program';
import { FirmwareType } from '@/schema/features/security/firmware';
import {
  CalldataDecoding,
  DataExtraction,
} from '@/schema/features/security/hardware-wallet-dapp-signing';
import { License } from '@/schema/features/transparency/license';
import { Variant } from '@/schema/variants';
import type { HardwareWallet } from '@/schema/wallet';
import { paragraph } from '@/types/content';

import { patrickalphac } from '../contributors/patrickalphac';

export const cypherockWallet: HardwareWallet = {
  metadata: {
    id: 'cypherock',
    displayName: 'Cypherock Wallet',
    tableName: 'Cypherock',
    blurb: paragraph(`
			The Cypherock has a secure element (EAL6+ rated) and uses a unique card-tapping system for transaction authorization.
		`),
    contributors: [patrickalphac],
    hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
    hardwareWalletModels: [
      {
        id: 'cypherock-x1',
        name: 'Cypherock X1',
        isFlagship: true,
        url: 'https://www.cypherock.com/product/cypherock-x1',
      },
    ],
    iconExtension: 'svg',
    lastUpdated: '2025-01-06',
    repoUrl: 'https://github.com/Cypherock',
    url: 'https://cypherock.com/',
  },
  features: {
    accountSupport: null,
    license: {
      license: License.MIT_WITH_CLAUSE,
      ref: [
        {
          explanation: 'Cypherock is open-source and reproducible',
          url: 'https://github.com/Cypherock/x1_wallet_firmware/blob/main/LICENSE.md',
        },
      ],
    },
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
      hardwarePrivacy: null,
      privacyPolicy: 'https://www.cypherock.com/privacy',
      transactionPrivacy: null,
    },
    profile: WalletProfile.GENERIC,
    security: {
      bugBountyProgram: {
        type: BugBountyProgramType.BASIC,
        details:
          'Cypherock provides legal protection for security researchers and discretionary rewards for valid security issues affecting X1 Wallet and X1 Card.',
        ref: [
          {
            explanation:
              'Bug bounty program with responsible disclosure policy and discretionary rewards',
            url: 'https://cypherock.com/bug-bounty',
          },
        ],
        upgradePathAvailable: true,
        url: 'https://cypherock.com/bug-bounty',
      },
      firmware: {
        type: FirmwareType.PASS,
        customFirmware: null,
        firmwareOpenSource: FirmwareType.PASS,
        reproducibleBuilds: FirmwareType.PASS,
        silentUpdateProtection: FirmwareType.PASS,
      },
      hardwareWalletDappSigning: {
        messageSigning: {
          calldataDecoding: CalldataDecoding.NONE,
          details:
            'Shows EIP-712 signature data only in the companion application, not on the hardware wallet itself.',
          messageExtraction: DataExtraction.EYES,
        },
        ref: [
          {
            explanation: "Independent video demonstration of Cypherock's signing implementation.",
            url: 'https://youtu.be/9YmPWxAvKYY?t=534',
          },
          {
            explanation:
              "Independent video demonstration of Cypherock's transaction implementation.",
            url: 'https://youtube.com/shorts/YG6lzwTUojE',
          },
        ],
        transactionSigning: {
          calldataDecoding: CalldataDecoding.NONE,
          calldataExtraction: DataExtraction.NONE,
          details:
            'Completely fails to display calldata for transactions on either the application or the hardware wallet itself.',
          displayedTransactionDetails: {
            chain: false,
            from: true, // derivation path counts
            gas: true, // tx fee
            nonce: false,
            to: true, // contract address
            value: true,
          },
        },
      },
      keysHandling: null,
      lightClient: {
        ethereumL1: null,
      },
      passkeyVerification: null,
      publicSecurityAudits: null,
      supplyChainDIY: null,
      supplyChainFactory: null,
      userSafety: null,
    },
    selfSovereignty: {
      interoperability: null,
    },
    transparency: {
      feeTransparency: null,
      maintenance: null,
      reputation: null,
    },
  },
  variants: {
    [Variant.HARDWARE]: true,
  },
};
