import type { WithRef } from '@/schema/reference'

import type { Support, Supported } from '../support'

/**
 * What set of accounts are exposed?
 *
 * To identify: use the Walletbeat test page (https://beta.walletbeat.eth.limo/test/)
 * which calls `eth_accounts` after connecting and shows how many accounts are returned.
 * Alternatively, open the browser console on any connected dapp and run:
 * `window.ethereum.request({ method: 'eth_accounts' })`
 */
export enum ExposedAccountsBehavior {
	/**
	 * The wallet exposes all user accounts to every connected app.
	 * (e.g. `eth_accounts` returns three addresses even though only one is active.)
	 * To identify: connect the wallet to a dapp while having multiple accounts set up,
	 * then call `eth_accounts` — all accounts are returned, not just the active one.
	 */
	ALL_ACCOUNTS = 'ALL_ACCOUNTS',

	/**
	 * The wallet exposes only the currently active/selected account.
	 * (e.g. `eth_accounts` returns a single address — whichever account is selected
	 * in the wallet at that moment.)
	 * To identify: switch accounts in the wallet and call `eth_accounts` from a dapp —
	 * only one address is returned and it matches the currently active account.
	 */
	ACTIVE_ACCOUNT_ONLY = 'ACTIVE_ACCOUNT_ONLY',

	/**
	 * There is no default set of exposed accounts; the user must explicitly choose
	 * which account(s) to share during the connection flow.
	 * (e.g. The wallet shows an account picker every time a new dapp requests access,
	 * with no account pre-selected.)
	 * To identify: on a freshly loaded dapp that has never been connected before,
	 * call `eth_accounts` before initiating a connect — it returns an empty array.
	 * During the connect flow the wallet prompts the user to choose which account to expose.
	 */
	NO_DEFAULT = 'NO_DEFAULT',

	/**
	 * The wallet exposes a different address per app/origin, derived specifically
	 * for that dapp, so apps cannot correlate activity across sites.
	 * (e.g. app.uniswap.org sees address 0xAAA, app.aave.com sees address 0xBBB,
	 * even though they both belong to the same user.)
	 * To identify: connect the wallet to two different dapps and compare the addresses
	 * returned by `eth_accounts` — they should differ even for the same underlying account.
	 */
	APP_SPECIFIC_ACCOUNT = 'APP_SPECIFIC_ACCOUNT',
}

/** Set of exposed accounts. */
export interface ExposedAccountSet {
	/**
	 * What set of accounts is exposed by default, without any extra configuration?
	 * See `ExposedAccountsBehavior` for how to identify the correct value.
	 */
	defaultBehavior: ExposedAccountsBehavior
}

/**
 * @returns whether the two given `ExposedAccountSet`s are equal.
 */
export function sameExposedAccountSet(
	exposedAccountSet1: ExposedAccountSet,
	exposedAccountSet2: ExposedAccountSet,
): boolean {
	return exposedAccountSet1.defaultBehavior === exposedAccountSet2.defaultBehavior
}

export const appConnectionNotSupported = {
	type: 'APP_CONNECTION_NOT_SUPPORTED',
} as const

/**
 * How the wallet isolates apps from getting data that other apps may also
 * gather.
 */
interface BaseAppIsolation {
	/**
	 * How does the wallet handle the `eth_accounts` RPC?
	 * Use the Walletbeat test page to verify: https://beta.walletbeat.eth.limo/test/
	 * It calls `eth_accounts` after connecting and shows exactly which accounts
	 * are returned, letting you observe the `ExposedAccountsBehavior` directly.
	 * Alternatively, open the browser console on any connected dapp and run:
	 * `window.ethereum.request({ method: 'eth_accounts' })`
	 */
	ethAccounts: Support<WithRef<ExposedAccountSet>>

	/**
	 * If the wallet supports ERC-7846 (`wallet_connect` RPC), what set of
	 * accounts are exposed?
	 * Use the Walletbeat test page to verify: https://beta.walletbeat.eth.limo/test/
	 * It tests ERC-7846 `wallet_connect` support and shows the returned account set.
	 * To test manually: open the browser console and run:
	 * `window.ethereum.request({ method: 'wallet_connect', params: [{}] })`
	 * If the call throws an error or returns null, set this to not supported.
	 */
	erc7846WalletConnect: Support<WithRef<ExposedAccountSet>>

	/**
	 * When connecting to a new app, does the wallet allow creating a new
	 * address or set of addresses as part of the app connection flow?
	 * To test: open a dapp you have never connected your wallet to before and
	 * start the connection flow. Check if your wallet offers an option to create
	 * a fresh address specifically for this app, rather than only letting you
	 * pick from existing accounts.
	 *
	 * Contributors can use https://beta.walletbeat.eth.limo/test/ to test.
	 */
	createInAppConnectionFlow: Support<WithRef<{}>>

	/**
	 * When connecting to a previously-connected app, does the wallet remember
	 * which address(es) the user had selected to connect for that specific
	 * app, and use them by default?
	 * To test: connect to a dapp using a specific account, then disconnect.
	 * Open the connection flow for the same dapp again — check whether the
	 * wallet pre-selects or highlights the account that was previously used
	 * for that dapp specifically.
	 */
	useAppSpecificLastConnectedAddresses: Support<WithRef<{}>>
}

/**
 * How the wallet isolates apps from getting data that other apps may also
 * gather.
 */
export type AppIsolation =
	| typeof appConnectionNotSupported
	| (BaseAppIsolation &
			// Either `eth_accounts` or `wallet_connect` must be supported.
			(| { ethAccounts: Supported<WithRef<ExposedAccountSet>> }
				| { erc7846WalletConnect: Supported<WithRef<ExposedAccountSet>> }
			))

/** Type predicate for `appConnectionNotSupported`. */
export function isAppConnectionSupportedInAppIsolation(
	appIsolation: AppIsolation,
): appIsolation is typeof appConnectionNotSupported {
	return (
		Object.hasOwn(appIsolation, 'type') &&
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we just checked the `type` key exists.
		(appIsolation as typeof appConnectionNotSupported).type === appConnectionNotSupported.type
	)
}
