import type React from 'react'

import { betaImagesRoot } from '@/constants'
import { hasVariant, Variant } from '@/schema/variants'
import type { RatedWallet } from '@/schema/wallet'

export function WalletIcon({
	wallet,
	iconSize,
}: {
	wallet: RatedWallet
	iconSize: number
}): React.JSX.Element {
	// Determine if this is a hardware wallet
	const isHardwareWallet = hasVariant(wallet.variants, Variant.HARDWARE)

	// Determine the correct folder based on wallet type
	const folderPath = isHardwareWallet ? 'hww' : 'wallets'

	return (
		<div style={{ width: iconSize, height: iconSize, overflow: 'hidden' }} className="flex">
			<img
				alt={wallet.metadata.displayName}
				width={iconSize}
				height={iconSize}
				src={`${betaImagesRoot}/${folderPath}/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
				style={{ filter: `drop-shadow(0 0 ${iconSize / 6}px rgba(255, 255, 255, 0.1))` }}
			/>
		</div>
	)
}
