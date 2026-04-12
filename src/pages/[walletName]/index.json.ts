import type { APIRoute, GetStaticPaths } from 'astro'

import { embeddedWalletAttributeTree } from '@/data/embedded-wallets'
import { hardwareWalletAttributeTree } from '@/data/hardware-wallets'
import { softwareWalletAttributeTree } from '@/data/software-wallets'
import {
	allRatedWallets,
	isEmbeddedRatedWallet,
	isHardwareRatedWallet,
	isSoftwareRatedWallet,
	isValidWalletName,
} from '@/data/wallets'
import { nonEmptyKeys, nonEmptyMap } from '@/types/utils/non-empty'
import { ratedWalletJsonExport } from '@/utils/wallet-json-export'

export const prerender = true

export const getStaticPaths: GetStaticPaths = () =>
	nonEmptyMap(nonEmptyKeys(allRatedWallets), walletName => ({ params: { walletName } }))

export const GET: APIRoute = ({ params }) => {
	const { walletName } = params

	if (walletName === undefined || !isValidWalletName(walletName)) {
		return new Response('Not found', { status: 404 })
	}

	const wallet = allRatedWallets[walletName]
	const payload = isSoftwareRatedWallet(wallet)
		? ratedWalletJsonExport(softwareWalletAttributeTree, wallet)
		: isHardwareRatedWallet(wallet)
			? ratedWalletJsonExport(hardwareWalletAttributeTree, wallet)
			: isEmbeddedRatedWallet(wallet)
				? ratedWalletJsonExport(embeddedWalletAttributeTree, wallet)
				: (() => {
						throw new Error('Wallet has no recognized type')
					})()

	return new Response(JSON.stringify(payload), {
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	})
}
