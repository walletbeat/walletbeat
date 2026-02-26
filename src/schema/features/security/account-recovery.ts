import type { Entity, WalletDeveloper } from '@/schema/entity'
import type { WithRef } from '@/schema/reference'
import { isNonEmptyArray, type NonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'
import { markdownListFormat, trimWhitespacePrefix } from '@/types/utils/text'

import type { Support } from '../support'

/**
 * The type of a single guardian.
 *
 * Most guardian types cannot be verified through hands-on testing alone —
 * the wallet's official security/recovery documentation and source code are
 * the primary sources.
 */
export enum GuardianType {
	/**
	 * A self-custodied private key held by the user (outside this wallet).
	 * (e.g. The wallet lets the user designate another wallet or a
	 * separately-stored seed phrase as a recovery guardian.)
	 * To identify: look for a recovery option that asks the user to sign with
	 * an existing private key they already control, rather than creating a new one.
	 */
	SELF_CUSTODY = 'SELF_CUSTODY',

	/**
	 * The wallet's own login/encryption password, distinct from the seed phrase.
	 * (e.g. The wallet encrypts a recovery payload using the wallet password,
	 * so knowing the password is required to decrypt and recover.)
	 * To identify: the recovery documentation states that the wallet password
	 * is a required input for decrypting the recovery backup.
	 */
	WALLET_PASSWORD = 'WALLET_PASSWORD',

	/**
	 * A service operated by the wallet developer that holds a key share or
	 * recovery material on behalf of the user.
	 * (e.g. The wallet company's server stores one share of the recovery secret,
	 * making it a mandatory participant in recovery.)
	 * To identify: the wallet's architecture documentation describes a server-side
	 * component that holds cryptographic material needed for recovery. This is also
	 * often visible as a "required" dependency in the recovery flow — if the
	 * provider's service is unavailable, recovery fails.
	 */
	WALLET_PROVIDER = 'WALLET_PROVIDER',

	/**
	 * An external account owned by the user but unrelated to this wallet.
	 * (e.g. A Google account, Apple ID, email address, or a separate Ethereum
	 * address that the user designates as a recovery guardian.)
	 * To identify: visible in the recovery setup UI — the wallet asks the user
	 * to link or sign in with an external account to enable recovery.
	 */
	USER_EXTERNAL_ACCOUNT = 'USER_EXTERNAL_ACCOUNT',

	/**
	 * A passkey (device-bound or synced) used as a guardian.
	 * (e.g. The user's Face ID / Touch ID passkey stored in their device's
	 * secure enclave or a platform passkey manager.)
	 * To identify: the recovery setup UI offers a passkey/biometric registration
	 * step. Check if the passkey is device-bound or synced across devices.
	 */
	PASSKEY = 'PASSKEY',

	/**
	 * A zero-knowledge identity proof (e.g. zkPassport, Anon Aadhaar).
	 * To identify: the wallet documentation or recovery UI mentions a ZK-based
	 * identity scheme by name. Requires inspecting the source code or audits to
	 * confirm the specific scheme used.
	 */
	ZKID = 'ZKID',
}

/** A single guardian represented by a wallet password. */
export interface GuardianWalletPassword {
	type: GuardianType.WALLET_PASSWORD
}

/** A single guardian represented by a self-custodied private key. */
export interface GuardianSelfCustody {
	type: GuardianType.SELF_CUSTODY
}

/** A single guardian represented by a service provided by the wallet developer. */
export interface GuardianWalletProviderService {
	type: GuardianType.WALLET_PROVIDER
	entity: WalletDeveloper
	description: string
}

/** A single guardian represented by an account owned by the user, unrelated to the wallet. */
export interface GuardianUserExternalAccount {
	type: GuardianType.USER_EXTERNAL_ACCOUNT
	entity: Exclude<Entity, WalletDeveloper>
	description: string
}

/** A single guardian represented by a private key stored as a passkey. */
export interface GuardianPasskey {
	type: GuardianType.PASSKEY
}

/** A single guardian represented by a ZK ID scheme (zkPassport, Anon Aadhaar, etc.) . */
export interface GuardianZKID {
	type: GuardianType.ZKID
	id: string
	description: string
}

/** A single guardian within a broader multi-guardian setup. */
export type Guardian =
	| GuardianSelfCustody
	| GuardianWalletPassword
	| GuardianWalletProviderService
	| GuardianUserExternalAccount
	| GuardianPasskey
	| GuardianZKID

export function guardianId(guardian: Guardian): string {
	switch (guardian.type) {
		case GuardianType.SELF_CUSTODY:
			return 'SELF_CUSTODY'
		case GuardianType.WALLET_PASSWORD:
			return 'WALLET_PASSWORD'
		case GuardianType.USER_EXTERNAL_ACCOUNT:
			return `USER_EXTERNAL_ACCOUNT[${guardian.entity.id}]`
		case GuardianType.WALLET_PROVIDER:
			return `WALLET_PROVIDER[${guardian.entity.id}]`
		case GuardianType.PASSKEY:
			return 'PASSKEY'
		case GuardianType.ZKID:
			return `ZKID[${guardian.id}]`
	}
}

export function guardianMarkdown(guardian: Guardian): string {
	switch (guardian.type) {
		case GuardianType.SELF_CUSTODY:
			return "The user's self-custodied key material"
		case GuardianType.WALLET_PASSWORD:
			return "The user's wallet password"
		case GuardianType.USER_EXTERNAL_ACCOUNT:
			return `The user's ${guardian.description}`
		case GuardianType.WALLET_PROVIDER:
			return guardian.description
		case GuardianType.PASSKEY:
			return "The user's passkey device"
		case GuardianType.ZKID:
			return guardian.description
	}
}

/**
 * @returns Whether the given two guardians are the same.
 */
export function guardianEquals(guardian1: Guardian, guardian2: Guardian): boolean {
	const sameType = <G extends Guardian>(g1: G, g2: Guardian): g2 is G => {
		return g1.type === g2.type
	}

	switch (guardian1.type) {
		case GuardianType.ZKID:
			return (
				sameType<GuardianZKID>(guardian1, guardian2) &&
				guardian1.description === guardian2.description
			)
		case GuardianType.PASSKEY:
			return sameType<GuardianPasskey>(guardian1, guardian2)
		case GuardianType.WALLET_PASSWORD:
			return sameType<GuardianWalletPassword>(guardian1, guardian2)
		case GuardianType.SELF_CUSTODY:
			return sameType<GuardianSelfCustody>(guardian1, guardian2)
		case GuardianType.USER_EXTERNAL_ACCOUNT:
			return (
				sameType<GuardianUserExternalAccount>(guardian1, guardian2) &&
				guardian1.entity.id === guardian2.entity.id
			)
		case GuardianType.WALLET_PROVIDER:
			return (
				sameType<GuardianWalletProviderService>(guardian1, guardian2) &&
				guardian1.entity.id === guardian2.entity.id
			)
	}
}

/**
 * @returns whether the `needle` guardian is in `haystack`
 */
export function guardiansInclude(needle: Guardian, haystack: Guardian[]): boolean {
	return haystack.some(guardian => guardianEquals(guardian, needle))
}

/**
 * @returns The `Entity` in control of the `Guardian`, or null if not controlled by an `Entity`.
 */
export function guardianEntity(guardian: Guardian): Entity | null {
	switch (guardian.type) {
		case GuardianType.ZKID:
			return null
		case GuardianType.PASSKEY:
			return null
		case GuardianType.WALLET_PASSWORD:
			return null
		case GuardianType.SELF_CUSTODY:
			return null
		case GuardianType.USER_EXTERNAL_ACCOUNT:
			return guardian.entity
		case GuardianType.WALLET_PROVIDER:
			return guardian.entity
	}
}

/**
 * @returns The subset of `haystack` that depend on the `needle` entity.
 */
export function guardiansWithEntity(entity: Entity, guardians: Guardian[]): Guardian[] {
	return guardians.filter(guardian => {
		const ent = guardianEntity(guardian)

		return ent !== null && ent.id === entity.id
	})
}

/**
 * @returns The subset of `haystack` that depend on any of the the `needle` entities.
 */
export function guardiansWithEntities(entities: Entity[], guardians: Guardian[]): Guardian[] {
	return guardians.filter(guardian => {
		const ent = guardianEntity(guardian)

		return ent !== null && entities.some(entity => entity.id === ent.id)
	})
}

/**
 * Type of guardian configuration.
 *
 * To identify: read the wallet's recovery documentation or security audit.
 * Look for keywords — "secret sharing", "MPC", "Shamir" indicate
 * SECRET_SPLIT; "approve", "guardians", "timelock", "waiting period"
 * indicate K_OF_N_WITH_TIMELOCK.
 */
export enum GuardianPolicyType {
	/**
	 * A recovery secret (seed phrase or equivalent cryptographic material) is
	 * split into shares using a scheme like Shamir's Secret Sharing or MPC,
	 * and each share is distributed to a different guardian.
	 * Recovery requires collecting enough shares to reconstruct the secret.
	 *
	 * To identify: the wallet documentation mentions "key splitting", "MPC",
	 * "Shamir", or describes that recovery involves multiple parties each
	 * contributing a fragment of the key. Source code inspection can confirm.
	 */
	SECRET_SPLIT_ACROSS_GUARDIANS = 'SECRET_SPLIT_ACROSS_GUARDIANS',

	/**
	 * K out of N designated guardians must approve a recovery request,
	 * subject to a timelock delay that lets the legitimate owner cancel it.
	 * (e.g. The user sets up 3 guardians and requires 2 approvals, with a
	 * 3-day waiting period during which the owner can cancel a malicious recovery.)
	 * To identify: the wallet documentation describes "X of Y guardians must
	 * approve" and a "waiting period" or "timelock". Check the recovery smart
	 * contract for the actual threshold and delay values.
	 */
	K_OF_N_WITH_TIMELOCK = 'K_OF_N_WITH_TIMELOCK',
}

interface GuardianPolicyBase {
	type: GuardianPolicyType
	descriptionMarkdown: string
}

/**
 * A single specific configuration of guardians requiring K of N signatures
 * to perform a recovery action under a timelock.
 */
export type GuardianPolicySecretSplitAcrossGuardians = GuardianPolicyBase & {
	type: GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS

	/**
	 * Which guardians are **required** to participate — without them,
	 * recovery is cryptographically impossible regardless of other guardians.
	 * (e.g. If a wallet provider's server holds one required share and that
	 * service goes offline, the user cannot recover even with all optional
	 * guardians present.)
	 * To identify: determine which parties hold shares that cannot be
	 * substituted. A wallet provider holding the sole copy of a required
	 * share is a required guardian. Check the security documentation or
	 * source code for single points of failure in the recovery scheme.
	 */
	requiredGuardians: Guardian[]

	/**
	 * Which guardians the user can optionally configure; some minimum number
	 * of these must cooperate for recovery to succeed.
	 * To identify: the recovery setup UI lists these as choices (e.g.
	 * "Set up recovery with Google and/or Apple").
	 */
	optionalGuardians: Guardian[]

	/**
	 * Minimum number of optional guardians the user must configure during setup.
	 * (e.g. `1` means the user must set up at least one optional guardian,
	 * but they choose which one(s).)
	 * To identify: go through the recovery setup flow and note how many
	 * optional guardians must be configured before setup is complete.
	 */
	optionalGuardiansMinimumConfigurable: number

	/**
	 * Minimum number of optional guardians that must cooperate at recovery time.
	 * May differ from `optionalGuardiansMinimumConfigurable` if the wallet
	 * requires setting up more guardians than strictly needed for recovery.
	 * To identify: check the recovery documentation for "how many guardians
	 * do you need to recover?" vs "how many must you configure?".
	 */
	optionalGuardiansMinimumNeededForRecovery: number

	/**
	 * Where is the secret reassembled from its shares?
	 * `CLIENT_SIDE`: the shares are combined entirely on the user's device;
	 * the full key never passes through any server.
	 * An `Entity`: the shares are sent to that entity's infrastructure
	 * for server-side reconstruction.
	 * To identify: this is NOT visible in the UI — check the wallet's
	 * security documentation for explicit claims ("key never leaves your device"),
	 * or inspect the source code for where share combination occurs.
	 * Server-side reconstruction is typically visible as an API call that
	 * receives multiple shares and returns the full key or a derived secret.
	 */
	secretReconstitution: 'CLIENT_SIDE' | Entity
}

/**
 * A single specific configuration of guardians requiring K of N signatures
 * to perform a recovery action under a timelock.
 */
export type GuardianPolicyKOfNWithTimelocks = GuardianPolicyBase & {
	type: GuardianPolicyType.K_OF_N_WITH_TIMELOCK

	/**
	 * The full list of configured guardians, each with equal voting weight.
	 * To identify: check the wallet's recovery UI for the list of guardian
	 * types the user can designate (e.g. a hardware wallet, a trusted friend's
	 * address, or the wallet provider's service).
	 */
	configuredGuardians: NonEmptyArray<Guardian>

	/**
	 * Which guardians are **required** to approve — without their signature,
	 * recovery cannot proceed regardless of how many optional guardians sign.
	 * (e.g. The wallet provider must co-sign every recovery request.)
	 * To identify: check the recovery smart contract or documentation for
	 * any mandatory co-signer that cannot be removed or substituted.
	 */
	requiredGuardians: Guardian[]

	/**
	 * Which entities are responsible for notifying the user when a recovery
	 * request has been initiated (during the timelock period).
	 * (e.g. The wallet provider sends an email/push notification so the
	 * legitimate owner can cancel a malicious recovery attempt.)
	 * To identify: check the wallet's security documentation or the recovery
	 * smart contract for event listeners and notification infrastructure.
	 */
	timelockWarningSentByAllOf: NonEmptyArray<Entity>

	/**
	 * Minimum number of guardian signatures needed for a recovery that
	 * goes through the full timelock delay.
	 * To identify: check the recovery smart contract or documentation for
	 * the guardian threshold. This is the K in "K of N".
	 */
	minimumSignaturesWithTimelock: number

	/**
	 * Minimum number of guardian signatures needed to bypass the timelock
	 * and recover immediately (typically a higher threshold).
	 * To identify: check if the recovery contract supports an "emergency
	 * recovery" path with a higher guardian threshold that skips the delay.
	 * If no bypass exists, this value equals `minimumSignaturesWithTimelock`.
	 */
	minimumSignaturesBypassTimelock: number
}

/** A single specific configuration of guardians. */
export type GuardianPolicy =
	| GuardianPolicySecretSplitAcrossGuardians
	| GuardianPolicyKOfNWithTimelocks

export function guardianPolicyMarkdown(guardianPolicy: GuardianPolicy): string {
	switch (guardianPolicy.type) {
		case GuardianPolicyType.K_OF_N_WITH_TIMELOCK:
			throw new Error('Not implemented yet')
		case GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS:
			return trimWhitespacePrefix(
				((): string => {
					const components: string[] = []

					if (isNonEmptyArray(guardianPolicy.requiredGuardians)) {
						const reqGuardians = nonEmptyMap(guardianPolicy.requiredGuardians, guardianMarkdown)

						components.push(
							trimWhitespacePrefix(`
							The recovery process **critically depends** on ${markdownListFormat(reqGuardians, {
								ifEmpty: { behavior: 'THROW_ERROR' },
								singleItemTemplate: 'ITEM.',
								uppercaseFirstCharacterOfListItems: true,
								multiItemPrefix: `the following:
							`,
								multiItemTemplate: `
							- ITEM`,
								multiItemSuffix: `

							`,
							})}
						`),
						)
					}

					const optGuardians = guardianPolicy.optionalGuardians.map(guardianMarkdown)

					components.push(
						trimWhitespacePrefix(`
						The recovery process requires setting up recovery with at least ${guardianPolicy.optionalGuardiansMinimumConfigurable.toString()} of the following:${markdownListFormat(
							optGuardians,
							{
								ifEmpty: { behavior: 'THROW_ERROR' },
								singleItemTemplate: 'ITEM.',
								uppercaseFirstCharacterOfListItems: true,
								multiItemPrefix: `
						`,
								multiItemTemplate: `
						- ITEM`,
								multiItemSuffix: `

						`,
							},
						)}
					`),
					)

					if (
						guardianPolicy.optionalGuardiansMinimumConfigurable !==
						guardianPolicy.optionalGuardiansMinimumNeededForRecovery
					) {
						components.push(
							`At least ${guardianPolicy.optionalGuardiansMinimumNeededForRecovery.toString()} of the above are required for recovery.`,
						)
					}

					components.push(
						trimWhitespacePrefix(`
							For evaluation purposes, Walletbeat assumes the user will use
							the policy requiring the _least amount of effort_ that the
							wallet allows, i.e.
							${guardianPolicy.optionalGuardiansMinimumConfigurable === 1 ? 'a single recovery guardian' : `${guardianPolicy.optionalGuardiansMinimumConfigurable.toString()} recovery guardians`}.
						`),
					)

					if (guardianPolicy.secretReconstitution === 'CLIENT_SIDE') {
						components.push('The key is reconstituted **client-side**.')
					} else {
						components.push(
							`The key is reconstituted on infrastructure **owned by ${guardianPolicy.secretReconstitution.name}**.`,
						)
					}

					return components.join('\n')
				})(),
			)
	}
}

/**
 * For wallets supporting social recovery (guardian-based), what policy does
 * it use for the guardians?
 */
export interface GuardianRecovery {
	/**
	 * The *minimum* guardian policy the wallet requires the user to configure.
	 * "Minimum" means the least-effort setup the wallet allows — e.g. if the
	 * wallet lets the user configure just one optional guardian, that is the
	 * minimum even if more are possible.
	 * To identify: go through the wallet's recovery setup flow with the fewest
	 * possible steps and record the resulting guardian configuration.
	 */
	minimumGuardianPolicy: GuardianPolicy
}

/**
 * How the wallet makes it possible for the user to recover their account.
 *
 * Note: account recovery features generally cannot be fully verified through
 * hands-on testing without deliberately losing access to a wallet.
 * Use the following approach instead:
 *   1. Walk through the wallet's recovery/backup settings UI to see what
 *      options are presented to the user.
 *   2. Read the wallet's official security or recovery documentation for
 *      the high-level policy (guardian types, thresholds, timelocks).
 *   3. Inspect the wallet's source code or published security audits for
 *      technical details that are not visible in the UI (e.g. where the
 *      recovery secret is reconstituted, or smart contract thresholds).
 */
export interface AccountRecovery {
	/**
	 * If the wallet supports "social recovery" (guardian-based), what policy
	 * does it use for the guardians?
	 * To identify: look for a "Recovery", "Backup", or "Guardian" section in
	 * the wallet's security settings. If no such feature exists, set to not
	 * supported. If it exists, fill in `GuardianRecovery` using the wallet's
	 * documentation and source code as described above.
	 */
	guardianRecovery: Support<WithRef<GuardianRecovery>>
}
