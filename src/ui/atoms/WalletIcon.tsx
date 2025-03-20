import { betaImagesRoot } from '@/constants'
import type { WalletMetadata } from '@/schema/wallet'
import { Variant } from '@/schema/variants'
import type React from 'react'

export function WalletIcon({
	walletMetadata,
	iconSize,
	variants = null,
}: {
	walletMetadata: WalletMetadata
	iconSize: number
	variants?: Record<Variant, boolean> | null
}): React.JSX.Element {
	// Determine if this is a hardware wallet
	const isHardwareWallet = variants?.hardware || false;
	
	// Determine the correct folder based on wallet type
	const folderPath = isHardwareWallet ? 'hardware-wallets' : 'wallets';
	
	return (
		<div style={{ width: iconSize, height: iconSize, overflow: 'hidden' }} className='flex'>
			<img
				alt={walletMetadata.displayName}
				width={iconSize}
				height={iconSize}
				src={`${betaImagesRoot}/${folderPath}/${walletMetadata.id}.${walletMetadata.iconExtension}`}
				style={{ filter: `drop-shadow(0 0 ${iconSize / 6}px rgba(255, 255, 255, 0.1))` }}
			/>
		</div>
	)
}
