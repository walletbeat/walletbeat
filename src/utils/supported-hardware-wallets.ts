import {
	type HardwareWalletType,
	hardwareWalletType,
} from '@/schema/features/security/hardware-wallet-support'
import { isMaybeSupported, isSupported } from '@/schema/features/support'
import { isRecord } from '@/types/utils/record'

/** Supported types include direct and WalletConnect connections; unavailable metadata has no badges. */
export function supportedHardwareWalletTypes(metadata: unknown): HardwareWalletType[] {
	if (
		!isRecord(metadata) ||
		!isRecord(metadata.hardwareWalletSupport) ||
		!isRecord(metadata.hardwareWalletSupport.wallets)
	) {
		return []
	}

	const wallets = metadata.hardwareWalletSupport.wallets

	return hardwareWalletType.items.filter(type => {
		const support = wallets[type]

		return isMaybeSupported(support) && isSupported(support)
	})
}
