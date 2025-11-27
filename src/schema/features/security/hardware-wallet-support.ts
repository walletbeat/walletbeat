import { isSupported, notSupported, type Support } from '@/schema/features/support'
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
 * Types of hardware wallets that can be supported
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
 */
export enum HardwareWalletConnection {
	/** USB, only for Desktop app with native USB; otherwise use webUSB. */
	USB = 'USB',

	/** QR-code based. */
	QR = 'QR',

	/** WebUSB (using a web browser); for desktop apps, use USB. */
	webUSB = 'WEBUSB',

	/** WebHID (using a web browser). */
	webHID = 'WEBHID',

	/** Bluetooth. */
	bluetooth = 'BLUETOOTH',

	/** WalletConnect. */
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
 */
export interface SupportedHardwareWallet {
	/** Supported ways to connect the hardware wallet to the software wallet. */
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
 * A record of hardware wallet types and their support status
 */
export type HardwareWalletSupport = WithRef<{
	/**
	 * Record of hardware wallet types and their support status
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
		.filter(isSupported)
		.map(w => nonEmptyDedup(hardwareWalletConnectionEnum.reorderNonEmpty(w.connectionTypes)))
		.reduce<NonEmptyArray<HardwareWalletConnection>[]>(
			(prev, cur) =>
				prev.some(types => types.join('|') === cur.join('|')) ? prev : prev.concat([cur]),
			[],
		)
	const sameConnectionTypeForAll = connectionTypes.length === 1 ? connectionTypes[0] : null

	return trimWhitespacePrefix(`
		the following hardware wallets${sameConnectionTypeForAll === null ? '' : hardwareWalletConnectionIsOnlyWalletConnect(sameConnectionTypeForAll) ? ' (through WalletConnect)' : ' (directly)'}:
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
