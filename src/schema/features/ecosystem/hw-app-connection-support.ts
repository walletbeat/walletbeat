import type { Support } from '@/schema/features/support'
import { isSupported } from '@/schema/features/support'
import type { MustRef, WithRef } from '@/schema/reference'
import { type NonEmptySet, setItems } from '@/types/utils/non-empty'

/**
 * Methods by which a hardware wallet can connect to apps
 *
 * If supported by a software wallet, just fill in the list below
 */
export enum AppConnectionMethod {
	/**
	 * The wallet connects to apps through its own proprietary closed-source application.
	 * (e.g. A hardware wallet that ships its own desktop app for connecting to apps, where the app's source code is not publicly available.)
	 */
	VENDOR_CLOSED_SOURCE_APP = 'VENDOR_CLOSED_SOURCE_APP',

	/**
	 * The wallet connects to apps through its own open-source application.
	 * (e.g. A hardware wallet that ships its own desktop app for connecting to apps, where the app's source code is publicly available and auditable.)
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
	 * Which connection methods are supported (must have at least one).
	 * (e.g. A hardware wallet that supports both its own open-source app and MetaMask would list
	 * `VENDOR_OPEN_SOURCE_APP` and `METAMASK` here.)
	 */
	supportedConnections: NonEmptySet<AppConnectionMethod | SoftwareWalletType>

	/**
	 * Is manufacturer consent required to integrate any hardware wallet feature into a software wallet?
	 * If so, must provide reference.
	 *   - `ALL_FEATURES_PERMISSIONLESSLY_INTEGRABLE`: any software wallet can integrate the hardware
	 *     wallet without needing approval from the manufacturer.
	 *   - `FEATURES_GATED_BY_MANUFACTURER`: the manufacturer must approve before a software wallet can
	 *     access certain features.
	 */
	requiresManufacturerConsent:
		| { type: 'ALL_FEATURES_PERMISSIONLESSLY_INTEGRABLE' }
		| MustRef<{ type: 'FEATURES_GATED_BY_MANUFACTURER' }>
		| null
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
