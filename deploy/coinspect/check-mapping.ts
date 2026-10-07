import type { WalletSoftwareFeatures } from '@/schema/features'
import type { ScamAlerts } from '@/schema/features/security/scam-alerts'
import { notSupported } from '@/schema/features/support'
import type { VariantFeature } from '@/schema/variants'
import type { Nullable } from '@/types/utils/nullable'

/**
 * Explicit "do not import this score" marker.
 * The field stays null for that wallet.
 */
export const coinspectNoValue = { noValue: true } as const

/** A score that must be listed but does not become a feature value. */
export type CoinspectNoValue = typeof coinspectNoValue

/**
 * One Coinspect check translated into one self-contained Walletbeat feature.
 * `target` reads that field. `scores` lists every score the check can produce,
 * each as a value of the field's type or `coinspectNoValue`.
 */
export interface CoinspectMappedCheck<T> {
	target: (features: WalletSoftwareFeatures) => VariantFeature<T>
	scores: Readonly<Record<number, T | CoinspectNoValue>>
}

/**
 * One Coinspect check translated into one property of a `Nullable` feature
 * blob. `target` reads the blob, and `property` names the property the scores
 * fill. The other properties of the blob are left as they are.
 */
export interface CoinspectMappedProperty<F extends object, K extends keyof F> {
	target: (features: WalletSoftwareFeatures) => VariantFeature<Nullable<F>>
	property: K
	scores: Readonly<Record<number, F[K] | CoinspectNoValue>>
}

/** A check that is not imported, with the reason it cannot be translated. */
export interface CoinspectSkippedCheck {
	skip: true
	reason: string
}

/**
 * A classified check. Mapped rows are stored in this widened form so each
 * row can target a different feature type. Build a mapped row with
 * `mapCoinspectCheck` or `mapCoinspectProperty` so the value type stays tied
 * to `target`.
 */
export type CoinspectCheckRow =
	| CoinspectSkippedCheck
	| {
			target: (features: WalletSoftwareFeatures) => unknown
			scores: Readonly<Record<number, unknown>>
	  }
	| {
			target: (features: WalletSoftwareFeatures) => unknown
			property: PropertyKey
			scores: Readonly<Record<number, unknown>>
	  }

/** Wrap a mapped row so its score values match the target field's type. */
export function mapCoinspectCheck<T>(row: CoinspectMappedCheck<T>): CoinspectCheckRow {
	return row
}

/** Wrap a mapped row so its score values match the target property's type. */
export function mapCoinspectProperty<F extends object, K extends keyof F>(
	row: CoinspectMappedProperty<F, K>,
): CoinspectCheckRow {
	return row
}

function skip(reason: string): CoinspectSkippedCheck {
	return { skip: true, reason }
}

/**
 * Every Coinspect check id Walletbeat knows about, keyed by the full id
 * (platform suffix and version included).
 *
 * A row maps a check only when each score translates into one complete value
 * of one feature, or of one property inside a `Nullable` feature blob. Every
 * other check is a skip, and the reason names the feature that blocks the import.
 */
export const coinspectChecks = {
	'WSR-PERM-001.v1': skip(
		'Warns on a Sign-In with Ethereum domain mismatch. transactionLegibility.erc4361 is WithRef<Support> and records whether the request is presented, not whether a mismatched domain is warned about.',
	),
	'WSR-PERM-002~Browser.v1': skip(
		'Requires unlock before browser dApp requests and no leak while locked. duressResistance records unlock mechanisms and duress actions, not whether a locked wallet refuses RPC.',
	),
	'WSR-PERM-002~Mobile.v1': skip(
		'Requires unlock before mobile dApp requests and no leak while locked. duressResistance records unlock mechanisms and duress actions, not whether a locked wallet refuses RPC.',
	),
	'WSR-PERM-003.v1': skip(
		'Warns on an EIP-712 chainId mismatch. messageSigningLegibility records which EIP-712 parts are displayed (struct, hashes, digest), not whether a mismatched chainId is rejected.',
	),
	'WSR-PERM-004.v1': skip(
		'Lists and revokes connected dApps. privacy.appIsolation records which accounts are exposed, not a list-and-revoke control for connections.',
	),
	'WSR-PERM-005.v1': skip(
		'Lists and revokes token approvals. permissionsManagement.approvalsManagement splits that into erc20Approvals, erc721Approvals, and erc1155Approvals, and the check does not say which standard.',
	),
	'WSR-PERM-006.v1': skip(
		'Rejects eth_sign by default. No feature records which signing RPC methods are disabled. Message signing legibility records how signing data is displayed.',
	),
	'WSR-PERM-007~Mobile.v1': skip(
		'Requires confirmation for WalletConnect requests. appIsolation.erc7846WalletConnect records which accounts are exposed, not per-request confirmation.',
	),
	'WSR-PERM-008~Browser.v1': skip(
		'Requires connection approval before privileged RPC and leaks nothing. That is consent plus a leak fact. appIsolation records account exposure, not per-method consent.',
	),
	'WSR-PERM-009.v1': skip(
		'Requires confirmation before switching chains. chainConfigurability records custom RPC and chain settings, not a switch-confirmation prompt.',
	),
	'WSR-PERM-010~Browser.v1': skip(
		'Requires confirmation before each privileged browser RPC. No feature records per-method confirmation. appIsolation records which accounts a connection exposes.',
	),
	'WSR-PERM-010~Mobile.v1': skip(
		'Requires confirmation for embedded-browser RPC. No feature records embedded-browser request confirmation.',
	),
	'WSR-PHYS-001.v1': skip(
		'Limits seed-phrase clipboard exposure and, on mobile, screenshot risk. Those are two facts. securityBestPractices clipboard entries are extension host permissions, not seed-phrase copy warnings.',
	),
	'WSR-PHYS-002~Browser.v1': skip(
		'Requires a non-trivial password of at least 8 characters. duressResistance BasicUnlock.mechanisms records that a password exists, not its minimum length.',
	),
	'WSR-PHYS-002~Mobile.v1': skip(
		'Requires biometrics, and rate limiting when weak PINs are allowed. BasicUnlock.mechanisms records which unlock methods exist, not attempt rate limits.',
	),
	'WSR-PHYS-002.v1': skip(
		'Older id, without a platform suffix, still used by reports; checks.json replaced it with WSR-PHYS-002~Browser.v1 and WSR-PHYS-002~Mobile.v1. Same gap: no field for authentication strength.',
	),
	'WSR-PHYS-003.v1': skip(
		'Warns before revealing a seed phrase or private key. keysHandling records where the key is generated and how multiparty reconstruction works, not the reveal warning.',
	),
	'WSR-PHYS-004.v1': skip(
		'Offers a manual lock control. duressResistance covers unlock mechanisms and duress actions, not a lock button.',
	),
	'WSR-PHYS-005.v1': skip(
		'Requires authentication before showing a seed phrase or private key. keysHandling does not record the reveal flow.',
	),
	'WSR-PHYS-006~Browser.v1': skip(
		'Auto-locks after at most 20 minutes of inactivity. No feature records an auto-lock timeout.',
	),
	'WSR-PHYS-006~Mobile.v1': skip(
		'Auto-locks on inactivity, when the device locks, or when the app is in the background. One score covers three triggers, and no feature records auto-lock.',
	),
	'WSR-THRE-001.v1': skip(
		'Shows a trusted-dApp badge. scamAlerts.scamUrlWarning is a blob (leaksUserAddress, leaksUserIp, leaksVisitedUrl) about scam-site lookups, not a trust badge.',
	),
	'WSR-THRE-002.v1': skip(
		'Older id still used by reports; checks.json replaced it with WSR-THRE-002.v2. Same gap: scamAlerts.sendTransactionWarning needs addressPoisoningDetection, newRecipientWarning, userWhitelist, leaksRecipient, and the shared leak fields.',
	),
	'WSR-THRE-002.v2': skip(
		'Warns on a known-malicious address and a poisoned lookalike, with a partial score when only one is caught. sendTransactionWarning splits those facts across addressPoisoningDetection and other properties, and also needs leak fields this check does not observe.',
	),
	// A pass cannot be written: a supported scamUrlWarning must also say what
	// the lookup leaks (user address, IP, visited URL), which the check does not observe.
	'WSR-THRE-003.v1': mapCoinspectProperty<ScamAlerts, 'scamUrlWarning'>({
		target: features => features.security.scamAlerts,
		property: 'scamUrlWarning',
		scores: {
			100: coinspectNoValue,
			0: notSupported,
		},
	}),
	'WSR-THRE-004.v1': skip(
		'The connection dialog discloses balance, history, and signing access. That is three facts. appIsolation does not record connection-dialog copy.',
	),
	'WSR-THRE-005.v1': skip(
		'Warns on an unknown address. sendTransactionWarning.newRecipientWarning is one boolean in a blob that also requires addressPoisoningDetection, userWhitelist, leaksRecipient, and the shared leak fields.',
	),
	'WSR-THRE-006.v1': skip(
		'Shows the full dApp URL in the connection prompt. No feature records URL truncation there.',
	),
	'WSR-THRE-007.v1': skip(
		'Hides spam tokens and NFTs by default. scamAlerts covers URLs, contracts, sends, and unlimited approvals, not token-list filtering.',
	),
	'WSR-VERI-001.v1': skip(
		'Warns on an invalid EIP-55 checksum for typed and dApp-provided addresses. transactionDetailsDisplay records gas, nonce, from, to, chain, and value display, not checksum checks.',
	),
	'WSR-VERI-002.v1': skip(
		'Links addresses and transaction hashes to a block explorer in the preview and in history, with a partial score when only one context does. No feature records explorer links.',
	),
	'WSR-VERI-003.v1': skip(
		'Shows simulated inputs and outputs before signing. transactionLegibility.transactionSimulations is a per-benchmark record (outcomes, failure, nondeterminism), and this check does not fill those benchmarks.',
	),
	'WSR-VERI-004.v1': skip(
		'Renders EIP-712 signing data as a readable struct rather than raw JSON, and also passes when EIP-712 signing is not supported. For software wallets, messageSigningLegibility sits under erc8213 (an ERC-8213 support claim) and requires the domain hash, message hash, and digest keys too.',
	),
	'WSR-VERI-005.v1': skip(
		'Shows token, spender, and amount on an ERC-20 approval, however the wallet decodes it. erc7730 records decoding with ERC-7730 descriptors specifically, so a pass would claim ERC-7730 support the check does not test.',
	),
	'WSR-VERI-006.v1': skip(
		'Shows the full signing payload, including verifyingContract, without truncation, for every signing method. messageSigningLegibility does not record truncation or scrolling.',
	),
	'WSR-VERI-007.v1': skip(
		'Keeps the sign button disabled until the user scrolls the whole message. No feature records mandatory scroll-to-sign.',
	),
} satisfies Record<string, CoinspectCheckRow>

/** True when the row is an explicit skip. */
export function isSkippedCoinspectCheck(row: CoinspectCheckRow): row is CoinspectSkippedCheck {
	return 'skip' in row && row.skip
}
