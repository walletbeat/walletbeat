import type { Info } from '@/types/Info';

export const enkrypt: Info = {
  url: 'https://www.enkrypt.com/',
  submittedByName: '@timmykwesi',
  submittedByUrl: 'https://warpcast.com/timmykwesi',
  updatedAt: '18/03/2025',
  updatedByName: '@Abyscuit',
  updatedByUrl: 'https://github.com/Abyscuit',
  browser: {
    accountType: 'EOA',
    chainCompatibility: {
      configurable: true,
      autoswitch: true,
      ethereum: true,
      optimism: true,
      arbitrum: true,
      base: true,
      polygon: true,
      gnosis: true,
      bnbSmartChain: true,
      avalanche: true,
    },
    ensCompatibility: {
      mainnet: true,
      subDomains: true,
      offchain: false,
      L2s: true,
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
      hardwareWalletSupport: true,
    },
    availableTestnets: {
      availableTestnets: true,
    },
    license: 'OPEN_SOURCE',
    connectionMethods: {
      walletConnect: false,
      injected: true,
      embedded: false,
      inappBrowser: false,
    },
    modularity: {
      modularity: false,
    },
  },
};
