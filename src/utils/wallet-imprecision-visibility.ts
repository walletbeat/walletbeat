import type { WalletMetadata } from '@/schema/wallet'
import { type CalendarDate, daysBetween, today } from '@/types/date'

const imprecisionDisplayGracePeriodDays = 7

/** Whether the wallet was updated within the last seven calendar days. */
export function isWalletUpdatedRecently(lastUpdated: CalendarDate, currentDate = today()): boolean {
	const ageInDays = daysBetween(lastUpdated, currentDate)

	return ageInDays >= 0 && ageInDays <= imprecisionDisplayGracePeriodDays
}

/** Whether the wallet should be shown in wallet tables. */
export function isWalletDisplayable(
	metadata: Pick<WalletMetadata, 'imprecise' | 'lastUpdated'>,
	currentDate = today(),
): boolean {
	return !metadata.imprecise || isWalletUpdatedRecently(metadata.lastUpdated, currentDate)
}
