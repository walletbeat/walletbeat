import { ratedEmbeddedWallets } from '../../../data/embedded-wallets.ts'
import { ratedHardwareWallets } from '../../../data/hardware-wallets.ts'
import { ratedSoftwareWallets } from '../../../data/software-wallets.ts'
import { displayedAttributeIdsForWalletType } from '../../schema/wallet-navigation.ts'
import { WalletType, walletTypes, walletTypeToUrlSlug } from '../../schema/wallet-types.ts'

const walletsByType = {
	[WalletType.SOFTWARE]: ratedSoftwareWallets,
	[WalletType.HARDWARE]: ratedHardwareWallets,
	[WalletType.EMBEDDED]: ratedEmbeddedWallets,
}

process.stdout.write(
	JSON.stringify(
		walletTypes.items.flatMap(walletType =>
			['summary', ...displayedAttributeIdsForWalletType(walletType)].map(group => ({
				path: `/${walletTypeToUrlSlug(walletType)}/${group}/`,
				names: Object.values(walletsByType[walletType])
					.map(wallet => wallet.metadata.displayName)
					.toSorted(),
			})),
		),
	),
)
