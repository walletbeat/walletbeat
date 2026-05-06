import type { Nullable } from '@/types/utils/nullable'

import type { MustRef, WithRef } from '../../reference'
import type { NotSupported, Support, Supported } from '../support'

/**
 * Whether the wallet has a publicly accessible changelog or release notes
 * stream. The reference is required when supported, since it IS the evidence.
 */
export type HasPublicChangelog = Support<MustRef<{}>>

/**
 * Whether the wallet's release builds are reproducible, i.e. the same source
 * revision and target can be rebuilt to produce bit-for-bit identical artifacts.
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
	| 'GITHUB_RELEASE'
	| 'SIGSTORE_REKOR'
	| 'ONCHAIN'
	| 'OTHER_PUBLIC'

/**
 * Artifact signing information for a wallet variant.
 *
 * Discriminated union ensures that `artifactSigner` and `signaturePublication`
 * are `null` when artifacts are not signed, making the invariant machine-checkable.
 */
export type ArtifactSigning =
	| {
			artifactsSigned: NotSupported
			artifactSigner: null
			signaturePublication: null
	  }
	| {
			artifactsSigned: Supported<WithRef<{}>>
			artifactSigner: ArtifactSignerType | null
			signaturePublication: SignaturePublicationType | null
	  }

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
 * Observable repository-level change controls for the wallet's source
 * repository. Each sub-field is independently researchable and may be `null`
 * until determined.
 */
export type RepositoryChangeControls = Nullable<
	WithRef<{
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
>
