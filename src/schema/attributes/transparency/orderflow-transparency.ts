import {
	exampleOrderflowAuctioneer,
	exampleWalletDevelopmentCompany,
} from '@/data/entities/example'
import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	Rating,
	Verifiability,
} from '@/schema/attributes'
import { entityLinks, entityNames, uniqueEntities } from '@/schema/entity'
import {
	CollectionPolicy,
	type DataCollectionByEntity,
	DataCollectionPurpose,
	type Endpoint,
	EntityRole,
	RegularEndpoint,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import { isSupported, notSupported, type Support, supported } from '@/schema/features/support'
import {
	computeWorstOperationFees,
	FeeDisplayLevel,
	type WorstOperationFees,
} from '@/schema/features/transparency/fee-display'
import {
	compareOrderflowDisclosureToFeeDisplay,
	deriveOrderflowFacts,
	OnchainVerificationDocumentation,
	OrderflowDisclosureLevel,
	type OrderflowPractices,
	partitionPreInclusionRecipientsByExtractiveness,
} from '@/schema/features/transparency/orderflow'
import { refNotNecessary, type WithRef } from '@/schema/reference'
import { verifiabilityRequiresSourceCodeAccess } from '@/schema/verifiability'
import type { WalletMetadata } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'
import { markdown, mdSentence, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

const exampleVerifiedEnclaveEndpoint: Endpoint = {
	type: 'SECURE_ENCLAVE',
	endToEndEncryption: { type: 'TERMINATED_INSIDE_ENCLAVE' },
	externalLogging: { type: 'NO' },
	verifiability: {
		ref: refNotNecessary,
		clientVerification: {
			type: 'VERIFIED',
			ref: 'https://example.com',
			verificationCodeAudit: { ref: 'https://example.com' },
		},
		independentCodeAudit: { ref: 'https://example.com' },
		reproducibleBuilds: true,
		sourceAvailable: true,
	},
}

const exampleAuctioneerRow: WithRef<DataCollectionByEntity> = {
	ref: refNotNecessary,
	byEntity: exampleOrderflowAuctioneer,
	dataCollection: {
		[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.BY_DEFAULT,
		endpoint: RegularEndpoint,
	},
	purposes: [DataCollectionPurpose.ORDERFLOW_AUCTION],
	role: EntityRole.OPERATOR,
}

const exampleNonExtractiveRecipientRow: WithRef<DataCollectionByEntity> = {
	ref: refNotNecessary,
	byEntity: exampleWalletDevelopmentCompany,
	dataCollection: {
		[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.BY_DEFAULT,
		endpoint: exampleVerifiedEnclaveEndpoint,
	},
	purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST],
	role: EntityRole.OPERATOR,
}

const exampleExtractiveRecipientRow: WithRef<DataCollectionByEntity> = {
	ref: refNotNecessary,
	byEntity: exampleWalletDevelopmentCompany,
	dataCollection: {
		[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.BY_DEFAULT,
		endpoint: RegularEndpoint,
	},
	purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST],
	role: EntityRole.OPERATOR,
}

const exampleOrderflowPracticesPageUrl = 'https://example.com/orderflow-practices'

const examplePassAuctioningPractices: OrderflowPractices = {
	disclosure: {
		ref: refNotNecessary,
		byDefault: OrderflowDisclosureLevel.COMPREHENSIVE,
		afterSingleAction: OrderflowDisclosureLevel.COMPREHENSIVE,
	},
	practicesPage: supported({
		ref: exampleOrderflowPracticesPageUrl,
		contents: {
			listsEntitiesAndWhatTheyDo: true,
			explainsDefaultOrderflowAuctioning: true,
			documentsHowToChangeDefaults: true,
			onchainVerification: OnchainVerificationDocumentation.METHOD_DOCUMENTED_AND_EFFECTIVE,
			pageLastUpdated: '2026-02-27',
		},
	}),
	userCanRemoveAuctioning: supported({ ref: refNotNecessary }),
}

const examplePartialOnchainPractices: OrderflowPractices = {
	disclosure: {
		ref: refNotNecessary,
		byDefault: OrderflowDisclosureLevel.COMPREHENSIVE,
		afterSingleAction: OrderflowDisclosureLevel.COMPREHENSIVE,
	},
	practicesPage: supported({
		ref: exampleOrderflowPracticesPageUrl,
		contents: {
			listsEntitiesAndWhatTheyDo: true,
			explainsDefaultOrderflowAuctioning: true,
			documentsHowToChangeDefaults: true,
			onchainVerification: OnchainVerificationDocumentation.METHOD_DOCUMENTED,
			pageLastUpdated: '2026-02-27',
		},
	}),
	userCanRemoveAuctioning: supported({ ref: refNotNecessary }),
}

const exampleFailNoDisclosurePractices: OrderflowPractices = {
	disclosure: {
		ref: refNotNecessary,
		byDefault: OrderflowDisclosureLevel.NONE,
		afterSingleAction: OrderflowDisclosureLevel.NONE,
	},
	practicesPage: notSupported,
	userCanRemoveAuctioning: notSupported,
}

const exampleFailLowProminencePractices: OrderflowPractices = {
	disclosure: {
		ref: refNotNecessary,
		byDefault: OrderflowDisclosureLevel.MENTIONED,
		afterSingleAction: OrderflowDisclosureLevel.MENTIONED,
	},
	practicesPage: supported({
		ref: exampleOrderflowPracticesPageUrl,
		contents: {
			listsEntitiesAndWhatTheyDo: true,
			explainsDefaultOrderflowAuctioning: true,
			documentsHowToChangeDefaults: true,
			onchainVerification: OnchainVerificationDocumentation.METHOD_DOCUMENTED_AND_EFFECTIVE,
			pageLastUpdated: '2026-02-27',
		},
	}),
	userCanRemoveAuctioning: supported({ ref: refNotNecessary }),
}

const exampleFailNoPracticesPagePractices: OrderflowPractices = {
	disclosure: {
		ref: refNotNecessary,
		byDefault: OrderflowDisclosureLevel.COMPREHENSIVE,
		afterSingleAction: OrderflowDisclosureLevel.COMPREHENSIVE,
	},
	practicesPage: notSupported,
	userCanRemoveAuctioning: supported({ ref: refNotNecessary }),
}

const exampleComprehensiveWorstFees: WorstOperationFees = {
	feeDisplay: {
		byDefault: FeeDisplayLevel.COMPREHENSIVE,
		afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
		fullySponsored: false,
		walletServiceFeeDisplayUnits: 'NOT_APPLICABLE',
	},
	references: [],
}

const exampleProminenceGapWorstFees: WorstOperationFees = {
	feeDisplay: {
		byDefault: FeeDisplayLevel.COMPREHENSIVE,
		afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
		fullySponsored: false,
		walletServiceFeeDisplayUnits: 'NOT_APPLICABLE',
	},
	references: [],
}

function orderflowDisclosureUserDescription(level: OrderflowDisclosureLevel): string {
	switch (level) {
		case OrderflowDisclosureLevel.NONE:
			return 'no mention of orderflow auctioning'
		case OrderflowDisclosureLevel.MENTIONED:
			return 'only a brief orderflow or MEV line'
		case OrderflowDisclosureLevel.COMPREHENSIVE:
			return 'a full orderflow disclosure'
	}
}

function feeDisplayUserDescription(level: FeeDisplayLevel): string {
	switch (level) {
		case FeeDisplayLevel.NONE:
			return 'no fee information'
		case FeeDisplayLevel.AGGREGATED:
			return 'only a single total fee'
		case FeeDisplayLevel.COMPREHENSIVE:
			return 'a full fee breakdown'
	}
}

function userControlPassDescription(userCanRemoveAuctioning: Support<WithRef<{}>>): string {
	return isSupported(userCanRemoveAuctioning)
		? 'documents how users can opt out of or change default orderflow auctioning'
		: 'states that default orderflow auctioning cannot be changed by users'
}

function userControlFailShortExplanation(userCanRemoveAuctioning: Support<WithRef<{}>>): string {
	return isSupported(userCanRemoveAuctioning)
		? 'does not explain how users can change default orderflow auctioning'
		: 'does not state whether users can change default orderflow auctioning'
}

function onchainVerificationShortExplanation(
	documentation: OnchainVerificationDocumentation,
): string {
	switch (documentation) {
		case OnchainVerificationDocumentation.NO_METHOD_DOCUMENTED:
			return 'does not document how users can verify onchain outcomes'
		case OnchainVerificationDocumentation.METHOD_DOCUMENTED:
			return 'has not confirmed that the documented onchain verification method works'
		case OnchainVerificationDocumentation.METHOD_DOCUMENTED_AND_EFFECTIVE:
			return 'documents effective onchain verification'
	}
}

function onchainVerificationDetailsClause(documentation: OnchainVerificationDocumentation): string {
	switch (documentation) {
		case OnchainVerificationDocumentation.NO_METHOD_DOCUMENTED:
			return 'the page does not document any method users can follow to verify onchain outcomes'
		case OnchainVerificationDocumentation.METHOD_DOCUMENTED:
			return 'the page documents an onchain verification method, but Walletbeat has not confirmed it is effective'
		case OnchainVerificationDocumentation.METHOD_DOCUMENTED_AND_EFFECTIVE:
			return 'the page documents an effective onchain verification method'
	}
}

function passFullyLocal(ctx: EvaluationContext): Evaluation {
	return ctx.build({
		outcome: {
			id: 'fully_local_orderflow',
			rating: Rating.PASS,
			displayName: 'No external pre-inclusion sharing',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not send pre-inclusion transaction data to external parties by default.',
			),
		},
		details: paragraph(`
			{{WALLET_NAME}} does not send transaction data to external services for broadcast,
			simulation, or orderflow auctioning before onchain inclusion under default settings.
		`),
	})
}

function passNonAuctioningNonExtractive(
	ctx: EvaluationContext,
	nonExtractiveRows: WithRef<DataCollectionByEntity>[],
): Evaluation {
	const recipients = uniqueEntities(nonExtractiveRows.map(row => row.byEntity))
	const names = entityNames(recipients)
	const links = entityLinks(recipients)

	ctx.addRef(...nonExtractiveRows)

	return ctx.build({
		outcome: {
			id: 'non_auctioning_non_extractive',
			rating: Rating.PASS,
			displayName: 'Non-extractive pre-inclusion sharing',
			shortExplanation: sentence(
				`{{WALLET_NAME}} does not auction orderflow by default, and all default pre-inclusion recipients (${names}) use documented, independently verifiable non-extractive endpoints.`,
			),
		},
		details: mdSentence(
			`{{WALLET_NAME}} does not auction orderflow by default. Under default settings, pre-inclusion transaction data is sent to ${links} through endpoints that are documented and independently verifiable as non-extractive.`,
		),
	})
}

function partialNonAuctioningExtractive(
	ctx: EvaluationContext,
	extractiveRows: WithRef<DataCollectionByEntity>[],
): Evaluation {
	const failingRecipients = uniqueEntities(extractiveRows.map(row => row.byEntity))
	const names = entityNames(failingRecipients)
	const links = entityLinks(failingRecipients)

	ctx.addRef(...extractiveRows)

	return ctx.build({
		outcome: {
			id: 'non_auctioning_extractive',
			rating: Rating.PARTIAL,
			displayName: 'Potentially extractive pre-inclusion sharing',
			shortExplanation: sentence(
				`{{WALLET_NAME}} does not auction orderflow by default, but sends pre-inclusion transaction data to ${names} through endpoints that are not documented and verifiable as non-extractive.`,
			),
		},
		details: mdSentence(
			`{{WALLET_NAME}} does not auction orderflow by default, but under default settings sends pre-inclusion transaction data to ${links} through endpoints that are not documented and verifiable as non-extractive.`,
		),
		howToImprove: mdSentence(
			'{{WALLET_NAME}} should route default pre-inclusion sharing through documented, independently verifiable non-extractive endpoints, or keep pre-inclusion transaction data fully local by default.',
		),
		impact: mdSentence(
			'Users may not realize that external parties can retain or monetize their transaction data before it is included onchain.',
		),
	})
}

function evaluateNonAuctioningOrderflow(
	ctx: EvaluationContext,
	preInclusionRecipients: WithRef<DataCollectionByEntity>[],
): Evaluation {
	const { nonExtractive, extractive } =
		partitionPreInclusionRecipientsByExtractiveness(preInclusionRecipients)

	if (extractive.length === 0) {
		// Wallet does not auction orderflow by default and every endpoint for those pre-inclusion recipients is verifiably non-extractive
		return passNonAuctioningNonExtractive(ctx, nonExtractive)
	}

	// Wallet does not auction by default but at least one pre-inclusion recipient endpoint is not verifiably non-extractive
	return partialNonAuctioningExtractive(ctx, extractive)
}

/**
 * Rates wallets that auction orderflow by default.
 * Compares orderflow UI disclosure to the worst-case fee display, then checks the
 * orderflow practices page (entities listed, default auctioning explained, how users
 * can change defaults, page freshness, and onchain verification documentation).
 */
function evaluateAuctioningOrderflow(
	ctx: EvaluationContext,
	orderflowPractices: OrderflowPractices,
	worstFees: WorstOperationFees,
	auctioneers: WithRef<DataCollectionByEntity>[],
): Evaluation {
	const worstFeeDisplay = worstFees.feeDisplay
	const { disclosure, practicesPage, userCanRemoveAuctioning } = orderflowPractices
	const auctioneerEntities = uniqueEntities(auctioneers.map(row => row.byEntity))
	const auctioneerNames = entityNames(auctioneerEntities)
	const auctioneerLinks = entityLinks(auctioneerEntities)

	ctx.addRef(...auctioneers)

	if (disclosure.byDefault === OrderflowDisclosureLevel.NONE) {
		ctx.addRef(disclosure)

		return ctx.build({
			outcome: {
				id: 'disclosure_ui_none',
				rating: Rating.FAIL,
				displayName: 'No orderflow disclosure in transaction UI',
				shortExplanation: sentence(
					`{{WALLET_NAME}} auctions orderflow to ${auctioneerNames} by default but does not mention orderflow auctioning in the transaction UI.`,
				),
			},
			details: mdSentence(
				`{{WALLET_NAME}} auctions orderflow to ${auctioneerLinks} by default, but the transaction approval screen shows ${orderflowDisclosureUserDescription(disclosure.byDefault)} while users confirm transactions.`,
			),
			howToImprove: mdSentence(
				'{{WALLET_NAME}} should disclose default orderflow auctioning in the transaction UI with prominence at least comparable to how it shows transaction fees, and link to an orderflow practices page from that disclosure.',
			),
			impact: mdSentence(
				'Users may confirm transactions without knowing their orderflow is being auctioned.',
			),
		})
	}

	const prominenceCompare = compareOrderflowDisclosureToFeeDisplay(disclosure, worstFeeDisplay)

	if (prominenceCompare < 0) {
		ctx.addRef(disclosure)
		ctx.addRef(worstFees.references)

		return ctx.build({
			outcome: {
				id: 'disclosure_ui_prominence',
				rating: Rating.FAIL,
				displayName: 'Orderflow disclosure less prominent than fees',
				shortExplanation: sentence(
					`{{WALLET_NAME}} auctions orderflow to ${auctioneerNames} by default, but orderflow disclosure in the transaction UI is less prominent than fee display.`,
				),
			},
			details: mdSentence(
				`{{WALLET_NAME}} auctions orderflow to ${auctioneerLinks} by default. On the transaction approval screen, orderflow disclosure is less prominent than fee display. By default, users see ${orderflowDisclosureUserDescription(disclosure.byDefault)} while fees show ${feeDisplayUserDescription(worstFeeDisplay.byDefault)}. After one interaction, orderflow shows ${orderflowDisclosureUserDescription(disclosure.afterSingleAction)} while fees show ${feeDisplayUserDescription(worstFeeDisplay.afterSingleAction)}.`,
			),
			howToImprove: mdSentence(
				'{{WALLET_NAME}} should make orderflow auctioning disclosure at least as prominent as its fee display on the transaction approval screen.',
			),
			impact: mdSentence('Users may notice fees but miss that their orderflow is being auctioned.'),
		})
	}

	if (!isSupported(practicesPage)) {
		ctx.addRef(disclosure)

		return ctx.build({
			outcome: {
				id: 'disclosure_page_link',
				rating: Rating.FAIL,
				displayName: 'No orderflow practices page',
				shortExplanation: sentence(
					`{{WALLET_NAME}} auctions orderflow to ${auctioneerNames} by default but does not link to a documented orderflow practices page from the transaction UI.`,
				),
			},
			details: mdSentence(
				`{{WALLET_NAME}} auctions orderflow to ${auctioneerLinks} by default and discloses orderflow auctioning in the transaction UI, but does not link to a documented orderflow practices page from that disclosure.`,
			),
			howToImprove: mdSentence(
				'{{WALLET_NAME}} should publish an orderflow practices page and link to it from the transaction UI orderflow disclosure.',
			),
			impact: mdSentence(
				'Users have no easy way to learn who receives their pre-inclusion transaction data or how defaults work.',
			),
		})
	}

	const { contents } = practicesPage

	if (!contents.listsEntitiesAndWhatTheyDo) {
		ctx.addRef(practicesPage)

		return ctx.build({
			outcome: {
				id: 'page_entities',
				rating: Rating.FAIL,
				displayName: 'Practices page omits recipient entities',
				shortExplanation: sentence(
					`{{WALLET_NAME}} auctions orderflow to ${auctioneerNames} by default, but its orderflow practices page does not list entities and what they do.`,
				),
			},
			details: mdSentence(
				`{{WALLET_NAME}} auctions orderflow to ${auctioneerLinks} by default. Its orderflow practices page does not list which entities receive pre-inclusion transaction data and what they do with it.`,
			),
			howToImprove: mdSentence(
				'{{WALLET_NAME}} should update its orderflow practices page to list each entity that receives pre-inclusion transaction data and describe what that entity does with it.',
			),
		})
	}

	if (!contents.explainsDefaultOrderflowAuctioning) {
		ctx.addRef(practicesPage)

		return ctx.build({
			outcome: {
				id: 'page_defaults',
				rating: Rating.FAIL,
				displayName: 'Practices page omits default auctioning',
				shortExplanation: sentence(
					`{{WALLET_NAME}} auctions orderflow to ${auctioneerNames} by default, but its orderflow practices page does not explain default orderflow auctioning.`,
				),
			},
			details: mdSentence(
				`{{WALLET_NAME}} auctions orderflow to ${auctioneerLinks} by default. Its orderflow practices page does not explain that orderflow auctioning is enabled by default.`,
			),
			howToImprove: mdSentence(
				'{{WALLET_NAME}} should update its orderflow practices page to explain that orderflow auctioning is enabled under default settings.',
			),
		})
	}

	if (!contents.documentsHowToChangeDefaults) {
		ctx.addRef(practicesPage, userCanRemoveAuctioning)

		const userControlRequirement = isSupported(userCanRemoveAuctioning)
			? 'explain how users can opt out of or change default orderflow auctioning settings'
			: 'state that default orderflow auctioning settings cannot be changed by users'

		return ctx.build({
			outcome: {
				id: 'page_user_control',
				rating: Rating.FAIL,
				displayName: 'Practices page omits user control over defaults',
				shortExplanation: sentence(
					`{{WALLET_NAME}} auctions orderflow to ${auctioneerNames} by default, but its orderflow practices page ${userControlFailShortExplanation(userCanRemoveAuctioning)}.`,
				),
			},
			details: mdSentence(
				`{{WALLET_NAME}} auctions orderflow to ${auctioneerLinks} by default. Its orderflow practices page does not ${userControlRequirement}.`,
			),
			howToImprove: mdSentence(
				`{{WALLET_NAME}} should update its orderflow practices page to ${userControlRequirement}.`,
			),
		})
	}

	if (
		contents.onchainVerification !==
		OnchainVerificationDocumentation.METHOD_DOCUMENTED_AND_EFFECTIVE
	) {
		ctx.addRef(disclosure, practicesPage, userCanRemoveAuctioning)

		return ctx.build({
			outcome: {
				id: 'page_onchain_verification',
				rating: Rating.PARTIAL,
				displayName: 'Incomplete onchain verification documentation',
				shortExplanation: sentence(
					`{{WALLET_NAME}} auctions orderflow to ${auctioneerNames} by default and publishes an orderflow practices page, but ${onchainVerificationShortExplanation(contents.onchainVerification)}.`,
				),
			},
			details: mdSentence(
				`{{WALLET_NAME}} auctions orderflow to ${auctioneerLinks} by default, discloses orderflow auctioning in the transaction UI with prominence comparable to fee display, and publishes an orderflow practices page (last updated ${contents.pageLastUpdated}). However, ${onchainVerificationDetailsClause(contents.onchainVerification)}.`,
			),
			howToImprove: mdSentence(
				'{{WALLET_NAME}} should document on its orderflow practices page a method users can follow to verify onchain outcomes, and confirm that method is effective.',
			),
			impact: mdSentence(
				'Users cannot independently confirm whether auctioning behaved as described.',
			),
		})
	}

	ctx.addRef(disclosure, practicesPage, userCanRemoveAuctioning)
	ctx.addRef(worstFees.references)

	return ctx.build({
		outcome: {
			id: 'auctioning_transparency',
			rating: Rating.PASS,
			displayName: 'Transparent default orderflow auctioning',
			shortExplanation: sentence(
				`{{WALLET_NAME}} auctions orderflow to ${auctioneerNames} by default and transparently discloses this in the transaction UI with prominence comparable to fee display.`,
			),
		},
		details: mdSentence(
			`{{WALLET_NAME}} auctions orderflow to ${auctioneerLinks} by default. The transaction UI shows ${orderflowDisclosureUserDescription(disclosure.byDefault)} by default and ${orderflowDisclosureUserDescription(disclosure.afterSingleAction)} after one interaction, with prominence comparable to its fee display. It links to an orderflow practices page (last updated ${contents.pageLastUpdated}). The page lists recipient entities, explains default auctioning, ${userControlPassDescription(userCanRemoveAuctioning)}, and documents an effective onchain verification method.`,
		),
	})
}

export const orderflowTransparency: Attribute = {
	id: 'orderflowTransparency',
	icon: 'orderflow_transparency',
	displayName: 'Orderflow transparency',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's orderflow transparency evaluated?",
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do to improve orderflow transparency?',
		),
	},
	question: sentence(
		'Does the wallet transparently disclose how it monetizes your transaction data?',
	),
	why: markdown(`
		Before a transaction is included onchain, wallet software may send transaction
		data to external services for broadcast, simulation, or orderflow auctioning
		(MEV). Users cannot see this path as clearly as onchain execution unless the
		wallet discloses it.

		Wallets that auction orderflow by default should tell users so in the transaction
		UI, with prominence at least comparable to how they show transaction fees.
		They should also publish a practices page explaining who receives data and how
		defaults can be changed.

		Wallets that share pre-inclusion data without auctioning should route that data
		through endpoints that are documented and independently verifiable as
		non-extractive, so external parties cannot retain or exploit transaction data.

		If the Ethereum protocol later implements a native mempool encryption mechanism,
		wallets may also protect their users from orderflow extraction by using this
		mechanism to shield transaction data before it is executed onchain.
	`),
	methodology: markdown(`
		Wallets are **exempt** from this attribute when they are hardware wallets.

		Software wallets that do not send pre-inclusion transaction data to external
		parties by default **pass** on this attribute.

		Software wallets that share pre-inclusion data by default but do not auction
		orderflow **pass** when every default recipient uses an endpoint that is
		documented and independently verifiable as non-extractive. They receive
		**partial** when at least one default recipient does not. The evaluation names
		which recipient entities use extractive endpoints.

		Wallets that **auction orderflow by default** are evaluated on disclosure
		prominence in the transaction UI (compared to the least clear basic-operation
		fee display), a linked orderflow practices page, and the contents of that page.
		The practices page should list recipient entities and what they do, explain that
		auctioning is enabled by default, document how users can change defaults (or
		state that defaults cannot be changed), and describe how users can verify
		onchain outcomes.

		They **fail** when orderflow is not disclosed in the UI, disclosure is less
		prominent than fees, no practices page is linked, or the page omits required
		content. They receive **partial** when onchain verification is documented but
		not confirmed effective. They **pass** when all requirements are met.

		If the Ethereum protocol later implements a native mempool encryption mechanism,
		wallets that use this mechanism to shield transaction data before it is included
		onchain would also pass this attribute.
	`),
	ratingScale: {
		display: 'fail-pass',
		exhaustive: false,
		fail: [
			exampleRating(
				paragraph('Auctions by default but does not mention orderflow in the transaction UI.'),
				evaluateAuctioningOrderflow(
					EvaluationContext.forTest(() => orderflowTransparency),
					exampleFailNoDisclosurePractices,
					exampleComprehensiveWorstFees,
					[exampleAuctioneerRow],
				),
			),
			exampleRating(
				paragraph(
					'Auctions by default but orderflow disclosure is less prominent than fee display.',
				),
				evaluateAuctioningOrderflow(
					EvaluationContext.forTest(() => orderflowTransparency),
					exampleFailLowProminencePractices,
					exampleProminenceGapWorstFees,
					[exampleAuctioneerRow],
				),
			),
			exampleRating(
				paragraph('Auctions by default, discloses in UI, but does not link to a practices page.'),
				evaluateAuctioningOrderflow(
					EvaluationContext.forTest(() => orderflowTransparency),
					exampleFailNoPracticesPagePractices,
					exampleComprehensiveWorstFees,
					[exampleAuctioneerRow],
				),
			),
		],
		partial: [
			exampleRating(
				paragraph(
					'Shares pre-inclusion data without auctioning, but at least one default recipient uses an extractive endpoint.',
				),
				partialNonAuctioningExtractive(
					EvaluationContext.forTest(() => orderflowTransparency),
					[exampleExtractiveRecipientRow],
				),
			),
			exampleRating(
				paragraph(
					'Auctions by default and publishes a practices page, but onchain verification is documented but not confirmed effective.',
				),
				evaluateAuctioningOrderflow(
					EvaluationContext.forTest(() => orderflowTransparency),
					examplePartialOnchainPractices,
					exampleComprehensiveWorstFees,
					[exampleAuctioneerRow],
				),
			),
		],
		pass: [
			exampleRating(
				paragraph('Keeps pre-inclusion data fully local by default.'),
				passFullyLocal(EvaluationContext.forTest(() => orderflowTransparency)),
			),
			exampleRating(
				paragraph(
					'Shares pre-inclusion data without auctioning via documented non-extractive endpoints.',
				),
				passNonAuctioningNonExtractive(
					EvaluationContext.forTest(() => orderflowTransparency),
					[exampleNonExtractiveRecipientRow],
				),
			),
			exampleRating(
				paragraph(
					'Auctions orderflow by default with UI disclosure, linked practices page, and full page content.',
				),
				evaluateAuctioningOrderflow(
					EvaluationContext.forTest(() => orderflowTransparency),
					examplePassAuctioningPractices,
					exampleComprehensiveWorstFees,
					[exampleAuctioneerRow],
				),
			),
		],
	},
	exempted: (ctx: EvaluationContext, _metadata: WalletMetadata) => {
		if (ctx.features.type === WalletType.HARDWARE || ctx.features.type === WalletType.EMBEDDED) {
			return exempt(
				ctx,
				sentence('This attribute is not applicable for hardware and embedded wallets.'),
			)
		}

		return null
	},
	evaluate: ctx => {
		const facts = deriveOrderflowFacts(ctx.features.privacy.dataCollection)

		if (facts.status === 'incomplete') {
			return unrated(ctx)
		}

		if (facts.auctioneers.length > 0) {
			// Auctioning wallets need orderflow practices and a fee-display baseline for prominence comparison.
			const { orderflowPractices, operationFees } = ctx.features.transparency

			if (orderflowPractices === null) {
				return unrated(ctx)
			}

			const worstFees = operationFees === null ? null : computeWorstOperationFees(operationFees)

			if (worstFees === null) {
				return unrated(ctx)
			}

			ctx.setVerifiability(Verifiability.VERIFIABLE) // Self-testable UI + public practices page.

			return evaluateAuctioningOrderflow(ctx, orderflowPractices, worstFees, facts.auctioneers)
		}

		ctx.setVerifiability(verifiabilityRequiresSourceCodeAccess({ coreOnlyIsSufficient: false })) // Pre-inclusion data paths and endpoint extractiveness.

		if (facts.preInclusionRecipients.length === 0) {
			return passFullyLocal(ctx)
		}

		return evaluateNonAuctioningOrderflow(ctx, facts.preInclusionRecipients)
	},
	aggregate: pickWorstRating,
}
