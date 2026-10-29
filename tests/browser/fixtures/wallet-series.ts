import { allWallets } from '@/data/wallets'
import { getWalletUrl } from '@/utils/urls'

export const prerender = true

export function GET() {
	return Response.json(Object.values(allWallets).map(wallet => getWalletUrl(wallet)))
}
