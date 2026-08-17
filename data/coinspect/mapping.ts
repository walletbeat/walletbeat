import {
	type CoinspectMapping,
	CoinspectPlatform,
	CoinspectUnmappedReason,
} from '@/schema/data-sources/coinspect'

/** Keyed by Coinspect `walletMakerUID`. */
export const coinspectMapping = {
	'1inch': { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	'alpha-wallet': { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	ambire: {
		// Walletbeat currently rates Ambire's browser extension only.
		skipPlatforms: [CoinspectPlatform.ANDROID],
		walletbeatId: 'ambire',
	},
	binance: { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	bitget: { walletbeatId: 'bitget' },
	brave: { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	// 'bridge-wallet' is Bridge Wallet by Mt Pelerin — https://www.mtpelerin.com/bitcoin-wallet
	'bridge-wallet': { walletbeatId: 'mtpelerin' },
	'coin-98': { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	'coin-wallet': { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	// 'coinbase-wallet' rebranded to Base App — https://base.app/
	'coinbase-wallet': {
		// Base App is mobile-only in Walletbeat; Coinspect still ships a Browser report.
		skipPlatforms: [CoinspectPlatform.BROWSER],
		walletbeatId: 'baseApp',
	},
	'ctrl-wallet': { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	elytro: { walletbeatId: 'elytro' },
	enkrypt: { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	exodus: { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	family: { walletbeatId: 'family' },
	fox: { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	frame: { walletbeatId: 'frame' },
	// 'gem' is Gem Wallet — https://gemwallet.com/
	gem: { walletbeatId: 'gemwallet' },
	// 'im-token' is imToken — https://token.im/
	'im-token': { walletbeatId: 'imtoken' },
	metamask: { walletbeatId: 'metamask' },
	'mew-wallet': { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	// 'nu-fi' is NuFi — https://nu.fi/
	'nu-fi': { walletbeatId: 'nufi' },
	okto: { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	okx: { walletbeatId: 'okx' },
	// Coinspect rates OneKey's software apps; Walletbeat tracks OneKey Pro hardware only.
	'one-key': {
		note: 'Walletbeat tracks OneKey Pro (hardware), not the OneKey software wallet Coinspect rates.',
		reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT,
		walletbeatId: null,
	},
	phantom: { walletbeatId: 'phantom' },
	// 'rabby-wallet' is Rabby Wallet — https://rabby.io/
	'rabby-wallet': { walletbeatId: 'rabby' },
	rainbow: { walletbeatId: 'rainbow' },
	'token-pocket': { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	tomo: { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	'trust-wallet': { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	// 'uniswap' is Uniswap Wallet — https://wallet.uniswap.org/
	uniswap: { walletbeatId: 'uniswapWallet' },
	'unstoppable-wallet': { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	zengo: { reason: CoinspectUnmappedReason.NOT_IN_WALLETBEAT, walletbeatId: null },
	zerion: { walletbeatId: 'zerion' },
} as const satisfies Record<string, CoinspectMapping>
