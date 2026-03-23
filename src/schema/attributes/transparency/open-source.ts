import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	Rating,
	Verifiability,
} from '@/schema/attributes'
import {
	FOSS,
	FOSSLicense,
	fossLicense,
	FutureFOSSLicense,
	futureFOSSLicense,
	type License,
	licenseIsFOSS,
	licenseName,
	licenseUrl,
	LicensingType,
} from '@/schema/features/transparency/license'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'
import { assertNonEmptyArray, nonEmptyGet } from '@/types/utils/non-empty'

import { pickWorstRating, unrated } from '../common'

function open(ctx: EvaluationContext, license: FOSSLicense): Evaluation {
	return ctx.build({
		value: {
			id: license,
			rating: Rating.PASS,
			icon: '\u{1f496}', // Sparkling heart
			displayName: `Open source (${licenseName(license)})`,
			shortExplanation: sentence(
				`{{WALLET_NAME}}'s source code is under an open-source license (${licenseName(license)}).`,
			),
		},
		details: markdown(`
			**{{WALLET_NAME}}** is licensed under the
			[**${licenseName(license)}** license](${licenseUrl(license).url}),
			a Free & Open-Source (FOSS) license.
		`),
	})
}

function openInTheFuture(ctx: EvaluationContext, license: FutureFOSSLicense): Evaluation {
	return ctx.build({
		value: {
			id: license,
			rating: Rating.PARTIAL,
			icon: '❤️‍🩹',
			displayName: `Open source in the future (${licenseName(license)})`,
			shortExplanation: sentence(
				`{{WALLET_NAME}} (${licenseName(license)})'s code license commits to transition to open-source in the future.`,
			),
		},
		details: markdown(`
			**{{WALLET_NAME}}** is licensed under the
			**${licenseName(license)}** license,
			a non-open-source (non-FOSS) license.
			However, this license stipulates that it must transition to
			a Free & Open-Source (FOSS) license in the future.
		`),
	})
}

function mixedIncludingProprietary(ctx: EvaluationContext, fossLicense: FOSSLicense): Evaluation {
	return ctx.build({
		value: {
			id: 'mixed_including_proprietary',
			rating: Rating.FAIL,
			icon: '💔', // Broken heart
			displayName: 'Partially-proprietary code license',
			shortExplanation: sentence(
				'{{WALLET_NAME}} uses a proprietary license for some of its code.',
			),
		},
		details: markdown(`
			While part of **{{WALLET_NAME}}** is licensed under the
			[**${licenseName(fossLicense)}** license](${licenseUrl(fossLicense).url})
			(a Free & Open-Source (FOSS) license), others are not.
		`),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should consider licensing all of its code under a Free & Open Source Software license.',
		),
	})
}

function proprietary(ctx: EvaluationContext): Evaluation {
	return ctx.build({
		value: {
			id: 'proprietary',
			rating: Rating.FAIL,
			icon: '💔', // Broken heart
			displayName: 'Proprietary code license',
			shortExplanation: sentence('{{WALLET_NAME}} uses a proprietary source code license.'),
		},
		details: paragraph(`
			{{WALLET_NAME}} uses a proprietary or non-FOSS source code license.
			Therefore, it is not Free & Open Source Software.
		`),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should consider re-licensing under a Free & Open Source Software license.',
		),
	})
}

function unlicensed(ctx: EvaluationContext): Evaluation {
	return ctx.build({
		value: {
			id: 'unlicensed',
			rating: Rating.FAIL,
			icon: '❔',
			displayName: 'Unlicensed or missing license file',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not have a valid license for its source code.',
			),
		},
		details: paragraph(
			'{{WALLET_NAME}} does not have a valid license for its source code. This is most likely an accidental omission, but a lack of license means that even if {{WALLET_NAME}} is functionally identical to an open-source project, it may later decide to set its license to a proprietary license. Therefore, {{WALLET_NAME}} is assumed to not be Free & Open Source Software until it does have a valid license file.',
		),
		howToImprove: paragraph('{{WALLET_NAME}} should add a license file to its source code.'),
	})
}

export const openSource: Attribute = {
	id: 'openSource',
	icon: '❤️',
	displayName: 'Source code license',
	wording: {
		midSentenceName: 'source code license',
	},
	question: sentence(`
		Does the user have the ability to avoid lock-in and freely audit,
		modify, and redistribute the wallet's source code?
	`),
	why: mdParagraph(`
		[Free & Open Source Software (FOSS) licensing](https://en.wikipedia.org/wiki/Open-source_license)
		allows a software project's source code to be freely used, modified and distributed.
		This allows better collaboration, more transparency into the software development practices
		that go into the project, and allows security researchers to more easily identify and report
		security vulnerabilities. In short, it turns software projects into public goods.
	`),
	methodology: markdown(`
		Wallets are assessed based whether the license of their source code meets
		the [Open Source Initiative's definition of open source](https://en.wikipedia.org/wiki/The_Open_Source_Definition).
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			mdParagraph(
				'The wallet is licensed under a Free & Open Source Software (FOSS) license. Examples of such licenses include [MIT](https://opensource.org/license/MIT), [Apache](https://opensource.org/license/apache-2-0), [BSD](https://opensource.org/license/bsd-1-clause), and [GPL](https://opensource.org/license/gpl-2-0).',
			),
			Rating.PASS,
		),
		partial: exampleRating(
			mdParagraph(
				'The wallet is licensed under a license that represents a commitment to switch to a Free & Open Source Software (FOSS) license by a specific date. Examples of such licenses include [BUSL](https://spdx.org/licenses/BUSL-1.1.html).',
			),
			Rating.PARTIAL,
		),
		fail: [
			exampleRating(
				paragraph('The wallet is licensed under any non-FOSS (proprietary) license.'),
				proprietary(EvaluationContext.forTest(() => openSource)),
			),
			exampleRating(
				paragraph(
					'The wallet is split across multiple repositories, some of which are FOSS-licensed and some of which are not.',
				),
				mixedIncludingProprietary(
					EvaluationContext.forTest(() => openSource),
					FOSSLicense.MIT,
				),
			),
			exampleRating(
				paragraph(
					"The wallet's source code repository is missing a license file. The lack of a license file may be an accidental omission on the wallet developers' part, but also may indicate that the wallet may set its license to a proprietary license. Therefore, Walletbeat makes the conservative assumption that the wallet is not be Free & Open Open Source Software until it does have a valid license file.",
				),
				unlicensed(EvaluationContext.forTest(() => openSource)),
			),
		],
	},
	evaluate: (ctx: EvaluationContext): Evaluation => {
		ctx.setVerifiability(Verifiability.VERIFIABLE) // If open-source, inherently verifiable. If closed-source, evidently true.

		if (ctx.features.licensing === null || ctx.features.licensing.walletAppLicense === null) {
			return unrated(ctx, null)
		}

		const allLicenses = new Set<License>()

		allLicenses.add(ctx.features.licensing.walletAppLicense.license)
		ctx.addRef(ctx.features.licensing.walletAppLicense)

		switch (ctx.features.licensing.type) {
			case LicensingType.SINGLE_WALLET_REPO_AND_LICENSE:
				break // Nothing more to do.
			case LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE:
				if (ctx.features.licensing.coreLicense === null) {
					return unrated(ctx, null)
				}

				allLicenses.add(ctx.features.licensing.coreLicense.license)
				ctx.addRef(ctx.features.licensing.coreLicense)
		}

		if (allLicenses.size === 1) {
			const license = nonEmptyGet(assertNonEmptyArray<License>(Array.from(allLicenses.values())))

			switch (licenseIsFOSS(license)) {
				case FOSS.FOSS:
					if (!fossLicense.is(license)) {
						throw new Error('Unreachable')
					}

					return open(ctx, license)
				case FOSS.FUTURE_FOSS:
					if (!futureFOSSLicense.is(license)) {
						throw new Error('Unreachable')
					}

					return openInTheFuture(ctx, license)
				case FOSS.NOT_FOSS:
					return proprietary(ctx)
			}
		}

		let hasFossLicense: FOSSLicense | null = null
		let hasProprietary = false

		for (const license of allLicenses.values()) {
			switch (licenseIsFOSS(license)) {
				case FOSS.FOSS:
					if (!fossLicense.is(license)) {
						throw new Error('Unreachable')
					}

					hasFossLicense = license
					break
				case FOSS.FUTURE_FOSS:
					throw new Error('Unimplemented')
				case FOSS.NOT_FOSS:
					hasProprietary = true
			}
		}

		if (!hasProprietary || hasFossLicense === null) {
			throw new Error('Unimplemented case; please implement.')
		}

		return mixedIncludingProprietary(ctx, hasFossLicense)
	},
	aggregate: pickWorstRating,
}
