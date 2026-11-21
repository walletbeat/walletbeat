import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	Rating,
	Verifiability,
} from '@/schema/attributes'
import { isSupported } from '@/schema/features/support'
import { isSourcePubliclyVisible } from '@/schema/features/transparency/license'
import {
	isRepositoryChangeControlPresent,
	type RepositoryChangeControl,
	RepositoryChangeControlState,
} from '@/schema/features/transparency/release-transparency'
import { verifiabilityRequiresSourceCodeAccess } from '@/schema/verifiability'
import type { WalletMetadata } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'
import { commaListFormat } from '@/types/utils/text'

import { exempt, pickWorstRating, unrated } from '../common'

type AdvancedGroupLevel = 'fail' | 'partial' | 'pass'

type BasicSignals = {
	changelog: boolean
	locking: boolean
	/**
	 * Labels of the repository change controls that are not in place,
	 * or `null` if the controls have not been assessed.
	 */
	missingChangeControls: string[] | null
	pass: boolean
}

type AdvancedSignals = {
	signing: boolean
	builds: boolean
	level: AdvancedGroupLevel
}

type BasicSignalPresence = Pick<BasicSignals, 'changelog' | 'locking' | 'missingChangeControls'>
type AdvancedSignalPresence = Pick<AdvancedSignals, 'signing' | 'builds'>

type ReleaseTransparencyFeatures =
	EvaluationContext['features']['transparency']['releaseTransparency']
type HasPublicChangelog = NonNullable<ReleaseTransparencyFeatures['hasPublicChangelog']>
type DependencyLocking = NonNullable<ReleaseTransparencyFeatures['dependencyLocking']>
type ArtifactSigning = NonNullable<ReleaseTransparencyFeatures['artifactSigning']>
type ReproducibleBuilds = ReleaseTransparencyFeatures['reproducibleBuilds']
type HermeticBuilds = ReleaseTransparencyFeatures['hermeticBuilds']
type RepositoryChangeControls = NonNullable<ReleaseTransparencyFeatures['repositoryChangeControls']>

const repositoryChangeControlLabels: Record<RepositoryChangeControl, string> = {
	requiredReview: 'required review',
	requiredChecks: 'required status checks',
	forcePushBlocked: 'blocked force pushes',
	branchDeletionBlocked: 'blocked branch deletion',
	tagsImmutable: 'immutable release tags',
}

function repositoryChangeControlStates(
	controls: RepositoryChangeControls,
): Array<{ label: string; state: RepositoryChangeControlState }> {
	return [
		{ label: repositoryChangeControlLabels.requiredReview, state: controls.requiredReview },
		{ label: repositoryChangeControlLabels.requiredChecks, state: controls.requiredChecks },
		{ label: repositoryChangeControlLabels.forcePushBlocked, state: controls.forcePushBlocked },
		{
			label: repositoryChangeControlLabels.branchDeletionBlocked,
			state: controls.branchDeletionBlocked,
		},
		{ label: repositoryChangeControlLabels.tagsImmutable, state: controls.tagsImmutable },
	]
}

function hasChangeControls(basicSignals: BasicSignalPresence): boolean {
	return basicSignals.missingChangeControls?.length === 0
}

function computeBasicSignals(
	hasPublicChangelog: HasPublicChangelog,
	dependencyLocking: DependencyLocking,
	repositoryChangeControls: RepositoryChangeControls | null,
): BasicSignals {
	const changelog = isSupported(hasPublicChangelog)
	const locking = isSupported(dependencyLocking)
	const missingChangeControls =
		repositoryChangeControls === null
			? null
			: repositoryChangeControlStates(repositoryChangeControls)
					.filter(({ state }) => !isRepositoryChangeControlPresent(state))
					.map(({ label }) => label)

	return {
		changelog,
		locking,
		missingChangeControls,
		// Repository change controls that have not been assessed do not prevent a basic pass.
		pass:
			changelog &&
			locking &&
			(missingChangeControls === null || missingChangeControls.length === 0),
	}
}

function computeAdvancedSignals(
	artifactSigning: ArtifactSigning,
	reproducibleBuilds: ReproducibleBuilds,
	hermeticBuilds: HermeticBuilds,
): AdvancedSignals {
	const signing = isSupported(artifactSigning)
	const reproducible = reproducibleBuilds !== null && isSupported(reproducibleBuilds)
	const hermetic = hermeticBuilds !== null && isSupported(hermeticBuilds)
	const builds = reproducible || hermetic

	const level: AdvancedGroupLevel =
		signing && builds ? 'pass' : signing || builds ? 'partial' : 'fail'

	return {
		signing,
		builds,
		level,
	}
}

function getBuildSignalLabel(
	reproducibleBuilds: ReproducibleBuilds,
	hermeticBuilds: HermeticBuilds,
): string | null {
	const reproducible = reproducibleBuilds !== null && isSupported(reproducibleBuilds)
	const hermetic = hermeticBuilds !== null && isSupported(hermeticBuilds)

	if (reproducible && hermetic) {
		return 'reproducible and hermetic builds'
	}

	if (reproducible) {
		return 'reproducible builds'
	}

	if (hermetic) {
		return 'hermetic builds'
	}

	return null
}

function missingAdvancedSignal(advancedSignals: AdvancedSignalPresence): string {
	if (advancedSignals.signing && !advancedSignals.builds) {
		return 'reproducible or hermetic builds'
	}

	if (!advancedSignals.signing && advancedSignals.builds) {
		return 'artifact signing'
	}

	return 'artifact signing and reproducible or hermetic builds'
}

function missingBasicSignals(basicSignals: BasicSignalPresence): string {
	const { missingChangeControls } = basicSignals
	const missing = [
		basicSignals.changelog ? null : 'public changelog',
		basicSignals.locking ? null : 'dependency locking',
		missingChangeControls === null || missingChangeControls.length === 0
			? null
			: `repository change controls (${commaListFormat(missingChangeControls)})`,
	].filter((signal): signal is string => signal !== null)

	if (missing.length === 0) {
		throw new Error('No missing basic signals')
	}

	return commaListFormat(missing)
}

function pass(ctx: EvaluationContext, supportedSignals: string[]): Evaluation {
	return ctx.build({
		outcome: {
			id: 'pass',
			rating: Rating.PASS,
			displayName: 'Transparent release process',
			shortExplanation: sentence(
				'{{WALLET_NAME}} meets release process transparency requirements.',
			),
		},
		details: paragraph(
			`{{WALLET_NAME}} satisfies all release process signals across the basic and advanced groups: ${commaListFormat(supportedSignals)}.`,
		),
	})
}

function partialBasicPassAdvancedFail(
	ctx: EvaluationContext,
	supportedSignals: string[],
): Evaluation {
	return ctx.build({
		outcome: {
			id: 'partial_basic_pass_advanced_fail',
			rating: Rating.PARTIAL,
			score: 0.4,
			displayName: 'Partial release process (basic pass)',
			shortExplanation: sentence(
				'{{WALLET_NAME}} meets basic release-process signals but lacks advanced-group coverage.',
			),
		},
		details: paragraph(
			`{{WALLET_NAME}} supports ${commaListFormat(supportedSignals)}, but is missing artifact signing and reproducible or hermetic builds.`,
		),
		howToImprove: mdParagraph(`
			To fully pass, **{{WALLET_NAME}}** should add both advanced signals:

			- **Artifact signing**: sign release artifacts so users can verify they have not
			  been tampered with.
			- **Reproducible or hermetic builds**: ensure independent parties can rebuild
			  the same source to obtain a byte-for-byte identical artifact, or that the
			  build can run fully offline from a pre-fetched, integrity-verified input set.
		`),
	})
}

function partialBasicFailAdvancedPartial(
	ctx: EvaluationContext,
	supportedSignals: string[],
	basicSignals: BasicSignalPresence,
	advancedSignals: AdvancedSignalPresence,
): Evaluation {
	const missingSignal = missingAdvancedSignal(advancedSignals)
	const missingBasic = missingBasicSignals(basicSignals)

	return ctx.build({
		outcome: {
			id: 'partial_basic_fail_advanced_partial',
			rating: Rating.PARTIAL,
			score: 0.6,
			displayName: 'Partial release process (advanced partial)',
			shortExplanation: sentence(
				`{{WALLET_NAME}} shows advanced-group coverage but misses ${missingBasic}.`,
			),
		},
		details: paragraph(
			`{{WALLET_NAME}} supports ${commaListFormat(supportedSignals)}, but is missing ${missingBasic} and ${missingSignal}.`,
		),
		howToImprove: mdParagraph(`
			To fully pass, **{{WALLET_NAME}}** should implement the missing signals:

			- **Missing advanced signal**: ${missingSignal}.
			- **Missing basic signal(s)**: ${missingBasic}.
		`),
	})
}

function partialBasicFailAdvancedPass(
	ctx: EvaluationContext,
	supportedSignals: string[],
	basicSignals: BasicSignalPresence,
): Evaluation {
	const missingBasic = missingBasicSignals(basicSignals)

	return ctx.build({
		outcome: {
			id: 'partial_basic_fail_advanced_pass',
			rating: Rating.PARTIAL,
			// Slightly above partial_basic_fail_advanced_partial because both advanced signals are present.
			score: 0.65,
			displayName: 'Partial release process (advanced pass)',
			shortExplanation: sentence(
				`{{WALLET_NAME}} has strong advanced-group coverage but misses ${missingBasic}.`,
			),
		},
		details: paragraph(
			`{{WALLET_NAME}} supports ${commaListFormat(supportedSignals)}, but is missing ${missingBasic}.`,
		),
		howToImprove: mdParagraph(`
			To fully pass, **{{WALLET_NAME}}** should add the basic signals:

			- **Missing basic signal(s)**: ${missingBasic}.
		`),
	})
}

function partialBasicPassAdvancedPartial(
	ctx: EvaluationContext,
	supportedSignals: string[],
	advancedSignals: AdvancedSignalPresence,
): Evaluation {
	const missingSignal = missingAdvancedSignal(advancedSignals)

	return ctx.build({
		outcome: {
			id: 'partial_basic_pass_advanced_partial',
			rating: Rating.PARTIAL,
			score: 0.75,
			displayName: 'Partial release process (basic pass, advanced partial)',
			shortExplanation: sentence(
				'{{WALLET_NAME}} meets basic signals and partial advanced-group coverage.',
			),
		},
		details: paragraph(
			`{{WALLET_NAME}} supports ${commaListFormat(supportedSignals)}, but is missing ${missingSignal}.`,
		),
		howToImprove: mdParagraph(`
			To fully pass, **{{WALLET_NAME}}** should add the remaining advanced signal:

			- **Missing advanced signal**: ${missingSignal}.
		`),
	})
}

function fail(ctx: EvaluationContext, basicSignals: BasicSignalPresence): Evaluation {
	// When advancedSignals.level is 'fail', only basic signals can appear in the
	// "supported" list; advanced slots are always empty at the evaluate() call site.
	const supportedBasicSignals = [
		basicSignals.changelog ? 'public changelog' : null,
		basicSignals.locking ? 'dependency locking' : null,
		hasChangeControls(basicSignals) ? 'repository change controls' : null,
	].filter((signal): signal is string => signal !== null)

	const detailsText =
		supportedBasicSignals.length === 0
			? '{{WALLET_NAME}} is missing basic signals and advanced signals.'
			: `{{WALLET_NAME}} supports ${commaListFormat(supportedBasicSignals)}, but is missing ${missingBasicSignals(basicSignals)} and advanced signals.`

	const bullets: string[] = []

	if (!basicSignals.changelog) {
		bullets.push('- **Public changelog**: publish release notes or a changelog for each release.')
	}

	if (!basicSignals.locking) {
		bullets.push(
			'- **Dependency locking**: use a lockfile (or equivalent) to pin all dependencies to known versions.',
		)
	}

	if (
		basicSignals.missingChangeControls !== null &&
		basicSignals.missingChangeControls.length > 0
	) {
		bullets.push(
			`- **Repository change controls**: add publicly visible repository rules (such as those on GitHub) for ${commaListFormat(basicSignals.missingChangeControls)}.`,
		)
	}

	bullets.push(
		'- **Reproducible or hermetic builds**: ensure independent parties can rebuild the same source to obtain a byte-for-byte identical artifact, or that the build can run fully offline from a pre-fetched, integrity-verified input set.',
		'- **Artifact signing**: sign release artifacts so users can verify they have not been tampered with.',
	)

	// Subsequent bullets are prefixed with the same leading tabs as the template
	// literal's content so trimWhitespacePrefix can strip them uniformly.
	const bulletsBlock = bullets.join('\n\t\t\t')

	return ctx.build({
		outcome: {
			id: 'fail',
			rating: Rating.FAIL,
			displayName: 'Insufficient release process coverage',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not meet release process transparency requirements.',
			),
		},
		details: paragraph(detailsText),
		howToImprove: mdParagraph(`
			**{{WALLET_NAME}}** should implement the missing release process signals:

			${bulletsBlock}
		`),
	})
}

export const releaseProcess: Attribute = {
	id: 'releaseProcess',
	icon: 'release_process_transparency',
	displayName: 'Release process',
	wording: {
		midSentenceName: 'release process',
	},
	question: sentence(
		"Can users trust that {{WALLET_NAME}}'s releases are built and distributed safely?",
	),
	why: mdParagraph(`
		Users entrust wallets with their funds and rely on them to ship safe updates.
		A trustworthy release process means users can verify that what they downloaded
		is what the developers built, that dependencies are controlled, and that changes
		between versions are documented.
		Without these signals, a compromised or tampered release may go undetected.
	`),
	methodology: markdown(`
		Five binary signals are assessed, grouped into two categories:

		**Basic**:

		1. **Public changelog**: the wallet publishes release notes or a changelog.
		2. **Dependency locking**: a lockfile or equivalent pins all dependency versions.
		3. **Repository change controls**: the wallet's source repository requires an approving
		   review and passing status checks before merging, blocks force pushes and deletion of
		   protected branches, and keeps release tags immutable.

		**Advanced**:

		4. **Artifact signing**: release artifacts are cryptographically signed and these signatures are published.
		5. **Reproducible or hermetic builds**: independent parties can verify that build output matches
		   source, or the build can run fully offline. Verifying this independently requires access to
		   public source code.

		A wallet **passes** when all basic signals and both advanced signals are present.
		Partial coverage earns a **partial** rating, based on which groups are satisfied.
		Basic signals alone score lower than advanced signals alone, reflecting stronger trust from
		advanced-group evidence. No signals at all earns a **fail**.

		Repository change controls count when anyone can check them (such as public repository
		rules on GitHub), or when the developer states they are in place. If the rating relies on
		such a statement, it is marked as unverifiable. Controls that cannot be checked publicly
		and that the developer makes no statement about do not count. Wallets whose repository
		change controls have not been assessed yet are rated on the other signals.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(
				'The wallet has a public changelog, reproducible or hermetic builds, signed artifacts, locked dependencies, and repository change controls.',
			),
			pass(
				EvaluationContext.forTest(() => releaseProcess),
				[
					'public changelog',
					'reproducible builds',
					'artifact signing',
					'dependency locking',
					'repository change controls',
				],
			),
		),
		partial: [
			exampleRating(
				paragraph(
					'The wallet has a public changelog, dependency locking, and repository change controls, but lacks both artifact signing and reproducible or hermetic builds.',
				),
				partialBasicPassAdvancedFail(
					EvaluationContext.forTest(() => releaseProcess),
					['public changelog', 'dependency locking', 'repository change controls'],
				),
			),
			exampleRating(
				paragraph(
					'The wallet has artifact signing and repository change controls, but no reproducible or hermetic builds, changelog, or dependency locking.',
				),
				partialBasicFailAdvancedPartial(
					EvaluationContext.forTest(() => releaseProcess),
					['artifact signing', 'repository change controls'],
					{ changelog: false, locking: false, missingChangeControls: [] },
					{ signing: true, builds: false },
				),
			),
			exampleRating(
				paragraph(
					'The wallet has reproducible builds, artifact signing, and dependency locking, but lacks a changelog and its repository does not require review before merging.',
				),
				partialBasicFailAdvancedPass(
					EvaluationContext.forTest(() => releaseProcess),
					['reproducible builds', 'artifact signing', 'dependency locking'],
					{
						changelog: false,
						locking: true,
						missingChangeControls: [repositoryChangeControlLabels.requiredReview],
					},
				),
			),
			exampleRating(
				paragraph(
					'The wallet has a changelog, dependency locking, repository change controls, and artifact signing, but no reproducible or hermetic builds.',
				),
				partialBasicPassAdvancedPartial(
					EvaluationContext.forTest(() => releaseProcess),
					[
						'public changelog',
						'artifact signing',
						'dependency locking',
						'repository change controls',
					],
					{ signing: true, builds: false },
				),
			),
		],
		fail: [
			exampleRating(
				paragraph(
					'The wallet has a public changelog and repository change controls, but lacks dependency locking, artifact signing, and reproducible or hermetic builds.',
				),
				fail(
					EvaluationContext.forTest(() => releaseProcess),
					{ changelog: true, locking: false, missingChangeControls: [] },
				),
			),
			exampleRating(
				paragraph(
					'The wallet has a public changelog and dependency locking, but its repository allows force pushes and does not keep release tags immutable, and it lacks artifact signing and reproducible or hermetic builds.',
				),
				fail(
					EvaluationContext.forTest(() => releaseProcess),
					{
						changelog: true,
						locking: true,
						missingChangeControls: [
							repositoryChangeControlLabels.forcePushBlocked,
							repositoryChangeControlLabels.tagsImmutable,
						],
					},
				),
			),
			exampleRating(
				paragraph('The wallet lacks all basic signals and advanced signals.'),
				fail(
					EvaluationContext.forTest(() => releaseProcess),
					{
						changelog: false,
						locking: false,
						missingChangeControls: Object.values(repositoryChangeControlLabels),
					},
				),
			),
		],
	},
	exempted: (ctx: EvaluationContext, _metadata: WalletMetadata) => {
		if (ctx.features.type === WalletType.HARDWARE) {
			return exempt(ctx, sentence('Release process is tracked separately for hardware wallets.'))
		}

		return null
	},
	evaluate: (ctx: EvaluationContext): Evaluation => {
		// Strict unknown handling for this attribute: if any required input is unknown,
		// keep the result UNRATED rather than inferring a weaker rating.

		const rt = ctx.features.transparency.releaseTransparency

		const hasPublicChangelog = rt.hasPublicChangelog

		if (hasPublicChangelog === null) {
			return unrated(ctx)
		}

		if (rt.reproducibleBuilds === null && rt.hermeticBuilds === null) {
			return unrated(ctx)
		}

		const artifactSigning = rt.artifactSigning

		if (artifactSigning === null) {
			return unrated(ctx)
		}

		const dependencyLocking = rt.dependencyLocking

		if (dependencyLocking === null) {
			return unrated(ctx)
		}

		const repositoryChangeControls = rt.repositoryChangeControls
		const basicSignals = computeBasicSignals(
			hasPublicChangelog,
			dependencyLocking,
			repositoryChangeControls,
		)
		const advancedSignals = computeAdvancedSignals(
			artifactSigning,
			rt.reproducibleBuilds,
			rt.hermeticBuilds,
		)

		let verifiabilityNeedsSourceCodeVisibility = false

		if (advancedSignals.builds) {
			// Build-integrity claims require public source code to verify independently.
			verifiabilityNeedsSourceCodeVisibility = true
		}

		if (basicSignals.locking) {
			// Dependency locking can only be checked against the wallet's source tree.
			verifiabilityNeedsSourceCodeVisibility = true
		}

		const buildSignal = getBuildSignalLabel(rt.reproducibleBuilds, rt.hermeticBuilds)

		const supportedSignals = [
			basicSignals.changelog ? 'public changelog' : null,
			buildSignal,
			advancedSignals.signing ? 'artifact signing' : null,
			basicSignals.locking ? 'dependency locking' : null,
			hasChangeControls(basicSignals) ? 'repository change controls' : null,
		].filter((signal): signal is string => signal !== null)

		const changeControlsAreClaimed =
			repositoryChangeControls !== null &&
			hasChangeControls(basicSignals) &&
			repositoryChangeControlStates(repositoryChangeControls).some(
				({ state }) => state === RepositoryChangeControlState.CLAIMED_PRESENT,
			)

		if (changeControlsAreClaimed) {
			// The developer's statement is the only evidence for some of the controls.
			ctx.setVerifiability(Verifiability.UNVERIFIABLE)
		} else {
			ctx.setVerifiability(
				verifiabilityNeedsSourceCodeVisibility
					? verifiabilityRequiresSourceCodeAccess({ coreOnlyIsSufficient: false })
					: Verifiability.VERIFIABLE,
			)
		}

		const sourceVisible = isSourcePubliclyVisible(ctx.features.licensing)

		if (verifiabilityNeedsSourceCodeVisibility && sourceVisible === null) {
			return unrated(ctx)
		}

		ctx.addRef(hasPublicChangelog, artifactSigning, dependencyLocking, repositoryChangeControls)

		if (advancedSignals.builds) {
			ctx.addRef(
				rt.reproducibleBuilds !== null && isSupported(rt.reproducibleBuilds)
					? rt.reproducibleBuilds
					: null,
				rt.hermeticBuilds !== null && isSupported(rt.hermeticBuilds) ? rt.hermeticBuilds : null,
			)
		} else {
			ctx.addRef(rt.reproducibleBuilds, rt.hermeticBuilds)
		}

		// Classification is group-based (basic pass + advanced level), not raw signal count.
		// Strong advanced-group coverage without basic signals remains PARTIAL.
		if (basicSignals.pass) {
			switch (advancedSignals.level) {
				case 'fail':
					return partialBasicPassAdvancedFail(ctx, supportedSignals)
				case 'partial':
					return partialBasicPassAdvancedPartial(ctx, supportedSignals, advancedSignals)
				case 'pass':
					return pass(ctx, supportedSignals)
			}
		} else {
			switch (advancedSignals.level) {
				case 'fail':
					return fail(ctx, basicSignals)
				case 'partial':
					return partialBasicFailAdvancedPartial(
						ctx,
						supportedSignals,
						basicSignals,
						advancedSignals,
					)
				case 'pass':
					return partialBasicFailAdvancedPass(ctx, supportedSignals, basicSignals)
			}
		}
	},
	aggregate: pickWorstRating,
}
