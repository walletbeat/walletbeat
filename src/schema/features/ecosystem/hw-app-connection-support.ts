import type { Support } from '@/schema/features/support'
import { isSupported } from '@/schema/features/support'
import type { WithRef } from '@/schema/reference'
import { type NonEmptySet, setItems } from '@/types/utils/non-empty'

/**
 * Methods by which a hardware wallet can connect to apps
 *
 * If supported by a software wallet, just fill in the list below
 */
export enum AppConnectionMethod {
	/**
	 * The wallet connects to apps through its own proprietary closed-source application
	 */
	VENDOR_CLOSED_SOURCE_APP = 'VENDOR_CLOSED_SOURCE_APP',

	/**
	 * The wallet connects to apps through its own open-source application
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
 * Specific details about a app connection method when supported
 */
export interface AppConnectionMethodDetails {
	/**
	 * Which connection methods are supported (must have at least one)
	 */
	supportedConnections: NonEmptySet<AppConnectionMethod | SoftwareWalletType>

	// TODO: Add check for whether features requires manufacturer consent
}

/**
 * A record of hardware wallet app connection support
 */
export type AppConnectionSupport = Support<WithRef<AppConnectionMethodDetails>>

/**
 * Returns the number of connection methods (including software wallets)
 */
export function countAllConnectionMethods(appSupport: AppConnectionSupport): number {
	if (!isSupported(appSupport)) {
		return 0
	}

	return setItems(appSupport.supportedConnections).length
}

/*
 * Checks if connection is a software wallet
 */
function isSoftwareWalletType(
	maybeWalletType: AppConnectionMethod | SoftwareWalletType,
): maybeWalletType is SoftwareWalletType {
	switch (maybeWalletType) {
		case AppConnectionMethod.VENDOR_CLOSED_SOURCE_APP:
			return false
		case AppConnectionMethod.VENDOR_OPEN_SOURCE_APP:
			return false
		default:
			return true
	}
}

/**
 * Returns all supported software wallet types
 */
export function getSupportedSoftwareWallets(
	connectionSupport: AppConnectionSupport,
): SoftwareWalletType[] {
	if (!isSupported(connectionSupport)) {
		return []
	}

	return setItems(connectionSupport.supportedConnections).filter(isSoftwareWalletType)
}
