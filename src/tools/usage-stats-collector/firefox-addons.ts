/**
 * Firefox add-on (addons.mozilla.org) slugs of tracked wallets, keyed by
 * wallet ID. Wallet metadata only records Chrome Web Store URLs.
 *
 * Each entry is the wallet maker's own listing: the add-on's author on
 * addons.mozilla.org is the wallet maker, and/or its homepage is the wallet's
 * website or repository.
 */
export const firefoxAddonSlugs: Partial<Record<string, string>> = {
	ambire: 'ambire-web3-wallet',
	frame: 'frame-extension',
	metamask: 'ether-metamask',
	phantom: 'phantom-app',
	rainbow: 'rainbow-extension',
	zerion: 'zerion-wallet-official',
}
