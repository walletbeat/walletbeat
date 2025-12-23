'use client'

import { mainnet, zksync } from '@wagmi/core/chains'
import { createConfig, http } from '@wagmi/core'

const config = createConfig({
	chains: [mainnet, zksync],
	transports: {
		[mainnet.id]: http(),
		[zksync.id]: http(),
	},
	ssr: false,
})

export default config
