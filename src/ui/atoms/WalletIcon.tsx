import { betaImagesRoot } from '@/constants'
import type { WalletMetadata } from '@/schema/wallet'
import type React from 'react'

export function WalletIcon({
	walletMetadata,
	iconSize,
}: {
	walletMetadata: WalletMetadata
	iconSize: number
}): React.JSX.Element {
	return (
		<img
			alt={walletMetadata.displayName}
			width={iconSize}
			height={iconSize}
			src={`${betaImagesRoot}/wallets/${walletMetadata.id}.${walletMetadata.iconExtension}`}
			style={{ filter: `drop-shadow(0 0 ${iconSize / 6}px rgba(255, 255, 255, 0.1))` }}
		/>
	)
}
