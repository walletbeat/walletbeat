'use client'

import { createConfig, createStorage, custom, http, noopStorage } from '@wagmi/core'
import { mainnet, zksync } from '@wagmi/core/chains'

declare global {
	interface Window {
		ethereum?: { request: (...args: unknown[]) => Promise<unknown> }
	}
}

const getTransport = () => {
	if (typeof window !== 'undefined' && window.ethereum) {
		return custom(window.ethereum)
	}

	return http('http://localhost:8545')
}

const config = createConfig({
	chains: [mainnet, zksync],
	transports: {
		[mainnet.id]: getTransport(),
		[zksync.id]: getTransport(),
	},
	ssr: false,
	storage: createStorage({ storage: noopStorage }),
})

export default config
