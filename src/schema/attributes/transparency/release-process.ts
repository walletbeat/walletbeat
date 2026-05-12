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
import type { WalletMetadata } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'
import { mdParagraph, paragraph, sentence } from '@/types/content'
import { commaListFormat } from '@/types/utils/text'

import { exempt, pickWorstRating, unrated } from '../common'

type AdvancedGroupLevel = 'fail' | 'partial' | 'pass'

type BasicSignals = {
	changelog: boolean
	locking: boolean
	pass: boolean
}

type AdvancedSignals = {
	signing: boolean
	builds: boolean
	level: AdvancedGroupLevel
}

type BasicSignalPresence = Pick<BasicSignals, 'changelog' | 'locking'>
type AdvancedSignalPresence = Pick<AdvancedSignals, 'signing' | 'builds'>

type ReleaseTransparencyFeatures =
	EvaluationContext['features']['transparency']['releaseTransparency']
type HasPublicChangelog = NonNullable<ReleaseTransparencyFeatures['hasPublicChangelog']>
type DependencyLocking = NonNullable<ReleaseTransparencyFeatures['dependencyLocking']>
type ArtifactSigning = NonNullable<ReleaseTransparencyFeatures['artifactSigning']>
type ReproducibleBuilds = ReleaseTransparencyFeatures['reproducibleBuilds']
type HermeticBuilds = ReleaseTransparencyFeatures['hermeticBuilds']

function computeBasicSignals(
	hasPublicChangelog: HasPublicChangelog,
	dependencyLocking: DependencyLocking,
): BasicSignals {
	const changelog = isSupported(hasPublicChangelog)
	const locking = isSupported(dependencyLocking)

	return {
		changelog,
		locking,
		pass: changelog && locking,
	}
}

function computeAdvancedSignals(
	artifactSigning: ArtifactSigning,
	reproducibleBuilds: ReproducibleBuilds,
	hermeticBuilds: HermeticBuilds,
	sourceVisible: boolean,
): AdvancedSignals {
	const signing = isSupported(artifactSigning)
	// Build-integrity claims only count when source is publicly visible,
	// because external reproducibility checks require source access.
	const reproducible =
		reproducibleBuilds !== null && isSupported(reproducibleBuilds) && sourceVisible
	const hermetic = hermeticBuilds !== null && isSupported(hermeticBuilds) && sourceVisible
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
	buildsVisible: boolean,
): string | null {
	const reproducible =
		reproducibleBuilds !== null && isSupported(reproducibleBuilds) && buildsVisible
	const hermetic = hermeticBuilds !== null && isSupported(hermeticBuilds) && buildsVisible

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
		return 'reproducible or hermetic builds (with publicly visible source)'
	}

	if (!advancedSignals.signing && advancedSignals.builds) {
		return 'artifact signing'
	}

	return 'artifact signing and reproducible or hermetic builds (with publicly visible source)'
}

function missingBasicSignals(basicSignals: BasicSignalPresence): string {
	if (!basicSignals.changelog && !basicSignals.locking) {
		return 'public changelog and dependency locking'
	}

	if (!basicSignals.changelog && basicSignals.locking) {
		return 'public changelog'
	}

	if (basicSignals.changelog && !basicSignals.locking) {
		return 'dependency locking'
	}

	throw new Error('No missing basic signals')
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
			`{{WALLET_NAME}} supports ${commaListFormat(supportedSignals)}, but is missing artifact signing and reproducible or hermetic builds (with publicly visible source).`,
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
	icon: '\u{1f4e6}', // Package box
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
	methodology: mdParagraph(`
		Four binary signals are assessed, grouped into two categories:

		**Basic**:
		1. **Public changelog**: the wallet publishes release notes or a changelog.
		2. **Dependency locking**: a lockfile or equivalent pins all dependency versions.

		**Advanced**:
		3. **Artifact signing**: release artifacts are cryptographically signed and these signatures are published.
		4. **Reproducible or hermetic builds**: independent parties can verify that build output matches
		   source, or the build can run fully offline. This requires public source code.

		A wallet **passes** when both basic signals and both advanced signals are present.
		Partial coverage earns a **partial** rating, based on which groups are satisfied.
		Basic signals alone score lower than advanced signals alone, reflecting stronger trust from
		advanced-group evidence. No signals at all earns a **fail**.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(
				'The wallet has a public changelog, reproducible or hermetic builds with public source, signed artifacts, and locked dependencies.',
			),
			pass(
				EvaluationContext.forTest(() => releaseProcess),
				['public changelog', 'reproducible builds', 'artifact signing', 'dependency locking'],
			),
		),
		partial: [
			exampleRating(
				paragraph(
					'The wallet has a public changelog and dependency locking, but lacks both artifact signing and reproducible or hermetic builds.',
				),
				partialBasicPassAdvancedFail(
					EvaluationContext.forTest(() => releaseProcess),
					['public changelog', 'dependency locking'],
				),
			),
			exampleRating(
				paragraph(
					'The wallet has artifact signing, but no reproducible or hermetic builds, changelog, or dependency locking.',
				),
				partialBasicFailAdvancedPartial(
					EvaluationContext.forTest(() => releaseProcess),
					['artifact signing'],
					{ changelog: false, locking: false },
					{ signing: true, builds: false },
				),
			),
			exampleRating(
				paragraph(
					'The wallet has reproducible builds and artifact signing, but lacks changelog and dependency locking.',
				),
				partialBasicFailAdvancedPass(
					EvaluationContext.forTest(() => releaseProcess),
					['reproducible builds', 'artifact signing'],
					{ changelog: false, locking: false },
				),
			),
			exampleRating(
				paragraph(
					'The wallet has a changelog, dependency locking, and artifact signing, but no reproducible or hermetic builds.',
				),
				partialBasicPassAdvancedPartial(
					EvaluationContext.forTest(() => releaseProcess),
					['public changelog', 'dependency locking', 'artifact signing'],
					{ signing: true, builds: false },
				),
			),
		],
		fail: [
			exampleRating(
				paragraph(
					'The wallet has a public changelog, but lacks dependency locking, artifact signing, and reproducible or hermetic builds.',
				),
				fail(
					EvaluationContext.forTest(() => releaseProcess),
					{ changelog: true, locking: false },
				),
			),
			exampleRating(
				paragraph('The wallet lacks both basic signals and advanced signals.'),
				fail(
					EvaluationContext.forTest(() => releaseProcess),
					{ changelog: false, locking: false },
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
		ctx.setVerifiability(Verifiability.VERIFIABLE)
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

		const sourceVisible = isSourcePubliclyVisible(ctx.features.licensing)

		// Intentional strict policy: source visibility is required input for this attribute.
		// We return UNRATED when unknown instead of downgrading builds to unsupported,
		// to avoid classifying with incomplete advanced-group verifiability context.
		if (sourceVisible === null) {
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

		const basicSignals = computeBasicSignals(hasPublicChangelog, dependencyLocking)
		const advancedSignals = computeAdvancedSignals(
			artifactSigning,
			rt.reproducibleBuilds,
			rt.hermeticBuilds,
			sourceVisible,
		)

		if (basicSignals.changelog) {
			ctx.addRef(hasPublicChangelog)
		}

		if (advancedSignals.builds) {
			ctx.addRef(rt.reproducibleBuilds, rt.hermeticBuilds)
		}

		if (advancedSignals.signing) {
			ctx.addRef(artifactSigning)
		}

		if (basicSignals.locking) {
			ctx.addRef(dependencyLocking)
		}

		const buildSignal = getBuildSignalLabel(rt.reproducibleBuilds, rt.hermeticBuilds, sourceVisible)

		const supportedSignals = [
			basicSignals.changelog ? 'public changelog' : null,
			buildSignal,
			advancedSignals.signing ? 'artifact signing' : null,
			basicSignals.locking ? 'dependency locking' : null,
		].filter((signal): signal is string => signal !== null)

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
