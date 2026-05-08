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

type SupplyLevel = 'fail' | 'partial' | 'pass'

type ProcessSignals = {
	changelog: boolean
	locking: boolean
	pass: boolean
}

type SupplySignals = {
	signing: boolean
	builds: boolean
	level: SupplyLevel
}

type ProcessSignalPresence = Pick<ProcessSignals, 'changelog' | 'locking'>
type SupplySignalPresence = Pick<SupplySignals, 'signing' | 'builds'>

type ReleaseTransparencyFeatures =
	EvaluationContext['features']['transparency']['releaseTransparency']
type HasPublicChangelog = NonNullable<ReleaseTransparencyFeatures['hasPublicChangelog']>
type DependencyLocking = NonNullable<ReleaseTransparencyFeatures['dependencyLocking']>
type ArtifactSigning = NonNullable<ReleaseTransparencyFeatures['artifactSigning']>
type ReproducibleBuilds = ReleaseTransparencyFeatures['reproducibleBuilds']
type HermeticBuilds = ReleaseTransparencyFeatures['hermeticBuilds']

function computeProcessSignals(
	hasPublicChangelog: HasPublicChangelog,
	dependencyLocking: DependencyLocking,
): ProcessSignals {
	const changelog = isSupported(hasPublicChangelog)
	const locking = isSupported(dependencyLocking)

	return {
		changelog,
		locking,
		pass: changelog && locking,
	}
}

function computeSupplySignals(
	artifactSigning: ArtifactSigning,
	reproducibleBuilds: ReproducibleBuilds,
	hermeticBuilds: HermeticBuilds,
	sourceVisible: boolean,
): SupplySignals {
	const signing = isSupported(artifactSigning)
	// Build-integrity claims only count when source is publicly visible,
	// because external reproducibility checks require source access.
	const reproducible =
		reproducibleBuilds !== null && isSupported(reproducibleBuilds) && sourceVisible
	const hermetic = hermeticBuilds !== null && isSupported(hermeticBuilds) && sourceVisible
	const builds = reproducible || hermetic

	const level: SupplyLevel = signing && builds ? 'pass' : signing || builds ? 'partial' : 'fail'

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

function missingSupplySignal(supplySignals: SupplySignalPresence): string {
	if (supplySignals.signing && !supplySignals.builds) {
		return 'reproducible or hermetic builds (with publicly visible source)'
	}

	if (!supplySignals.signing && supplySignals.builds) {
		return 'artifact signing'
	}

	return 'artifact signing and reproducible or hermetic builds (with publicly visible source)'
}

function missingProcessSignals(processSignals: ProcessSignalPresence): string {
	if (!processSignals.changelog && !processSignals.locking) {
		return 'public changelog and dependency locking'
	}

	if (!processSignals.changelog && processSignals.locking) {
		return 'public changelog'
	}

	if (processSignals.changelog && !processSignals.locking) {
		return 'dependency locking'
	}

	throw new Error('No missing process signals')
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
			`{{WALLET_NAME}} satisfies all release process signals across process transparency and supply-chain integrity: ${commaListFormat(supportedSignals)}.`,
		),
	})
}

function partialProcessPassSupplyFail(
	ctx: EvaluationContext,
	supportedSignals: string[],
): Evaluation {
	return ctx.build({
		outcome: {
			id: 'partial_process_pass_supply_fail',
			rating: Rating.PARTIAL,
			score: 0.4,
			displayName: 'Partial release process (process pass)',
			shortExplanation: sentence(
				'{{WALLET_NAME}} meets process transparency baseline signals but lacks supply-chain integrity coverage.',
			),
		},
		details: paragraph(
			`{{WALLET_NAME}} supports ${commaListFormat(supportedSignals)}, but is missing artifact signing and reproducible or hermetic builds (with publicly visible source).`,
		),
		howToImprove: mdParagraph(`
			To fully pass, **{{WALLET_NAME}}** should add both supply-chain integrity signals:

			- **Artifact signing**: sign release artifacts so users can verify they have not
			  been tampered with.
			- **Reproducible or hermetic builds**: ensure independent parties can rebuild
			  the same source to obtain a byte-for-byte identical artifact, or that the
			  build can run fully offline from a pre-fetched, integrity-verified input set.
		`),
	})
}

function partialProcessFailSupplyPartial(
	ctx: EvaluationContext,
	supportedSignals: string[],
	processSignals: ProcessSignalPresence,
	supplySignals: SupplySignalPresence,
): Evaluation {
	const missingSignal = missingSupplySignal(supplySignals)
	const missingProcess = missingProcessSignals(processSignals)

	return ctx.build({
		outcome: {
			id: 'partial_process_fail_supply_partial',
			rating: Rating.PARTIAL,
			score: 0.6,
			displayName: 'Partial release process (supply partial)',
			shortExplanation: sentence(
				`{{WALLET_NAME}} shows supply-chain integrity coverage but misses ${missingProcess}.`,
			),
		},
		details: paragraph(
			`{{WALLET_NAME}} supports ${commaListFormat(supportedSignals)}, but is missing ${missingProcess} and ${missingSignal}.`,
		),
		howToImprove: mdParagraph(`
			To fully pass, **{{WALLET_NAME}}** should implement the missing signals:

			- **Missing supply-chain integrity signal**: ${missingSignal}.
			- **Missing process transparency signal(s)**: ${missingProcess}.
		`),
	})
}

function partialProcessFailSupplyPass(
	ctx: EvaluationContext,
	supportedSignals: string[],
	processSignals: ProcessSignalPresence,
): Evaluation {
	const missingProcess = missingProcessSignals(processSignals)

	return ctx.build({
		outcome: {
			id: 'partial_process_fail_supply_pass',
			rating: Rating.PARTIAL,
			// Slightly above partial_process_fail_supply_partial because both supply signals are present.
			score: 0.65,
			displayName: 'Partial release process (supply pass)',
			shortExplanation: sentence(
				`{{WALLET_NAME}} has strong supply-chain integrity coverage but misses ${missingProcess}.`,
			),
		},
		details: paragraph(
			`{{WALLET_NAME}} supports ${commaListFormat(supportedSignals)}, but is missing ${missingProcess}.`,
		),
		howToImprove: mdParagraph(`
			To fully pass, **{{WALLET_NAME}}** should add the process transparency baseline:

			- **Missing process transparency signal(s)**: ${missingProcess}.
		`),
	})
}

function partialProcessPassSupplyPartial(
	ctx: EvaluationContext,
	supportedSignals: string[],
	supplySignals: SupplySignalPresence,
): Evaluation {
	const missingSignal = missingSupplySignal(supplySignals)

	return ctx.build({
		outcome: {
			id: 'partial_process_pass_supply_partial',
			rating: Rating.PARTIAL,
			score: 0.75,
			displayName: 'Partial release process (process pass, supply partial)',
			shortExplanation: sentence(
				'{{WALLET_NAME}} meets process transparency baseline signals and partial supply-chain integrity coverage.',
			),
		},
		details: paragraph(
			`{{WALLET_NAME}} supports ${commaListFormat(supportedSignals)}, but is missing ${missingSignal}.`,
		),
		howToImprove: mdParagraph(`
			To fully pass, **{{WALLET_NAME}}** should add the remaining supply-chain integrity signal:

			- **Missing supply-chain integrity signal**: ${missingSignal}.
		`),
	})
}

function fail(ctx: EvaluationContext): Evaluation {
	return ctx.build({
		outcome: {
			id: 'fail',
			rating: Rating.FAIL,
			displayName: 'Insufficient release process coverage',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not meet release process transparency requirements.',
			),
		},
		details: paragraph(
			'{{WALLET_NAME}} is missing process transparency baseline signals and supply-chain integrity signals.',
		),
		howToImprove: mdParagraph(`
			**{{WALLET_NAME}}** should implement the following release process signals:

			- **Public changelog**: publish release notes or a changelog for each release.
			- **Reproducible or hermetic builds**: ensure independent parties can rebuild
			  the same source to obtain a byte-for-byte identical artifact, or that the
			  build can run fully offline from a pre-fetched, integrity-verified input set.
			- **Artifact signing**: sign release artifacts so users can verify they have not
			  been tampered with.
			- **Dependency locking**: use a lockfile (or equivalent) to pin all dependencies
			  to known versions.
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

		**Process transparency** (baseline hygiene):
		1. **Public changelog**: the wallet publishes release notes or a changelog.
		2. **Dependency locking**: a lockfile or equivalent pins all dependency versions.

		**Supply-chain integrity** (high-trust):
		3. **Artifact signing**: release artifacts are cryptographically signed and these signatures are published.
		4. **Reproducible or hermetic builds**: independent parties can verify the build output matches
		   the source, or the build can run fully offline. This requires the wallet's source code to be
		   publicly visible, since external verification requires source access.

		A wallet **passes** when both process signals and both supply-chain signals are present.
		Partial coverage earns a **partial** rating, scored by how much of the two groups is satisfied:
		process signals alone score lower than supply-chain signals alone, reflecting the higher trust
		value of supply-chain integrity. No signals at all earns a **fail**.
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
				partialProcessPassSupplyFail(
					EvaluationContext.forTest(() => releaseProcess),
					['public changelog', 'dependency locking'],
				),
			),
			exampleRating(
				paragraph(
					'The wallet has artifact signing, but no reproducible or hermetic builds, changelog, or dependency locking.',
				),
				partialProcessFailSupplyPartial(
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
				partialProcessFailSupplyPass(
					EvaluationContext.forTest(() => releaseProcess),
					['reproducible builds', 'artifact signing'],
					{ changelog: false, locking: false },
				),
			),
			exampleRating(
				paragraph(
					'The wallet has a changelog, dependency locking, and artifact signing, but no reproducible or hermetic builds.',
				),
				partialProcessPassSupplyPartial(
					EvaluationContext.forTest(() => releaseProcess),
					['public changelog', 'dependency locking', 'artifact signing'],
					{ signing: true, builds: false },
				),
			),
		],
		fail: exampleRating(
			paragraph(
				'The wallet lacks both process transparency baseline signals and supply-chain integrity signals.',
			),
			fail(EvaluationContext.forTest(() => releaseProcess)),
		),
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
		// to avoid classifying with incomplete supply-chain verifiability context.
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

		const processSignals = computeProcessSignals(hasPublicChangelog, dependencyLocking)
		const supplySignals = computeSupplySignals(
			artifactSigning,
			rt.reproducibleBuilds,
			rt.hermeticBuilds,
			sourceVisible,
		)

		if (processSignals.changelog) {
			ctx.addRef(hasPublicChangelog)
		}

		if (supplySignals.builds) {
			ctx.addRef(rt.reproducibleBuilds, rt.hermeticBuilds)
		}

		if (supplySignals.signing) {
			ctx.addRef(artifactSigning)
		}

		if (processSignals.locking) {
			ctx.addRef(dependencyLocking)
		}

		const buildSignal = getBuildSignalLabel(rt.reproducibleBuilds, rt.hermeticBuilds, sourceVisible)

		const supportedSignals = [
			processSignals.changelog ? 'public changelog' : null,
			buildSignal,
			supplySignals.signing ? 'artifact signing' : null,
			processSignals.locking ? 'dependency locking' : null,
		].filter((signal): signal is string => signal !== null)

		// Classification is group-based (processPass + supplyLevel), not raw signal count.
		// Strong supply-chain integrity without process baseline remains PARTIAL.
		if (processSignals.pass) {
			switch (supplySignals.level) {
				case 'fail':
					return partialProcessPassSupplyFail(ctx, supportedSignals)
				case 'partial':
					return partialProcessPassSupplyPartial(ctx, supportedSignals, supplySignals)
				case 'pass':
					return pass(ctx, supportedSignals)
			}
		} else {
			switch (supplySignals.level) {
				case 'fail':
					return fail(ctx)
				case 'partial':
					return partialProcessFailSupplyPartial(
						ctx,
						supportedSignals,
						processSignals,
						supplySignals,
					)
				case 'pass':
					return partialProcessFailSupplyPass(ctx, supportedSignals, processSignals)
			}
		}

		throw new Error('Unreachable')
	},
	aggregate: pickWorstRating,
}
