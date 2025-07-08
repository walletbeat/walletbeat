import type { WithRef } from '@/schema/reference'
import type { Support } from '@/schema/features/support'
import { isSupported, supported, notSupported } from '@/schema/features/support'
import { setItems, type NonEmptySet } from '@/types/utils/non-empty'

/**
 * Methods by which a hardware wallet can connect to dApps
 *
 * If supported by a software wallet, just fill in the list below
 */
export enum DappConnectionMethod {
	/**
	 * The wallet connects to dApps through its own proprietary closed-source application
	 */
	VENDOR_CLOSED_SOURCE_APP = 'VENDOR_CLOSED_SOURCE_APP',

	/**
	 * The wallet connects to dApps through its own open-source application
	 */
	VENDOR_OPEN_SOURCE_APP = 'VENDOR_OPEN_SOURCE_APP',
}

/**
 * Types of software wallets that hardware wallets can connect through
 */
export enum SoftwareWalletType {
	METAMASK = 'METAMASK',
	RABBY = 'RABBY',
	FRAME = 'FRAME',
	AMBIRE = 'AMBIRE',
	OTHER = 'OTHER',
}

/**
 * Specific details about a dApp connection method when supported
 */
export interface DappConnectionMethodDetails {
	/**
	 * Which connection methods are supported (must have at least one)
	 */
	supportedConnections: NonEmptySet<DappConnectionMethod | SoftwareWalletType>

	/**
	 * Additional details about dApp connection capabilities
	 */
	details?: string
}

/**
 * A record of hardware wallet dApp connection support
 */
export type DappConnectionSupport = Support<WithRef<DappConnectionMethodDetails>>

/**
 * Shorthand for a wallet that cannot connect to dApps
 */
export const cannotConnectToDapps: DappConnectionSupport = notSupported

/**
 * Returns the number of connection methods (including software wallets)
 */
export function countAllConnectionMethods(dappSupport: DappConnectionSupport): number {
	if (!isSupported(dappSupport)) {
		return 0
	}

	return Object.values(dappSupport.supportedConnections).filter(supported => supported === true)
		.length
}

/*
 * Checks if connection is a software wallet
 */
function isSoftwareWalletType(
	maybeWalletType: DappConnectionMethod | SoftwareWalletType,
): maybeWalletType is SoftwareWalletType {
	switch (maybeWalletType) {
		case DappConnectionMethod.VENDOR_CLOSED_SOURCE_APP:
			return false
		case DappConnectionMethod.VENDOR_OPEN_SOURCE_APP:
			return false
		default:
			return true
	}
}

/**
 * Returns all supported software wallet types
 */
export function getSupportedSoftwareWallets(
	connectionSupport: DappConnectionSupport,
): SoftwareWalletType[] {
	if (!isSupported(connectionSupport)) {
		return []
	}
	return setItems(connectionSupport.supportedConnections).filter(isSoftwareWalletType)
}

/**
 * Helper function to create connection details for a wallet that only supports one method
 */
export function singleConnectionMethod(
	method: DappConnectionMethod | SoftwareWalletType,
): DappConnectionMethodDetails {
	return {
		supportedConnections: {
			[method]: true,
		} as NonEmptySet<DappConnectionMethod | SoftwareWalletType>,
	}
}
