import { exampleSecurityAuditor } from '@/data/entities/example'
import {
	type Attribute,
	compareExplicitRatings,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	Rating,
	Verifiability,
	type WalletNameAndPseudonymStrings,
	type WalletNameStrings,
} from '@/schema/attributes'
import {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	type BugBountyProgramSupport,
	CoverageBreadth,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import { type SecurityAudit, securityAuditId } from '@/schema/features/security/security-audits'
import { isSupported, supported } from '@/schema/features/support'
import { mergeRefs, refNotNecessary, toFullyQualified } from '@/schema/reference'
import { type AtLeastOneVariant } from '@/schema/variants'
import { verifiabilityRequiresAtLeastOneReference } from '@/schema/verifiability'
import { markdown, mdSentence, paragraph, type Sentence, sentence } from '@/types/content'
import {
	type BugBountyDetail,
	isSecurityAuditsDetails,
	mergeSecurityAuditsDetails,
	type SecurityAuditDetail,
} from '@/types/content/details/security-audits'
import { daysSince } from '@/types/date'
import {
	isNonEmptyArray,
	type NonEmptyArray,
	nonEmptyMap,
	nonEmptySet,
	setItems,
} from '@/types/utils/non-empty'
import { trimWhitespacePrefix } from '@/types/utils/text'

import { pickWorstRating, unrated } from '../common'

export type SecurityAuditsMetadata = {
	securityAudits: SecurityAudit[]
}

type BugBountyProgramSubResult = {
	rating: Rating.PASS | Rating.PARTIAL | Rating.FAIL
	outcomeId: string
	displayName: string
	shortExplanation: Sentence<WalletNameStrings>
	details: BugBountyDetail
	howToImproveMarkdown: string | null
}

type SecurityAuditsSubResult = {
	rating: Rating.PASS | Rating.PARTIAL | Rating.FAIL
	outcomeId: string
	displayName: string
	shortExplanation: Sentence<WalletNameStrings>
	howToImproveMarkdown: string | null
	audits: SecurityAudit[]
	auditedInLastYear: boolean
	hasUnaddressedFlaws: boolean
}

/** Whether at least one of the given audits was performed within the last year. */
export function isAuditedInLastYear(audits: readonly SecurityAudit[]): boolean {
	return audits.some(audit => daysSince(audit.auditDate) <= 366)
}

function noAudits(): SecurityAuditsSubResult {
	return {
		rating: Rating.FAIL,
		outcomeId: 'no_audits',
		displayName: 'No security audits',
		shortExplanation: sentence('{{WALLET_NAME}} has not undergone security auditing.'),
		howToImproveMarkdown:
			'{{WALLET_NAME}} should undergo a security audit by an independent security auditor.',
		audits: [],
		auditedInLastYear: false,
		hasUnaddressedFlaws: false,
	}
}

function audited(
	audits: NonEmptyArray<SecurityAudit>,
	auditedInLastYear: boolean,
	hasUnaddressedFlaws: boolean,
): SecurityAuditsSubResult {
	const { rating, displayName, shortExplanation, howToImproveMarkdown } = ((): Pick<
		SecurityAuditsSubResult,
		'rating' | 'displayName' | 'shortExplanation' | 'howToImproveMarkdown'
	> => {
		if (!auditedInLastYear && hasUnaddressedFlaws) {
			return {
				rating: Rating.FAIL,
				displayName: 'Last security audit older than a year, has unaddressed flaws',
				shortExplanation: sentence(
					'The most recent security audit for {{WALLET_NAME}} is over a year old and some security flaws remain.',
				),
				howToImproveMarkdown:
					'{{WALLET_NAME}} should fix the security flaws pointed out in past audits, then should undergo a new security audit.',
			}
		}

		if (!auditedInLastYear) {
			return {
				rating: Rating.PARTIAL,
				displayName: 'Last security audit older than a year',
				shortExplanation: sentence(
					'The most recent security audit for {{WALLET_NAME}} is over a year old.',
				),
				howToImproveMarkdown: '{{WALLET_NAME}} should undergo a new security audit.',
			}
		}

		if (hasUnaddressedFlaws) {
			return {
				rating: Rating.PARTIAL,
				displayName: 'Unaddressed security flaws',
				shortExplanation: sentence(
					'{{WALLET_NAME}} has undergone a recent security audit, but some security flaws have not been addressed.',
				),
				howToImproveMarkdown:
					'{{WALLET_NAME}} should fix the security flaws pointed out in past security audits, then should consider undergoing a new security audit.',
			}
		}

		return {
			rating: Rating.PASS,
			displayName: 'Recent flawless security audit',
			shortExplanation: sentence(
				'{{WALLET_NAME}} has undergone a recent security audit with all faults addressed.',
			),
			howToImproveMarkdown: null,
		}
	})()

	return {
		rating,
		outcomeId: `audited_${auditedInLastYear}_${hasUnaddressedFlaws}`,
		displayName,
		shortExplanation,
		howToImproveMarkdown,
		audits,
		auditedInLastYear,
		hasUnaddressedFlaws,
	}
}

function getRewardDescription(support: BugBountyProgramSupport): string {
	if (!isSupported(support.rewards)) {
		return ''
	}

	const min = support.rewards.minimum
	const max = support.rewards.maximum

	if (min != null && max != null) {
		if (min === max) {
			return `with a $${min.toLocaleString()} reward`
		} else {
			return `with rewards ranging from $${min.toLocaleString()} to $${max.toLocaleString()}`
		}
	} else if (max != null) {
		return `with rewards up to $${max.toLocaleString()}`
	} else if (typeof min === 'number') {
		return `with rewards starting at $${min.toLocaleString()}`
	}

	return ''
}

/**
 * Sub-result for wallets that do not implement any bug bounty program.
 */
function noBugBountyProgram(): BugBountyProgramSubResult {
	return {
		rating: Rating.FAIL,
		outcomeId: 'no_bug_bounty_program',
		displayName: 'No bug bounty program',
		shortExplanation: sentence(
			"{{WALLET_NAME}} does not implement a bug bounty program and doesn't provide security updates.",
		),
		details: {
			availability: 'NONE',
			coverage: [],
			upgradePathAvailable: false,
			references: [],
		},
		howToImproveMarkdown:
			'{{WALLET_NAME}} should implement a bug bounty program to incentivize security researchers to responsibly disclose vulnerabilities. At minimum, the wallet should provide a clear vulnerability disclosure policy and ensure a process exists for providing security updates to users.',
	}
}

/**
 * Sub-result for wallets that implement a bug bounty program.
 */
export function evaluateBugBountyProgram(
	support: BugBountyProgramSupport,
): BugBountyProgramSubResult {
	const rewardInfo = getRewardDescription(support)
	const hasRewards =
		isSupported(support.rewards) &&
		support.rewards.minimum != null &&
		support.rewards.maximum != null &&
		support.rewards.minimum !== 0 &&
		support.rewards.maximum !== 0
	const hasFullCoverage = support.coverageBreadth === 'FULL_SCOPE'
	const hasLegalProtection = isSupported(support.legalProtections)
	const isActive = support.availability === BugBountyProgramAvailability.ACTIVE

	const passesAll = isActive && hasFullCoverage && hasRewards && hasLegalProtection

	const rating = passesAll
		? Rating.PASS
		: isActive || hasRewards || hasFullCoverage || hasLegalProtection
			? Rating.PARTIAL
			: Rating.FAIL

	return {
		rating,
		outcomeId: isActive ? 'bug_bounty_available' : 'bug_bounty_not_available',
		displayName: isActive ? 'Bug bounty program available' : 'Bug bounty program inactive',
		shortExplanation: mdSentence<WalletNameStrings>(
			`{{WALLET_NAME}} has a bug bounty program${rewardInfo ? ` ${rewardInfo}` : ''}${isActive ? '' : ', but it is currently inactive'}.`,
		),
		details: {
			availability: support.availability,
			coverage:
				support.coverageBreadth === 'FULL_SCOPE' ? 'FULL_SCOPE' : setItems(support.coverageBreadth),
			...(support.platform !== undefined && { platform: support.platform }),
			...(isSupported(support.rewards) && {
				rewards: {
					...(support.rewards.minimum !== undefined &&
						support.rewards.minimum !== null && { minimum: support.rewards.minimum }),
					...(support.rewards.maximum !== undefined &&
						support.rewards.maximum !== null && { maximum: support.rewards.maximum }),
					currency: support.rewards.currency === '' ? 'USD' : support.rewards.currency,
				},
			}),
			...(isSupported(support.legalProtections) && {
				legalProtection: support.legalProtections.type,
			}),
			...(isSupported(support.disclosure) && { disclosureDays: support.disclosure.numberOfDays }),
			upgradePathAvailable: support.upgradePathAvailable,
			references: mergeRefs(
				...toFullyQualified(support.ref),
				...(isSupported(support.legalProtections)
					? toFullyQualified(support.legalProtections.ref)
					: []),
			),
		},
		howToImproveMarkdown: passesAll
			? null
			: `
			{{WALLET_NAME}} should:
			${!isActive ? '- Activate or relaunch their bug bounty program to encourage vulnerability reporting' : ''}
			${!hasRewards ? '- Clearly define the reward range (minimum and maximum) to attract more security researchers' : ''}
			${!hasFullCoverage ? '- Expand coverage to include all hardware and software components' : ''}
			${!hasLegalProtection ? '- Implement Safe Harbor or legal assurance language to protect security researchers from legal action' : ''}
			${!support.upgradePathAvailable ? '- Establish or improve a clear upgrade path for users after vulnerabilities are fixed' : ''}
		`,
	}
}

/** Example of a bug bounty program that passes all checks. Used in rating scale examples. */
const exampleActiveBugBountyProgram: BugBountyProgramSupport = {
	dateStarted: '2020-01-01' as const,
	availability: BugBountyProgramAvailability.ACTIVE,
	coverageBreadth: 'FULL_SCOPE',
	rewards: supported({
		minimum: 1000,
		maximum: 50000,
		currency: 'USD',
	}),
	platform: BugBountyPlatform.HACKER_ONE,
	disclosure: supported({
		numberOfDays: 30,
	}),
	legalProtections: supported({
		type: LegalProtectionType.SAFE_HARBOR,
		ref: 'https://example.com/bug-bounty-safe-harbor',
	}),
	upgradePathAvailable: true,
	ref: refNotNecessary,
}

/** Example of a bug bounty program that is inactive. Used in rating scale examples. */
const exampleInactiveBugBountyProgram: BugBountyProgramSupport = {
	dateStarted: '2020-01-01' as const,
	availability: BugBountyProgramAvailability.INACTIVE,
	coverageBreadth: nonEmptySet(CoverageBreadth.APP_ONLY),
	rewards: supported({
		minimum: 5000,
		maximum: 5000,
		currency: 'USD',
	}),
	platform: BugBountyPlatform.SELF_HOSTED,
	disclosure: supported({
		numberOfDays: 90,
	}),
	legalProtections: supported({
		type: LegalProtectionType.LEGAL_ASSURANCE,
		ref: 'https://example.com/bug-bounty-legal-assurance',
	}),
	upgradePathAvailable: true,
	ref: refNotNecessary,
}

/** Canonical evidence for one audit, including the flaws it found. */
function auditDetail(audit: SecurityAudit): SecurityAuditDetail {
	return {
		auditor: audit.auditor,
		auditDate: audit.auditDate,
		findings:
			audit.unpatchedFlaws === 'NONE_FOUND'
				? { kind: 'noneFound' }
				: audit.unpatchedFlaws === 'ALL_FIXED'
					? { kind: 'allFixed' }
					: {
							kind: 'flaws',
							flaws: nonEmptyMap(audit.unpatchedFlaws, flaw => ({
								name: flaw.name,
								severity: flaw.severityAtAuditPublication,
								status: flaw.presentStatus,
							})),
						},
		references: toFullyQualified(audit.ref),
	}
}

/**
 * Combine the security audits and bug bounty program sub-evaluations into a
 * single evaluation. The overall rating is the worst of the two sub-ratings
 * (i.e. a wallet must do well on both to get a passing rating).
 */
function combineEvaluation(
	ctx: EvaluationContext<SecurityAuditsMetadata>,
	auditsPart: SecurityAuditsSubResult,
	bugBountyPart: BugBountyProgramSubResult,
): Evaluation<SecurityAuditsMetadata> {
	const { rating, displayName, shortExplanation } = ((): Pick<
		SecurityAuditsSubResult,
		'rating' | 'displayName' | 'shortExplanation'
	> => {
		if (auditsPart.rating === Rating.PASS && bugBountyPart.rating === Rating.PASS) {
			return {
				rating: Rating.PASS,
				displayName: 'Recent security audit and active bug bounty program',
				shortExplanation: sentence(
					'{{WALLET_NAME}} has undergone a recent security audit with all faults addressed, and maintains an active bug bounty program.',
				),
			}
		}

		return compareExplicitRatings(bugBountyPart.rating, auditsPart.rating) < 0
			? bugBountyPart
			: auditsPart
	})()

	const howToImproveParts = [auditsPart.howToImproveMarkdown, bugBountyPart.howToImproveMarkdown]
		.filter((part): part is string => part !== null)
		.map(trimWhitespacePrefix)

	return ctx.build({
		outcome: {
			id: `${auditsPart.outcomeId}__${bugBountyPart.outcomeId}`,
			rating,
			displayName,
			shortExplanation,
			metadata: {
				securityAudits: auditsPart.audits,
			},
		},
		details: {
			type: 'securityAudits',
			audits: auditsPart.audits.map(auditDetail),
			bugBounty: bugBountyPart.details,
		},
		howToImprove:
			howToImproveParts.length === 0
				? undefined
				: markdown<WalletNameAndPseudonymStrings>(howToImproveParts.join('\n\n')),
	})
}

const sampleSecurityAudit: SecurityAudit = {
	auditDate: '2020-01-01',
	auditor: exampleSecurityAuditor,
	ref: 'https://example.com/audit.pdf',
	unpatchedFlaws: 'ALL_FIXED',
	variantsScope: 'ALL_VARIANTS',
}

export const securityAuditsAndBounties: Attribute<SecurityAuditsMetadata> = {
	id: 'securityAuditsAndBounties',
	icon: 'security_audits',
	displayName: 'Security Audits & Bounties',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How are a wallet's security audits and bug bounty program evaluated?",
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do on the security auditing and bug bounty front?',
		),
	},
	question: sentence(
		"Has the wallet's source code been reviewed by security auditors, and does the wallet maintain an active bug bounty program?",
	),
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

		However, even audited software is not free of vulnerabilities. Bug bounty
		programs incentivize security researchers to responsibly discover and
		disclose vulnerabilities, rather than exploit them.

		A well-structured bug bounty program:

		1. Provides clear guidelines for researchers to report vulnerabilities
		2. Offers appropriate rewards based on severity of findings
		3. Demonstrates a commitment to addressing security issues quickly
		4. Communicates transparently about discovered vulnerabilities and their resolution

		Additionally, wallets should provide upgrade paths for users when critical
		security issues are discovered, so that fixes actually reach existing users.
	`),
	methodology: markdown(`
		Wallets are evaluated on two closely-related aspects: their track record
		of published security audits, and their bug bounty program. The overall
		rating is the worse of the two, so a wallet must do well on both aspects
		in order to get a passing rating.

		**Security audits**: Walletbeat examines the set of published security
		audits of the wallet. To qualify, a security audit must be publicly
		available, and must be from a security auditor that has a traceable
		corporate entity distinct from the wallet's own development team.

		Security audits typically come with one or more security flaws found,
		categorized by level of severity. Definitions of severity vary across
		auditors, but generally anything "medium" or above is worth paying
		attention to.

		A wallet does well on this aspect if it has been audited at least once
		within the last 365 days, and all medium-or-higher severity flaws
		that were found across *all* audits (including older ones) are addressed.
		This applies to all wallet types, including hardware wallets.

		**Bug bounty program**: Wallets do well on this aspect if they implement
		a comprehensive bug bounty program with:

		- An active program accepting vulnerability reports
		- Full coverage of the wallet's components
		- Financial rewards based on severity
		- Legal protections (such as Safe Harbor language) for security researchers
		- A clear upgrade path for users when security issues are fixed

		Programs with limitations (limited coverage, unclear rewards, inactive or
		paused programs, no legal protections) are rated as partial. Wallets with
		no formal process for reporting vulnerabilities fail this aspect.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: false,
		pass: [
			exampleRating(
				paragraph(
					'The wallet was audited within the last year with all flaws of severity "medium" or higher addressed, and it maintains an active bug bounty program with rewards, full scope coverage, and legal protections for security researchers.',
				),
				combineEvaluation(
					EvaluationContext.forTest(() => securityAuditsAndBounties),
					audited([sampleSecurityAudit], true, false),
					evaluateBugBountyProgram(exampleActiveBugBountyProgram),
				),
			),
		],
		partial: [
			exampleRating(
				paragraph('The wallet was audited over a year ago, and has not been audited since.'),
				combineEvaluation(
					EvaluationContext.forTest(() => securityAuditsAndBounties),
					audited([sampleSecurityAudit], false, false),
					evaluateBugBountyProgram(exampleActiveBugBountyProgram),
				),
			),
			exampleRating(
				paragraph(
					'The wallet was audited within the last year, and there remains at least one unaddressed security flaw of severity "medium" or higher.',
				),
				combineEvaluation(
					EvaluationContext.forTest(() => securityAuditsAndBounties),
					audited([sampleSecurityAudit], true, true),
					evaluateBugBountyProgram(exampleActiveBugBountyProgram),
				),
			),
			exampleRating(
				paragraph(
					'The wallet has a recent flawless security audit, but its bug bounty program is inactive or has significant limitations.',
				),
				combineEvaluation(
					EvaluationContext.forTest(() => securityAuditsAndBounties),
					audited([sampleSecurityAudit], true, false),
					evaluateBugBountyProgram(exampleInactiveBugBountyProgram),
				),
			),
		],
		fail: [
			exampleRating(
				paragraph('The wallet was never audited by an independent security auditor.'),
				combineEvaluation(
					EvaluationContext.forTest(() => securityAuditsAndBounties),
					noAudits(),
					evaluateBugBountyProgram(exampleActiveBugBountyProgram),
				),
			),
			exampleRating(
				paragraph(
					'The wallet was audited over a year ago, has not been audited since, and there remains at least one unaddressed security flaw of severity "medium" or higher.',
				),
				combineEvaluation(
					EvaluationContext.forTest(() => securityAuditsAndBounties),
					audited([sampleSecurityAudit], false, true),
					evaluateBugBountyProgram(exampleActiveBugBountyProgram),
				),
			),
			exampleRating(
				paragraph(
					'The wallet does not implement any bug bounty program or vulnerability disclosure policy.',
				),
				combineEvaluation(
					EvaluationContext.forTest(() => securityAuditsAndBounties),
					audited([sampleSecurityAudit], true, false),
					noBugBountyProgram(),
				),
			),
		],
	},
	evaluate: (
		ctx: EvaluationContext<SecurityAuditsMetadata>,
	): Evaluation<SecurityAuditsMetadata> => {
		ctx.setVerifiability(
			verifiabilityRequiresAtLeastOneReference({
				referenceCountsAs: Verifiability.VERIFIABLE,
			}),
		)

		// Bug bounty program sub-evaluation: applies to all wallet types.
		const bugBountyFeature = ctx.features.security.bugBountyProgram
		const bugBountyPart = ((): BugBountyProgramSubResult | 'UNRATED' => {
			if (bugBountyFeature === null) {
				return 'UNRATED'
			}

			if (!isSupported(bugBountyFeature)) {
				return noBugBountyProgram()
			}

			ctx.addRef(
				bugBountyFeature,
				isSupported(bugBountyFeature.legalProtections) ? bugBountyFeature.legalProtections : null,
			)

			return evaluateBugBountyProgram(bugBountyFeature)
		})()

		// Security audits sub-evaluation: applies to all wallet types.
		const auditsFeature = ctx.features.security.publicSecurityAudits
		const auditsPart = ((): SecurityAuditsSubResult | 'UNRATED' => {
			if (auditsFeature === null) {
				return 'UNRATED'
			}

			if (!isNonEmptyArray(auditsFeature)) {
				return noAudits()
			}

			ctx.addRef(...auditsFeature)

			const auditedInLastYear = isAuditedInLastYear(auditsFeature)
			let hasUnaddressedFlaws = false

			for (const audit of auditsFeature) {
				if (Array.isArray(audit.unpatchedFlaws)) {
					for (const flaw of audit.unpatchedFlaws) {
						if (flaw.presentStatus === 'NOT_FIXED') {
							hasUnaddressedFlaws = true
						}
					}
				}
			}

			return audited(auditsFeature, auditedInLastYear, hasUnaddressedFlaws)
		})()

		if (auditsPart === 'UNRATED' || bugBountyPart === 'UNRATED') {
			return unrated(ctx, {
				securityAudits: auditsPart === 'UNRATED' ? [] : auditsPart.audits,
			})
		}

		return combineEvaluation(ctx, auditsPart, bugBountyPart)
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<SecurityAuditsMetadata>>) => {
		const worstEvaluation = pickWorstRating<SecurityAuditsMetadata>(perVariant)
		const allAudits: SecurityAudit[] = []
		const auditsIdSet = new Set<string>()

		for (const evaluation of Object.values(perVariant)) {
			if (!evaluation?.outcome.metadata?.securityAudits) {
				continue
			}

			for (const audit of evaluation.outcome.metadata.securityAudits) {
				const auditId = securityAuditId(audit)

				if (!auditsIdSet.has(auditId)) {
					allAudits.push(audit)
					auditsIdSet.add(auditId)
				}
			}
		}
		worstEvaluation.outcome.metadata = {
			securityAudits: allAudits,
		}

		// The overall evaluation shows every variant's audit evidence, so its
		// details must carry that same evidence: the summary they display is
		// derived from these audits rather than from the worst variant alone.
		if (isSecurityAuditsDetails(worstEvaluation.details)) {
			worstEvaluation.details = mergeSecurityAuditsDetails(
				worstEvaluation.details,
				Object.values(perVariant)
					.map(evaluation => evaluation?.details)
					.filter(isSecurityAuditsDetails),
			)
		}

		return worstEvaluation
	},
}
