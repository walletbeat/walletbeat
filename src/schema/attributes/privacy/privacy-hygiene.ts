import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	type ExemptEvaluation,
	Rating,
	type Value,
} from '@/schema/attributes'
import {
	collectedByDefault,
	CollectionPolicy,
	type DataCollection,
	DataCollectionPurpose,
	PersonalInfo,
	qualifiedDataCollection,
	userFlow,
	type UserInfo,
	userInfoEnums,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import { isSupported } from '@/schema/features/support'
import type { AtLeastOneVariant } from '@/schema/variants'
import { verifiabilityRequiresSourceCodeAccess } from '@/schema/verifiability'
import type { WalletMetadata } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'
import { isNonEmptyArray } from '@/types/utils/non-empty'

import { exempt, pickWorstRating, unrated } from '../common'

export type PrivacyHygieneValue = Value

/**
 * Whether this type of user information is forbidden without prior user consent.
 *
 * Keep this switch exhaustive: if a new `UserInfo` is added, TypeScript should force
 * you to decide whether it belongs in this category.
 */
function isForbiddenWithoutPriorConsentUserInfo(userInfo: UserInfo): boolean {
	switch (userInfo) {
		case PersonalInfo.BROWSING_HISTORY_URLS:
		case WalletInfo.WALLET_CONNECTED_DOMAINS:
			return true

		case PersonalInfo.IP_ADDRESS:
		case PersonalInfo.TRACKING_IDENTIFIER:
		case PersonalInfo.PSEUDONYM:
		case PersonalInfo.LEGAL_NAME:
		case PersonalInfo.EMAIL:
		case PersonalInfo.PHONE:
		case PersonalInfo.CONTACTS:
		case PersonalInfo.PHYSICAL_ADDRESS:
		case PersonalInfo.FACE:
		case PersonalInfo.CEX_ACCOUNT:
		case PersonalInfo.GOVERNMENT_ID:
		case PersonalInfo.X_DOT_COM_ACCOUNT:
		case PersonalInfo.FARCASTER_ACCOUNT:
		case WalletInfo.USER_ACTIONS:
		case WalletInfo.ACCOUNT_ADDRESS:
		case WalletInfo.BALANCE:
		case WalletInfo.ASSETS:
		case WalletInfo.MEMPOOL_TRANSACTIONS:
			return false
	}
}

function browsingHistoryByDefault(
	ctx: EvaluationContext<PrivacyHygieneValue>,
): Evaluation<PrivacyHygieneValue> {
	return ctx.build({
		value: {
			id: 'browsing_history_by_default',
			rating: Rating.FAIL,
			displayName: 'Browsing history sent by default',
			shortExplanation: sentence(
				'{{WALLET_NAME}} sends browsing history to an external service by default without consent.',
			),
		},
		details: sentence(
			'{{WALLET_NAME}} sends browsing history to an external service by default without consent.',
		),
		howToImprove: sentence(
			'{{WALLET_NAME}} should not send browsing history without prior user consent.',
		),
		impact: paragraph(
			'Sending browsing history by default allows external entities to profile you and undermines expectations of privacy.',
		),
	})
}

function walletConnectedDomainsByDefault(
	ctx: EvaluationContext<PrivacyHygieneValue>,
): Evaluation<PrivacyHygieneValue> {
	return ctx.build({
		value: {
			id: 'wallet_connected_domains_by_default',
			rating: Rating.FAIL,
			displayName: 'Wallet-connected domains sent by default',
			shortExplanation: sentence(
				'{{WALLET_NAME}} sends wallet-connected domains to an external service by default without consent.',
			),
		},
		details: sentence(
			'{{WALLET_NAME}} sends wallet-connected domains to an external service by default without consent.',
		),
		howToImprove: sentence(
			'{{WALLET_NAME}} should not send wallet-connected domains without prior user consent.',
		),
		impact: paragraph(
			'Sending wallet-connected domains by default allows external entities to profile you and undermines expectations of privacy.',
		),
	})
}

function browsingHistoryAndWalletConnectedDomainsByDefault(
	ctx: EvaluationContext<PrivacyHygieneValue>,
): Evaluation<PrivacyHygieneValue> {
	return ctx.build({
		value: {
			id: 'browsing_history_and_wallet_connected_domains_by_default',
			rating: Rating.FAIL,
			displayName: 'Browsing history and wallet-connected domains sent by default',
			shortExplanation: sentence(
				'{{WALLET_NAME}} sends browsing history and wallet-connected domains to an external service by default without consent.',
			),
		},
		details: sentence(
			'{{WALLET_NAME}} sends browsing history and wallet-connected domains to an external service by default without consent.',
		),
		howToImprove: sentence(
			'{{WALLET_NAME}} should not send browsing history or wallet-connected domains without prior user consent.',
		),
		impact: paragraph(
			'Sending browsing history and wallet-connected domains by default allows external entities to profile you and undermines expectations of privacy.',
		),
	})
}

function usageAnalyticsWithoutConsent(
	ctx: EvaluationContext<PrivacyHygieneValue>,
): Evaluation<PrivacyHygieneValue> {
	return ctx.build({
		value: {
			id: 'usage_analytics_without_consent',
			rating: Rating.FAIL,
			displayName: 'Usage analytics without prior consent',
			shortExplanation: sentence(
				'{{WALLET_NAME}} uses product analytics without asking for user consent first.',
			),
		},
		details: sentence(
			'{{WALLET_NAME}} uses product analytics without asking for user consent first.',
		),
		howToImprove: sentence(
			'{{WALLET_NAME}} should ask for user consent before enabling product analytics.',
		),
		impact: paragraph(
			"Using product analytics without prior consent sends usage data to external services without the user's agreement.",
		),
	})
}

function crashReportingWithoutConsent(
	ctx: EvaluationContext<PrivacyHygieneValue>,
): Evaluation<PrivacyHygieneValue> {
	return ctx.build({
		value: {
			id: 'crash_reporting_without_consent',
			rating: Rating.PARTIAL,
			displayName: 'Crash reporting without prior consent',
			shortExplanation: sentence(
				'{{WALLET_NAME}} sends crash/error reports without asking for user consent first.',
			),
		},
		details: sentence(
			'{{WALLET_NAME}} sends crash/error reports without asking for user consent first.',
		),
		howToImprove: sentence(
			'{{WALLET_NAME}} should ask for user consent before enabling crash/error reporting.',
		),
		impact: paragraph(
			'Collecting crash reports without prior consent can expose wallet usage context without explicit user agreement, even when product analytics are disabled or consented.',
		),
	})
}

function noForbiddenDataByDefault(
	ctx: EvaluationContext<PrivacyHygieneValue>,
): Evaluation<PrivacyHygieneValue> {
	return ctx.build({
		value: {
			id: 'no_forbidden_data_by_default',
			rating: Rating.PASS,
			displayName: 'No forbidden data sent by default',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not send browsing history or wallet-connected domains without consent, and asks for consent before using product analytics or crash/error reporting.',
			),
		},
		details: sentence(
			'{{WALLET_NAME}} does not send browsing history or wallet-connected domains without consent, and asks for consent before using product analytics or crash/error reporting.',
		),
	})
}

interface AnalyticsTelemetryResult {
	evaluations: Array<Evaluation<PrivacyHygieneValue>>
	hasIncompleteAnalyticsData: boolean
}

/**
 * Evaluates usage analytics and crash reporting telemetry policy.
 * Calls `ctx.addRef` for each supported analytics feature.
 *
 * Usage analytics without consent is rated FAIL (sends behavioral data);
 * crash reporting without consent is rated PARTIAL (less sensitive, but still
 * collected without agreement). Both are collected independently so
 * `pickWorstRating` can select the appropriate overall rating.
 *
 * `hasIncompleteAnalyticsData` is true when either analytics feature is null,
 * signaling the caller that a confident PASS cannot be issued.
 */
function evaluateAnalyticsTelemetry(
	ctx: EvaluationContext<PrivacyHygieneValue>,
): AnalyticsTelemetryResult {
	const usageAnalytics = ctx.features.privacy.analytics.usage
	const crashReportsAnalytics = ctx.features.privacy.analytics.crashReports
	const evaluations: Array<Evaluation<PrivacyHygieneValue>> = []

	if (usageAnalytics !== null && isSupported(usageAnalytics)) {
		ctx.addRef(usageAnalytics)

		if (
			usageAnalytics.policy === CollectionPolicy.BY_DEFAULT ||
			usageAnalytics.policy === CollectionPolicy.ALWAYS
		) {
			evaluations.push(usageAnalyticsWithoutConsent(ctx))
		}
	}

	if (crashReportsAnalytics !== null && isSupported(crashReportsAnalytics)) {
		ctx.addRef(crashReportsAnalytics)

		if (
			crashReportsAnalytics.policy === CollectionPolicy.BY_DEFAULT ||
			crashReportsAnalytics.policy === CollectionPolicy.ALWAYS
		) {
			evaluations.push(crashReportingWithoutConsent(ctx))
		}
	}

	return {
		evaluations,
		hasIncompleteAnalyticsData: usageAnalytics === null || crashReportsAnalytics === null,
	}
}

interface FlowScanResult {
	hasUnknownFlowData: boolean
	hasAnalyticsInSomeFlow: boolean
	sendsBrowsingHistoryByDefault: boolean
	sendsWalletConnectedDomainsByDefault: boolean
}

/**
 * Scans all user flows in `dataCollection` for forbidden-by-default data and
 * analytics usage. Calls `ctx.addRef` on every collected-data entry that
 * involves analytics or forbidden data, so the evaluation evidence trail is
 * complete regardless of the final rating.
 *
 * Returns data-only flags; the caller is responsible for mapping these flags
 * to `Evaluation` objects.
 */
function scanFlowsForForbiddenDataViolations(
	dataCollection: DataCollection,
	ctx: EvaluationContext<PrivacyHygieneValue>,
): FlowScanResult {
	let hasUnknownFlowData = false
	let hasAnalyticsInSomeFlow = false
	let sendsBrowsingHistoryByDefault = false
	let sendsWalletConnectedDomainsByDefault = false
	const forbiddenInfos = userInfoEnums.items.filter(isForbiddenWithoutPriorConsentUserInfo)

	for (const flow of userFlow.items) {
		const forFlow = dataCollection[flow]

		if (forFlow === null) {
			hasUnknownFlowData = true
			continue
		}

		if (forFlow === undefined || forFlow === 'FLOW_NOT_SUPPORTED') {
			continue
		}

		for (const collected of forFlow.collected) {
			const hasAnalyticsPurpose = collected.purposes.includes(DataCollectionPurpose.ANALYTICS)

			hasAnalyticsInSomeFlow = hasAnalyticsInSomeFlow || hasAnalyticsPurpose

			const qualifiedCollection = qualifiedDataCollection(collected.dataCollection)

			const collectsForbiddenData = forbiddenInfos.some(
				info => qualifiedCollection[info] !== CollectionPolicy.NEVER,
			)

			if (hasAnalyticsPurpose || collectsForbiddenData) {
				ctx.addRef(collected)
			}

			for (const info of forbiddenInfos) {
				if (collectedByDefault(qualifiedCollection[info])) {
					if (info === PersonalInfo.BROWSING_HISTORY_URLS) {
						sendsBrowsingHistoryByDefault = true
					}

					if (info === WalletInfo.WALLET_CONNECTED_DOMAINS) {
						sendsWalletConnectedDomainsByDefault = true
					}
				}
			}
		}
	}

	return {
		hasUnknownFlowData,
		hasAnalyticsInSomeFlow,
		sendsBrowsingHistoryByDefault,
		sendsWalletConnectedDomainsByDefault,
	}
}

export const privacyHygiene: Attribute<PrivacyHygieneValue> = {
	id: 'privacyHygiene',
	icon: '\u{1f9fc}', // Soap
	displayName: 'Privacy hygiene',
	wording: {
		midSentenceName: 'privacy hygiene',
	},
	question: sentence('Does {{WALLET_NAME}} only send sensitive data with your explicit consent?'),
	why: markdown(
		[
			'Users expect that data like browsing history and which sites they connect their wallet to is never sent without consent.',
			'Much like users would not expect a web browser to leak browsing history for analytics, they should not expect wallets to track every site interaction by default.',
			'Product analytics and crash/error reporting telemetry should only be used after the user has agreed.',
			'This attribute encodes that baseline.',
		].join(' '),
	),
	methodology: markdown(
		[
			'We evaluate default behavior using network requests and published data-collection policies.',
			'The wallet fails if it sends browsing history or wallet-connected domains by default.',
			'The wallet also fails if it uses product analytics without prior consent.',
			'It gets a partial rating when crash/error reporting runs without prior consent.',
		].join(' '),
	),
	ratingScale: {
		display: 'fail-pass',
		exhaustive: false,
		fail: [
			exampleRating(
				sentence(
					'The wallet sends browsing history to an external service by default without consent.',
				),
				browsingHistoryByDefault(EvaluationContext.forTest(() => privacyHygiene)),
			),
			exampleRating(
				sentence(
					'The wallet sends wallet-connected domains to an external service by default without consent.',
				),
				walletConnectedDomainsByDefault(EvaluationContext.forTest(() => privacyHygiene)),
			),
			exampleRating(
				sentence(
					'The wallet sends browsing history and wallet-connected domains to an external service by default without consent.',
				),
				browsingHistoryAndWalletConnectedDomainsByDefault(
					EvaluationContext.forTest(() => privacyHygiene),
				),
			),
			exampleRating(
				sentence('The wallet uses product analytics without asking for user consent first.'),
				usageAnalyticsWithoutConsent(EvaluationContext.forTest(() => privacyHygiene)),
			),
		],
		partial: [
			exampleRating(
				sentence(
					'The wallet asks for consent before product analytics, but sends crash/error reports without prior consent.',
				),
				crashReportingWithoutConsent(EvaluationContext.forTest(() => privacyHygiene)),
			),
		],
		pass: exampleRating(
			sentence(
				'The wallet does not send browsing history or wallet-connected domains without consent, and asks for consent before using product analytics or crash/error reporting.',
			),
			noForbiddenDataByDefault(EvaluationContext.forTest(() => privacyHygiene)),
		),
	},
	exempted: (
		ctx: EvaluationContext<PrivacyHygieneValue>,
		_metadata: WalletMetadata,
	): ExemptEvaluation<PrivacyHygieneValue> | null => {
		if (ctx.features.type === WalletType.HARDWARE) {
			return exempt(ctx, sentence('This attribute is not applicable for hardware wallets.'), null)
		}

		return null
	},
	evaluate: (ctx: EvaluationContext<PrivacyHygieneValue>): Evaluation<PrivacyHygieneValue> => {
		ctx.setVerifiability(verifiabilityRequiresSourceCodeAccess({ coreOnlyIsSufficient: false }))

		const dataCollection = ctx.features.privacy.dataCollection

		if (dataCollection === null) {
			return unrated(ctx, null)
		}

		const flowScan = scanFlowsForForbiddenDataViolations(dataCollection, ctx)
		const analytics = evaluateAnalyticsTelemetry(ctx)
		const evaluations: Array<Evaluation<PrivacyHygieneValue>> = []

		if (flowScan.sendsBrowsingHistoryByDefault && flowScan.sendsWalletConnectedDomainsByDefault) {
			evaluations.push(browsingHistoryAndWalletConnectedDomainsByDefault(ctx))
		} else if (flowScan.sendsBrowsingHistoryByDefault) {
			evaluations.push(browsingHistoryByDefault(ctx))
		} else if (flowScan.sendsWalletConnectedDomainsByDefault) {
			evaluations.push(walletConnectedDomainsByDefault(ctx))
		}

		evaluations.push(...analytics.evaluations)

		// Incomplete data must be checked before we issue a PASS, because missing
		// analytics or flow data means we cannot confidently say nothing is wrong.
		if (flowScan.hasAnalyticsInSomeFlow && analytics.hasIncompleteAnalyticsData) {
			return unrated(ctx, null)
		}

		if (flowScan.hasUnknownFlowData) {
			return unrated(ctx, null)
		}

		if (isNonEmptyArray(evaluations)) {
			return pickWorstRating<PrivacyHygieneValue>(evaluations)
		}

		return noForbiddenDataByDefault(ctx)
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<PrivacyHygieneValue>>) =>
		pickWorstRating<PrivacyHygieneValue>(perVariant),
}
