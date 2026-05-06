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

function describeSupportedSignals(signals: string[]): string {
	return commaListFormat(signals)
}

function pass(ctx: EvaluationContext, supportedSignals: string[]): Evaluation {
	return ctx.build({
		outcome: {
			id: 'pass',
			rating: Rating.PASS,
			displayName: 'Strong release process',
			shortExplanation: sentence(
				`{{WALLET_NAME}} meets all 4 release process signals: ${describeSupportedSignals(supportedSignals)}.`,
			),
		},
		details: paragraph(
			`{{WALLET_NAME}} satisfies all four release process signals: ${describeSupportedSignals(supportedSignals)}.`,
		),
	})
}

function partial(
	ctx: EvaluationContext,
	signalCount: 1 | 2 | 3,
	supportedSignals: string[],
): Evaluation {
	const score = signalCount / 4

	return ctx.build({
		outcome: {
			id: `partial_${signalCount.toString()}`,
			rating: Rating.PARTIAL,
			score,
			displayName: `Partial release process (${signalCount.toString()}/4 signals)`,
			shortExplanation: sentence(
				`{{WALLET_NAME}} meets ${signalCount.toString()} of 4 release process signals: ${describeSupportedSignals(supportedSignals)}.`,
			),
		},
		details: paragraph(
			`{{WALLET_NAME}} meets ${signalCount.toString()} of 4 release process signals: ${describeSupportedSignals(supportedSignals)}.`,
		),
		howToImprove: mdParagraph(`
			To fully pass, **{{WALLET_NAME}}** should implement all four signals:

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

function fail(ctx: EvaluationContext): Evaluation {
	return ctx.build({
		outcome: {
			id: 'fail',
			rating: Rating.FAIL,
			displayName: 'No release process signals',
			shortExplanation: sentence('{{WALLET_NAME}} has none of the four release process signals.'),
		},
		details: paragraph(
			'{{WALLET_NAME}} does not have a public changelog, reproducible or hermetic builds, artifact signing, or dependency locking.',
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
		Four independently-verifiable signals are assessed, each binary (present or absent):

		1. **Public changelog**: the wallet publishes release notes or a changelog.
		2. **Reproducible or hermetic builds**: independent parties can verify the build
		   output matches the source, or the build can run fully offline.
		   This signal only counts when the wallet's source code is publicly visible,
		   since external verification requires source access.
		3. **Artifact signing**: release artifacts are cryptographically signed.
		4. **Dependency locking**: a lockfile or equivalent pins all dependency versions.

		All four signals present earns a **pass**. Any partial coverage earns a **partial**.
		No signals earns a **fail**.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: false,
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
					'The wallet has a public changelog, signed artifacts, and locked dependencies, but no reproducible or hermetic builds.',
				),
				partial(
					EvaluationContext.forTest(() => releaseProcess),
					3,
					['public changelog', 'artifact signing', 'dependency locking'],
				),
			),
			exampleRating(
				paragraph(
					'The wallet has a public changelog and signed artifacts, but no reproducible builds or dependency locking.',
				),
				partial(
					EvaluationContext.forTest(() => releaseProcess),
					2,
					['public changelog', 'artifact signing'],
				),
			),
			exampleRating(
				paragraph(
					'The wallet has reproducible builds with public source, but lacks the other signals.',
				),
				partial(
					EvaluationContext.forTest(() => releaseProcess),
					1,
					['reproducible builds'],
				),
			),
		],
		fail: exampleRating(
			paragraph('The wallet has none of the four release process signals.'),
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

		const rt = ctx.features.transparency.releaseTransparency

		// Signal 1: Public changelog
		if (rt.hasPublicChangelog === null) {
			return unrated(ctx)
		}

		const changelog = isSupported(rt.hasPublicChangelog)

		if (changelog) {
			ctx.addRef(rt.hasPublicChangelog)
		}

		// Signal 2: Reproducible or hermetic builds
		if (rt.reproducibleBuilds === null && rt.hermeticBuilds === null) {
			return unrated(ctx)
		}

		const reproducibleSupported =
			rt.reproducibleBuilds !== null && isSupported(rt.reproducibleBuilds)
		const hermeticSupported = rt.hermeticBuilds !== null && isSupported(rt.hermeticBuilds)

		// Source-visibility cap: reproducibility cannot be externally verified
		// without public source access, so the signal does not count.
		const buildsVisible = isSourcePubliclyVisible(ctx.features.licensing)

		if (buildsVisible === null) {
			return unrated(ctx)
		}

		const reproducible = reproducibleSupported && buildsVisible
		const hermetic = hermeticSupported && buildsVisible
		const builds = reproducible || hermetic

		if (builds) {
			ctx.addRef(rt.reproducibleBuilds, rt.hermeticBuilds)
		}

		// Signal 3: Artifact signing
		if (rt.artifactSigning === null) {
			return unrated(ctx)
		}

		const signing = isSupported(rt.artifactSigning.artifactsSigned)

		if (signing) {
			ctx.addRef(rt.artifactSigning.artifactsSigned)
		}

		// Signal 4: Dependency locking
		if (rt.dependencyLocking === null) {
			return unrated(ctx)
		}

		const locking = isSupported(rt.dependencyLocking)

		if (locking) {
			ctx.addRef(rt.dependencyLocking)
		}

		const buildSignal =
			reproducible && hermetic
				? 'reproducible and hermetic builds'
				: reproducible
					? 'reproducible builds'
					: hermetic
						? 'hermetic builds'
						: null

		const supportedSignals = [
			changelog ? 'public changelog' : null,
			buildSignal,
			signing ? 'artifact signing' : null,
			locking ? 'dependency locking' : null,
		].filter((signal): signal is string => signal !== null)

		const signalCount = [changelog, builds, signing, locking].filter(Boolean).length

		if (signalCount === 4) {
			return pass(ctx, supportedSignals)
		}

		if (signalCount === 0) {
			return fail(ctx)
		}

		if (signalCount === 1 || signalCount === 2 || signalCount === 3) {
			return partial(ctx, signalCount, supportedSignals)
		}

		throw new Error('Unreachable')
	},
	aggregate: pickWorstRating,
}
