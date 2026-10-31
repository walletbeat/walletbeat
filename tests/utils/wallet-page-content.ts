import { allHardwareModels } from '@/data/hardware-wallets'
import { allRatedWalletsBySlug } from '@/data/wallets'
import { Rating } from '@/schema/attributes'
import { isMaybeSupported, isSupported } from '@/schema/features/support'
import { toFullyQualified } from '@/schema/reference'
import { stripSyntheticAnchor } from '@/schema/url'
import { hasSingleVariant, type Variant } from '@/schema/variants'
import type { RatedWallet } from '@/schema/wallet'
import { isRecord } from '@/types/utils/record'
import { slugifyCamelCase } from '@/types/utils/text'

export const contentWallets: RatedWallet<string>[] = Object.values(allRatedWalletsBySlug)
/** Facts selected by the native wallet contract; model selection only filters hardware badges. */
export function selectedWalletContent(
	wallet: RatedWallet<string>,
	variant: Variant | null,
	model: string | null,
) {
	const tree =
		variant && !hasSingleVariant(wallet.variants)
			? wallet.variants[variant]?.attributes
			: wallet.overall

	if (!tree) {
		throw new Error(`Unsupported variant: ${variant}`)
	}

	const attributes = Object.values(tree)
		.flatMap(group => Object.values(group))
		.filter(entry => entry.evaluation.outcome.rating !== Rating.EXEMPT)
		.map(({ attribute, evaluation }) => ({
			id: slugifyCamelCase(attribute.id),
			name: attribute.displayName,
			rating: evaluation.outcome.rating,

			citations: [
				...new Set(
					toFullyQualified(evaluation.references).flatMap(ref =>
						ref.urls.map(url => stripSyntheticAnchor(url.url)),
					),
				),
			].sort(),
		}))
	const hardware = Object.values(tree)
		.flatMap(group => Object.values(group))
		.find(entry => entry.attribute.id === 'hardwareWalletSupport')?.evaluation.outcome
	const metadata = hardware && 'metadata' in hardware ? hardware.metadata : null
	const support =
		isRecord(metadata) && isRecord(metadata.hardwareWalletSupport)
			? metadata.hardwareWalletSupport
			: null
	const brands =
		support && isRecord(support.wallets)
			? Object.entries(support.wallets)
					.filter(([, value]) => isMaybeSupported(value) && isSupported(value))
					.map(([brand]) => brand)
			: []
	const supportedModels = allHardwareModels.filter(item =>
		brands.includes(item.brandId.toUpperCase()),
	)

	return {
		attributes,
		supportedModels,
		badges: supportedModels
			.filter(item => !model || item.modelId === model)
			.map(item => ({
				href: `/${item.brandId}/?model=${item.modelId}`,
				text: item.modelName,
				image: item.iconUrl,
				alt: item.brandName,
			})),
	}
}

export function walletContentPlans() {
	return contentWallets.map(wallet => {
		const variants: (Variant | null)[] = [
			null,
			...(!hasSingleVariant(wallet.variants) ? Object.keys(wallet.variants) : []),
		]
		const ownModels = allHardwareModels
			.filter(model => model.brandId === wallet.metadata.id)
			.map(model => model.modelId)
		const cases = variants.flatMap(variant => {
			const { supportedModels } = selectedWalletContent(wallet, variant, null)
			const unsupported = allHardwareModels.find(
				model => !supportedModels.some(item => item.modelId === model.modelId),
			)?.modelId
			const models: (string | null)[] = [
				null,
				...(supportedModels.length
					? [
							supportedModels[0].modelId,
							...(unsupported ? [unsupported] : []),
							'unknown-wallet-model',
						]
					: []),
				...(variant === null && ownModels.length > 1 ? ownModels : []),
			]

			return [...new Set(models)].map(model => {
				const { attributes, badges } = selectedWalletContent(wallet, variant, model)

				return { variant, model, attributes, badges }
			})
		})

		return { id: wallet.metadata.id, variants, ownModels, cases }
	})
}

export type WalletContentPlan = ReturnType<typeof walletContentPlans>[number]
export type WalletContentCase = WalletContentPlan['cases'][number]
