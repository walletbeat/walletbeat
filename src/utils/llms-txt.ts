import { ratedHardwareWallets } from '@/data/hardware-wallets'
import { ratedSoftwareWallets } from '@/data/software-wallets'
import { allRatedWallets } from '@/data/wallets'
import type { RatedWallet } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'
import { walletBlurbText } from '@/utils/wallet-page-markdown'

function walletEntry(wallet: RatedWallet<string>, siteUrl: string): string {
	const blurb = walletBlurbText(wallet)
	const url = `${siteUrl}/${wallet.metadata.id}/index.html.md`

	return `- [${wallet.metadata.displayName}](${url}): ${blurb}`
}

export function llmsTxtBody(siteUrl: string): string {
	// Partition by data source (UI-aligned): software and hardware from data modules; embedded from allRatedWallets for future use.
	// data/wallets.ts currently builds only software + hardware, so embeddedWallets is [] until embedded wallets are added to allRatedWallets.
	const softwareWallets = Object.values(ratedSoftwareWallets)
	const hardwareWallets = Object.values(ratedHardwareWallets)
	const embeddedWallets = Object.values(allRatedWallets).filter(
		w =>
			w.types[WalletType.EMBEDDED] === true &&
			w.types[WalletType.SOFTWARE] !== true &&
			w.types[WalletType.HARDWARE] !== true,
	)

	const lines: string[] = []

	lines.push('# Walletbeat')
	lines.push('')
	lines.push(
		'> Walletbeat is an independent rating platform for Ethereum wallets, evaluating them across security, privacy, self-sovereignty, transparency, ecosystem, and maintenance categories.',
	)
	lines.push('')
	lines.push(
		'Each wallet is rated on individual attributes using a `PASS` / `PARTIAL` / `FAIL` / `UNRATED` / `EXEMPT` system.',
	)
	lines.push(
		'`PASS` means the wallet fully meets the criteria; `PARTIAL` means it partially does; `FAIL` means it does not;',
	)
	lines.push(
		'`UNRATED` means the information is not yet available; `EXEMPT` means the attribute does not apply to this wallet.',
	)
	lines.push('')
	lines.push(`Full wallet list and ratings: ${siteUrl}`)
	lines.push(`Methodology: ${siteUrl}/methodology/index.html.md`)
	lines.push('')

	if (softwareWallets.length > 0) {
		lines.push('## Software Wallets')
		lines.push('')

		for (const wallet of softwareWallets) {
			lines.push(walletEntry(wallet, siteUrl))
		}

		lines.push('')
	}

	if (hardwareWallets.length > 0) {
		lines.push('## Hardware Wallets')
		lines.push('')

		for (const wallet of hardwareWallets) {
			lines.push(walletEntry(wallet, siteUrl))
		}

		lines.push('')
	}

	if (embeddedWallets.length > 0) {
		lines.push('## Embedded Wallets')
		lines.push('')

		for (const wallet of embeddedWallets) {
			lines.push(walletEntry(wallet, siteUrl))
		}

		lines.push('')
	}

	return lines.join('\n')
}
