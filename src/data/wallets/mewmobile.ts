import type { Info } from '@/types/Info';

export const mewmobile: Info = {
  url: 'https://www.mewwallet.com/',
  submittedByName: '@Abyscuit',
  submittedByUrl: 'https://github.com/Abyscuit',
  updatedAt: '18/03/2025',
  updatedByName: '@Abyscuit',
  updatedByUrl: 'https://github.com/Abyscuit',
  mobile: {
    accountType: 'EOA',
    chainCompatibility: {
      configurable: false,
      autoswitch: false,
      ethereum: true,
      optimism: true,
      arbitrum: true,
      base: true,
      polygon: true,
      gnosis: false,
      bnbSmartChain: true,
      avalanche: false,
    },
    ensCompatibility: {
      mainnet: false,
      subDomains: false,
      offchain: false,
      L2s: false,
      customDomains: false,
      freeUsernames: false,
    },
    backupOptions: {
      cloud: false,
      local: true,
      socialRecovery: false,
    },
    securityFeatures: {
      multisig: false,
      MPC: false,
      keyRotation: false,
      transactionScanning: false,
      limitsAndTimelocks: false,
      hardwareWalletSupport: false,
    },
    availableTestnets: {
      availableTestnets: false,
    },
    license: 'OPEN_SOURCE',
    connectionMethods: {
      walletConnect: true,
      injected: true,
      embedded: false,
      inappBrowser: true,
    },
    modularity: {
      modularity: false,
    },
  },
};
