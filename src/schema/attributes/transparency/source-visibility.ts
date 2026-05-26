import { type Attribute, Rating, Verifiability } from '@/schema/attributes'
import { licenseSourceIsVisible, LicensingType } from '@/schema/features/transparency/license'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'

import { pickWorstRating, unrated } from '../common'

const sourcePublic: (typeof sourceVisibility)['evaluate'] = ctx =>
	ctx.build({
		outcome: {
			id: 'public',
			rating: Rating.PASS,
			displayName: 'Source code publicly available',
			shortExplanation: sentence(`
				The source code for {{WALLET_NAME}} is public.
			`),
		},
		details: markdown(`
			The source code for **{{WALLET_NAME}}** is publicly viewable.
		`),
		impact: paragraph(`
			This allows its source code to be examined for security flaws and
			for Walletbeat to review how the wallet works.
		`),
	})

const sourcePartiallyPrivate: (typeof sourceVisibility)['evaluate'] = ctx =>
	ctx.build({
		outcome: {
			id: 'partially_private',
			rating: Rating.FAIL,
			displayName: 'Source code not fully available',
			shortExplanation: sentence(`
				The source code for {{WALLET_NAME}} is not fully public.
			`),
		},
		details: paragraph(`
			Some but not all parts of the source code for {{WALLET_NAME}}
			are available to the public.
		`),
		impact: paragraph(`
			Since not all the source code is publicly viewable,
			it is not possible to audit {{WALLET_NAME}}
			or to fully determine how it works.
		`),
		howToImprove: paragraph(`
			{{WALLET_NAME}} should make all of its source code publicly
			viewable.
		`),
	})

const sourcePrivate: (typeof sourceVisibility)['evaluate'] = ctx =>
	ctx.build({
		outcome: {
			id: 'private',
			rating: Rating.FAIL,
			displayName: 'Source code not publicly available',
			shortExplanation: sentence(`
				The source code for {{WALLET_NAME}} is not public.
			`),
		},
		details: paragraph(`
			The source code for {{WALLET_NAME}} is not available
			to the public.
		`),
		impact: paragraph(`
			Since its source code is not publicly viewable,
			it is not possible to audit {{WALLET_NAME}}
			or to fully determine how it works.
		`),
		howToImprove: paragraph(`
			{{WALLET_NAME}} should make its source code publicly
			viewable.
		`),
	})

export const sourceVisibility: Attribute = {
	id: 'sourceVisibility',
	icon: 'source_visibility',
	displayName: 'Source visibility',
	wording: {
		midSentenceName: 'source visibility',
	},
	question: sentence('Is the source code for the wallet visible to the public?'),
	why: paragraph(`
		When using a wallet, users are entrusting it to preserve their funds
		safely. This requires a high level of trust in the wallet's source code
		and in the wallet's development team. By making the wallet's source code
		visible to the public, its source code can be more easily inspected for
		security vulnerabilities and for potential malicious code.
		This improves the wallet's security and trustworthiness.
	`),
	methodology: sentence(`
		Wallets are assessed based on whether or not their source code is
		publicly visible, irrespective of the license of the source code.
	`),
	ratingScale: {
		display: 'simple',
		content: mdParagraph(`
			If a wallet's source code is visible, it passes. If not, it fails.

			If a wallet's source code spans multiple repositories (e.g. shared
			core libraries and per-version repositories), all of them need to
			be visible.
		`),
	},
	evaluate: ctx => {
		ctx.setVerifiability(Verifiability.VERIFIABLE) // Inherently verifiable, just look at the source.

		if (ctx.features.licensing === null) {
			return unrated(ctx)
		}

		switch (ctx.features.licensing.type) {
			case LicensingType.SINGLE_WALLET_REPO_AND_LICENSE:
				if (ctx.features.licensing.walletAppLicense === null) {
					return unrated(ctx)
				}

				ctx.addRef(ctx.features.licensing.walletAppLicense)

				if (licenseSourceIsVisible(ctx.features.licensing.walletAppLicense.license)) {
					return sourcePublic(ctx)
				}

				return sourcePrivate(ctx)
			case LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE:
				return (() => {
					if (
						ctx.features.licensing.coreLicense === null ||
						ctx.features.licensing.walletAppLicense === null
					) {
						return unrated(ctx)
					}

					ctx.addRef(ctx.features.licensing.coreLicense, ctx.features.licensing.walletAppLicense)
					const coreVisible = licenseSourceIsVisible(ctx.features.licensing.coreLicense.license)
					const walletAppVisible = licenseSourceIsVisible(
						ctx.features.licensing.walletAppLicense.license,
					)

					if (coreVisible && walletAppVisible) {
						return sourcePublic(ctx)
					}

					if (!coreVisible && !walletAppVisible) {
						return sourcePrivate(ctx)
					}

					return sourcePartiallyPrivate(ctx)
				})()
		}
	},
	aggregate: pickWorstRating,
}
