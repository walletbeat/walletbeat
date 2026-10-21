import type { WithRef } from '@/schema/reference'

import { isSupported, type Support } from '../support'

/**
 * How new versions of the wallet get installed on the user's device.
 */
export enum UpdateInstallation {
	/**
	 * Updates are delivered through an app store, browser extension store or
	 * package manager, and the platform's own update settings apply. The wallet
	 * does not install updates itself.
	 * (e.g. A mobile app from an app store, or a browser extension from the
	 * browser's extension store.)
	 * To identify: the wallet is only distributed through such a platform and
	 * has no update mechanism of its own.
	 */
	PLATFORM_MANAGED = 'PLATFORM_MANAGED',

	/**
	 * The wallet only installs a new version after the user explicitly approves
	 * it, or the user downloads and installs new versions manually.
	 * To identify: the wallet shows an update prompt that can be dismissed,
	 * and keeps working on the current version afterwards.
	 */
	USER_APPROVED = 'USER_APPROVED',

	/**
	 * The wallet installs new versions automatically by default, and the user
	 * can turn this off.
	 * To identify: look for an automatic updates setting in the wallet.
	 */
	AUTOMATIC_WITH_OPT_OUT = 'AUTOMATIC_WITH_OPT_OUT',

	/**
	 * The wallet installs new versions automatically, and the user cannot turn
	 * this off. This includes wallet code that is served from the developer's
	 * servers each time it is loaded, such as a hosted web app or an iframe
	 * loaded by an SDK.
	 * To identify: there is no setting to disable automatic updates, or the
	 * wallet's code is loaded from a server the developer controls.
	 */
	AUTOMATIC_WITHOUT_OPT_OUT = 'AUTOMATIC_WITHOUT_OPT_OUT',
}

/**
 * How the wallet's developer gets new versions of the wallet to users, and
 * how much control users have over which version they run.
 */
export type SoftwareUpdates = WithRef<{
	/** How new versions of the wallet get installed. */
	installation: UpdateInstallation

	/**
	 * Can the developer remotely stop an installed version of the wallet from
	 * being used, e.g. through a minimum version check that blocks the wallet
	 * until the user updates?
	 *
	 * To test: look for "update required" screens that cannot be dismissed,
	 * or search the wallet's source code for a minimum or deprecated version
	 * check fetched from a server.
	 */
	remoteVersionBlocking: Support
}>

/**
 * Whether the developer controls which version of the wallet the user runs,
 * either by installing updates without a way to opt out or by remotely
 * blocking older versions.
 */
export function developerControlsInstalledVersion(softwareUpdates: SoftwareUpdates): boolean {
	return (
		softwareUpdates.installation === UpdateInstallation.AUTOMATIC_WITHOUT_OPT_OUT ||
		isSupported(softwareUpdates.remoteVersionBlocking)
	)
}
