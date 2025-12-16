import type { Entity, WalletDeveloper } from '@/schema/entity'
import type { WithRef } from '@/schema/reference'
import { isNonEmptyArray, type NonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'
import { markdownListFormat, trimWhitespacePrefix } from '@/types/utils/text'

import type { Support } from '../support'

/** The type of a single guardian. */
export enum GuardianType {
	/** A self-custodied private key. */
	SELF_CUSTODY = 'SELF_CUSTODY',

	/** A wallet password which is unrelated to the user's self-custodied private key. */
	WALLET_PASSWORD = 'WALLET_PASSWORD',

	/** A service provided by the wallet developer. */
	WALLET_PROVIDER = 'WALLET_PROVIDER',

	/** An account owned by the user, unrelated to the wallet. */
	USER_EXTERNAL_ACCOUNT = 'USER_EXTERNAL_ACCOUNT',

	/** A private key stored as a passkey. */
	PASSKEY = 'PASSKEY',

	/** A ZK ID scheme (zkPassport, Anon Aadhaar, etc.) */
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

/** Type of guardian configuration. */
export enum GuardianPolicyType {
	/**
	 * A recovery secret (seedphrase or other cryptographic material sufficient
	 * to perform recovery) is split into shares, and then the shares are spread
	 * across guardians.
	 */
	SECRET_SPLIT_ACROSS_GUARDIANS = 'SECRET_SPLIT_ACROSS_GUARDIANS',

	/** K of N guardians required to perform recovery under timelock. */
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
	 * Which guardians are **required** to participate in the recovery procedure?
	 * For example, if the account recovery secret is stored on a particular provider and
	 * nowhere else, the entity storing the recovery secret is required to participate for
	 * the recovery to succeed.
	 */
	requiredGuardians: Guardian[]

	/**
	 * Which guardians **may** be needed to participate in the recovery procedure?
	 */
	optionalGuardians: Guardian[]

	/**
	 * Minimum number of guardians from `optionalGuardians`
	 * that the user is required to set up.
	 */
	optionalGuardiansMinimumConfigurable: number

	/**
	 * Minimum number of guardians from `optionalGuardians`
	 * that need to cooperate in order to perform account recovery.
	 */
	optionalGuardiansMinimumNeededForRecovery: number

	/**
	 * Where is the secret reconstituted?
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
	 * What are the configured guardians?
	 * Each guardian is assumed to have identical weight.
	 */
	configuredGuardians: NonEmptyArray<Guardian>

	/**
	 * Which specific guardians are **required** to participate in the recovery procedure?
	 * For example, if the account recovery secret is stored on a particular provider and
	 * nowhere else, the entity storing the recovery secret is required to participate for
	 * the recovery to succeed.
	 */
	requiredGuardians: Guardian[]

	/** Who is responsible for sending timelock warnings to the user? */
	timelockWarningSentByAllOf: NonEmptyArray<Entity>

	/**
	 * What is the minimum number of signatures needed to perform a recovery
	 * action that requires timelock?
	 */
	minimumSignaturesWithTimelock: number

	/** What is the minimum number of signatures needed to perform a recovery
	 * action that bypasses timelock?
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
	 * What is the *minimum* policy that the wallet requires the user to set up?
	 */
	minimumGuardianPolicy: GuardianPolicy
}

/**
 * How the wallet makes it possible for the user to recover their account.
 */
export interface AccountRecovery {
	/**
	 * If the wallet supports "social recovery" (guardian-based), what policy
	 * does it use for the guardians?
	 */
	guardianRecovery: Support<WithRef<GuardianRecovery>>
}
