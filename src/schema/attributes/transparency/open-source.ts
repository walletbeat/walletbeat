import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import {
	FOSS,
	License,
	licenseIsFOSS,
	licenseName,
	type LicenseWithRef,
} from '@/schema/features/transparency/license'
import { refs, toFullyQualified } from '@/schema/reference'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'
import { licenseDetailsContent } from '@/types/content/license-details'

import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.transparency.open_source'

export type OpenSourceValue = Value & {
	license: License
	__brand: 'attributes.transparency.open_source'
}

function open({ license, ref }: LicenseWithRef): Evaluation<OpenSourceValue> {
	return {
		value: {
			id: license,
			rating: Rating.PASS,
			icon: '\u{1f496}', // Sparkling heart
			displayName: `Open source (${licenseName(license)})`,
			shortExplanation: sentence(
				`{{WALLET_NAME}}'s source code is under an open-source license (${licenseName(license)}).`,
			),
			license,
			__brand: brand,
		},
		details: licenseDetailsContent(),
		references: toFullyQualified(ref),
	}
}

function openInTheFuture({ license, ref }: LicenseWithRef): Evaluation<OpenSourceValue> {
	return {
		value: {
			id: license,
			rating: Rating.PARTIAL,
			icon: '❤️‍🩹',
			displayName: `Open source in the future (${licenseName(license)})`,
			shortExplanation: sentence(
				`{{WALLET_NAME}} (${licenseName(license)})'s code license commits to transition to open-source in the future.`,
			),
			license,
			__brand: brand,
		},
		details: licenseDetailsContent(),
		references: toFullyQualified(ref),
	}
}

function proprietary({ ref }: LicenseWithRef): Evaluation<OpenSourceValue> {
	return {
		value: {
			id: 'proprietary',
			rating: Rating.FAIL,
			icon: '💔', // Broken heart
			displayName: 'Proprietary code license',
			shortExplanation: sentence('{{WALLET_NAME}} uses a proprietary source code license.'),
			license: License.PROPRIETARY,
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} uses a proprietary or non-FOSS source code license. Therefore, it is not Free and Open Source Software.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should consider re-licensing under a Free and Open Source Software license.',
		),
		references: toFullyQualified(ref),
	}
}

const unlicensed: Evaluation<OpenSourceValue> = {
	value: {
		id: 'unlicensed',
		rating: Rating.FAIL,
		icon: '❔',
		displayName: 'Unlicensed or missing license file',
		shortExplanation: sentence(
			'{{WALLET_NAME}} does not have a valid license for its source code.',
		),
		license: License.UNLICENSED_VISIBLE,
		__brand: brand,
	},
	details: paragraph(
		'{{WALLET_NAME}} does not have a valid license for its source code. This is most likely an accidental omission, but a lack of license means that even if {{WALLET_NAME}} is functionally identical to an open-source project, it may later decide to set its license to a proprietary license. Therefore, {{WALLET_NAME}} is assumed to not be Free and Open Source Software until it does have a valid license file.',
	),
	howToImprove: paragraph('{{WALLET_NAME}} should add a license file to its source code.'),
	references: [],
}

export const openSource: Attribute<OpenSourceValue> = {
	id: 'openSource',
	icon: '❤️',
	displayName: 'Source code license',
	wording: {
		midSentenceName: 'source code license',
	},
	question: sentence(
		"Is the wallet's source code licensed under a Free and Open Source Software (FOSS) license?",
	),
	why: mdParagraph(
		"[Free and Open Source Software (FOSS) licensing](https://en.wikipedia.org/wiki/Open-source_license) allows a software project's source code to be freely used, modified and distributed. This allows better collaboration, more transparency into the software development practices that go into the project, and allows security researchers to more easily identify and report security vulnerabilities. In short, it turns software projects into public goods.",
	),
	methodology: markdown(`
		Wallets are assessed based whether the license of their source code meets
		the [Open Source Initiative's definition of open source](https://en.wikipedia.org/wiki/The_Open_Source_Definition).
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			mdParagraph(
				'The wallet is licensed under a Free and Open Source Software (FOSS) license. Examples of such licenses include [MIT](https://opensource.org/license/MIT), [Apache](https://opensource.org/license/apache-2-0), [BSD](https://opensource.org/license/bsd-1-clause), and [GPL](https://opensource.org/license/gpl-2-0).',
			),
			Rating.PASS,
		),
		partial: exampleRating(
			mdParagraph(
				'The wallet is licensed under a license that represents a commitment to switch to a Free and Open Source Software (FOSS) license by a specific date. Examples of such licenses include [BUSL](https://spdx.org/licenses/BUSL-1.1.html).',
			),
			Rating.PARTIAL,
		),
		fail: [
			exampleRating(
				paragraph('The wallet is licensed under any non-FOSS (proprietary) license.'),
				proprietary({ license: License.PROPRIETARY }).value,
			),
			exampleRating(
				paragraph(
					"The wallet's source code repository is missing a license file. The lack of a license file may be an accidental omission on the wallet developers' part, but also may indicate that the wallet may set its license to a proprietary license. Therefore, Walletbeat makes the conservative assumption that the wallet is not be Free and Open Open Source Software until it does have a valid license file.",
				),
				unlicensed.value,
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<OpenSourceValue> => {
		if (features.license === null) {
			return unrated(openSource, brand, { license: License.UNLICENSED_VISIBLE })
		}

		const license = features.license.license
		const references = refs(features.license)

		if (license === License.UNLICENSED_VISIBLE) {
			return { references, ...unlicensed }
		}

		switch (licenseIsFOSS(license)) {
			case FOSS.FOSS:
				return {
					references,
					...open(features.license),
				}
			case FOSS.FUTURE_FOSS:
				return {
					references,
					...openInTheFuture(features.license),
				}
			case FOSS.NOT_FOSS:
				return {
					references,
					...proprietary(features.license),
				}
		}
	},
	aggregate: pickWorstRating<OpenSourceValue>,
}
