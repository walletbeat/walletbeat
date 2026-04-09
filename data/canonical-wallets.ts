import type { CanonicalWallet } from '@/schema/wallet'

import { bitboxWallet } from './hardware-wallets/bitbox'
import { cypherockWallet } from './hardware-wallets/cypherock'
import { fireflyWallet } from './hardware-wallets/firefly'
import { gridplusWallet } from './hardware-wallets/gridplus'
import { imkeyWallet } from './hardware-wallets/imkey'
import { keycardShell } from './hardware-wallets/keycard-shell'
import { keystoneWallet } from './hardware-wallets/keystone'
import { ngrave } from './hardware-wallets/ngrave'
import { onekeyWallet } from './hardware-wallets/onekey'
import { trezorWallet } from './hardware-wallets/trezor'
import { ambire } from './software-wallets/ambire'
import { baseApp } from './software-wallets/base-app'
import { bitget } from './software-wallets/bitget'
import { daimo } from './software-wallets/daimo'
import { elytro } from './software-wallets/elytro'
import { family } from './software-wallets/family'
import { frame } from './software-wallets/frame'
import { gemwallet } from './software-wallets/gem'
import { imtoken } from './software-wallets/imtoken'
import { metamask } from './software-wallets/metamask'
import { mtpelerin } from './software-wallets/mtpelerin'
import { nufi } from './software-wallets/nufi'
import { okx } from './software-wallets/okx'
import { phantom } from './software-wallets/phantom'
import { pillarx } from './software-wallets/pillarx'
import { rabby } from './software-wallets/rabby'
import { rainbow } from './software-wallets/rainbow'
import { safe } from './software-wallets/safe'
import { uniswapWallet } from './software-wallets/uniswap-wallet'
import { zerion } from './software-wallets/zerion'
import { zeus } from './software-wallets/zeus'
import { ledger } from './wallets/ledger'

export const canonicalWallets = {
	ambire,
	'base-app': baseApp,
	bitbox: bitboxWallet,
	bitget,
	cypherock: cypherockWallet,
	daimo,
	elytro,
	family,
	firefly: fireflyWallet,
	frame,
	gemwallet,
	gridplus: gridplusWallet,
	imkey: imkeyWallet,
	imtoken,
	'keycard-shell': keycardShell,
	keystone: keystoneWallet,
	ledger,
	metamask,
	mtpelerin,
	ngrave,
	nufi,
	okx,
	onekey: onekeyWallet,
	phantom,
	pillarx,
	rabby,
	rainbow,
	safe,
	trezor: trezorWallet,
	'uniswap-wallet': uniswapWallet,
	zerion,
	zeus,
} as const satisfies Record<string, CanonicalWallet>

export type CanonicalWalletName = keyof typeof canonicalWallets
