import { type Attribute, type Evaluation, Rating, type Value } from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { licenseSourceIsVisible, LicensingType } from '@/schema/features/transparency/license'
import { mergeRefs, type ReferenceArray, toFullyQualified } from '@/schema/reference'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'

import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.transparency.source_visibility'

export type SourceVisibilityValue = Value & {
	__brand: 'attributes.transparency.source_visibility'
}

function sourcePublic(references: ReferenceArray): Evaluation<SourceVisibilityValue> {
	return {
		value: {
			id: 'public',
			rating: Rating.PASS,
			displayName: 'Source code publicly available',
			shortExplanation: sentence(`
				The source code for {{WALLET_NAME}} is public.
			`),
			__brand: brand,
		},
		details: markdown(`
			The source code for **{{WALLET_NAME}}** is publicly viewable.
		`),
		impact: paragraph(`
			This allows its source code to be examined for security flaws and
			for Walletbeat to review how the wallet works.
		`),
		references,
	}
}

function sourcePartiallyPrivate(references: ReferenceArray): Evaluation<SourceVisibilityValue> {
	return {
		value: {
			id: 'partially_private',
			rating: Rating.FAIL,
			displayName: 'Source code not fully available',
			shortExplanation: sentence(`
				The source code for {{WALLET_NAME}} is not fully public.
			`),
			__brand: brand,
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
		references,
	}
}

function sourcePrivate(references: ReferenceArray): Evaluation<SourceVisibilityValue> {
	return {
		value: {
			id: 'private',
			rating: Rating.FAIL,
			displayName: 'Source code not publicly available',
			shortExplanation: sentence(`
				The source code for {{WALLET_NAME}} is not public.
			`),
			__brand: brand,
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
		references,
	}
}

export const sourceVisibility: Attribute<SourceVisibilityValue> = {
	id: 'sourceVisibility',
	icon: '\u{1f50d}', // Looking glass
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
	evaluate: (features: ResolvedFeatures): Evaluation<SourceVisibilityValue> => {
		if (features.licensing === null) {
			return unrated(sourceVisibility, brand, null)
		}

		switch (features.licensing.type) {
			case LicensingType.SINGLE_WALLET_REPO_AND_LICENSE:
				if (features.licensing.walletAppLicense === null) {
					return unrated(sourceVisibility, brand, null)
				}

				if (licenseSourceIsVisible(features.licensing.walletAppLicense.license)) {
					return sourcePublic(toFullyQualified(features.licensing.walletAppLicense.ref))
				}

				return sourcePrivate(toFullyQualified(features.licensing.walletAppLicense.ref))
			case LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE:
				return (() => {
					if (
						features.licensing.coreLicense === null ||
						features.licensing.walletAppLicense === null
					) {
						return unrated(sourceVisibility, brand, null)
					}

					const refs = mergeRefs(
						features.licensing.coreLicense.ref,
						features.licensing.walletAppLicense.ref,
					)
					const coreVisible = licenseSourceIsVisible(features.licensing.coreLicense.license)
					const walletAppVisible = licenseSourceIsVisible(
						features.licensing.walletAppLicense.license,
					)

					if (coreVisible && walletAppVisible) {
						return sourcePublic(refs)
					}

					if (!coreVisible && !walletAppVisible) {
						return sourcePrivate(refs)
					}

					return sourcePartiallyPrivate(refs)
				})()
		}
	},
	aggregate: pickWorstRating<SourceVisibilityValue>,
}
