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
 * Whether routine dependency updates only pick up dependency releases that
 * are at least a minimum age, so that a compromised release has time to be
 * detected and pulled before the wallet adopts it. One-off updates for
 * security fixes may bypass the minimum age.
 *
 * To test: look in the wallet's source repository for a minimum release age
 * setting, e.g. `minimumReleaseAge` in `pnpm-workspace.yaml`, `.npmrc` or a
 * Renovate config, `npmMinimalAgeGate` in `.yarnrc.yml`, or `cooldown` in
 * `.github/dependabot.yml`. Set to `notSupported` if routine updates have no
 * minimum age.
 */
export type DependencyAgeGate = Support<
	WithRef<{
		/** Minimum age, in days, of a dependency release before routine updates adopt it. */
		minimumAgeDays: number
	}>
>

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
 * Observable repository-level change controls for the wallet's source
 * repository.
 */
export type RepositoryChangeControls = WithRef<{
	/** Whether protected branch rules require an approving review before merge. */
	requiredReview: boolean
	/** Whether protected branch rules require status checks to pass before merge. */
	requiredChecks: boolean
	/** Whether force-push is blocked on protected branches. */
	forcePushBlocked: boolean
	/** Whether deletion is blocked on protected branches. */
	branchDeletionBlocked: boolean
	/** Whether release tags are protected / immutable. */
	tagsImmutable: boolean
}>
