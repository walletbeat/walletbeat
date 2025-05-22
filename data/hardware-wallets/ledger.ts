import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile';
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program';
import { DappSigningLevel } from '@/schema/features/security/hardware-wallet-dapp-signing';
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification';
import { Variant } from '@/schema/variants';
import type { HardwareWallet } from '@/schema/wallet';
import { paragraph } from '@/types/content';

import { nconsigny } from '../contributors/nconsigny';

export const ledgerWallet: HardwareWallet = {
  metadata: {
    id: 'ledger',
    displayName: 'Ledger Wallet',
    tableName: 'Ledger',
    blurb: paragraph(`
			Ledger Wallet is a self-custodial wallet built by Ledger. It
			integrates with Ledger hardware wallets to provide secure cryptocurrency management.
		`),
    contributors: [nconsigny],
    hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
    hardwareWalletModels: [
      {
        id: 'ledger-stax',
        name: 'Ledger Stax',
        isFlagship: true,
        url: 'https://shop.ledger.com/products/ledger-stax',
      },
      {
        id: 'ledger-nano-s',
        name: 'Ledger Nano S',
        isFlagship: false,
        url: 'https://www.ledger.com/academy/tutorials/nano-s-configure-a-new-device',
      },
      {
        id: 'ledger-nano-s-plus',
        name: 'Ledger Nano S+',
        isFlagship: false,
        url: 'https://shop.ledger.com/products/ledger-nano-s-plus',
      },
      {
        id: 'ledger-nano-x',
        name: 'Ledger Nano X',
        isFlagship: false,
        url: 'https://shop.ledger.com/products/ledger-nano-x',
      },
      {
        id: 'ledger-flex',
        name: 'Ledger Flex',
        isFlagship: false,
        url: 'https://shop.ledger.com/products/ledger-flex',
      },
    ],
    iconExtension: 'svg',
    lastUpdated: '2025-03-12',
    repoUrl: 'https://github.com/LedgerHQ/',
    url: 'https://www.ledger.com/',
  },
  features: {
    accountSupport: null,
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
      hardwarePrivacy: null,
      privacyPolicy: 'https://ledger.com/privacy-policy',
      transactionPrivacy: null,
    },
    profile: WalletProfile.GENERIC,
    security: {
      bugBountyProgram: {
        type: BugBountyProgramType.COMPREHENSIVE,
        details:
          'Ledger offers a comprehensive bug bounty program through their Donjon security team. The program offers competitive rewards based on the severity of findings and has a clear disclosure process.',
        ref: [
          {
            explanation:
              'Ledger maintains a well-documented bug bounty program through their Donjon security team, offering rewards up to $10,000 for critical vulnerabilities.',
            url: 'https://donjon.ledger.com/bounty/',
          },
        ],
        upgradePathAvailable: true,
        url: 'https://donjon.ledger.com/bounty/',
      },
      firmware: null,
      hardwareWalletDappSigning: {
        details:
          'Ledger provides basic transaction details when using hardware wallets, but some complex interactions may not display complete information on the hardware device.',
        level: DappSigningLevel.PARTIAL,
        ref: [
          {
            explanation:
              "Independent video demonstration of Ledger's clear signing implementation on Safe.",
            url: 'https://youtu.be/7lP_0h-PPvY?t=720',
          },
        ],
      },
      keysHandling: null,
      lightClient: {
        ethereumL1: null,
      },
      passkeyVerification: {
        library: PasskeyVerificationLibrary.NONE,
        ref: null,
      },
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

// add entries for

// For Ledger I need :

// Ledger nano S : @https://www.ledger.com/academy/tutorials/nano-s-configure-a-new-device
// Ledger nano S + :  @https://shop.ledger.com/products/ledger-nano-s-plus
// Ledger nano X : @https://shop.ledger.com/products/ledger-nano-x
// Ledger flex : @https://shop.ledger.com/products/ledger-flex
// flagship : Ledger stax : @https://shop.ledger.com/products/ledger-stax
