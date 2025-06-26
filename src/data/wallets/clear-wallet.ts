import type { Info } from '@/types/Info';

export const clearwallet: Info = {
    url: 'https://clear-wallet.flashsoft.eu/',
    submittedByName: '@andrei0x309',
    submittedByUrl: 'https://warpcast.com/andrei0x309',
    updatedAt: '28/1/2025',
    updatedByName: '@andrei0x309',
    updatedByUrl: 'https://warpcast.com/andrei0x309',
    browser: {
        accountType: 'EOA',
        chainCompatibility: {
            configurable: true,
            autoswitch: false,
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
