import { allRatedWallets } from '@/data/wallets'
import { EipSupportStatus, eipSupportStatus, ratedWalletEipSupport } from '@/schema/eip-support'
import type { Eip, EipNumber } from '@/schema/eips'
import type { RatedWallet } from '@/schema/wallet'
import { remap } from '@/types/utils/remap'
import { getWalletUrl } from '@/utils/urls'

/** A wallet that implements an EIP, as shown in the EIP directory. */
export interface EipImplementer {
	/** Wallet ID. */
	id: string

	/** Wallet display name. */
	displayName: string

	/** Extension of the wallet icon under `/images/wallets/`. */
	iconExtension: string

	/** URL of the wallet page. */
	url: string
}

/** An EIP together with the rated wallets that implement it. */
export type EipDirectoryEntry = Eip & {
	/** Rated wallets that implement this EIP on at least one variant, sorted by name. */
	implementers: EipImplementer[]
}

/**
 * Determine which rated wallets implement an EIP, using per-EIP support
 * (not attribute ratings, which aggregate several features).
 */
export function eipImplementers(
	eip: Eip,
	wallets: Array<RatedWallet<string>> = Object.values(allRatedWallets),
): EipImplementer[] {
	return wallets
		.filter(
			wallet =>
				eipSupportStatus(ratedWalletEipSupport(wallet, eip.number).overall) ===
				EipSupportStatus.SUPPORTED,
		)
		.map(wallet => ({
			id: wallet.metadata.id,
			displayName: wallet.metadata.displayName,
			iconExtension: wallet.metadata.iconExtension,
			url: getWalletUrl(wallet),
		}))
		.sort((a, b) => a.displayName.localeCompare(b.displayName))
}

/** Annotate EIPs with the rated wallets that implement them. */
export function eipDirectoryEntries(
	eips: Record<EipNumber, Eip>,
): Record<EipNumber, EipDirectoryEntry> {
	return remap<Record<EipNumber, Eip>, EipDirectoryEntry, EipNumber, Eip>(eips, (_, eip) => ({
		...eip,
		implementers: eipImplementers(eip),
	}))
}
