import { allHardwareModels } from '@/data/hardware-wallets'
import { allRatedWalletsBySlug } from '@/data/wallets'
import { hasSingleVariant, Variant } from '@/schema/variants'

type Wallet = (typeof allRatedWalletsBySlug)[string]
export function walletSelections(wallet: Wallet) {
	const variants = [
		undefined,
		...(!hasSingleVariant(wallet.variants) ? (Object.keys(wallet.variants) as Variant[]) : []),
	]
	const models = allHardwareModels
		.filter(model => model.brandId === wallet.metadata.id)
		.map(model => model.modelId)

	return variants
		.flatMap(variant => {
			const applicableModels =
				Variant.HARDWARE in wallet.variants &&
				(variant === undefined || variant === Variant.HARDWARE)
					? models
					: []

			return [undefined, ...applicableModels].map(model => ({ variant, model }))
		})
		.filter(choice => choice.variant !== undefined || choice.model !== undefined)
		.map(choice => {
			const variant = choice.variant?.toLowerCase() ?? 'all'
			const model = choice.model ?? 'all'

			if (
				!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(variant) ||
				!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(model) ||
				choice.model === 'all'
			) {
				throw new Error('Selection IDs must preserve route-key boundaries')
			}

			return { ...choice, key: `${variant}--${model}` }
		})
}
