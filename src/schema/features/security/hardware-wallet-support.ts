import { isSupported, notSupported, type Support, type Supported } from '@/schema/features/support'
import type { WithRef } from '@/schema/reference'
import {
	isNonEmptyArray,
	type NonEmptyArray,
	nonEmptyDedup,
	nonEmptyMap,
} from '@/types/utils/non-empty'
import { commaListFormat, trimWhitespacePrefix } from '@/types/utils/text'
import { Enum } from '@/utils/enum'

/**
 * Types of hardware wallets that can be supported.
 * To identify: check the wallet's documentation or settings for a list of
 * supported hardware wallets, then verify by connecting each device.
 * Use OTHER for hardware wallets not listed here.
 */
export enum HardwareWalletType {
	LEDGER = 'LEDGER',
	TREZOR = 'TREZOR',
	GRIDPLUS = 'GRIDPLUS',
	KEYSTONE = 'KEYSTONE',
	KEEPKEY = 'KEEPKEY',
	FIREFLY = 'FIREFLY',
	ONEKEY = 'ONEKEY',
	BITBOX = 'BITBOX',
	IMKEY = 'IMKEY',
	/** A hardware wallet not listed above. */
	OTHER = 'OTHER',
}

/**
 * Enum helper for `HardwareWalletType`.
 */
export const hardwareWalletType = new Enum<HardwareWalletType>({
	[HardwareWalletType.LEDGER]: true,
	[HardwareWalletType.TREZOR]: true,
	[HardwareWalletType.GRIDPLUS]: true,
	[HardwareWalletType.KEYSTONE]: true,
	[HardwareWalletType.KEEPKEY]: true,
	[HardwareWalletType.FIREFLY]: true,
	[HardwareWalletType.ONEKEY]: true,
	[HardwareWalletType.BITBOX]: true,
	[HardwareWalletType.IMKEY]: true,
	[HardwareWalletType.OTHER]: true,
})

/**
 * The hardware wallet type as a human-readable string.
 * Return `ifOther` if hwWalletType is `HardwareWalletType.OTHER`.
 * If `ifOther` is null, throw error.
 */
export function hardwareWalletTypeToString(
	hwWalletType: HardwareWalletType,
	ifOther: string | null,
): string {
	switch (hwWalletType) {
		case HardwareWalletType.LEDGER:
			return 'Ledger'
		case HardwareWalletType.BITBOX:
			return 'BitBox'
		case HardwareWalletType.TREZOR:
			return 'Trezor'
		case HardwareWalletType.GRIDPLUS:
			return 'GridPlus'
		case HardwareWalletType.KEYSTONE:
			return 'Keystone'
		case HardwareWalletType.KEEPKEY:
			return 'KeepKey'
		case HardwareWalletType.ONEKEY:
			return 'OneKey'
		case HardwareWalletType.FIREFLY:
			return 'Firefly'
		case HardwareWalletType.IMKEY:
			return 'imKey'
		case HardwareWalletType.OTHER:
			if (ifOther === null) {
				throw new Error('Unexpected "OTHER" hardware wallet type')
			}

			return ifOther
	}
}

/**
 * Connection method between software and hardware wallet.
 * To identify: connect the hardware wallet and check which browser API or
 * protocol the software wallet uses (visible in browser DevTools → Network
 * or via the wallet's documentation).
 */
export enum HardwareWalletConnection {
	/**
	 * Native USB via a desktop application (not a browser).
	 * Use webUSB instead if the connection goes through a browser.
	 */
	USB = 'USB',

	/**
	 * QR-code based: the software wallet displays a QR code that the hardware
	 * wallet camera scans (or vice versa).
	 */
	QR = 'QR',

	/**
	 * USB through the browser's WebUSB API (browser extensions or web apps).
	 * Use USB instead for native desktop applications.
	 */
	webUSB = 'WEBUSB',

	/**
	 * HID through the browser's WebHID API.
	 * Similar to webUSB but uses the HID protocol instead.
	 * (e.g. Trezor uses WebHID in some browser integrations.)
	 */
	webHID = 'WEBHID',

	/** Wireless connection via Bluetooth. */
	bluetooth = 'BLUETOOTH',

	/**
	 * Indirect connection via the WalletConnect protocol — the hardware wallet
	 * connects through its companion app rather than directly to the software wallet.
	 */
	WALLET_CONNECT = 'WALLET_CONNECT',
}

/**
 * Enum helper for `HardwareWalletConnection`.
 */
export const hardwareWalletConnectionEnum = new Enum<HardwareWalletConnection>({
	[HardwareWalletConnection.USB]: true,
	[HardwareWalletConnection.QR]: true,
	[HardwareWalletConnection.webUSB]: true,
	[HardwareWalletConnection.webHID]: true,
	[HardwareWalletConnection.bluetooth]: true,
	[HardwareWalletConnection.WALLET_CONNECT]: true,
})

/**
 * @returns Human-readable string for the given `HardwareWalletConnection`.
 */
export function hardwareWalletConnectionToString(
	hardwareWalletConnection: HardwareWalletConnection,
): string {
	switch (hardwareWalletConnection) {
		case HardwareWalletConnection.USB:
			return 'USB'
		case HardwareWalletConnection.QR:
			return 'QR code'
		case HardwareWalletConnection.webUSB:
			return 'WebUSB'
		case HardwareWalletConnection.webHID:
			return 'WebHID'
		case HardwareWalletConnection.bluetooth:
			return 'Bluetooth'
		case HardwareWalletConnection.WALLET_CONNECT:
			return 'WalletConnect'
	}
}

/**
 * Set of connection types that are supported for a single hardware wallet.
 * To identify: connect the hardware wallet using each available method and
 * record which ones work. Check the wallet's documentation for the full list.
 */
export interface SupportedHardwareWallet {
	/**
	 * All supported ways to connect this hardware wallet to the software wallet.
	 * List every working connection method — a hardware wallet may support
	 * more than one (e.g. both webUSB and Bluetooth).
	 */
	connectionTypes: NonEmptyArray<HardwareWalletConnection>
}

/**
 * @returns Whether the only supported hardware connection type is WalletConnect.
 */
export function hardwareWalletConnectionIsOnlyWalletConnect(
	connectionTypes: SupportedHardwareWallet['connectionTypes'],
): boolean {
	const deduped = nonEmptyDedup(connectionTypes)

	return deduped.length === 1 && deduped[0] === HardwareWalletConnection.WALLET_CONNECT
}

/**
 * A record of hardware wallet types and their support status.
 * The ref must link to the wallet's documentation page listing supported
 * hardware wallets, or to the relevant settings screen if no doc page exists.
 */
export type HardwareWalletSupport = WithRef<{
	/**
	 * For each hardware wallet type, whether it is supported and via which
	 * connection methods. Omit a type entirely rather than setting it to
	 * not supported — only list wallets that have been explicitly verified.
	 */
	wallets: Partial<Record<HardwareWalletType, Support<SupportedHardwareWallet>>>
}>

/**
 * Build a Markdown string that represents the set of supported hardware wallets,
 * and whether this is directly or through WalletConnect.
 */
export function supportsHardwareWalletTypesMarkdown(
	wallets: HardwareWalletSupport['wallets'],
	includeWalletConnectOnly: boolean,
): string {
	const fullSupportedWallets = hardwareWalletType.fullRecord(wallets, notSupported)
	const otherSupported = isSupported(fullSupportedWallets[HardwareWalletType.OTHER])

	if (otherSupported) {
		const nonOther = hardwareWalletType.filterRecord(
			fullSupportedWallets,
			(w, support) => w !== HardwareWalletType.OTHER && isSupported(support),
		)

		if (Object.entries(nonOther).length === 0) {
			return 'an uncategorized hardware wallet type.'
		}
	}

	let supportedWallets = hardwareWalletType.filterRecord(
		fullSupportedWallets,
		(w, support) => isSupported(support) && w !== HardwareWalletType.OTHER,
	)

	if (!includeWalletConnectOnly) {
		supportedWallets = hardwareWalletType.filterRecord(
			supportedWallets,
			(_, support) =>
				isSupported(support) &&
				!hardwareWalletConnectionIsOnlyWalletConnect(support.connectionTypes),
		)
	}

	const supportedWalletTypes = hardwareWalletType.recordKeys(supportedWallets)

	if (!isNonEmptyArray(supportedWalletTypes)) {
		return 'no hardware wallets'
	}

	const walletSpecificMethod = (w: HardwareWalletType): string => {
		if (!isSupported(fullSupportedWallets[w])) {
			return ' (unsupported)'
		}

		if (hardwareWalletConnectionIsOnlyWalletConnect(fullSupportedWallets[w].connectionTypes)) {
			return ' (through WalletConnect)'
		}

		return ` (directly via ${commaListFormat(hardwareWalletConnectionEnum.reorder(fullSupportedWallets[w].connectionTypes).map(hardwareWalletConnectionToString), 'or')})`
	}

	if (supportedWalletTypes.length === 1) {
		if (otherSupported) {
			return `the ${hardwareWalletTypeToString(supportedWalletTypes[0], null)} hardware wallet${walletSpecificMethod(supportedWalletTypes[0])}, as well as other uncategorized hardware wallet types.`
		}

		return `the ${hardwareWalletTypeToString(supportedWalletTypes[0], null)} hardware wallet${walletSpecificMethod(supportedWalletTypes[0])}.`
	}

	const connectionTypes = Object.values(supportedWallets)
		.filter(
			(wallet): wallet is Supported<SupportedHardwareWallet> =>
				wallet !== undefined && isSupported(wallet),
		)
		.map(wallet =>
			nonEmptyDedup(hardwareWalletConnectionEnum.reorderNonEmpty(wallet.connectionTypes)),
		)
		.reduce<NonEmptyArray<HardwareWalletConnection>[]>(
			(prev, cur) =>
				prev.some(types => types.join('|') === cur.join('|')) ? prev : prev.concat([cur]),
			[],
		)
	const sameConnectionTypeForAll = connectionTypes.length === 1 ? connectionTypes[0] : null

	return trimWhitespacePrefix(`the following hardware wallets${sameConnectionTypeForAll === null ? '' : hardwareWalletConnectionIsOnlyWalletConnect(sameConnectionTypeForAll) ? ' (through WalletConnect)' : ' (directly)'}:
${nonEmptyMap(
	supportedWalletTypes,
	w => `
* ${hardwareWalletTypeToString(w, null)}${sameConnectionTypeForAll === null ? walletSpecificMethod(w) : ''}`,
).join('')}${
		otherSupported
			? `
* ... and others${sameConnectionTypeForAll === null ? walletSpecificMethod(HardwareWalletType.OTHER) : ''}
`
			: ''
	}
	`)
}
