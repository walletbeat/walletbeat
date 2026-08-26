import type { Entity } from '@/schema/entity'
import { type UserInfo, userInfoName } from '@/schema/features/privacy/data-collection'
import type { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import {
	type AccountRecoveryDrillType,
	accountRecoveryDrillWording,
	type Guardian,
	guardianMarkdown,
	type GuardianType,
} from '@/schema/features/security/account-recovery'
import type {
	BugBountyPlatform,
	BugBountyProgramAvailability,
	CoverageBreadth,
	LegalProtectionType,
} from '@/schema/features/security/bug-bounty-program'
import {
	type EthereumL1LightClient,
	ethereumL1LightClientUrl,
} from '@/schema/features/security/light-client'
import type { SecurityFlawSeverity } from '@/schema/features/security/security-audits'
import {
	type TransactionSubmissionL2Type,
	transactionSubmissionL2TypeName,
} from '@/schema/features/self-sovereignty/transaction-submission'
import {
	type MonetizationStrategy,
	monetizationStrategyName,
} from '@/schema/features/transparency/monetization'
import { type ReferenceInput, toFullyQualified } from '@/schema/reference'
import type { Variant } from '@/schema/variants'
import type { AccountRecoveryDetails } from '@/types/content/account-recovery-details'
import type { AccountUnruggabilityDetails } from '@/types/content/account-unruggability-details'
import type { AddressCorrelationDetails } from '@/types/content/address-correlation-details'
import type { ChainVerificationDetails } from '@/types/content/chain-verification-details'
import type { FundingDetails } from '@/types/content/funding-details'
import type { GuardianPolicyDetail } from '@/types/content/guardian-policy'
import type { GuardianScenarioOutcomeDetail } from '@/types/content/guardian-scenarios'
import type { InlineText } from '@/types/content/inline'
import {
	type PrivateTransfersDetails,
	privateTransferTechnologyName,
} from '@/types/content/private-transfers-details'
import type { ScamPreventionDetails, ScamWarningKind } from '@/types/content/scam-alert-details'
import {
	auditsByRecency,
	type SecurityAuditsDetails,
} from '@/types/content/security-audits-details'
import type { StructuredDetails } from '@/types/content/structured-details'
import type {
	L1BroadcastSupport,
	L2ForceInclusionCapability,
	TransactionInclusionDetails,
} from '@/types/content/transaction-inclusion-details'
import type { CalendarDate } from '@/types/date'
import { renderStrings } from '@/types/utils/text'

import type { StructuredDetailsContext } from './context'
import { dispatchStructuredDetails, type StructuredDetailsRenderers } from './registry'

/**
 * JSON adapter for canonical structured evaluation details.
 *
 * This module owns the public DTO shape: every variant has a dedicated typed
 * export type, so the internal model can change without silently changing the
 * published payload. Templates are resolved, references are normalized, and
 * calendar dates stay `YYYY-MM-DD` strings.
 */

export interface ReferenceUrlJsonExport {
	label: string
	url: string
}

export interface ReferenceJsonExport {
	explanation?: string
	urls: ReferenceUrlJsonExport[]
}

export interface InlineTextJsonExport {
	text: string
	links?: Array<{ text: string; url: string }>
}

export interface EntityRefJsonExport {
	entityId: string
	entityName: string
}

export interface GuardianJsonExport {
	type: GuardianType
	description: string
	entityId?: string
}

export type GuardianPolicyFactsJsonExport =
	| {
			kind: 'secretSplit'
			requiredGuardians: GuardianJsonExport[]
			optionalGuardians: GuardianJsonExport[]
			optionalGuardiansMinimumConfigurable: number
			optionalGuardiansMinimumNeededForRecovery: number
			secretReconstitution: 'CLIENT_SIDE' | EntityRefJsonExport
	  }
	| {
			kind: 'kOfNWithTimelock'
			configuredGuardians: GuardianJsonExport[]
			requiredGuardians: GuardianJsonExport[]
			timelockWarningSentByAllOf: EntityRefJsonExport[]
			minimumSignaturesWithTimelock: number
			minimumSignaturesBypassTimelock: number
	  }

export interface GuardianPolicyJsonExport {
	description: string[]
	facts: GuardianPolicyFactsJsonExport
}

export interface GuardianScenarioJsonExport {
	id: string
	scenario: string
	consequence?: string
}

export interface AccountRecoveryDrillJsonExport {
	type: AccountRecoveryDrillType
	name: string
	reminderEveryNDays: number
	references?: ReferenceJsonExport[]
}

export interface AccountRecoveryDetailsJsonExport {
	type: 'accountRecovery'
	guardianPolicy?: GuardianPolicyJsonExport
	recoverableScenarios: GuardianScenarioJsonExport[]
	unrecoverableScenarios: GuardianScenarioJsonExport[]
	drills?: {
		configured: AccountRecoveryDrillJsonExport[]
		missing: Array<{ type: AccountRecoveryDrillType; name: string }>
	}
}

export interface AccountUnruggabilityDetailsJsonExport {
	type: 'accountUnruggability'
	guardianPolicy?: GuardianPolicyJsonExport
	safeScenarios: GuardianScenarioJsonExport[]
	takeoverScenarios: GuardianScenarioJsonExport[]
}

export interface AddressCorrelationLeakJsonExport {
	source: { kind: 'onchain' } | ({ kind: 'entity' } & EntityRefJsonExport)
	correlatedInfo: Array<{ info: UserInfo; name: string }>
	references?: ReferenceJsonExport[]
}

export interface AddressCorrelationDetailsJsonExport {
	type: 'addressCorrelation'
	leaks: AddressCorrelationLeakJsonExport[]
}

export interface ChainVerificationLightClientJsonExport {
	id: EthereumL1LightClient
	name: string
	url: string
}

export interface ChainVerificationDetailsJsonExport {
	type: 'chainVerification'
	lightClients: ChainVerificationLightClientJsonExport[]
}

export interface FundingStrategyJsonExport {
	strategy: MonetizationStrategy
	name: string
	userAligned: boolean
}

export interface FundingDetailsJsonExport {
	type: 'funding'
	strategies: FundingStrategyJsonExport[]
	revenueBreakdownIsPublic: boolean
}

export interface PrivateTransferTechnologyJsonExport {
	technology: PrivateTransferTechnology
	name: string
	sending: InlineTextJsonExport
	receiving: InlineTextJsonExport
	spending: InlineTextJsonExport
	notes?: InlineTextJsonExport[]
}

export interface PrivateTransfersDetailsJsonExport {
	type: 'privateTransfers'
	technologies: PrivateTransferTechnologyJsonExport[]
	defaultModeNote?: InlineTextJsonExport
}

export interface ScamWarningDetailsJsonExport {
	kind: ScamWarningKind
	description: string
	items?: string[]
	conclusion?: string
	references?: ReferenceJsonExport[]
}

export interface ScamPreventionDetailsJsonExport {
	type: 'scamPrevention'
	warnings: ScamWarningDetailsJsonExport[]
}

export interface SecurityAuditFlawJsonExport {
	name: string
	severity: SecurityFlawSeverity
	status: 'FIXED' | 'NOT_FIXED'
}

export interface SecurityAuditJsonExport {
	auditor: { id: string; name: string }

	auditDate: CalendarDate

	variants: Variant[] | 'ALL_VARIANTS'
	findings: 'NONE_FOUND' | 'ALL_FIXED' | 'FLAWS'
	flaws?: SecurityAuditFlawJsonExport[]
	references?: ReferenceJsonExport[]
}

export interface BugBountyJsonExport {
	availability: BugBountyProgramAvailability | 'NONE'
	coverage: 'FULL_SCOPE' | CoverageBreadth[]
	platform?: BugBountyPlatform
	rewards?: { minimum?: number; maximum?: number; currency: string }
	legalProtection?: LegalProtectionType
	disclosureDays?: number
	upgradePathAvailable: boolean
	references?: ReferenceJsonExport[]
}

export interface SecurityAuditsDetailsJsonExport {
	type: 'securityAudits'
	audits: SecurityAuditJsonExport[]
	bugBounty?: BugBountyJsonExport
}

export interface TransactionInclusionL2JsonExport {
	l2: TransactionSubmissionL2Type
	name: string
	forceInclusion: L2ForceInclusionCapability
}

export interface TransactionInclusionDetailsJsonExport {
	type: 'transactionInclusion'
	l1Broadcast: L1BroadcastSupport
	l2s: TransactionInclusionL2JsonExport[]
	l1References?: ReferenceJsonExport[]
	l2References?: ReferenceJsonExport[]
}

export type StructuredDetailsJsonExport =
	| AccountRecoveryDetailsJsonExport
	| AccountUnruggabilityDetailsJsonExport
	| AddressCorrelationDetailsJsonExport
	| ChainVerificationDetailsJsonExport
	| FundingDetailsJsonExport
	| PrivateTransfersDetailsJsonExport
	| ScamPreventionDetailsJsonExport
	| SecurityAuditsDetailsJsonExport
	| TransactionInclusionDetailsJsonExport

export function serializeReferences(references: ReferenceInput): ReferenceJsonExport[] {
	return toFullyQualified(references).map(ref => ({
		...(ref.explanation !== undefined && { explanation: ref.explanation }),
		urls: ref.urls.map(url => ({ label: url.label, url: url.url })),
	}))
}

export function serializeInlineText(
	inline: InlineText,
	context: StructuredDetailsContext,
): InlineTextJsonExport {
	const links = inline
		.filter(span => span.kind === 'link')
		.map(span => ({ text: renderStrings(span.text, { ...context.strings }), url: span.url }))

	return {
		text: inline.map(span => renderStrings(span.text, { ...context.strings })).join(''),
		...(links.length > 0 && { links }),
	}
}

function serializeGuardian(guardian: Guardian): GuardianJsonExport {
	return {
		type: guardian.type,
		description: guardianMarkdown(guardian),
		...('entity' in guardian && { entityId: guardian.entity.id }),
	}
}

function serializeEntityRef(entity: Entity): EntityRefJsonExport {
	return { entityId: entity.id, entityName: entity.name }
}

function serializeGuardianPolicy(policy: GuardianPolicyDetail): GuardianPolicyJsonExport {
	return {
		description: policy.description,
		facts:
			policy.facts.kind === 'secretSplit'
				? {
						kind: 'secretSplit',
						requiredGuardians: policy.facts.requiredGuardians.map(serializeGuardian),
						optionalGuardians: policy.facts.optionalGuardians.map(serializeGuardian),
						optionalGuardiansMinimumConfigurable: policy.facts.optionalGuardiansMinimumConfigurable,
						optionalGuardiansMinimumNeededForRecovery:
							policy.facts.optionalGuardiansMinimumNeededForRecovery,
						secretReconstitution:
							policy.facts.secretReconstitution === 'CLIENT_SIDE'
								? 'CLIENT_SIDE'
								: serializeEntityRef(policy.facts.secretReconstitution),
					}
				: {
						kind: 'kOfNWithTimelock',
						configuredGuardians: policy.facts.configuredGuardians.map(serializeGuardian),
						requiredGuardians: policy.facts.requiredGuardians.map(serializeGuardian),
						timelockWarningSentByAllOf:
							policy.facts.timelockWarningSentByAllOf.map(serializeEntityRef),
						minimumSignaturesWithTimelock: policy.facts.minimumSignaturesWithTimelock,
						minimumSignaturesBypassTimelock: policy.facts.minimumSignaturesBypassTimelock,
					},
	}
}

function serializeScenario(scenario: GuardianScenarioOutcomeDetail): GuardianScenarioJsonExport {
	return {
		id: scenario.id,
		scenario: scenario.scenario,
		...(scenario.consequence !== undefined && { consequence: scenario.consequence }),
	}
}

function serializeAccountRecoveryDetails(
	details: AccountRecoveryDetails,
): AccountRecoveryDetailsJsonExport {
	return {
		type: 'accountRecovery',
		...(details.guardianPolicy !== undefined && {
			guardianPolicy: serializeGuardianPolicy(details.guardianPolicy),
		}),
		recoverableScenarios: details.recoverableScenarios.map(serializeScenario),
		unrecoverableScenarios: details.unrecoverableScenarios.map(serializeScenario),
		...(details.drills !== undefined && {
			drills: {
				configured: details.drills.configured.map(drill => {
					const references = serializeReferences(drill.references)

					return {
						type: drill.type,
						name: accountRecoveryDrillWording(drill.type).label,
						reminderEveryNDays: drill.reminderEveryNDays,
						...(references.length > 0 && { references }),
					}
				}),
				missing: details.drills.missing.map(type => ({
					type,
					name: accountRecoveryDrillWording(type).label,
				})),
			},
		}),
	}
}

function serializeAccountUnruggabilityDetails(
	details: AccountUnruggabilityDetails,
): AccountUnruggabilityDetailsJsonExport {
	return {
		type: 'accountUnruggability',
		...(details.guardianPolicy !== undefined && {
			guardianPolicy: serializeGuardianPolicy(details.guardianPolicy),
		}),
		safeScenarios: details.safeScenarios.map(serializeScenario),
		takeoverScenarios: details.takeoverScenarios.map(serializeScenario),
	}
}

function serializeAddressCorrelationDetails(
	details: AddressCorrelationDetails,
): AddressCorrelationDetailsJsonExport {
	return {
		type: 'addressCorrelation',
		leaks: details.leaks.map(leak => {
			const references = serializeReferences(leak.references)

			return {
				source:
					leak.source.kind === 'onchain'
						? { kind: 'onchain' }
						: { kind: 'entity', ...serializeEntityRef(leak.source.entity) },
				correlatedInfo: leak.correlatedInfo.map(info => ({
					info,
					name: userInfoName(info).long,
				})),
				...(references.length > 0 && { references }),
			}
		}),
	}
}

function serializeChainVerificationDetails(
	details: ChainVerificationDetails,
): ChainVerificationDetailsJsonExport {
	return {
		type: 'chainVerification',
		lightClients: details.lightClients.map(client => {
			const { url, label } = ethereumL1LightClientUrl(client)

			return { id: client, name: label, url }
		}),
	}
}

function serializeFundingDetails(details: FundingDetails): FundingDetailsJsonExport {
	return {
		type: 'funding',
		strategies: details.strategies.map(({ strategy, userAligned }) => ({
			strategy,
			name: monetizationStrategyName(strategy),
			userAligned,
		})),
		revenueBreakdownIsPublic: details.revenueBreakdownIsPublic,
	}
}

function serializePrivateTransfersDetails(
	details: PrivateTransfersDetails,
	context: StructuredDetailsContext,
): PrivateTransfersDetailsJsonExport {
	return {
		type: 'privateTransfers',
		technologies: details.technologies.map(technology => ({
			technology: technology.technology,
			name: privateTransferTechnologyName[technology.technology],
			sending: serializeInlineText(technology.sending, context),
			receiving: serializeInlineText(technology.receiving, context),
			spending: serializeInlineText(technology.spending, context),
			...(technology.notes.length > 0 && {
				notes: technology.notes.map(note => serializeInlineText(note, context)),
			}),
		})),
		...(details.defaultModeNote !== undefined && {
			defaultModeNote: serializeInlineText(details.defaultModeNote, context),
		}),
	}
}

function serializeScamPreventionDetails(
	details: ScamPreventionDetails,
	context: StructuredDetailsContext,
): ScamPreventionDetailsJsonExport {
	return {
		type: 'scamPrevention',
		warnings: details.warnings.map(warning => {
			const references =
				warning.references === undefined ? [] : serializeReferences(warning.references)

			return {
				kind: warning.kind,
				description: renderStrings(warning.description, { ...context.strings }),
				...(warning.items !== undefined && { items: warning.items }),
				...(warning.conclusion !== undefined && { conclusion: warning.conclusion }),
				...(references.length > 0 && { references }),
			}
		}),
	}
}

function serializeSecurityAuditsDetails(
	details: SecurityAuditsDetails,
): SecurityAuditsDetailsJsonExport {
	const bugBountyReferences =
		details.bugBounty === undefined ? [] : serializeReferences(details.bugBounty.references)

	return {
		type: 'securityAudits',
		audits: auditsByRecency(details).map(audit => {
			const references = serializeReferences(audit.references)

			return {
				auditor: { id: audit.auditor.id, name: audit.auditor.name },
				auditDate: audit.auditDate,
				variants: audit.variants,
				findings:
					audit.findings.kind === 'noneFound'
						? 'NONE_FOUND'
						: audit.findings.kind === 'allFixed'
							? 'ALL_FIXED'
							: 'FLAWS',
				...(audit.findings.kind === 'flaws' && { flaws: [...audit.findings.flaws] }),
				...(references.length > 0 && { references }),
			}
		}),
		...(details.bugBounty !== undefined && {
			bugBounty: {
				availability: details.bugBounty.availability,
				coverage: details.bugBounty.coverage,
				...(details.bugBounty.platform !== undefined && { platform: details.bugBounty.platform }),
				...(details.bugBounty.rewards !== undefined && { rewards: details.bugBounty.rewards }),
				...(details.bugBounty.legalProtection !== undefined && {
					legalProtection: details.bugBounty.legalProtection,
				}),
				...(details.bugBounty.disclosureDays !== undefined && {
					disclosureDays: details.bugBounty.disclosureDays,
				}),
				upgradePathAvailable: details.bugBounty.upgradePathAvailable,
				...(bugBountyReferences.length > 0 && { references: bugBountyReferences }),
			},
		}),
	}
}

function serializeTransactionInclusionDetails(
	details: TransactionInclusionDetails,
): TransactionInclusionDetailsJsonExport {
	const l1References =
		details.l1References === undefined ? [] : serializeReferences(details.l1References)
	const l2References =
		details.l2References === undefined ? [] : serializeReferences(details.l2References)

	return {
		type: 'transactionInclusion',
		l1Broadcast: details.l1Broadcast,
		l2s: details.l2s.map(({ l2, forceInclusion }) => ({
			l2,
			name: transactionSubmissionL2TypeName(l2),
			forceInclusion,
		})),
		...(l1References.length > 0 && { l1References }),
		...(l2References.length > 0 && { l2References }),
	}
}

const jsonSerializers: StructuredDetailsRenderers<StructuredDetailsJsonExport> = {
	accountRecovery: serializeAccountRecoveryDetails,
	accountUnruggability: serializeAccountUnruggabilityDetails,
	addressCorrelation: serializeAddressCorrelationDetails,
	chainVerification: serializeChainVerificationDetails,
	funding: serializeFundingDetails,
	privateTransfers: serializePrivateTransfersDetails,
	scamPrevention: serializeScamPreventionDetails,
	securityAudits: serializeSecurityAuditsDetails,
	transactionInclusion: serializeTransactionInclusionDetails,
}

export function serializeStructuredDetails(
	details: StructuredDetails,
	context: StructuredDetailsContext,
): StructuredDetailsJsonExport {
	return dispatchStructuredDetails(jsonSerializers, details, context)
}
