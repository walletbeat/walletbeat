import type { MustRef, WithRef } from '../../reference'
import type { Support } from '../support'

/**
 * Whether the wallet has a publicly accessible changelog or release notes
 * stream. The reference is required when supported, since it IS the evidence.
 */
export type HasPublicChangelog = Support<MustRef<{}>>

/**
 * Whether the wallet's release builds are reproducible, i.e. the same source
 * revision and target can be rebuilt to produce bit-for-bit identical artifacts
 * by an independent party.
 */
export type ReproducibleBuilds = Support<WithRef<{}>>

/**
 * Whether the wallet's release builds are hermetic, i.e. the build can run
 * fully offline from a complete, integrity-verified input set gathered in a
 * prior dependency-fetch phase.
 */
export type HermeticBuilds = Support<WithRef<{}>>

/** Which key or identity class signs release artifacts. */
export type ArtifactSignerType = 'DEVELOPER_KEY' | 'BUILD_INFRA_IDENTITY' | 'BOTH' | 'UNKNOWN'

/** Where signatures or attestations for release artifacts are published. */
export type SignaturePublicationType =
	'GITHUB_RELEASE' | 'SIGSTORE_REKOR' | 'ONCHAIN' | 'OTHER_PUBLIC'

/** Signer and publication metadata for artifact signing (without reference). */
export type ArtifactSigningPayload = {
	signer: ArtifactSignerType
	publication: SignaturePublicationType
}

/**
 * Artifact signing information for a wallet variant when signing is supported.
 *
 * In wallet feature data, use `Support<WithRef<Nullable<ArtifactSigningPayload>>>`
 * (see `WalletBaseFeatures`) so `ref`, `signer`, or `publication` may be `null`
 * while research is in progress — matching `chainConfigurability`.
 *
 * During resolution, this feature is normalized all-or-nothing: if any field
 * remains unknown on a supported payload, the resolved value becomes `null`.
 */
export type ArtifactSigningDetails = WithRef<ArtifactSigningPayload>

export type ArtifactSigning = Support<ArtifactSigningDetails>

/**
 * Whether the wallet's release builds enforce a lockfile (or equivalent)
 * for locked dependency resolution.
 */
export type DependencyLocking = Support<WithRef<{}>>

/**
 * Whether dependency vulnerability scanning is configured in CI/release
 * workflows for the wallet.
 */
export type DependencyVulnerabilityScanning = Support<WithRef<{}>>

/**
 * Whether the wallet's release builds isolate external dependencies from
 * each other and from the wallet's own code at runtime (e.g. via LavaMoat
 * policies enforced with SES compartments), so that a compromised dependency
 * cannot reach code or globals beyond what its policy grants.
 */
export type DependencySandboxing = Support<WithRef<{}>>

/**
 * Whether a repository change control is in place, and whether that can be
 * checked publicly.
 * A `null` value means the control has not been looked into yet.
 */
export enum RepositoryChangeControlState {
	/**
	 * The control is in place, and anyone can check this.
	 * (e.g. A GitHub ruleset that is visible on the repository's public
	 * rules page or rulesets API.)
	 */
	VERIFIABLY_PRESENT = 'VERIFIABLY_PRESENT',

	/**
	 * The control is not in place, and anyone can check this.
	 * (e.g. The public rulesets do not include it, and the public branch API
	 * shows no classic branch protection providing it.)
	 */
	VERIFIABLY_ABSENT = 'VERIFIABLY_ABSENT',

	/**
	 * The wallet developer states that the control is in place, but this
	 * cannot be checked publicly.
	 * (e.g. A classic branch protection rule, which only repository admins
	 * can see.)
	 */
	CLAIMED_PRESENT = 'CLAIMED_PRESENT',

	/**
	 * The wallet developer states that the control is not in place.
	 * This cannot be checked publicly, but a developer has no incentive to
	 * claim not to have a control, so it is as strong as `VERIFIABLY_ABSENT`.
	 */
	CLAIMED_ABSENT = 'CLAIMED_ABSENT',

	/**
	 * The wallet developer makes no statement either way, and whether the
	 * control is in place cannot be checked publicly.
	 */
	UNVERIFIABLE = 'UNVERIFIABLE',
}

/**
 * Observable repository-level change controls for the wallet's source
 * repository.
 */
export type RepositoryChangeControls = WithRef<{
	/** Whether protected branch rules require an approving review before merge. */
	requiredReview: RepositoryChangeControlState
	/** Whether protected branch rules require status checks to pass before merge. */
	requiredChecks: RepositoryChangeControlState
	/** Whether force-push is blocked on protected branches. */
	forcePushBlocked: RepositoryChangeControlState
	/** Whether deletion is blocked on protected branches. */
	branchDeletionBlocked: RepositoryChangeControlState
	/** Whether release tags are protected / immutable. */
	tagsImmutable: RepositoryChangeControlState
}>
