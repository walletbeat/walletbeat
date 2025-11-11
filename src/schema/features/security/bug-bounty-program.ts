import type { MustRef, WithRef } from '@/schema/reference'
import type { CalendarDate } from '@/types/date'
import { type NonEmptySet } from '@/types/utils/non-empty'

import type { Support } from '../support'
/**
 * Platforms of bug bounty programs
 */
export enum BugBountyPlatform {
	SELF_HOSTED = 'Self-hosted',
	HACKER_ONE = 'Hacker One',
	BUG_CROWD = 'Bugcrowd',
	INTIGRITI = 'Intigriti',
	IMMUNEFI = 'Immunefi',
	BUGRAP = 'Bugrap',
}

/**
 * Types of legal protection provided to security researchers
 * SAFE_HARBOR: Explicit Safe Harbor language
 * LEGAL_ASSURANCE: Pledges not to sue, similar protections
 */
export enum LegalProtectionType {
	SAFE_HARBOR = 'SAFE_HARBOR',
	LEGAL_ASSURANCE = 'LEGAL_ASSURANCE',
}

/**
 * A set of at least one coverage breadth
 */
export type AtLeastOneCoverageBreadth = NonEmptySet<CoverageBreadth>

/**
 * Information about legal protections for security researchers
 */
export type LegalProtection = MustRef<{
	/**
	 * The type of legal protection provided
	 */
	type: LegalProtectionType
}>

/**
 * The availability of the bug bounty program
 * Active - Running now, accepting reports
 * Inactive - Temporarily paused
 * Never - Never existed
 */
export enum BugBountyProgramAvailability {
	ACTIVE = 'ACTIVE',
	INACTIVE = 'INACTIVE',
}

/**
 * The coverage breadth of the bug bounty program
 */
export enum CoverageBreadth {
	APP_ONLY = 'APP_ONLY',
	FIRMWARE_ONLY = 'FIRMWARE_ONLY',
	HARDWARE_ONLY = 'HARDWARE_ONLY',
}

/**
 * Information about the bug bounty program implementation
 */
export type BugBountyProgramSupport = WithRef<{
	/**
	 * The date the bug bounty program started
	 */
	dateStarted: CalendarDate

	/**
	 * The availability of the bug bounty program
	 */
	availability: BugBountyProgramAvailability

	/**
	 * The coverage breadth of the bug bounty program
	 */
	coverageBreadth: AtLeastOneCoverageBreadth | 'FULL_SCOPE'

	/**
	 * The rewards for the bug bounty program
	 */
	rewards: Support<{
		minimum: number
		maximum: number
		currency: string
	}>

	/**
	 * The platform of the bug bounty program
	 */
	platform: BugBountyPlatform

	/**
	 * The disclosure process of the bug bounty program;
	 * number of days, privacy of reports, etc.
	 */
	disclosure: Support<{
		numberOfDays: number
	}>

	/**
	 * Whether the wallet offers an upgrade path for security issues
	 */
	upgradePathAvailable: boolean

	/**
	 * The legal protections offered to security researchers
	 */
	legalProtections: Support<LegalProtection>
}>

/**
 * A record of bug bounty program support
 */
export type BugBountyProgramImplementation = WithRef<BugBountyProgramSupport>
