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
	DataCollectionPurpose,
	PersonalInfo,
	qualifiedDataCollection,
	userFlow,
	type UserInfo,
	userInfoEnums,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import type { AtLeastOneVariant } from '@/schema/variants'
import { verifiabilityRequiresSourceCodeAccess } from '@/schema/verifiability'
import type { WalletMetadata } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'

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

		let hasUnknownFlowData = false
		let hasAnalyticsInSomeFlow = false
		const forbiddenInfos = userInfoEnums.items.filter(isForbiddenWithoutPriorConsentUserInfo)
		let sendsBrowsingHistoryByDefault = false
		let sendsWalletConnectedDomainsByDefault = false

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
				let collectsForbiddenData = false
				let collectsForbiddenDataByDefault = false

				for (const info of forbiddenInfos) {
					collectsForbiddenData =
						collectsForbiddenData || qualifiedCollection[info] !== CollectionPolicy.NEVER

					if (collectedByDefault(qualifiedCollection[info])) {
						collectsForbiddenDataByDefault = true

						if (info === PersonalInfo.BROWSING_HISTORY_URLS) {
							sendsBrowsingHistoryByDefault = true
						}

						if (info === WalletInfo.WALLET_CONNECTED_DOMAINS) {
							sendsWalletConnectedDomainsByDefault = true
						}
					}
				}

				if (hasAnalyticsPurpose || collectsForbiddenData || collectsForbiddenDataByDefault) {
					ctx.addRef(collected)
				}
			}
		}

		if (sendsBrowsingHistoryByDefault && sendsWalletConnectedDomainsByDefault) {
			return browsingHistoryAndWalletConnectedDomainsByDefault(ctx)
		}

		if (sendsBrowsingHistoryByDefault) {
			return browsingHistoryByDefault(ctx)
		}

		if (sendsWalletConnectedDomainsByDefault) {
			return walletConnectedDomainsByDefault(ctx)
		}

		const usageAnalyticsConsent = ctx.features.privacy.usageAnalyticsConsent
		const crashReportingConsent = ctx.features.privacy.crashReportingConsent

		if (
			usageAnalyticsConsent === CollectionPolicy.BY_DEFAULT ||
			usageAnalyticsConsent === CollectionPolicy.ALWAYS
		) {
			return usageAnalyticsWithoutConsent(ctx)
		}

		if (
			crashReportingConsent === CollectionPolicy.BY_DEFAULT ||
			crashReportingConsent === CollectionPolicy.ALWAYS
		) {
			return crashReportingWithoutConsent(ctx)
		}

		if (
			hasAnalyticsInSomeFlow &&
			(usageAnalyticsConsent === null || crashReportingConsent === null)
		) {
			return unrated(ctx, null)
		}

		if (hasUnknownFlowData) {
			return unrated(ctx, null)
		}

		return noForbiddenDataByDefault(ctx)
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<PrivacyHygieneValue>>) =>
		pickWorstRating<PrivacyHygieneValue>(perVariant),
}
