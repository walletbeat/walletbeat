import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	type ExemptEvaluation,
	Rating,
} from '@/schema/attributes'
import {
	KeyGenerationLocation,
	type KeysHandlingSupport,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import {
	passkeyLibraryName,
	PasskeyVerificationLibrary,
	type PasskeyVerificationSupport,
} from '@/schema/features/security/passkey-verification'
import {
	AndroidPermission,
	type BrowserExtensionManifest,
	BrowserExtensionPermission,
	type BrowserSecurityBestPractices,
	ExternalExtensionIdScope,
	HostPermissionScope,
	IosUsageDescription,
	KeyStorageMechanism,
	type MobileAppManifest,
	type MobileSecurityBestPractices,
	SecureRngSource,
	type SecurityBestPracticesBase,
	WebAccessibleResourcesScope,
} from '@/schema/features/security/security-best-practices'
import { isSupported } from '@/schema/features/support'
import { Variant } from '@/schema/variants'
import { verifiabilityRequiresSourceCodeAccess } from '@/schema/verifiability'
import type { WalletMetadata } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'
import { markdown, mdParagraph, mdSentence, paragraph, sentence } from '@/types/content'
import { isNonEmptyArray } from '@/types/utils/non-empty'
import { commaListFormat } from '@/types/utils/text'

import { aggregateVariantEvaluations, exempt, pickWorstRating, unrated } from '../common'

export type SecurityBestPracticesValue = null

function sourceNotAvailable(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
): Evaluation<SecurityBestPracticesValue> {
	return ctx.build({
		outcome: {
			id: 'source_not_available',
			rating: Rating.FAIL,
			displayName: 'Source code not available',
			shortExplanation: mdSentence(
				"{{WALLET_NAME}}'s source code is not publicly available, so security best practices cannot be independently verified.",
			),
		},
		details: paragraph(
			'{{WALLET_NAME}} does not make its source code publicly available. As a result, it is not possible to independently verify how it handles key storage, random number generation, or deployment hardening.',
		),
		howToImprove: mdParagraph(
			'{{WALLET_NAME}} should open-source its code so that key storage, random number generation, and deployment hardening can be independently verified.',
		),
	})
}

function keyStoragePass(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
	mechanism: KeyStorageMechanism.HARDWARE_SECURITY_MODULE | KeyStorageMechanism.PASSKEY_MANAGED,
): Evaluation<SecurityBestPracticesValue> {
	const mechanismLabel =
		mechanism === KeyStorageMechanism.PASSKEY_MANAGED
			? 'No private key is stored, the wallet uses passkey-managed accounts.'
			: 'Keys are stored in a hardware security module or secure enclave.'

	return ctx.build({
		outcome: {
			id: 'key_storage_pass',
			rating: Rating.PASS,
			displayName: 'Secure key storage',
			shortExplanation: mdSentence(`{{WALLET_NAME}} stores keys securely. ${mechanismLabel}`),
		},
		details: paragraph(mechanismLabel),
	})
}

function keyStoragePartial(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
	mechanism:
		| KeyStorageMechanism.ENCRYPTED_WITH_USER_SECRET_STANDARDIZED_KDF
		| KeyStorageMechanism.OS_SANDBOXED_PLAINTEXT,
): Evaluation<SecurityBestPracticesValue> {
	const mechanismLabel =
		mechanism === KeyStorageMechanism.ENCRYPTED_WITH_USER_SECRET_STANDARDIZED_KDF
			? 'Keys are encrypted with a user-known secret using a standardized KDF, but could be attacked if the secret is weak.'
			: 'Keys are stored in OS-sandboxed storage without additional encryption. Other processes are blocked from reading them, but the keys are not encrypted at rest.'

	return ctx.build({
		outcome: {
			id: 'key_storage_partial',
			rating: Rating.PARTIAL,
			displayName: 'Partial key storage protection',
			shortExplanation: mdSentence(
				`{{WALLET_NAME}} has partial key storage protection. ${mechanismLabel}`,
			),
		},
		details: paragraph(mechanismLabel),
		howToImprove: mdParagraph(
			'{{WALLET_NAME}} should store keys inside a hardware security module or secure enclave.',
		),
	})
}

function keyStorageFail(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
): Evaluation<SecurityBestPracticesValue> {
	return ctx.build({
		outcome: {
			id: 'key_storage_fail',
			rating: Rating.FAIL,
			displayName: 'Weak key storage',
			shortExplanation: mdSentence('{{WALLET_NAME}} does not adequately protect key storage.'),
		},
		details: paragraph(
			'The key storage mechanism used by {{WALLET_NAME}} does not provide adequate protection against key extraction.',
		),
		howToImprove: mdParagraph(
			'{{WALLET_NAME}} should store keys in a hardware security module or secure enclave, or encrypt them with a strong user secret.',
		),
	})
}

function keyStorageUnverifiable(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
): Evaluation<SecurityBestPracticesValue> {
	return ctx.build({
		outcome: {
			id: 'key_storage_not_verifiable',
			rating: Rating.FAIL,
			displayName: 'Key storage cannot be verified',
			shortExplanation: mdSentence(
				"{{WALLET_NAME}}'s source code is not publicly available, so the key storage mechanism cannot be independently verified.",
			),
		},
		details: paragraph(
			'{{WALLET_NAME}} does not make its source code publicly available. As a result, it is not possible to independently verify how it stores private keys.',
		),
		howToImprove: mdParagraph(
			'{{WALLET_NAME}} should open-source its code so that its key storage mechanism can be independently verified.',
		),
	})
}

function evaluateKeyStorage(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
	mechanism: KeyStorageMechanism,
): Evaluation<SecurityBestPracticesValue> {
	switch (mechanism) {
		case KeyStorageMechanism.HARDWARE_SECURITY_MODULE:
		case KeyStorageMechanism.PASSKEY_MANAGED:
			return keyStoragePass(ctx, mechanism)
		case KeyStorageMechanism.ENCRYPTED_WITH_USER_SECRET_STANDARDIZED_KDF:
		case KeyStorageMechanism.OS_SANDBOXED_PLAINTEXT:
			return keyStoragePartial(ctx, mechanism)
		case KeyStorageMechanism.ENCRYPTED_WITH_USER_SECRET_WEAK_KDF:
			return keyStorageFail(ctx)
		case KeyStorageMechanism.NOT_VERIFIABLE:
			return keyStorageUnverifiable(ctx)
		default:
			return keyStorageFail(ctx)
	}
}

function evaluateSecureRng(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
	rng: SecureRngSource,
): Evaluation<SecurityBestPracticesValue> {
	switch (rng) {
		case SecureRngSource.OS_CSPRNG:
		case SecureRngSource.HARDWARE_ENTROPY:
			return ctx.build({
				outcome: {
					id: 'rng_pass',
					rating: Rating.PASS,
					displayName: 'Secure random number generation',
					shortExplanation: mdSentence(
						'{{WALLET_NAME}} uses a cryptographically secure OS-provided or hardware entropy source for key generation.',
					),
				},
				details: paragraph(
					'{{WALLET_NAME}} derives entropy for key generation from the operating system CSPRNG or a dedicated hardware entropy source, both of which are considered cryptographically secure.',
				),
			})
		case SecureRngSource.LIBRARY_RNG:
			return ctx.build({
				outcome: {
					id: 'rng_partial',
					rating: Rating.PARTIAL,
					displayName: 'Unverified RNG quality',
					shortExplanation: mdSentence(
						'{{WALLET_NAME}} uses a library-provided RNG whose quality has not been independently verified.',
					),
				},
				details: paragraph(
					'{{WALLET_NAME}} uses a library-provided random number generator for key generation. The cryptographic quality of this RNG has not been independently verified.',
				),
				howToImprove: mdParagraph(
					"{{WALLET_NAME}} should use the operating system's CSPRNG for key generation.",
				),
			})
		case SecureRngSource.NOT_VERIFIABLE:
			return ctx.build({
				outcome: {
					id: 'rng_not_verifiable',
					rating: Rating.FAIL,
					displayName: 'RNG source cannot be verified',
					shortExplanation: mdSentence(
						"{{WALLET_NAME}}'s source code is not publicly available, so the entropy source used for key generation cannot be independently verified.",
					),
				},
				details: paragraph(
					'{{WALLET_NAME}} does not make its source code publicly available. As a result, it is not possible to independently verify what entropy source it uses for key generation.',
				),
				howToImprove: mdParagraph(
					'{{WALLET_NAME}} should open-source its code so that the entropy source used for key generation can be independently verified.',
				),
			})
		default:
			return ctx.build({
				outcome: {
					id: 'rng_fail',
					rating: Rating.FAIL,
					displayName: 'Unknown or insecure RNG',
					shortExplanation: mdSentence(
						'{{WALLET_NAME}} uses an unknown or insecure source of entropy for key generation.',
					),
				},
				details: paragraph(
					'The source of entropy used by {{WALLET_NAME}} for key generation is unknown or insecure.',
				),
				howToImprove: mdParagraph(
					"{{WALLET_NAME}} should use the operating system's CSPRNG for key generation.",
				),
			})
	}
}

function evaluateContentScripts(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
	manifest: BrowserExtensionManifest,
): Evaluation<SecurityBestPracticesValue> {
	switch (manifest.contentScripts) {
		case HostPermissionScope.NONE:
		case HostPermissionScope.HTTPS_ONLY:
			return ctx.build({
				outcome: {
					id: 'content_scripts_pass',
					rating: Rating.PASS,
					displayName: 'Minimal content script injection',
					shortExplanation: mdSentence(
						'{{WALLET_NAME}} injects content scripts only into HTTPS pages or not at all.',
					),
				},
				details: paragraph(
					'{{WALLET_NAME}} restricts content script injection to HTTPS origins or declares no content scripts, minimizing exposure to malicious pages.',
				),
			})
		case HostPermissionScope.HTTP_AND_HTTPS:
			return ctx.build({
				outcome: {
					id: 'content_scripts_partial',
					rating: Rating.PARTIAL,
					displayName: 'Content scripts injected into HTTP pages',
					shortExplanation: mdSentence(
						'{{WALLET_NAME}} injects content scripts into insecure HTTP pages as well as HTTPS.',
					),
				},
				details: paragraph(
					'{{WALLET_NAME}} injects content scripts into both HTTP and HTTPS pages, unnecessarily exposing the extension to insecure origins.',
				),
				howToImprove: mdParagraph(
					'{{WALLET_NAME}} should restrict content script `matches` to HTTPS origins only in its manifest.',
				),
			})
		case HostPermissionScope.UNRESTRICTED:
			return ctx.build({
				outcome: {
					id: 'content_scripts_fail',
					rating: Rating.FAIL,
					displayName: 'Unrestricted content script injection',
					shortExplanation: mdSentence(
						'{{WALLET_NAME}} injects content scripts into all pages including local files and non-web schemes.',
					),
				},
				details: paragraph(
					'{{WALLET_NAME}} injects content scripts into all origins including file:// and other non-web schemes, dramatically increasing the extension attack surface.',
				),
				howToImprove: mdParagraph(
					'{{WALLET_NAME}} should restrict content script `matches` to HTTPS origins only in its manifest.',
				),
			})
	}
}

function evaluateExternallyConnectable(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
	manifest: BrowserExtensionManifest,
): Evaluation<SecurityBestPracticesValue> {
	if (manifest.externallyConnectable === 'NOT_EXTERNALLY_CONNECTABLE') {
		return ctx.build({
			outcome: {
				id: 'externally_connectable_pass',
				rating: Rating.PASS,
				displayName: 'No external message connections',
				shortExplanation: mdSentence(
					'{{WALLET_NAME}} does not expose a direct message channel to web pages or other extensions.',
				),
			},
			details: mdParagraph(
				'{{WALLET_NAME}} does not declare `externally_connectable`, so no web page or external extension can send it messages directly.',
			),
		})
	}

	const { extensionIds, pageMatches } = manifest.externallyConnectable

	if (
		extensionIds === ExternalExtensionIdScope.ANY ||
		pageMatches === HostPermissionScope.UNRESTRICTED
	) {
		return ctx.build({
			outcome: {
				id: 'externally_connectable_fail',
				rating: Rating.FAIL,
				displayName: 'Unrestricted external message connections',
				shortExplanation: mdSentence(
					'{{WALLET_NAME}} allows any extension or web page to send it wallet messages directly.',
				),
			},
			details: mdParagraph(
				`{{WALLET_NAME}}'s \`externally_connectable\` is open to ${
					extensionIds === ExternalExtensionIdScope.ANY
						? 'any installed extension'
						: 'all origins including non-web schemes'
				}, allowing malicious actors to send it wallet requests directly.`,
			),
			howToImprove: mdParagraph(
				'{{WALLET_NAME}} should restrict `externally_connectable` to specific trusted extension IDs and HTTPS origins only.',
			),
		})
	}

	if (pageMatches === HostPermissionScope.HTTP_AND_HTTPS) {
		return ctx.build({
			outcome: {
				id: 'externally_connectable_partial',
				rating: Rating.PARTIAL,
				displayName: 'External connections allowed from HTTP pages',
				shortExplanation: mdSentence(
					'{{WALLET_NAME}} allows insecure HTTP pages to send it wallet messages directly.',
				),
			},
			details: paragraph(
				'{{WALLET_NAME}} is externally connectable from HTTP pages, meaning insecure origins can send wallet requests to the extension.',
			),
			howToImprove: mdParagraph(
				'{{WALLET_NAME}} should restrict `externally_connectable` page matches to HTTPS origins only.',
			),
		})
	}

	return ctx.build({
		outcome: {
			id: 'externally_connectable_pass',
			rating: Rating.PASS,
			displayName: 'Restricted external message connections',
			shortExplanation: mdSentence(
				'{{WALLET_NAME}} restricts external message connections to specific trusted extensions and HTTPS pages.',
			),
		},
		details: mdParagraph(
			'{{WALLET_NAME}} restricts `externally_connectable` to specific named extension IDs and HTTPS origins, limiting who can send it direct messages.',
		),
	})
}

const browserPermissionRatings: Record<BrowserExtensionPermission, Rating.FAIL | Rating.PASS> = {
	// Benign or wallet-typical permissions.
	// Grants access only to the currently active tab when the user invokes the extension, needed for app injection.
	[BrowserExtensionPermission.ACTIVE_TAB]: Rating.PASS,
	// Schedules periodic background tasks, used for network polling, lock timers, and session expiry.
	[BrowserExtensionPermission.ALARMS]: Rating.PASS,
	// Writes text to the clipboard on user action, used to copy addresses and transaction hashes.
	[BrowserExtensionPermission.CLIPBOARD_WRITE]: Rating.PASS,
	// Adds items to the browser right-click menu, used for quick-access wallet actions.
	[BrowserExtensionPermission.CONTEXT_MENUS]: Rating.PASS,
	// Read/write access to cookies for specific origins, used for session management with wallet backends.
	[BrowserExtensionPermission.COOKIES]: Rating.PASS,
	// Declaratively blocks or redirects requests without seeing their content, used for ad/tracker blocking in privacy-focused wallets.
	[BrowserExtensionPermission.DECLARATIVE_NET_REQUEST]: Rating.PASS,
	// Same as above but also applies to host-matched pages, used when rules must cover specific app domains.
	[BrowserExtensionPermission.DECLARATIVE_NET_REQUEST_WITH_HOST_ACCESS]: Rating.PASS,
	// Firebase Cloud Messaging for push notifications, used to deliver transaction alerts.
	[BrowserExtensionPermission.GCM]: Rating.PASS,
	// OAuth2 token retrieval via the browser's identity API, used for optional social login flows.
	[BrowserExtensionPermission.IDENTITY]: Rating.PASS,
	// Retrieves the user's Google account email alongside the OAuth token, used when email is needed for account linking.
	[BrowserExtensionPermission.IDENTITY_EMAIL]: Rating.PASS,
	// Displays desktop notifications, used for transaction confirmations and security alerts.
	[BrowserExtensionPermission.NOTIFICATIONS]: Rating.PASS,
	// Creates an off-screen document for DOM operations without a visible window, used for background cryptographic work.
	[BrowserExtensionPermission.OFFSCREEN]: Rating.PASS,
	// Injects scripts into web pages, required for app content-script injection.
	[BrowserExtensionPermission.SCRIPTING]: Rating.PASS,
	// Opens the extension in the browser side panel, used for a persistent wallet UI alongside web pages.
	[BrowserExtensionPermission.SIDE_PANEL]: Rating.PASS,
	// Key-value storage synced or local, required for storing encrypted keys and settings.
	[BrowserExtensionPermission.STORAGE]: Rating.PASS,
	// Reads CPU core count and load, used to tune cryptographic thread counts.
	[BrowserExtensionPermission.SYSTEM_CPU]: Rating.PASS,
	// Reads connected display info, used for responsive UI layout across monitor configurations.
	[BrowserExtensionPermission.SYSTEM_DISPLAY]: Rating.PASS,
	// Access to tab metadata (URL, title), used to detect active apps and switch network contexts.
	[BrowserExtensionPermission.TABS]: Rating.PASS,
	// Removes the 5 MB storage cap, required for wallets that cache chain data or transaction history locally.
	[BrowserExtensionPermission.UNLIMITED_STORAGE]: Rating.PASS,
	// Observes navigation events without seeing request bodies, used to detect page changes for content-script re-injection.
	[BrowserExtensionPermission.WEB_NAVIGATION]: Rating.PASS,
	// Read-only access to HTTP/S request metadata, used to detect and warn about insecure RPC connections.
	[BrowserExtensionPermission.WEB_REQUEST]: Rating.PASS,

	// Dangerous permissions: not necessary for a wallet and introduce serious risks.
	// Exposes the user's physical location, not required for any wallet function and enables persistent user tracking.
	[BrowserExtensionPermission.GEOLOCATION]: Rating.FAIL,
	// Full read/write access to all bookmarks, not required for any wallet function.
	[BrowserExtensionPermission.BOOKMARKS]: Rating.FAIL,
	// Attaches the Chrome DevTools protocol to any tab, full read/write access to page content.
	[BrowserExtensionPermission.DEBUGGER]: Rating.FAIL,
	// Can delete history, cookies, and cached data, destructive and privacy-invasive.
	[BrowserExtensionPermission.BROWSING_DATA]: Rating.FAIL,
	// Full read access to the user's browsing history.
	[BrowserExtensionPermission.HISTORY]: Rating.FAIL,
	// Can list, enable, disable, or uninstall other extensions.
	[BrowserExtensionPermission.MANAGEMENT]: Rating.FAIL,
	// Can reroute all browser network traffic through an attacker-controlled proxy.
	[BrowserExtensionPermission.PROXY]: Rating.FAIL,
	// Allows registering arbitrary user-supplied scripts that run in web pages.
	[BrowserExtensionPermission.USER_SCRIPTS]: Rating.FAIL,
	// Intercepts WebAuthn requests, can impersonate hardware security keys.
	[BrowserExtensionPermission.WEB_AUTHENTICATION_PROXY]: Rating.FAIL,
	// Captures the screen, a window, or a tab as a media stream.
	[BrowserExtensionPermission.DESKTOP_CAPTURE]: Rating.FAIL,
	// Legitimate for hardware wallet communication but opens a native OS code execution channel; prefer browser-native HID, USB, or Bluetooth APIs instead.
	[BrowserExtensionPermission.NATIVE_MESSAGING]: Rating.FAIL,
	// Reads clipboard contents without a user gesture, exposing seed phrases or keys copied elsewhere.
	[BrowserExtensionPermission.CLIPBOARD_READ]: Rating.FAIL,
	// Can synchronously block or modify all HTTP/S requests.
	[BrowserExtensionPermission.WEB_REQUEST_BLOCKING]: Rating.FAIL,
	// Reads and modifies browser-wide privacy settings.
	[BrowserExtensionPermission.PRIVACY]: Rating.FAIL,
	// Saves a full MHTML snapshot of any tab.
	[BrowserExtensionPermission.PAGE_CAPTURE]: Rating.FAIL,
}

function evaluateBrowserPermissions(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
	manifest: BrowserExtensionManifest,
): Evaluation<SecurityBestPracticesValue> {
	const badPerms = manifest.permissions.filter(p => browserPermissionRatings[p] === Rating.FAIL)

	if (badPerms.length > 0) {
		return ctx.build({
			outcome: {
				id: 'browser_permissions_fail',
				rating: Rating.FAIL,
				displayName: 'Dangerous browser permissions declared',
				shortExplanation: mdSentence(
					'{{WALLET_NAME}} declares browser permissions that are not necessary for a wallet and introduce serious risks.',
				),
			},
			details: paragraph(
				`{{WALLET_NAME}} declares the following high-risk browser permissions that are not required for wallet functionality: ${commaListFormat(badPerms)}.`,
			),
			howToImprove: mdParagraph(
				`{{WALLET_NAME}} should remove these permissions from its manifest: ${commaListFormat(badPerms.map(p => `\`${p}\``))}.`,
			),
		})
	}

	return ctx.build({
		outcome: {
			id: 'browser_permissions_pass',
			rating: Rating.PASS,
			displayName: 'No dangerous browser permissions',
			shortExplanation: mdSentence(
				'{{WALLET_NAME}} does not declare any high-risk browser API permissions.',
			),
		},
		details: paragraph(
			'{{WALLET_NAME}} does not declare any browser API permissions that would give it unnecessary access to sensitive browser state.',
		),
	})
}

function evaluateBrowserExtension(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
	manifest: BrowserExtensionManifest,
): Evaluation<SecurityBestPracticesValue> {
	const minimalPermissions =
		manifest.hostPermissions === HostPermissionScope.NONE ||
		manifest.hostPermissions === HostPermissionScope.HTTPS_ONLY
	const lockedDownAccessibleResources =
		manifest.webAccessibleResources === WebAccessibleResourcesScope.NONE ||
		manifest.webAccessibleResources === WebAccessibleResourcesScope.SPECIFIC_ORIGINS

	if (minimalPermissions && lockedDownAccessibleResources) {
		return ctx.build({
			outcome: {
				id: 'browser_extension_pass',
				rating: Rating.PASS,
				displayName: 'Browser extension is hardened',
				shortExplanation: mdSentence(
					'{{WALLET_NAME}} requests minimal browser permissions and restricts web-accessible resources.',
				),
			},
			details: paragraph(
				'{{WALLET_NAME}} follows browser extension security best practices: it requests only the permissions it needs and restricts web-accessible resources to prevent other websites from loading its internal assets.',
			),
		})
	}

	if (!minimalPermissions && !lockedDownAccessibleResources) {
		return ctx.build({
			outcome: {
				id: 'browser_extension_fail',
				rating: Rating.FAIL,
				displayName: 'Browser extension lacks hardening',
				shortExplanation: mdSentence(
					'{{WALLET_NAME}} requests overbroad permissions and does not restrict web-accessible resources.',
				),
			},
			details: paragraph(
				"{{WALLET_NAME}}'s browser extension requests overbroad permissions and does not restrict its web_accessible_resources, increasing the attack surface for malicious websites.",
			),
			howToImprove: mdParagraph(
				'{{WALLET_NAME}} should request only necessary host permissions and restrict `web_accessible_resources` to specific trusted origins in its manifest.',
			),
		})
	}

	return ctx.build({
		outcome: {
			id: 'browser_extension_partial',
			rating: Rating.PARTIAL,
			displayName: 'Browser extension partially hardened',
			shortExplanation: mdSentence(
				'{{WALLET_NAME}} partially follows browser extension security best practices.',
			),
		},
		details: paragraph(
			`{{WALLET_NAME}}'s browser extension is partially hardened: ${
				!minimalPermissions
					? 'it requests overbroad host permissions'
					: !lockedDownAccessibleResources
						? 'its internal assets are exposed to all websites via unrestricted web-accessible resources'
						: ''
			}.`,
		),
		howToImprove: mdParagraph(
			'{{WALLET_NAME}} should request only necessary host permissions and restrict `web_accessible_resources` to specific trusted origins.',
		),
	})
}

const androidPermissionRatings: Record<AndroidPermission, Rating.PASS | Rating.FAIL> = {
	// Necessary or wallet-typical permissions.
	// Required for all network communication with RPC nodes, APIs, and wallet backends.
	[AndroidPermission.INTERNET]: Rating.PASS,
	// Checks connectivity before making network requests, avoiding unnecessary failures.
	[AndroidPermission.ACCESS_NETWORK_STATE]: Rating.PASS,
	// Camera access for QR code scanning, the standard way to input addresses and connect to apps.
	[AndroidPermission.CAMERA]: Rating.PASS,
	// Bluetooth communication with hardware wallets (Android < 12).
	[AndroidPermission.BLUETOOTH]: Rating.PASS,
	// Bluetooth administration for pairing hardware wallets (Android < 12).
	[AndroidPermission.BLUETOOTH_ADMIN]: Rating.PASS,
	// Initiates connections to paired hardware wallets over Bluetooth (Android 12+).
	[AndroidPermission.BLUETOOTH_CONNECT]: Rating.PASS,
	// Discovers and pairs hardware wallets over Bluetooth (Android 12+).
	[AndroidPermission.BLUETOOTH_SCAN]: Rating.PASS,
	// Posts notifications such as transaction confirmations and price alerts (Android 13+).
	[AndroidPermission.POST_NOTIFICATIONS]: Rating.PASS,
	// Writes to shared storage, e.g. to export transaction receipts or QR codes. The implicit
	// read access this used to grant disappeared after Android 4.4 (API 19, 2013), which is far
	// older than any version in practical use, so writing is a benign, wallet-typical operation.
	[AndroidPermission.WRITE_EXTERNAL_STORAGE]: Rating.PASS,

	// Dangerous permissions: not necessary for a wallet and introduce serious risks.
	// Launches full-screen UI over the lock screen from a notification (call/alarm pattern); it
	// is a phishing vector (e.g. a fake seed-phrase prompt). On Android < 14 it is auto-granted
	// at install, and the manifest gives no guarantee of the user's OS version, so we take the
	// pessimistic view.
	[AndroidPermission.USE_FULL_SCREEN_INTENT]: Rating.FAIL,
	// Allows drawing overlays over other apps, can be used to phish seed phrases or intercept transaction confirmations.
	[AndroidPermission.SYSTEM_ALERT_WINDOW]: Rating.FAIL,
	// Microphone access enables covert audio recording of sensitive conversations near the device.
	[AndroidPermission.RECORD_AUDIO]: Rating.FAIL,
	// Precise GPS location can be used to profile and deanonymize users; not required for any wallet function.
	[AndroidPermission.ACCESS_FINE_LOCATION]: Rating.FAIL,
	// Modifying global audio settings can suppress security alerts or notifications from other apps.
	[AndroidPermission.MODIFY_AUDIO_SETTINGS]: Rating.FAIL,
	// Broad read of shared storage exposes private files.
	[AndroidPermission.READ_EXTERNAL_STORAGE]: Rating.FAIL,
}

const iosPermissionRatings: Record<IosUsageDescription, Rating.PASS | Rating.FAIL> = {
	// Necessary or wallet-typical permissions.
	// Camera access for QR code scanning, the standard way to input addresses and connect to apps.
	[IosUsageDescription.CAMERA]: Rating.PASS,
	// Face ID biometric authentication, used to unlock the wallet without a PIN.
	[IosUsageDescription.FACE_ID]: Rating.PASS,
	// Allows saving exported transaction receipts or QR codes to the photo library.
	[IosUsageDescription.PHOTO_LIBRARY_ADD]: Rating.PASS,

	// Dangerous permissions: not necessary for a wallet and introduce serious risks.
	// Microphone access enables covert audio recording of sensitive conversations near the device.
	[IosUsageDescription.MICROPHONE]: Rating.FAIL,
	// Precise GPS location can be used to profile and deanonymize users; not required for any wallet function.
	[IosUsageDescription.LOCATION_WHEN_IN_USE]: Rating.FAIL,
	// Read access to the full photo library exposes private images; wallets only ever need to write, not read.
	[IosUsageDescription.PHOTO_LIBRARY]: Rating.FAIL,
	// Always-on Bluetooth enables passive device-tracking and proximity-based attacks even when the app runs in the background.
	[IosUsageDescription.BLUETOOTH_ALWAYS]: Rating.FAIL,
	// Legacy pre-iOS 13 peripheral mode; replaced by BLUETOOTH_ALWAYS and no longer needed on supported OS versions.
	[IosUsageDescription.BLUETOOTH_PERIPHERAL]: Rating.FAIL,
}

function getUnnecessaryPermissionLists(manifest: MobileAppManifest): {
	androidList: string[]
	iosList: string[]
} {
	const badAndroid =
		manifest.android === 'NOT_AN_ANDROID_APP'
			? []
			: manifest.android.usesPermissions.filter(p => androidPermissionRatings[p] === Rating.FAIL)
	const badIos =
		manifest.ios === 'NOT_AN_IOS_APP'
			? []
			: manifest.ios.usageDescriptions.filter(p => iosPermissionRatings[p] === Rating.FAIL)

	return {
		androidList: badAndroid.map(p => `\`${p.replace('android.permission.', '')}\``),
		iosList: badIos.map(p => `\`${p}\``),
	}
}

function evaluateMobileApp(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
	manifest: MobileAppManifest,
): Evaluation<SecurityBestPracticesValue> {
	const { androidList, iosList } = getUnnecessaryPermissionLists(manifest)
	const minimalPermissions = androidList.length === 0 && iosList.length === 0

	if (minimalPermissions) {
		return ctx.build({
			outcome: {
				id: 'mobile_app_pass',
				rating: Rating.PASS,
				displayName: 'Mobile app requests minimal permissions',
				shortExplanation: mdSentence('{{WALLET_NAME}} requests only the OS permissions it needs.'),
			},
			details: paragraph(
				'{{WALLET_NAME}} declares only the OS permissions it needs and avoids high-risk permissions that could expose users to phishing or privacy leaks.',
			),
		})
	}

	return ctx.build({
		outcome: {
			id: 'mobile_app_fail',
			rating: Rating.FAIL,
			displayName: 'Mobile app requests high-risk permissions',
			shortExplanation: mdSentence(
				'{{WALLET_NAME}} requests high-risk OS permissions that are not necessary for a wallet.',
			),
		},
		details: mdParagraph(
			`{{WALLET_NAME}}'s mobile app declares high-risk OS permissions not required for wallet functionality, increasing the attack surface.${androidList.length > 0 ? ` Unnecessary Android permissions: ${commaListFormat(androidList)}.` : ''}${iosList.length > 0 ? ` Unnecessary iOS permissions: ${commaListFormat(iosList)}.` : ''}`,
		),
		howToImprove: mdParagraph(
			`{{WALLET_NAME}} should remove the unnecessary permissions from its manifests.${androidList.length > 0 ? ` Android (\`AndroidManifest.xml\`): ${commaListFormat(androidList)}.` : ''}${iosList.length > 0 ? ` iOS (\`Info.plist\`): ${commaListFormat(iosList)}.` : ''}`,
		),
	})
}

function evaluatePasskeySubEval(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
	support: PasskeyVerificationSupport,
): Evaluation<SecurityBestPracticesValue> {
	const libraryName = passkeyLibraryName(support.library)

	switch (support.library) {
		case PasskeyVerificationLibrary.SMOOTH_CRYPTO_LIB:
		case PasskeyVerificationLibrary.DAIMO_P256_VERIFIER:
		case PasskeyVerificationLibrary.OPEN_ZEPPELIN_P256_VERIFIER:
		case PasskeyVerificationLibrary.WEB_AUTHN_SOL:
			return ctx.build({
				outcome: {
					id: 'passkey_pass',
					rating: Rating.PASS,
					displayName: 'Audited passkey verification',
					shortExplanation: mdSentence(
						`{{WALLET_NAME}} uses ${libraryName}, a well-audited on-chain passkey verification library.`,
					),
				},
				details: paragraph(
					`{{WALLET_NAME}} uses ${libraryName} for on-chain passkey signature verification, a well-audited P-256 library.`,
				),
			})
		case PasskeyVerificationLibrary.FRESH_CRYPTO_LIB:
		case PasskeyVerificationLibrary.OTHER:
			return ctx.build({
				outcome: {
					id: 'passkey_partial',
					rating: Rating.PARTIAL,
					displayName: 'Suboptimal passkey verification',
					shortExplanation: mdSentence(
						`{{WALLET_NAME}} uses ${libraryName} for on-chain passkey verification, which has received less auditing than preferred alternatives.`,
					),
				},
				details: paragraph(
					`{{WALLET_NAME}} implements passkey verification using ${libraryName}, a library that has received less auditing than the preferred alternatives.`,
				),
				howToImprove: mdParagraph(
					'{{WALLET_NAME}} should consider upgrading to a more widely audited P-256 verification library such as Smooth Crypto Lib, Daimo P256 Verifier, or OpenZeppelin P256 Verifier.',
				),
			})
		default:
			return ctx.build({
				outcome: {
					id: 'passkey_fail',
					rating: Rating.FAIL,
					displayName: 'No recognized passkey verification',
					shortExplanation: mdSentence(
						'{{WALLET_NAME}} does not use a recognized passkey verification library.',
					),
				},
				details: paragraph(
					'{{WALLET_NAME}} does not use a recognized or audited library for on-chain P-256 passkey signature verification.',
				),
				howToImprove: mdParagraph(
					'{{WALLET_NAME}} should implement passkey verification using a well-audited P-256 library such as Smooth Crypto Lib.',
				),
			})
	}
}

function evaluateKeysHandling(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
	keysHandling: KeysHandlingSupport,
): Evaluation<SecurityBestPracticesValue> {
	switch (keysHandling.keyGeneration) {
		case KeyGenerationLocation.FULLY_ON_USER_DEVICE:
		case KeyGenerationLocation.MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE:
			break // OK
		case KeyGenerationLocation.FULLY_OFF_USER_DEVICE:
			return ctx.build({
				outcome: {
					id: 'key_off_device',
					displayName: 'Key material not under user control',
					rating: Rating.FAIL,
					shortExplanation: sentence(
						'{{WALLET_NAME}} generates keys on external servers. The security of key material at rest cannot be independently verified.',
					),
				},
				details: markdown(`
					Key material for {{WALLET_NAME}} is generated and held on external
					servers. Users have no control over how it is stored or encrypted
					at rest, and cannot independently verify that it is protected.
				`),
				howToImprove: mdParagraph(
					"{{WALLET_NAME}} should generate and store key material on the user's device so the user controls how it is secured at rest.",
				),
			})
	}

	switch (keysHandling.multipartyKeyReconstruction) {
		case MultiPartyKeyReconstruction.NON_MULTIPARTY:
		case MultiPartyKeyReconstruction.ON_USER_DEVICE:
		case MultiPartyKeyReconstruction.MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE:
			break // OK
		case MultiPartyKeyReconstruction.MULTIPARTY_COMPUTED_WITHOUT_USER_DEVICE:
			return ctx.build({
				outcome: {
					id: 'multiparty_reconstructed_without_user_device',
					rating: Rating.FAIL,
					displayName: 'MPC key reconstruction bypasses user device',
					shortExplanation: sentence(
						"{{WALLET_NAME}}'s MPC keys can be reconstructed server-side, outside the user's security perimeter.",
					),
				},
				details: markdown(`
					{{WALLET_NAME}} uses multi-party computation, but key reconstruction
					can occur on external servers without the user's device being
					involved. The at-rest security of the reconstructed key material on
					the provider's infrastructure cannot be independently verified.
				`),
				howToImprove: mdParagraph(
					"{{WALLET_NAME}} should ensure that key reconstruction always requires user-device participation, so key material never exists in full outside the user's security perimeter.",
				),
			})
	}

	return ctx.build({
		outcome: {
			id: 'keys_handling_pass',
			rating: Rating.PASS,
			displayName: 'Key material remains within user security perimeter',
			shortExplanation: sentence(
				"{{WALLET_NAME}} generates and handles key material on the user's device, keeping it within the user's security perimeter.",
			),
		},
		details: paragraph(
			"Key material is generated on the user's device and cannot be reconstructed outside it. At-rest security is governed by the local storage mechanism.",
		),
	})
}

export const securityBestPractices: Attribute<SecurityBestPracticesValue> = {
	id: 'securityBestPractices',
	icon: 'security_best_practices',
	displayName: 'Security best practices',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's security best practices evaluated?",
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do to improve its security best practices?',
		),
	},
	question: sentence(
		'Does {{WALLET_NAME}} follow security best practices for key storage, random number generation, deployment hardening, and passkey verification?',
	),
	why: markdown(`
		Poor key storage, weak entropy, lax deployment hardening, or
		insecure passkey verification each independently compromise a
		wallet's security, no matter how strong the other layers are.
	`),
	methodology: markdown(`
		Up to four sub-evaluations are scored; the worst determines the overall rating.

		- **Key storage**: Secure enclave or no on-device key = Pass; standardized KDF or OS sandbox = Partial; anything else = Fail.
		- **Secure RNG**: OS CSPRNG = Pass; unverified library RNG = Partial; unknown/insecure = Fail.
		- **Deployment hardening**: browser extension host permissions and \`web_accessible_resources\` scope; mobile app high-risk permission declarations.
		- **Passkey verification** (if supported): well-audited library = Pass; less-audited = Partial; none = Fail.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: false,
		pass: [
			exampleRating(
				mdParagraph(
					'(Browser extension) The extension stores keys in a hardware security module, uses an OS CSPRNG, requests minimal host permissions, and restricts web-accessible resources.',
				),
				evaluateBrowserExtension(
					EvaluationContext.forTest(() => securityBestPractices),
					{
						hostPermissions: HostPermissionScope.NONE,
						webAccessibleResources: WebAccessibleResourcesScope.NONE,
						contentScripts: HostPermissionScope.NONE,
						externallyConnectable: 'NOT_EXTERNALLY_CONNECTABLE',
						permissions: [],
					},
				),
			),
			exampleRating(
				mdParagraph(
					'(Mobile app) The app stores keys in a hardware security module, uses an OS CSPRNG, and declares only the OS permissions it needs.',
				),
				evaluateMobileApp(
					EvaluationContext.forTest(() => securityBestPractices),
					{
						android: { usesPermissions: [AndroidPermission.INTERNET, AndroidPermission.CAMERA] },
						ios: { usageDescriptions: [IosUsageDescription.CAMERA, IosUsageDescription.FACE_ID] },
					},
				),
			),
			exampleRating(
				mdParagraph(
					'(Desktop app) The app stores keys in a hardware security module and uses an OS CSPRNG.',
				),
				evaluateKeyStorage(
					EvaluationContext.forTest(() => securityBestPractices),
					KeyStorageMechanism.HARDWARE_SECURITY_MODULE,
				),
			),
		],
		partial: [
			exampleRating(
				mdParagraph(
					'(Browser extension) The extension uses a standardized KDF for key encryption and an OS CSPRNG, but its web-accessible resources are exposed to all HTTPS origins.',
				),
				evaluateBrowserExtension(
					EvaluationContext.forTest(() => securityBestPractices),
					{
						hostPermissions: HostPermissionScope.NONE,
						webAccessibleResources: WebAccessibleResourcesScope.HTTPS_ONLY,
						contentScripts: HostPermissionScope.NONE,
						externallyConnectable: 'NOT_EXTERNALLY_CONNECTABLE',
						permissions: [],
					},
				),
			),
			exampleRating(
				mdParagraph(
					'(Mobile app) The app encrypts keys with a user password using a standardized KDF and uses an OS CSPRNG, but does not use a hardware security module.',
				),
				evaluateKeyStorage(
					EvaluationContext.forTest(() => securityBestPractices),
					KeyStorageMechanism.ENCRYPTED_WITH_USER_SECRET_STANDARDIZED_KDF,
				),
			),
			exampleRating(
				mdParagraph(
					'(Desktop app) The app stores keys in OS-sandboxed storage and uses an OS CSPRNG, but does not use a hardware security module or secure enclave.',
				),
				evaluateKeyStorage(
					EvaluationContext.forTest(() => securityBestPractices),
					KeyStorageMechanism.OS_SANDBOXED_PLAINTEXT,
				),
			),
		],
		fail: [
			exampleRating(
				mdParagraph(
					'(Browser extension) The extension requests overbroad host permissions and exposes web-accessible resources to all origins.',
				),
				evaluateBrowserExtension(
					EvaluationContext.forTest(() => securityBestPractices),
					{
						hostPermissions: HostPermissionScope.HTTP_AND_HTTPS,
						webAccessibleResources: WebAccessibleResourcesScope.HTTP_AND_HTTPS,
						contentScripts: HostPermissionScope.NONE,
						externallyConnectable: 'NOT_EXTERNALLY_CONNECTABLE',
						permissions: [],
					},
				),
			),
			exampleRating(
				mdParagraph(
					'(Mobile app) The app requests high-risk OS permissions such as drawing over other apps.',
				),
				evaluateMobileApp(
					EvaluationContext.forTest(() => securityBestPractices),
					{
						android: {
							usesPermissions: [AndroidPermission.INTERNET, AndroidPermission.SYSTEM_ALERT_WINDOW],
						},
						ios: {
							usageDescriptions: [IosUsageDescription.CAMERA, IosUsageDescription.MICROPHONE],
						},
					},
				),
			),
			exampleRating(
				mdParagraph(
					'(Desktop app) The app derives keys using a weak, non-standard key derivation function.',
				),
				evaluateKeyStorage(
					EvaluationContext.forTest(() => securityBestPractices),
					KeyStorageMechanism.ENCRYPTED_WITH_USER_SECRET_WEAK_KDF,
				),
			),
			exampleRating(
				paragraph(
					'The wallet generates keys on external servers. Users cannot verify or control how that key material is stored at rest.',
				),
				evaluateKeysHandling(
					EvaluationContext.forTest(() => securityBestPractices),
					{
						keyGeneration: KeyGenerationLocation.FULLY_OFF_USER_DEVICE,
						multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
					},
				),
			),
			exampleRating(
				paragraph(
					"The wallet uses MPC but reconstructs the key on external servers, placing key material outside the user's security perimeter.",
				),
				evaluateKeysHandling(
					EvaluationContext.forTest(() => securityBestPractices),
					{
						keyGeneration: KeyGenerationLocation.MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE,
						multipartyKeyReconstruction:
							MultiPartyKeyReconstruction.MULTIPARTY_COMPUTED_WITHOUT_USER_DEVICE,
					},
				),
			),
			exampleRating(
				mdParagraph(
					'The wallet is closed-source. Security properties such as key storage, random number generation, and manifests cannot be independently verified.',
				),
				sourceNotAvailable(EvaluationContext.forTest(() => securityBestPractices)),
			),
		],
	},
	aggregate: aggregateVariantEvaluations<SecurityBestPracticesValue>,
	exempted: (
		ctx: EvaluationContext<SecurityBestPracticesValue>,
		_metadata: WalletMetadata,
	): ExemptEvaluation<SecurityBestPracticesValue> | null => {
		if (ctx.features.type === WalletType.HARDWARE) {
			return exempt(
				ctx,
				sentence(
					'Hardware wallets handle key security through dedicated physical security mechanisms.',
				),
			)
		}

		return null
	},
	evaluate: (
		ctx: EvaluationContext<SecurityBestPracticesValue>,
	): Evaluation<SecurityBestPracticesValue> => {
		ctx.setVerifiability(verifiabilityRequiresSourceCodeAccess({ coreOnlyIsSufficient: false }))

		const { securityBestPractices, keysHandling, passkeyVerification } = ctx.features.security

		if (securityBestPractices === null || keysHandling === null || passkeyVerification === null) {
			return unrated(ctx)
		}

		const { variant } = ctx.features
		const subEvaluations: Array<Evaluation<SecurityBestPracticesValue>> = []

		if (variant === Variant.BROWSER) {
			if (securityBestPractices.browser === 'NOT_A_BROWSER_EXTENSION') {
				return exempt(ctx, sentence('This wallet does not have a browser extension variant.'))
			}

			if (securityBestPractices.browser === 'SOURCE_NOT_AVAILABLE') {
				return sourceNotAvailable(ctx)
			}

			const browser = ctx.popRefs<BrowserSecurityBestPractices>(securityBestPractices.browser)

			subEvaluations.push(
				evaluateKeyStorage(ctx, browser.keyStorageMechanism),
				evaluateSecureRng(ctx, browser.secureRng),
				evaluateBrowserExtension(ctx, browser.browserExtensionHardening),
				evaluateContentScripts(ctx, browser.browserExtensionHardening),
				evaluateExternallyConnectable(ctx, browser.browserExtensionHardening),
				evaluateBrowserPermissions(ctx, browser.browserExtensionHardening),
			)
		}

		if (variant === Variant.MOBILE) {
			if (securityBestPractices.mobile === 'NOT_A_MOBILE_APP') {
				return exempt(ctx, sentence('This wallet does not have a mobile app variant.'))
			}

			if (securityBestPractices.mobile === 'SOURCE_NOT_AVAILABLE') {
				return sourceNotAvailable(ctx)
			}

			const mobile = ctx.popRefs<MobileSecurityBestPractices>(securityBestPractices.mobile)

			subEvaluations.push(
				evaluateKeyStorage(ctx, mobile.keyStorageMechanism),
				evaluateSecureRng(ctx, mobile.secureRng),
				evaluateMobileApp(ctx, mobile.mobileAppHardening),
			)
		}

		if (variant === Variant.DESKTOP) {
			if (securityBestPractices.desktop === 'NOT_A_DESKTOP_APP') {
				return exempt(ctx, sentence('This wallet does not have a desktop app variant.'))
			}

			if (securityBestPractices.desktop === 'SOURCE_NOT_AVAILABLE') {
				return sourceNotAvailable(ctx)
			}

			const desktop = ctx.popRefs<SecurityBestPracticesBase>(securityBestPractices.desktop)

			subEvaluations.push(
				evaluateKeyStorage(ctx, desktop.keyStorageMechanism),
				evaluateSecureRng(ctx, desktop.secureRng),
			)
		}

		ctx.addRef(keysHandling)
		subEvaluations.push(evaluateKeysHandling(ctx, keysHandling))

		if (isSupported(passkeyVerification)) {
			const passkeySupport = ctx.popRefs<PasskeyVerificationSupport>(passkeyVerification)

			subEvaluations.push(evaluatePasskeySubEval(ctx, passkeySupport))
		}

		if (!isNonEmptyArray(subEvaluations)) {
			return unrated(ctx)
		}

		return pickWorstRating(subEvaluations)
	},
}
