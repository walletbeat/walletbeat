import type { Info } from '@/types/Info';

export const mewportfolio: Info = {
  url: 'https://www.myetherwallet.com/',
  submittedByName: '@Abyscuit',
  submittedByUrl: 'https://github.com/Abyscuit',
  updatedAt: '18/03/2025',
  updatedByName: '@Abyscuit',
  updatedByUrl: 'https://github.com/Abyscuit',
  repoUrl: 'https://github.com/MyEtherWallet/MyEtherWallet',
  desktop: {
    accountType: 'EOA',
    chainCompatibility: {
      configurable: false,
      autoswitch: false,
      ethereum: true,
      optimism: true,
      arbitrum: true,
      base: false,
      polygon: true,
      gnosis: true,
      bnbSmartChain: true,
      avalanche: false,
    },
    ensCompatibility: {
      mainnet: true,
      subDomains: true,
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
      hardwareWalletSupport: true,
    },
    availableTestnets: {
      availableTestnets: true,
    },
    license: 'OPEN_SOURCE',
    connectionMethods: {
      walletConnect: false,
      injected: false,
      embedded: false,
      inappBrowser: false,
    },
    modularity: {
      modularity: false,
    },
  },
};
