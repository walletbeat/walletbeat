import { exampleSecurityAuditor } from '@/data/entities/example'
import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { type SecurityAudit, securityAuditId } from '@/schema/features/security/security-audits'
import { mergeRefs } from '@/schema/reference'
import { type AtLeastOneVariant } from '@/schema/variants'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'
import { securityAuditsDetailsContent } from '@/types/content/security-audits-details'
import { daysSince } from '@/types/date'
import { isNonEmptyArray, type NonEmptyArray } from '@/types/utils/non-empty'

import { exempt, pickWorstRating, unrated } from '../common'

const brand = 'attributes.security.security_audits'

export type SecurityAuditsValue = Value & {
	securityAudits: SecurityAudit[]
	__brand: 'attributes.security.security_audits'
}

function noAudits(): Evaluation<SecurityAuditsValue> {
	return {
		value: {
			id: 'no_audits',
			rating: Rating.FAIL,
			displayName: 'No security audits',
			shortExplanation: sentence('{{WALLET_NAME}} has not undergone security auditing.'),
			securityAudits: [],
			__brand: brand,
		},
		details: paragraph('{{WALLET_NAME}} has not undergone any security auditing.'),
		references: [],
	}
}

function audited(
	audits: NonEmptyArray<SecurityAudit>,
	auditedInLastYear: boolean,
	hasUnaddressedFlaws: boolean,
): Evaluation<SecurityAuditsValue> {
	const { rating, displayName, shortExplanation, howToImprove } = ((): Pick<
		SecurityAuditsValue,
		'rating' | 'displayName' | 'shortExplanation'
	> & { howToImprove: Evaluation<SecurityAuditsValue>['howToImprove'] } => {
		if (!auditedInLastYear && hasUnaddressedFlaws) {
			return {
				rating: Rating.FAIL,
				displayName: 'Last security audit older than a year, has unaddressed flaws',
				shortExplanation: sentence(
					'The most recent security audit for {{WALLET_NAME}} is over a year old and some security flaws remain.',
				),
				howToImprove: paragraph(
					'{{WALLET_NAME}} should fix the security flaws pointed out in past audits, then should undergo a new security audit.',
				),
			}
		}

		if (!auditedInLastYear) {
			return {
				rating: Rating.PARTIAL,
				displayName: 'Last security audit older than a year',
				shortExplanation: sentence(
					'The most recent security audit for {{WALLET_NAME}} is over a year old.',
				),
				howToImprove: paragraph('{{WALLET_NAME}} should undergo a new security audit.'),
			}
		}

		if (hasUnaddressedFlaws) {
			return {
				rating: Rating.PARTIAL,
				displayName: 'Unaddressed security flaws',
				shortExplanation: sentence(
					'{{WALLET_NAME}} has undergone a recent security audit, but some security flaws have not been addressed.',
				),
				howToImprove: paragraph(
					'{{WALLET_NAME}} should fix the security flaws pointed out in past security audits, then should consider undergoing a new security audit.',
				),
			}
		}

		return {
			rating: Rating.PASS,
			displayName: 'Recent flawless security audit',
			shortExplanation: sentence(
				'{{WALLET_NAME}} has undergone a recent security audit with all faults addressed.',
			),
			howToImprove: undefined,
		}
	})()

	return {
		value: {
			id: `audited_${auditedInLastYear}_${hasUnaddressedFlaws}`,
			rating,
			displayName,
			shortExplanation,
			securityAudits: audits,
			__brand: brand,
		},
		details: securityAuditsDetailsContent({
			auditedInLastYear,
			hasUnaddressedFlaws,
		}),
		howToImprove,
		references: mergeRefs(...audits.map(audit => audit.ref)),
	}
}

const sampleSecurityAudit: SecurityAudit = {
	auditDate: '2020-01-01',
	auditor: exampleSecurityAuditor,
	ref: 'https://example.com/audit.pdf',
	unpatchedFlaws: 'ALL_FIXED',
	variantsScope: 'ALL_VARIANTS',
}

export const securityAudits: Attribute<SecurityAuditsValue> = {
	id: 'securityAudits',
	icon: '\u{1f50f}', // Locked with Pen
	displayName: 'Security audits',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's security auditing track record evaluated?",
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do on the security auditing front?',
		),
	},
	question: sentence("Has the wallet's source code been reviewed by security auditors?"),
	why: markdown(`
		Wallets are high-stakes pieces of software that deal with sensitive
		user data and funds. To ensure that their code is secure, industry best
		practices involve regularly submitting the wallet's source code for audit
		by an independent security auditor. These companies specialize in
		reviewing source code with an eye for security vulnerabilities. They
		report their findings to the wallet's development team for consideration,
		pointing out both flaws and potential security improvements.

		These security audits matter in order to ensure the wallet's source code
		is secure, and remains that way over time. Wallet development teams
		typically publish such audits so that wallet users can feel safer knowing
		that the wallet's source code was independently audited.
	`),
	methodology: markdown(`
		Wallets are evaluated by their track record of published security audits.

		Walletbeat examines the set of published security audits of the wallet.
		To qualify, a security audit must be publicly available, and must be
		from a security auditor that has a traceable corporate entity distinct
		from the wallet's own development team.

		Security audits typically come with one or more security flaws found,
		categorized by level of severity. Definitions of severity vary across
		auditors, but generally anything "medium" or above is worth paying
		attention to.

		A wallet gets a passing rating if it has been audited at least once
		within the last 365 days, and that all medium-or-higher severity flaws
		that were found across *all* audits (including older ones) are addressed.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(
				'The wallet was audited within the last year, and all flaws of severity "medium" or higher are addressed.',
			),
			audited([sampleSecurityAudit], true, false),
		),
		partial: [
			exampleRating(
				paragraph('The wallet was audited over a year ago, and has not been audited since.'),
				audited([sampleSecurityAudit], false, false),
			),
			exampleRating(
				paragraph(
					'The wallet was audited within the last year, and there remains at least one unaddressed security flaw of severity "medium" or higher.',
				),
				audited([sampleSecurityAudit], true, true),
			),
		],
		fail: [
			exampleRating(
				paragraph('The wallet was never audited by an independent security auditor.'),
				noAudits(),
			),
			exampleRating(
				paragraph(
					'The wallet was audited over a year ago, has not been audited since, and there remains at least one unaddressed security flaw of severity "medium" or higher.',
				),
				audited([sampleSecurityAudit], false, true),
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<SecurityAuditsValue> => {
		if (features.type === WalletType.HARDWARE) {
			return exempt(
				securityAudits,
				sentence('This attribute is not applicable to hardware wallets.'),
				brand,
				{ securityAudits: [] },
			)
		}

		if (features.security.publicSecurityAudits === null) {
			return unrated(securityAudits, brand, { securityAudits: [] })
		}

		if (!isNonEmptyArray(features.security.publicSecurityAudits)) {
			return noAudits()
		}

		const audits = features.security.publicSecurityAudits
		let auditedInLastYear = false
		let hasUnaddressedFlaws = false

		for (const audit of audits) {
			if (daysSince(audit.auditDate) <= 366) {
				auditedInLastYear = true
			}

			if (Array.isArray(audit.unpatchedFlaws)) {
				for (const flaw of audit.unpatchedFlaws) {
					if (flaw.presentStatus === 'NOT_FIXED') {
						hasUnaddressedFlaws = true
					}
				}
			}
		}

		return audited(audits, auditedInLastYear, hasUnaddressedFlaws)
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<SecurityAuditsValue>>) => {
		const worstEvaluation = pickWorstRating<SecurityAuditsValue>(perVariant)
		const allAudits: SecurityAudit[] = []
		const auditsIdSet = new Set<string>()

		for (const evaluation of Object.values(perVariant)) {
			for (const audit of evaluation.value.securityAudits) {
				const auditId = securityAuditId(audit)

				if (!auditsIdSet.has(auditId)) {
					allAudits.push(audit)
					auditsIdSet.add(auditId)
				}
			}
		}
		worstEvaluation.value.securityAudits = allAudits

		return worstEvaluation
	},
}
