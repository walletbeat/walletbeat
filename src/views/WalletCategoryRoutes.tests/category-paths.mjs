import { ratedEmbeddedWallets } from '../../../data/embedded-wallets.ts'
import { ratedHardwareWallets } from '../../../data/hardware-wallets.ts'
import { ratedSoftwareWallets } from '../../../data/software-wallets.ts'
import { displayedAttributeIdsForWalletType } from '../../schema/wallet-navigation.ts'
import { WalletType, walletTypes, walletTypeToUrlSlug } from '../../schema/wallet-types.ts'

const namesByType = {
	[WalletType.SOFTWARE]: Object.values(ratedSoftwareWallets).map(
		wallet => wallet.metadata.displayName,
	),
	[WalletType.HARDWARE]: Object.values(ratedHardwareWallets).map(
		wallet => wallet.metadata.displayName,
	),
	[WalletType.EMBEDDED]: Object.values(ratedEmbeddedWallets).map(
		wallet => wallet.metadata.displayName,
	),
}

process.stdout.write(
	JSON.stringify(
		walletTypes.items.flatMap(walletType =>
			['summary', ...displayedAttributeIdsForWalletType(walletType)].map(group => ({
				path: `/${walletTypeToUrlSlug(walletType)}/${group}/`,
				names: namesByType[walletType].toSorted(),
			})),
		),
	),
)
