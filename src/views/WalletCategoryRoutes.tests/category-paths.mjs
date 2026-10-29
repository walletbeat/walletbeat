import { displayedAttributeIdsForWalletType } from '../../schema/wallet-navigation.ts'
import { walletTypes, walletTypeToUrlSlug } from '../../schema/wallet-types.ts'

process.stdout.write(
	JSON.stringify(
		walletTypes.items.flatMap(walletType =>
			['summary', ...displayedAttributeIdsForWalletType(walletType)].map(
				group => `/${walletTypeToUrlSlug(walletType)}/${group}/`,
			),
		),
	),
)
