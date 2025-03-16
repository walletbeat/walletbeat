import type { Contributor } from '@/schema/wallet'

export const exampleContributor: Contributor = {
	name: 'example-contributor',
	affiliation: 'example-company', // e.g. affiliation at a Wallet or Wallet related company "employee", "founder", "consultant", etc. at MetaMask
	shares_in_wallet_company: 'none', //e.g "shares in Metamask or consensys" (don't need to disclose the amount)
}
