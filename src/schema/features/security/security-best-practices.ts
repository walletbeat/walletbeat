import type { WithRef } from '@/schema/reference'
import { Enum } from '@/utils/enum'

/**
 * How the wallet stores the user's private key.
 */
export enum KeyStorageMechanism {
	/**
	 * The key is encrypted with a user-known secret before being stored on disk,
	 * using a standardized key derivation function.
	 */
	ENCRYPTED_WITH_USER_SECRET_STANDARDIZED_KDF = 'ENCRYPTED_WITH_USER_SECRET_STANDARDIZED_KDF',

	/**
	 * The key is encrypted with a user-known secret before being stored on disk,
	 * but the key derivation is non-standard or ad-hoc.
	 */
	ENCRYPTED_WITH_USER_SECRET_WEAK_KDF = 'ENCRYPTED_WITH_USER_SECRET_WEAK_KDF',

	/**
	 * The key is stored inside a hardware security module or secure enclave
	 * that prevents key extraction by other software.
	 */
	HARDWARE_SECURITY_MODULE = 'HARDWARE_SECURITY_MODULE',

	/**
	 * The key is stored in plaintext, but in OS-sandboxed app storage that
	 * other apps and processes cannot read.
	 */
	OS_SANDBOXED_PLAINTEXT = 'OS_SANDBOXED_PLAINTEXT',

	/**
	 * No private key is stored on the device. The wallet uses passkey-managed
	 * smart contract accounts
	 */
	NO_KEY_STORED = 'NO_KEY_STORED',
}

/**
 * The entropy source used when generating the wallet's private key.
 */
export enum SecureRngSource {
	/** OS-provided Cryptographically Secure Pseudorandom RNG. */
	OS_CSPRNG = 'OS_CSPRNG',

	/** Dedicated hardware entropy source. */
	HARDWARE_ENTROPY = 'HARDWARE_ENTROPY',

	/** A library-provided RNG whose quality is not independently verified. */
	LIBRARY_RNG = 'LIBRARY_RNG',
}

/**
 * Scope of a Browser Extension URL match pattern grant, expressed in terms
 * relevant to wallet extensions. Ordered from least to most permissive.
 */
export enum HostPermissionScope {
	/** No host permissions declared; the extension does not access web pages. */
	NONE = 'NONE',

	/**
	 * HTTPS origins only — covers all legitimate apps without touching
	 * insecure pages, local files, or WebSocket connections.
	 */
	HTTPS_ONLY = 'HTTPS_ONLY',

	/** HTTP and HTTPS origins — includes insecure web pages in addition to apps. */
	HTTP_AND_HTTPS = 'HTTP_AND_HTTPS',

	/**
	 * All origins including non-web schemes (file://, ws://, wss://, etc.) —
	 * the extension can read and modify local files and raw socket traffic.
	 */
	UNRESTRICTED = 'UNRESTRICTED',
}

/**
 * Security-sensitive Browser Extension permission strings declared in the
 * `permissions` manifest field. Values match the manifest string exactly.
 */
export enum BrowserExtensionPermission {
	/** Access the currently active tab's URL, title, and favicon. */
	ACTIVE_TAB = 'activeTab',

	/** Read and modify browser bookmarks. */
	BOOKMARKS = 'bookmarks',

	/** Delete browsing data (history, cookies, cache). */
	BROWSING_DATA = 'browsingData',

	/** Read clipboard contents without a user gesture. */
	CLIPBOARD_READ = 'clipboardRead',

	/** Write to the clipboard without a user gesture. */
	CLIPBOARD_WRITE = 'clipboardWrite',

	/** Read and modify cookies for all accessible hosts. */
	COOKIES = 'cookies',

	/** Attach the browser debugger protocol to any tab. */
	DEBUGGER = 'debugger',

	/** Block or redirect network requests via declarativeNetRequest. */
	DECLARATIVE_NET_REQUEST = 'declarativeNetRequest',

	/** Block or redirect requests with host-based access. */
	DECLARATIVE_NET_REQUEST_WITH_HOST_ACCESS = 'declarativeNetRequestWithHostAccess',

	/** Capture the desktop, a window, or a tab as a media stream. */
	DESKTOP_CAPTURE = 'desktopCapture',

	/** Access the device's geographic location. */
	GEOLOCATION = 'geolocation',

	/** Read the full browsing history. */
	HISTORY = 'history',

	/** Access the user's Google Account identity (no email). */
	IDENTITY = 'identity',

	/** Access the user's Google Account email address. */
	IDENTITY_EMAIL = 'identity.email',

	/** List, enable, disable, or uninstall other extensions. */
	MANAGEMENT = 'management',

	/** Send and receive messages from a native OS application. */
	NATIVE_MESSAGING = 'nativeMessaging',

	/** Save a tab's full page as MHTML. */
	PAGE_CAPTURE = 'pageCapture',

	/** Read and modify browser privacy settings. */
	PRIVACY = 'privacy',

	/** Monitor and control the browser's network proxy settings. */
	PROXY = 'proxy',

	/** Inject scripts and CSS into pages programmatically. */
	SCRIPTING = 'scripting',

	/** Read the URLs, titles, and favicons of all open tabs. */
	TABS = 'tabs',

	/** Register user-supplied scripts that run in web pages. */
	USER_SCRIPTS = 'userScripts',

	/** Intercept WebAuthn requests on behalf of the extension. */
	WEB_AUTHENTICATION_PROXY = 'webAuthenticationProxy',

	/** Observe all navigation events across tabs. */
	WEB_NAVIGATION = 'webNavigation',

	/** Observe (and with blocking, modify) all HTTP/S requests. */
	WEB_REQUEST = 'webRequest',

	/** Block or modify HTTP/S requests synchronously. */
	WEB_REQUEST_BLOCKING = 'webRequestBlocking',
}

/**
 * Scope of web origins that can load resources from the extension via
 * `web_accessible_resources`.
 */
export enum WebAccessibleResourcesScope {
	/**
	 * `web_accessible_resources` is absent; no extension resource is
	 * reachable from any web page. Most secure default.
	 */
	NONE = 'NONE',

	/** Only a fixed list of named HTTPS origins may load extension resources. */
	SPECIFIC_ORIGINS = 'SPECIFIC_ORIGINS',

	/** Any HTTPS origin may load extension resources. */
	HTTPS_ONLY = 'HTTPS_ONLY',

	/** Any HTTP or HTTPS origin may load extension resources. */
	HTTP_AND_HTTPS = 'HTTP_AND_HTTPS',

	/** Any origin, including non-web schemes, may load extension resources. */
	UNRESTRICTED = 'UNRESTRICTED',
}

/**
 * Scope of extension IDs permitted to open a message channel to the wallet
 * via `externally_connectable`. Ordered from least to most permissive.
 */
export enum ExternalExtensionIdScope {
	/** No `ids` field listed; no other extension may connect. */
	NONE = 'NONE',

	/** Only specific, named extension IDs may connect. */
	SPECIFIC = 'SPECIFIC',

	/** Any installed extension may connect (`"ids": ["*"]`). */
	ANY = 'ANY',
}

/**
 * Security-relevant fields from the Browser Extension Manifest.
 * Values should be extracted directly from the published manifest.json.
 */
export interface BrowserExtensionManifest {
	/**
	 * Scope of host permissions granted at install time, controlling which
	 * pages the background service worker may programmatically access.
	 * Maps to the `host_permissions` manifest field.
	 */
	hostPermissions: HostPermissionScope

	/**
	 * Scope of pages the wallet's content scripts are injected into on every
	 * page load, controlling what the wallet can silently read and modify.
	 * Maps to the broadest `matches` entry across all `content_scripts`.
	 */
	contentScripts: HostPermissionScope

	/**
	 * Which external web pages and other extensions may open a direct message
	 * channel to the wallet (e.g. to send RPC requests).
	 * Maps to the `externally_connectable` manifest field.
	 * Set to 'NOT_EXTERNALLY_CONNECTABLE' if the field is absent from the
	 * manifest, meaning no external connections are permitted.
	 */
	externallyConnectable:
		| {
				/** Which other installed extensions may connect. */
				extensionIds: ExternalExtensionIdScope
				/** Which web page origins may send messages directly to the wallet. */
				pageMatches: HostPermissionScope
		  }
		| 'NOT_EXTERNALLY_CONNECTABLE'

	/**
	 * Security-sensitive Browser API permissions declared in the `permissions`
	 * manifest field, granted to the extension at install time.
	 */
	permissions: BrowserExtensionPermission[]

	/**
	 * Broadest scope of web origins that may load resources from this
	 * extension.
	 * Maps to the broadest `matches` entry across all `web_accessible_resources`
	 * items.
	 */
	webAccessibleResources: WebAccessibleResourcesScope
}

/**
 * Android permissions declared via `<uses-permission>` in AndroidManifest.xml.
 * Enum values match the android:name attribute string exactly.
 *
 * All permissions seen in any wallet manifest must be listed here, including
 * non-security-relevant ones — the manifest collector throws on unknown values.
 */
export enum AndroidPermission {
	/** Required for any network communication. */
	INTERNET = 'android.permission.INTERNET',

	/** Check network connectivity state before making requests. */
	ACCESS_NETWORK_STATE = 'android.permission.ACCESS_NETWORK_STATE',

	/** Draw overlays on top of other apps — significant phishing risk. */
	SYSTEM_ALERT_WINDOW = 'android.permission.SYSTEM_ALERT_WINDOW',

	/** Camera access, typically for QR code scanning. */
	CAMERA = 'android.permission.CAMERA',

	/** Microphone access. */
	RECORD_AUDIO = 'android.permission.RECORD_AUDIO',

	/** Modify global audio settings. */
	MODIFY_AUDIO_SETTINGS = 'android.permission.MODIFY_AUDIO_SETTINGS',

	/** Bluetooth (Android < 12). */
	BLUETOOTH = 'android.permission.BLUETOOTH',

	/** Bluetooth administration (Android < 12). */
	BLUETOOTH_ADMIN = 'android.permission.BLUETOOTH_ADMIN',

	/** Initiate connections to paired Bluetooth devices (Android 12+). */
	BLUETOOTH_CONNECT = 'android.permission.BLUETOOTH_CONNECT',

	/** Discover and pair Bluetooth devices (Android 12+). */
	BLUETOOTH_SCAN = 'android.permission.BLUETOOTH_SCAN',

	/** Precise location, required for BLE scanning on Android < 12. */
	ACCESS_FINE_LOCATION = 'android.permission.ACCESS_FINE_LOCATION',
}

export const androidPermissions = new Enum<AndroidPermission>({
	[AndroidPermission.INTERNET]: true,
	[AndroidPermission.ACCESS_NETWORK_STATE]: true,
	[AndroidPermission.SYSTEM_ALERT_WINDOW]: true,
	[AndroidPermission.CAMERA]: true,
	[AndroidPermission.RECORD_AUDIO]: true,
	[AndroidPermission.MODIFY_AUDIO_SETTINGS]: true,
	[AndroidPermission.BLUETOOTH]: true,
	[AndroidPermission.BLUETOOTH_ADMIN]: true,
	[AndroidPermission.BLUETOOTH_CONNECT]: true,
	[AndroidPermission.BLUETOOTH_SCAN]: true,
	[AndroidPermission.ACCESS_FINE_LOCATION]: true,
})

/**
 * iOS usage description keys declared in Info.plist (NS*UsageDescription).
 * Enum values match the plist key string exactly.
 *
 * All keys seen in any wallet plist must be listed here, including
 * non-security-relevant ones — the manifest collector throws on unknown values.
 */
export enum IosUsageDescription {
	/** Bluetooth access at all times. */
	BLUETOOTH_ALWAYS = 'NSBluetoothAlwaysUsageDescription',

	/** Bluetooth peripheral access (legacy, pre-iOS 13). */
	BLUETOOTH_PERIPHERAL = 'NSBluetoothPeripheralUsageDescription',

	/** Camera access, typically for QR code scanning. */
	CAMERA = 'NSCameraUsageDescription',

	/** Face ID biometric authentication. */
	FACE_ID = 'NSFaceIDUsageDescription',

	/** Location access while the app is in use, required for BLE on iOS. */
	LOCATION_WHEN_IN_USE = 'NSLocationWhenInUseUsageDescription',

	/** Microphone access. */
	MICROPHONE = 'NSMicrophoneUsageDescription',

	/** Save images to the photo library. */
	PHOTO_LIBRARY_ADD = 'NSPhotoLibraryAddUsageDescription',

	/** Read images from the photo library. */
	PHOTO_LIBRARY = 'NSPhotoLibraryUsageDescription',
}

export const iosUsageDescriptions = new Enum<IosUsageDescription>({
	[IosUsageDescription.BLUETOOTH_ALWAYS]: true,
	[IosUsageDescription.BLUETOOTH_PERIPHERAL]: true,
	[IosUsageDescription.CAMERA]: true,
	[IosUsageDescription.FACE_ID]: true,
	[IosUsageDescription.LOCATION_WHEN_IN_USE]: true,
	[IosUsageDescription.MICROPHONE]: true,
	[IosUsageDescription.PHOTO_LIBRARY_ADD]: true,
	[IosUsageDescription.PHOTO_LIBRARY]: true,
})

/**
 * Security-relevant fields from a mobile app's platform manifest.
 * Values should be derived directly from the published app manifest.
 * Not available for apps without a public source repository.
 */
export interface MobileAppManifest {
	/**
	 * Permissions declared in AndroidManifest.xml via `<uses-permission>`.
	 * Set to 'NOT_AN_ANDROID_APP' if the wallet has no Android variant.
	 */
	android:
		| {
				usesPermissions: AndroidPermission[]
		  }
		| 'NOT_AN_ANDROID_APP'

	/**
	 * Usage description keys declared in Info.plist (NS*UsageDescription).
	 * Set to 'NOT_AN_IOS_APP' if the wallet has no iOS variant.
	 */
	ios:
		| {
				usageDescriptions: IosUsageDescription[]
		  }
		| 'NOT_AN_IOS_APP'
}

/**
 * Security best-practices fields.
 */
export interface SecurityBestPracticesBase {
	/** How the wallet stores the user's private key. */
	keyStorageMechanism: KeyStorageMechanism

	/** The entropy source used during key generation. */
	secureRng: SecureRngSource
}

/**
 * Security best-practices for the browser extension variant.
 */
export interface BrowserSecurityBestPractices extends SecurityBestPracticesBase {
	browserExtensionHardening: BrowserExtensionManifest
}

/**
 * Security best-practices for the mobile app variant.
 */
export interface MobileSecurityBestPractices extends SecurityBestPracticesBase {
	mobileAppHardening: MobileAppManifest
}

/**
 * Security best-practices data for a wallet, broken down by variant.
 */
export interface SecurityBestPracticesData {
	/** Browser extension variant. Set to 'NOT_A_BROWSER_EXTENSION' if absent. */
	browser: WithRef<BrowserSecurityBestPractices> | 'NOT_A_BROWSER_EXTENSION'

	/** Mobile app variant. Set to 'NOT_A_MOBILE_APP' if absent. */
	mobile: WithRef<MobileSecurityBestPractices> | 'NOT_A_MOBILE_APP'

	/** Desktop app variant. Set to 'NOT_A_DESKTOP_APP' if absent. */
	desktop: WithRef<SecurityBestPracticesBase> | 'NOT_A_DESKTOP_APP'
}
