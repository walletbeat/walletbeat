import type { MustRef, WithRef } from '@/schema/reference'

import { type Support } from '../support'

/**
 * What level of orderflow / MEV auctioning information is shown by default and
 * after a user action during transaction confirmation.
 */
export enum OrderflowDisclosureLevel {
	/** No mention of auction / orderflow / MEV. */
	NONE = 'NONE',

	/**
	 * Single line or toggle (e.g. "MEV protection", "Private tx") without full
	 * breakdown.
	 */
	AGGREGATED = 'AGGREGATED',

	/**
	 * Clear block: auctioning disclosed, stats or kickback called out, Learn more
	 * to practices page.
	 */
	COMPREHENSIVE = 'COMPREHENSIVE',
}

/**
 * How much orderflow / MEV information is displayed by default and after a user action.
 *
 * `byDefault` and `afterSingleAction` must tell a consistent story: one user action may
 * reveal the same or more detail, but never less. Enforced by
 * `validateOrderflowDisclosure`.
 *
 * Valid pairs include `(NONE, NONE)`, `(NONE, AGGREGATED)`, `(AGGREGATED, AGGREGATED)`,
 * `(AGGREGATED, COMPREHENSIVE)`, and `(COMPREHENSIVE, COMPREHENSIVE)`.
 *
 * Invalid examples:
 * - `(AGGREGATED, NONE)` — e.g. "MEV protection: on" is visible by default, but nothing
 *   orderflow-related appears after the user taps it.
 * - `(COMPREHENSIVE, AGGREGATED)` — a full orderflow block is shown by default, but one
 *   action collapses it to a single line.
 */
export interface OrderflowDisclosure {
	/** Level shown with default settings and no orderflow-related user action. */
	byDefault: OrderflowDisclosureLevel

	/**
	 * Level shown after at most one orderflow-related user action (e.g. tapping a
	 * row, toggle, or "Learn more"), with no settings changed.
	 */
	afterSingleAction: OrderflowDisclosureLevel
}

/** Whether the wallet documents how users can verify onchain outcomes. */
export enum OnchainVerificationDocumentation {
	NO_METHOD_DOCUMENTED = 'NO_METHOD_DOCUMENTED',
	METHOD_DOCUMENTED = 'METHOD_DOCUMENTED',
	METHOD_DOCUMENTED_AND_EFFECTIVE = 'METHOD_DOCUMENTED_AND_EFFECTIVE',
}

/** Contents researchers evaluate on the wallet's orderflow practices page. */
export interface OrderflowPracticesPageContents {
	listsEntitiesAndWhatTheyDo: boolean
	explainsDefaultOrderflowAuctioning: boolean
	documentsHowToChangeDefaults: boolean
	onchainVerification: OnchainVerificationDocumentation
	/** Calendar date shown on the wallet's practices page (YYYY-MM-DD). */
	pageLastUpdated: string
}

/** Orderflow transparency practices beyond data-collection entity rows. */
export type OrderflowPractices = WithRef<{
	disclosure: WithRef<OrderflowDisclosure>
	userCanRemoveAuctioning: Support
	practicesPage: Support<
		MustRef<{
			url: string
			contents: WithRef<OrderflowPracticesPageContents>
		}>
	>
}>

/**
 * Validates that `OrderflowDisclosure` levels are consistent (parallel to fee display
 * rules).
 *
 * - Rule 1: `afterSingleAction` cannot be `NONE` when `byDefault` is `AGGREGATED` or
 *   `COMPREHENSIVE`.
 * - Rule 2: `byDefault` `COMPREHENSIVE` requires `afterSingleAction` `COMPREHENSIVE`.
 *
 * @throws When either rule is violated.
 */
export function validateOrderflowDisclosure(orderflow: OrderflowDisclosure): void {
	if (
		(orderflow.byDefault === OrderflowDisclosureLevel.AGGREGATED ||
			orderflow.byDefault === OrderflowDisclosureLevel.COMPREHENSIVE) &&
		orderflow.afterSingleAction === OrderflowDisclosureLevel.NONE
	) {
		throw new Error(
			'Invalid orderflow disclosure: Cannot have afterSingleAction=NONE if the default behavior is not NONE',
		)
	}

	if (
		orderflow.byDefault === OrderflowDisclosureLevel.COMPREHENSIVE &&
		orderflow.afterSingleAction !== OrderflowDisclosureLevel.COMPREHENSIVE
	) {
		throw new Error(
			'Invalid orderflow disclosure: Cannot have byDefault=COMPREHENSIVE if the afterSingleAction behavior is not also comprehensive',
		)
	}
}
