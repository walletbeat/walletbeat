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

function analyticsWithoutConsent(
	ctx: EvaluationContext<PrivacyHygieneValue>,
): Evaluation<PrivacyHygieneValue> {
	return ctx.build({
		value: {
			id: 'analytics_without_consent',
			rating: Rating.FAIL,
			displayName: 'Analytics without prior consent',
			shortExplanation: sentence(
				'{{WALLET_NAME}} uses analytics (such as Matomo or Sentry) without asking for user consent first.',
			),
		},
		details: sentence(
			'{{WALLET_NAME}} uses analytics (such as Matomo or Sentry) without asking for user consent first.',
		),
		howToImprove: sentence(
			'{{WALLET_NAME}} should ask for user consent before enabling analytics.',
		),
		impact: paragraph(
			"Using analytics without prior consent sends usage data to external services without the user's agreement.",
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
				'{{WALLET_NAME}} does not send browsing history or wallet-connected domains without consent, and asks for consent before using analytics.',
			),
		},
		details: sentence(
			'{{WALLET_NAME}} does not send browsing history or wallet-connected domains without consent, and asks for consent before using analytics.',
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
			'Analytics (Matomo, Sentry, etc.) should only be used after the user has agreed.',
			'This attribute encodes that baseline.',
		].join(' '),
	),
	methodology: markdown(
		'We consider default behavior; we look at network requests and data-collection policies; we fail if browsing history or wallet-connected domains are sent by default, or if analytics are used without prior consent.',
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
				sentence(
					'The wallet uses analytics (e.g. Matomo or Sentry) without asking for user consent first.',
				),
				analyticsWithoutConsent(EvaluationContext.forTest(() => privacyHygiene)),
			),
		],
		partial: [],
		pass: exampleRating(
			sentence(
				'The wallet does not send browsing history or wallet-connected domains without consent, and asks for consent before using analytics.',
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

		const analyticsConsent = ctx.features.privacy.analyticsConsent

		if (
			analyticsConsent === CollectionPolicy.BY_DEFAULT ||
			analyticsConsent === CollectionPolicy.ALWAYS
		) {
			return analyticsWithoutConsent(ctx)
		}

		if (hasAnalyticsInSomeFlow && analyticsConsent === null) {
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
