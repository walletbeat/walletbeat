'use client'

import { createConfig, http } from '@wagmi/core'
import { mainnet, zksync } from '@wagmi/core/chains'

const config = createConfig({
	chains: [mainnet, zksync],
	transports: {
		[mainnet.id]: http(),
		[zksync.id]: http(),
	},
	ssr: false,
})

export default config
