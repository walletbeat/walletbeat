import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	type ExemptEvaluation,
	Rating,
	type Value,
} from '@/schema/attributes'
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
import { type AtLeastOneVariant } from '@/schema/variants'
import { verifiabilityRequiresSourceCodeAccess } from '@/schema/verifiability'
import type { WalletMetadata } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'
import { markdown, mdParagraph, mdSentence, paragraph, sentence } from '@/types/content'
import { isNonEmptyArray } from '@/types/utils/non-empty'

import { exempt, pickWorstRating, unrated } from '../common'

export type SecurityBestPracticesValue = Value

function keyStoragePass(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
	mechanism: KeyStorageMechanism.HARDWARE_SECURITY_MODULE | KeyStorageMechanism.PASSKEY_MANAGED,
): Evaluation<SecurityBestPracticesValue> {
	const mechanismLabel =
		mechanism === KeyStorageMechanism.PASSKEY_MANAGED
			? 'No private key is stored, the wallet uses passkey-managed accounts.'
			: 'Keys are stored in a hardware security module or secure enclave.'

	return ctx.build({
		value: {
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
		value: {
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
		value: {
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
				value: {
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
				value: {
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
		default:
			return ctx.build({
				value: {
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
				value: {
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
				value: {
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
				value: {
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
			value: {
				id: 'externally_connectable_pass',
				rating: Rating.PASS,
				displayName: 'No external message connections',
				shortExplanation: mdSentence(
					'{{WALLET_NAME}} does not expose a direct message channel to web pages or other extensions.',
				),
			},
			details: paragraph(
				'{{WALLET_NAME}} does not declare externally_connectable, so no web page or external extension can send it messages directly.',
			),
		})
	}

	const { extensionIds, pageMatches } = manifest.externallyConnectable

	if (
		extensionIds === ExternalExtensionIdScope.ANY ||
		pageMatches === HostPermissionScope.UNRESTRICTED
	) {
		return ctx.build({
			value: {
				id: 'externally_connectable_fail',
				rating: Rating.FAIL,
				displayName: 'Unrestricted external message connections',
				shortExplanation: mdSentence(
					'{{WALLET_NAME}} allows any extension or web page to send it wallet messages directly.',
				),
			},
			details: paragraph(
				`{{WALLET_NAME}}'s externally_connectable is open to ${
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
			value: {
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
		value: {
			id: 'externally_connectable_pass',
			rating: Rating.PASS,
			displayName: 'Restricted external message connections',
			shortExplanation: mdSentence(
				'{{WALLET_NAME}} restricts external message connections to specific trusted extensions and HTTPS pages.',
			),
		},
		details: paragraph(
			'{{WALLET_NAME}} restricts externally_connectable to specific named extension IDs and HTTPS origins, limiting who can send it direct messages.',
		),
	})
}

const failBrowserPermissions: BrowserExtensionPermission[] = [
	// Attaches the Chrome DevTools protocol to any tab, full read/write access to page content.
	BrowserExtensionPermission.DEBUGGER,
	// Can delete history, cookies, and cached data, destructive and privacy-invasive.
	BrowserExtensionPermission.BROWSING_DATA,
	// Full read access to the user's browsing history.
	BrowserExtensionPermission.HISTORY,
	// Can list, enable, disable, or uninstall other extensions.
	BrowserExtensionPermission.MANAGEMENT,
	// Can reroute all browser network traffic through an attacker-controlled proxy.
	BrowserExtensionPermission.PROXY,
	// Allows registering arbitrary user-supplied scripts that run in web pages.
	BrowserExtensionPermission.USER_SCRIPTS,
	// Intercepts WebAuthn requests, can impersonate hardware security keys.
	BrowserExtensionPermission.WEB_AUTHENTICATION_PROXY,
	// Captures the screen, a window, or a tab as a media stream.
	BrowserExtensionPermission.DESKTOP_CAPTURE,
]

const partialBrowserPermissions: BrowserExtensionPermission[] = [
	// Legitimate for hardware wallet communication but opens a native OS code execution channel.
	BrowserExtensionPermission.NATIVE_MESSAGING,
	// Reads clipboard contents without a user gesture.
	BrowserExtensionPermission.CLIPBOARD_READ,
	// Can synchronously block or modify all HTTP/S requests.
	BrowserExtensionPermission.WEB_REQUEST_BLOCKING,
	// Reads and modifies browser-wide privacy settings.
	BrowserExtensionPermission.PRIVACY,
	// Saves a full MHTML snapshot of any tab.
	BrowserExtensionPermission.PAGE_CAPTURE,
]

function evaluateBrowserPermissions(
	ctx: EvaluationContext<SecurityBestPracticesValue>,
	manifest: BrowserExtensionManifest,
): Evaluation<SecurityBestPracticesValue> {
	const badFail = manifest.permissions.filter(p => failBrowserPermissions.includes(p))
	const badPartial = manifest.permissions.filter(p => partialBrowserPermissions.includes(p))

	if (badFail.length > 0) {
		return ctx.build({
			value: {
				id: 'browser_permissions_fail',
				rating: Rating.FAIL,
				displayName: 'Dangerous browser permissions declared',
				shortExplanation: mdSentence(
					'{{WALLET_NAME}} declares browser permissions that are not necessary for a wallet and introduce serious risks.',
				),
			},
			details: paragraph(
				`{{WALLET_NAME}} declares the following high-risk browser permissions that are not required for wallet functionality: ${badFail.join(', ')}.`,
			),
			howToImprove: mdParagraph(
				`{{WALLET_NAME}} should remove these permissions from its manifest: ${badFail.map(p => `\`${p}\``).join(', ')}.`,
			),
		})
	}

	if (badPartial.length > 0) {
		return ctx.build({
			value: {
				id: 'browser_permissions_partial',
				rating: Rating.PARTIAL,
				displayName: 'Risky browser permissions declared',
				shortExplanation: mdSentence(
					'{{WALLET_NAME}} declares browser permissions that carry elevated risk for a wallet.',
				),
			},
			details: paragraph(
				`{{WALLET_NAME}} declares the following elevated-risk browser permissions: ${badPartial.join(', ')}.`,
			),
			howToImprove: mdParagraph(
				`{{WALLET_NAME}} should evaluate whether these permissions are strictly necessary and remove any that are not: ${badPartial.map(p => `\`${p}\``).join(', ')}.`,
			),
		})
	}

	return ctx.build({
		value: {
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
			value: {
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
			value: {
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
		value: {
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

const unnecessaryAndroidPermissions = [
	// Allows drawing overlays over other apps, can be used to phish seed phrases or intercept transaction confirmations.
	AndroidPermission.SYSTEM_ALERT_WINDOW,
	// Microphone access enables covert audio recording of sensitive conversations.
	AndroidPermission.RECORD_AUDIO,
	// Precise location data can be used to profile and deanonymize users.
	AndroidPermission.ACCESS_FINE_LOCATION,
	// Modifying audio settings can be abused to suppress security alerts or notifications.
	AndroidPermission.MODIFY_AUDIO_SETTINGS,
]

const unnecessaryIosPermissions = [
	// Microphone access enables covert audio recording of sensitive conversations.
	IosUsageDescription.MICROPHONE,
	// Precise location data can be used to profile and deanonymize users.
	IosUsageDescription.LOCATION_WHEN_IN_USE,
	// Read access to the full photo library is a privacy risk.
	IosUsageDescription.PHOTO_LIBRARY,
	// Always-on Bluetooth enables passive device tracking and proximity-based attacks.
	IosUsageDescription.BLUETOOTH_ALWAYS,
	// Legacy Bluetooth peripheral access exposes the device to Bluetooth-based exploitation.
	IosUsageDescription.BLUETOOTH_PERIPHERAL,
]

function getUnnecessaryPermissionLists(manifest: MobileAppManifest): {
	androidList: string
	iosList: string
} {
	const badAndroid =
		manifest.android === 'NOT_AN_ANDROID_APP'
			? []
			: manifest.android.usesPermissions.filter(p => unnecessaryAndroidPermissions.includes(p))
	const badIos =
		manifest.ios === 'NOT_AN_IOS_APP'
			? []
			: manifest.ios.usageDescriptions.filter(p => unnecessaryIosPermissions.includes(p))

	return {
		androidList: badAndroid.map(p => p.replace('android.permission.', '')).join(', '),
		iosList: badIos.join(', '),
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
			value: {
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
		value: {
			id: 'mobile_app_fail',
			rating: Rating.FAIL,
			displayName: 'Mobile app requests high-risk permissions',
			shortExplanation: mdSentence(
				'{{WALLET_NAME}} requests high-risk OS permissions that are not necessary for a wallet.',
			),
		},
		details: paragraph(
			`{{WALLET_NAME}}'s mobile app declares high-risk OS permissions not required for wallet functionality, increasing the attack surface.${androidList.length > 0 ? ` Unnecessary Android permissions: ${androidList}.` : ''}${iosList.length > 0 ? ` Unnecessary iOS permissions: ${iosList}.` : ''}`,
		),
		howToImprove: mdParagraph(
			`{{WALLET_NAME}} should remove the unnecessary permissions from its manifests.${androidList.length > 0 ? ` Android (\`AndroidManifest.xml\`): ${androidList}.` : ''}${iosList.length > 0 ? ` iOS (\`Info.plist\`): ${iosList}.` : ''}`,
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
				value: {
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
				value: {
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
				value: {
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

export const securityBestPractices: Attribute<SecurityBestPracticesValue> = {
	id: 'securityBestPractices',
	icon: '\u{1f510}', // Locked with key
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
					'(Mobile app) The app requests high-risk OS permissions such as draw-over-other-apps.',
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
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<SecurityBestPracticesValue>>) =>
		pickWorstRating<SecurityBestPracticesValue>(perVariant),
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
				null,
			)
		}

		return null
	},
	evaluate: (
		ctx: EvaluationContext<SecurityBestPracticesValue>,
	): Evaluation<SecurityBestPracticesValue> => {
		ctx.setVerifiability(verifiabilityRequiresSourceCodeAccess({ coreOnlyIsSufficient: false }))

		const feature = ctx.features.security.securityBestPractices

		if (feature === null) {
			return unrated(ctx, null)
		}

		const subEvaluations: Array<Evaluation<SecurityBestPracticesValue>> = []

		if (feature.browser !== 'NOT_A_BROWSER_EXTENSION') {
			const browser = ctx.popRefs<BrowserSecurityBestPractices>(feature.browser)

			subEvaluations.push(
				evaluateKeyStorage(ctx, browser.keyStorageMechanism),
				evaluateSecureRng(ctx, browser.secureRng),
				evaluateBrowserExtension(ctx, browser.browserExtensionHardening),
				evaluateContentScripts(ctx, browser.browserExtensionHardening),
				evaluateExternallyConnectable(ctx, browser.browserExtensionHardening),
				evaluateBrowserPermissions(ctx, browser.browserExtensionHardening),
			)
		}

		if (feature.mobile !== 'NOT_A_MOBILE_APP') {
			const mobile = ctx.popRefs<MobileSecurityBestPractices>(feature.mobile)

			subEvaluations.push(
				evaluateKeyStorage(ctx, mobile.keyStorageMechanism),
				evaluateSecureRng(ctx, mobile.secureRng),
				evaluateMobileApp(ctx, mobile.mobileAppHardening),
			)
		}

		if (feature.desktop !== 'NOT_A_DESKTOP_APP') {
			const desktop = ctx.popRefs<SecurityBestPracticesBase>(feature.desktop)

			subEvaluations.push(
				evaluateKeyStorage(ctx, desktop.keyStorageMechanism),
				evaluateSecureRng(ctx, desktop.secureRng),
			)
		}

		if (!isNonEmptyArray(subEvaluations)) {
			return unrated(ctx, null)
		}

		const passkeyVerification = ctx.features.security.passkeyVerification

		if (passkeyVerification !== null && isSupported(passkeyVerification)) {
			const passkeySupport = ctx.popRefs<PasskeyVerificationSupport>(passkeyVerification)

			subEvaluations.push(evaluatePasskeySubEval(ctx, passkeySupport))
		}

		return pickWorstRating<SecurityBestPracticesValue>(subEvaluations)
	},
}
