import type { LevelConfig, Slice } from '@/components/pie-geometry'
import {
	type EipStatusSupportCard,
	EipSupportStatus,
	eipSupportStatusColor,
	eipSupportStatusGroupId,
} from '@/schema/eip-support'

/** The chart counts status entries; its center counts distinct wallets. */
export function eipSupportPie(
	cards: Pick<EipStatusSupportCard, 'id' | 'status'>[],
	listId: string,
) {
	const walletCount = new Set(cards.map(card => card.id)).size
	const supportedWalletCount = new Set(
		cards.filter(card => card.status === EipSupportStatus.SUPPORTED).map(card => card.id),
	).size
	const slices: Slice[] = [
		{ status: EipSupportStatus.SUPPORTED, description: 'supported' },
		{ status: EipSupportStatus.NOT_SUPPORTED, description: 'not supported' },
		{ status: EipSupportStatus.UNKNOWN, description: 'unknown' },
	].flatMap(({ status, description }) => {
		const count = cards.filter(card => card.status === status).length

		return count === 0
			? []
			: [
					{
						id: status,
						color: eipSupportStatusColor[status],
						weight: count,
						arcLabel: String(count),
						ariaLabel: `${count} platform-qualified status entries: ${description}`,
						href: `#${eipSupportStatusGroupId(listId, status)}`,
					},
				]
	})
	const levels: LevelConfig[] = [
		{
			outerRadiusFraction: 1,
			innerRadiusFraction: 0.58,
			gap: 0,
			angleGap: slices.length > 1 ? 4 : 0,
			outerCornerRadius: 6,
			innerCornerRadius: 4,
		},
	]

	return { walletCount, supportedWalletCount, slices, levels }
}
