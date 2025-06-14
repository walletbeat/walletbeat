import { exampleContributor } from '@/data/contributors/example';
import { WalletProfile } from '@/schema/features/profile';
import { Variant } from '@/schema/variants';
import type { HardwareWallet } from '@/schema/wallet';
import { paragraph } from '@/types/content';

export const unratedHardwareTemplate: HardwareWallet = {
  metadata: {
    id: 'unrated',
    displayName: 'Unrated hardware wallet template',
    tableName: 'Unrated',
    blurb: paragraph(`
			This is a fictitious hardware wallet with all of its fields unrated.
			It is meant to be useful to copy-paste to other wallet files
			when initially creating the skeleton structure for their data.
		`),
    contributors: [exampleContributor],
    iconExtension: 'svg',
    lastUpdated: '2020-01-01',
    repoUrl: 'https://example.com/repo',
    url: 'https://example.com',
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
      privacyPolicy: 'https://example.com/privacy-policy',
      transactionPrivacy: null,
    },
    profile: WalletProfile.GENERIC,
    security: {
      bugBountyProgram: null,
      firmware: null,
      hardwareWalletDappSigning: null,
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
