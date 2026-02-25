import type { MustRef, WithRef } from '@/schema/reference'
import type { CalendarDate } from '@/types/date'
import { type NonEmptySet } from '@/types/utils/non-empty'

import type { Support } from '../support'
/**
 * Bug bounty program data is almost entirely researchable, no hands-on
 * wallet testing is required. The primary sources are:
 *   1. The wallet's bug bounty page (linked from the wallet's security
 *      documentation or directly on the platform listed below).
 *   2. The bug bounty platform page (HackerOne, Immunefi, Bugcrowd, etc.)
 *      which typically lists scope, rewards, disclosure policy, and legal terms.
 *   3. The wallet's Terms of Service or Security Policy for legal protections.
 */

/**
 * Platforms that host bug bounty programs.
 * To identify: look for a "Bug Bounty", "Security", or "Responsible Disclosure"
 * link on the wallet's website. The platform is usually obvious from the URL
 * Use SELF_HOSTED if the program is run directly on the wallet's own website
 * with no third-party platform involved.
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
 * Types of legal protection provided to security researchers.
 *
 * Legal protections give researchers explicit assurance
 * they won't be prosecuted or sued for good-faith work.
 *
 * To identify: look for a "Legal" or "Safe Harbor" section on the bug bounty
 * page, or in the wallet's Terms of Service or Security Policy.
 */
export enum LegalProtectionType {
	/**
	 * The wallet explicitly grants researchers a "Safe Harbor" — formal legal
	 * language stating that good-faith security research will not result in
	 * legal action, even if the research technically violated the ToS or
	 * computer fraud laws.
	 * Safe Harbor language typically waives relevant ToS restrictions and
	 * references a defined standard for "Good Faith Security Research".
	 * (e.g. MetaMask's HackerOne page has a Safe Harbor section stating they
	 * waive any ToS restriction that conflicts with good-faith research.)
	 * To identify: the bug bounty page or security policy has an explicit
	 * "Safe Harbor" heading or section using that exact term, with formal
	 * legal commitment language.
	 */
	SAFE_HARBOR = 'SAFE_HARBOR',

	/**
	 * The wallet provides a softer form of legal protection — a pledge or
	 * policy commitment not to pursue legal action against researchers acting
	 * in good faith, but without formal Safe Harbor legal language.
	 * (e.g. A statement like "We will not take legal action against researchers
	 * who follow our responsible disclosure guidelines" without referencing
	 * Safe Harbor specifically.)
	 * To identify: the bug bounty page has a promise not to sue researchers,
	 * but does not use formal "Safe Harbor" language or a dedicated legal section.
	 * Use SAFE_HARBOR instead if the page explicitly uses that term.
	 */
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
	 * The type of legal protection provided.
	 * The ref must link directly to the section of the bug bounty page or
	 * security policy that contains the legal protection language.
	 */
	type: LegalProtectionType
}>

/**
 * The availability of the bug bounty program.
 * To identify: check whether the bug bounty page is currently accepting new
 * vulnerability reports. Platform pages (HackerOne, Immunefi, etc.) usually
 * show a clear "Accepting reports" or "Paused" status.
 */
export enum BugBountyProgramAvailability {
	/** The program is currently running and accepting new vulnerability reports. */
	ACTIVE = 'ACTIVE',

	/**
	 * The program exists but is temporarily paused and not accepting reports.
	 * (e.g. A wallet that had a program but has since suspended it.)
	 * If the program never existed at all, set the top-level `bugBountyProgram`
	 * field to `notSupported` rather than using this value.
	 */
	INACTIVE = 'INACTIVE',
}

/**
 * The scope of what the bug bounty program covers.
 * To identify: look for a "Scope" or "In Scope" section on the bug bounty page.
 * Use `FULL_SCOPE` (the string) when everything is in scope — app, backend,
 * smart contracts, firmware, hardware, etc. Use the specific enum values when
 * the scope is explicitly restricted to only one component.
 */
export enum CoverageBreadth {
	/**
	 * Only the wallet application (browser extension, mobile/desktop app) is
	 * in scope. Backend services, firmware, and hardware are excluded.
	 */
	APP_ONLY = 'APP_ONLY',

	/**
	 * Only the device firmware is in scope. The app and hardware are excluded.
	 * Typically used for hardware wallets.
	 */
	FIRMWARE_ONLY = 'FIRMWARE_ONLY',

	/**
	 * Only the hardware design is in scope. The app and firmware are excluded.
	 * Typically used for hardware wallets with a separate hardware bounty.
	 */
	HARDWARE_ONLY = 'HARDWARE_ONLY',
}

/**
 * Information about the bug bounty program implementation.
 * The ref must link to the bug bounty program page (on the platform or
 * the wallet's own site).
 */
export type BugBountyProgramSupport = WithRef<{
	/**
	 * The date the bug bounty program started (YYYY-MM-DD).
	 * To identify: some platforms show a "Program started" date on the
	 * program page. Otherwise, check the wallet's blog or changelog for
	 * the announcement. If only the year/month is known, use the first
	 * day of that month as an approximation.
	 */
	dateStarted: CalendarDate

	/**
	 * Whether the program is currently accepting reports.
	 * See `BugBountyProgramAvailability` for how to identify.
	 */
	availability: BugBountyProgramAvailability

	/**
	 * What parts of the wallet are in scope.
	 * Use the string `'FULL_SCOPE'` when everything is in scope.
	 * See `CoverageBreadth` for how to identify specific scopes.
	 */
	coverageBreadth: AtLeastOneCoverageBreadth | 'FULL_SCOPE'

	/**
	 * The reward range offered to researchers.
	 * To identify: look for a "Rewards" or "Bounties" section on the program
	 * page. Rewards are typically shown as a table by severity (Critical, High,
	 * Medium, Low). Use the lowest reward across all severities as `minimum`
	 * and the highest as `maximum`. Set to not supported if no monetary rewards
	 * are offered (e.g. acknowledgement-only programs).
	 */
	rewards: Support<{
		minimum: number
		maximum: number
		currency: string
	}>

	/**
	 * The platform hosting the program.
	 * See `BugBountyPlatform` for how to identify.
	 */
	platform: BugBountyPlatform

	/**
	 * The coordinated disclosure policy — how long the wallet developer has
	 * to fix a reported vulnerability before the researcher may publish it.
	 * To identify: look for a "Disclosure" or "Responsible Disclosure" section
	 * on the bug bounty page. The `numberOfDays` is the embargo period in days
	 * (e.g. 90 days is the industry standard set by Google Project Zero).
	 * Set to not supported if the program has no defined disclosure timeline
	 * or prohibits public disclosure entirely.
	 */
	disclosure: Support<{
		numberOfDays: number
	}>

	/**
	 * Whether users can receive a fix for discovered vulnerabilities —
	 * i.e. whether the wallet has an update mechanism that reaches existing users.
	 * (e.g. `true`: the wallet is distributed via an app store or has
	 * auto-updates, so a patched version can reach all users.
	 * `false`: the wallet has no update mechanism — e.g. a static binary
	 * with no distribution channel — so a fix cannot be delivered to users
	 * who already installed the vulnerable version.)
	 * To identify: check whether the wallet is distributed through an app store,
	 * browser extension store, or has an auto-update mechanism. If users must
	 * manually replace binaries with no notification, set to false.
	 */
	upgradePathAvailable: boolean

	/**
	 * Legal protections offered to researchers acting in good faith.
	 * See `LegalProtectionType` for the distinction between Safe Harbor and
	 * Legal Assurance, and how to identify which applies.
	 * Set to not supported if the program offers no legal protections.
	 */
	legalProtections: Support<LegalProtection>
}>

/**
 * A record of bug bounty program support
 */
export type BugBountyProgramImplementation = WithRef<BugBountyProgramSupport>
