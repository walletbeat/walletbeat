import { withBasePath } from '@/base-url'
import {
	type Attribute,
	EvaluationContext,
	exampleRating,
	exampleRatingUnimplemented,
	Rating,
} from '@/schema/attributes'
import {
	collectedByDefault,
	type DataCollectionByEntity,
	dataCollectionForAllSupportedFlows,
	type MultiAddressHandling,
	MultiAddressPolicy,
	type QualifiedDataCollection,
	qualifiedDataCollectionWithEndpoint,
	SIMULTANEOUS_WINDOW_MS,
	userInfoCorrelatableAcrossEntities,
	userInfoEnums,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import { isSupported } from '@/schema/features/support'
import { verifiabilityRequiresSourceCodeAccess } from '@/schema/verifiability'
import { markdown, paragraph, sentence } from '@/types/content'

import { pickWorstRating, unrated } from '../common'

const uniqueDestinations: (typeof multiAddressCorrelation)['evaluate'] = ctx =>
	ctx.build({
		outcome: {
			id: 'unique_destinations',
			rating: Rating.PASS,
			icon: '\u{26d3}', // Broken chain
			displayName: 'Wallet uses unique endpoints per address',
			shortExplanation: sentence(
				'{{WALLET_NAME}} uses unique endpoints for each wallet address, which keeps them uncorrelated.',
			),
		},
		details: paragraph(
			'When configured with multiple addresses, {{WALLET_NAME}} uses unique RPC endpoints for each wallet address. Therefore, no single RPC endpoint gets to learn about more than one of your addresses.',
		),
	})

const activeAddressOnly: (typeof multiAddressCorrelation)['evaluate'] = ctx =>
	ctx.build({
		outcome: {
			id: 'active_address_only',
			rating: Rating.PASS,
			icon: '\u{1f4ce}', // Single paperclip
			displayName: 'Wallet only handles one active address at a time',
			shortExplanation: sentence(
				"{{WALLET_NAME}} only makes requests about one active address at a time, so it can't be correlated with other addresses.",
			),
		},
		details: paragraph(
			'{{WALLET_NAME}} only has one active address at a time, and all outgoing RPC requests are only about that address. Additionally, the account switching UI does not perform bulk queries about all configured addresses in close succession.',
		),
		impact: paragraph(
			'Multi-address privacy is generally well-preserved by {{WALLET_NAME}}. However, you should avoid quickly switching between active addresses in order to avoid making successive requests to the same RPC endpoint about different addresses.',
		),
	})

const activeAddressOnlyWithCorrelatableUserInfo: (typeof multiAddressCorrelation)['evaluate'] =
	ctx =>
		ctx.build({
			outcome: {
				id: 'active_address_only_with_correlatable_user_info',
				rating: Rating.FAIL,
				displayName: 'Multiple addresses are correlatable by a shared identifier',
				shortExplanation: sentence(
					'{{WALLET_NAME}} only makes requests about one active address at a time, but sends a user identifier across requests allowing addresses to be correlated over time.',
				),
			},
			details: paragraph(`
			{{WALLET_NAME}} only has one active address at a time, and all outgoing RPC requests are only about that address.
			However, requests contain a shared user identifier (e.g. a tracking cookie), which lets the external provider
			correlate requests that belong to the same user. This allows the external provider to correlate the user's
			addresses.
		`),
			impact: paragraph(
				'Using multiple addresses in {{WALLET_NAME}} will allow them to be correlated by an external provider. You should avoid configuring multiple addresses with {{WALLET_NAME}}.',
			),
			howToImprove: paragraph(
				'{{WALLET_NAME}} should stop sending correlatable user identifiers from the requests it makes.',
			),
		})

const correlatableUserInfoCorrelation: (typeof multiAddressCorrelation)['evaluate'] = ctx =>
	ctx.build({
		outcome: {
			id: 'correlatable_user_info_correlation',
			rating: Rating.FAIL,
			displayName: 'Multiple addresses are correlatable by a shared user identifier',
			shortExplanation: sentence(
				'{{WALLET_NAME}} makes requests about different addresses that share a user identifier, allowing an external provider to correlate them.',
			),
		},
		details: paragraph(`
When configured with multiple addresses, {{WALLET_NAME}} makes requests about each address
separately, but these requests carry a user identifier that is shared across them (either
directly or through a chain of requests). This lets an external provider link the requests
back to the same user and therefore correlate the user's addresses.
`),
		impact: paragraph(
			'Using multiple addresses in {{WALLET_NAME}} will allow them to be correlated by an external provider. You should avoid configuring multiple addresses with {{WALLET_NAME}}.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should strip all correlatable user identifiers from the requests it makes.',
		),
	})

const bulkRequests: (typeof multiAddressCorrelation)['evaluate'] = ctx =>
	ctx.build({
		outcome: {
			id: 'bulkRequests',
			rating: Rating.FAIL,
			displayName: 'Multiple addresses are correlatable by an external provider',
			shortExplanation: sentence(
				'{{WALLET_NAME}} makes bulk requests containing multiple addresses to the same endpoint, which allows it to correlate your addresses.',
			),
		},
		details: paragraph(
			'When configured with multiple addresses, {{WALLET_NAME}} makes requests that contain multiple addresses simultaneously.',
		),
		impact: paragraph(
			'Using multiple addresses in {{WALLET_NAME}} will allow them to be correlated by an external provider. You should avoid configuring multiple addresses with {{WALLET_NAME}}.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should first ensure that it never makes requests containing multiple addresses simultaneously. Next, it should ensure that these requests are staggered and are proxied through different proxies and RPC endpoints to prevent correlation. This can be done through the use of privacy solutions such as Oblivious HTTP, Tor, and others.',
		),
	})

const correlatableRequests: (typeof multiAddressCorrelation)['evaluate'] = ctx =>
	ctx.build({
		outcome: {
			id: 'correlatableRequests',
			rating: Rating.FAIL,
			displayName: 'Multiple addresses are correlatable by an external provider',
			shortExplanation: sentence(
				'{{WALLET_NAME}} makes requests about multiple addresses simultaneously to the same endpoint, which allows it to correlate your addresses.',
			),
		},
		details: paragraph(
			'When configured with multiple addresses, {{WALLET_NAME}} makes separate requests for each wallet address, but these requests are sent simultaneously and without proxying. This allows the RPC endpoint to correlate your addresses.',
		),
		impact: paragraph(
			'Using multiple addresses in {{WALLET_NAME}} will allow them to be correlated by an external provider. You should avoid configuring multiple addresses with {{WALLET_NAME}}.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should ensure that its requests are staggered and are proxied through different proxies and RPC endpoints to prevent correlation. This can be done through the use of privacy solutions such as Oblivious HTTP, Tor, and others.',
		),
	})

const staggeredRequests: (typeof multiAddressCorrelation)['evaluate'] = ctx =>
	ctx.build({
		outcome: {
			id: 'staggered_requests',
			rating: Rating.PARTIAL,
			displayName: 'Requests for multiple addresses are staggered across time',
			shortExplanation: sentence(
				'{{WALLET_NAME}} staggers requests about multiple addresses over time, which makes it harder to correlate your addresses.',
			),
		},
		details: paragraph(`
			When configured with multiple addresses, {{WALLET_NAME}} makes requests
			that contain only one of your addresses at a time. While each of these
			requests go to the same endpoint, they are staggered over time.
			Depending on the delay between such requests, this can provide some
			degree of privacy, as this makes it harder for the endpoint
			to correlate these requests as coming from the same user due to the
			time elapsed between the requests.
			However, since these requests are still unproxied, the endpoint is
			still able to correlate the requests due to their identical origin IP address.
		`),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should ensure requests are proxied through distinct proxies in order to prevent the RPC endpoint from learning the correlation between addresses. This can be done through the use of privacy solutions such as Oblivious HTTP, Tor, and others.',
		),
	})

const uncorrelatedRequests: (typeof multiAddressCorrelation)['evaluate'] = ctx =>
	ctx.build({
		outcome: {
			id: 'uncorrelated_requests',
			rating: Rating.PASS,
			icon: '\u{26d3}', // Broken chain
			displayName: 'Requests for multiple addresses are uncorrelated',
			shortExplanation: sentence(
				'{{WALLET_NAME}} makes requests about multiple addresses that cannot be linked together, so they are not correlatable.',
			),
		},
		details: paragraph(
			'When configured with multiple addresses, {{WALLET_NAME}} makes requests about each address that are not linked by any shared user identifier and do not occur close enough in time from the same IP to be correlated. As a result, an external provider cannot correlate these addresses.',
		),
	})

const unsupported: (typeof multiAddressCorrelation)['evaluate'] = ctx =>
	ctx.build({
		outcome: {
			id: 'unsupported',
			rating: Rating.EXEMPT,
			icon: '\u{1f4ce}', // Single paperclip
			displayName: 'Multiple addresses unsupported',
			shortExplanation: sentence('You can only use one address in {{WALLET_NAME}}.'),
		},
		details: paragraph(
			'You can only use one address in {{WALLET_NAME}}, so multi-address privacy is irrelevant.',
		),
	})

type QualifiedDataCollectionWithMultiAddress = QualifiedDataCollection & {
	multiAddress: MultiAddressHandling
}

function isQualifiedDataCollectionWithMultiAddress(
	dataCollection: QualifiedDataCollection,
): dataCollection is QualifiedDataCollectionWithMultiAddress {
	return dataCollection.multiAddress != null
}

/**
 * Whether the given data collection sends any correlatable `UserInfo` value
 * by default. A correlatable `UserInfo` is one whose identical string value
 * across two requests forms a correlation edge (see
 * {@link userInfoCorrelatableAcrossEntities}).
 *
 * The account address and mempool transactions are excluded: their values vary
 * per address, so they are the correlation target rather than a correlation
 * signal.
 */
function anyCorrelatableUserInfoCollectedByDefault(
	dataCollection: QualifiedDataCollection,
): boolean {
	return userInfoEnums.items.some(userInfo => {
		if (userInfo === WalletInfo.ACCOUNT_ADDRESS || userInfo === WalletInfo.MEMPOOL_TRANSACTIONS) {
			return false
		}

		return (
			userInfoCorrelatableAcrossEntities(userInfo) && collectedByDefault(dataCollection[userInfo])
		)
	})
}

// Edge strengths produced by the classifier are on a bounded scale (shared
// UserInfo edges are offset well above IP-time edges). The length multiplier is
// far larger than any such strength so that chain length is the primary
// ordering when ranking which entity is worst for the user.
const CHAIN_LENGTH_WEIGHT = 1_000_000_000
const NO_CHAIN_SCORE = 1_000_000_000_000

function rateHandling(dataCollection: QualifiedDataCollectionWithMultiAddress): number {
	if (
		dataCollection.multiAddress.type === MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES
	) {
		return 0
	}

	switch (dataCollection.multiAddress.type) {
		case MultiAddressPolicy.ACTIVE_ADDRESS_ONLY:
			return anyCorrelatableUserInfoCollectedByDefault(dataCollection) ? 0 : 1000
		case MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS: {
			const chain = dataCollection.multiAddress.bestChain

			if (chain !== null) {
				// A stronger chain (shorter, then higher weakest-edge strength)
				// is worse for the user, so it scores lower.
				return chain.length * CHAIN_LENGTH_WEIGHT - chain.weakestEdge.strength
			}

			// No correlation chain links two distinct addresses, so the
			// addresses are not correlatable by this entity.
			return (
				NO_CHAIN_SCORE + { SAME_FOR_ALL: 0, ISOLATED: 1 }[dataCollection.multiAddress.destination]
			)
		}
	}
}

export const multiAddressCorrelation: Attribute = {
	id: 'multiAddressCorrelation',
	icon: 'multi_address_privacy',
	displayName: 'Multi-address privacy',
	wording: {
		midSentenceName: 'multi-address privacy',
	},
	question: sentence('Can your multiple wallet addresses be correlated with one another?'),
	why: paragraph(`
		You probably have more than one wallet address configured in your wallet,
		which you use for different purposes and perhaps as different identities.
		These wallet addresses all belong to you, but you would rather keep that
		fact private. It is therefore important to use a wallet that does not reveal that fact.
	`),
	methodology: markdown(`
		Wallets are assessed based on whether an external provider can learn that
		two or more of the user's wallet addresses belong to the same user.

		An external provider may learn of this correlation either through:

		- The wallet software explicitly sending this data (e.g. through
		  analytics)
		- Requesting data about multiple wallet addresses in bulk, allowing
		  the receiving endpoint to learn that all of these addresses belong to
		  the same user. Similar correlations are also possible by IP and/or
			time-based correlation of requests that each contain one wallet address.
		- Requests about different wallet addresses carrying a common
		  correlatable user identifier (e.g. cookies, unique HTTP headers, UUIDs),
			either directly or transitively through a chain of requests that each
			share such an identifier. This lets the receiving endpoint link requests
			back to the same user and therefore correlate the user's addresses.

		Walletbeat determines this by inspecting the network requests made by the
		wallet. See the [data collection guide](${withBasePath('/docs/wallet-testing/data-collection/')})
		for how these requests are captured.

		In order to prevent this information from being revealed, wallets can
		use a variety of strategies:

		* Wallets may offer the user to only have one active wallet address at
			a time, and only ever makes requests about the active wallet address.
			The user is expected to not change their active address often.
			The wallet should also ensure that any account-switching widget does
			not cause bulk/simultaneous requests about multiple addresses to the
			same endpoint, such as for refreshing balances.
			Note that this scheme, while simple to implement, is incompatible with
			stealth addresses. This is because stealth addresses inherently require
			the user to simultaneously manage a range of addresses.
		* Wallets may look up information about multiple addresses by splitting
			up the requests such that each request only contains one address, then
			sending these requests over different proxy circuits in a manner that
			staggers the requests over time. This ensures that the receiving
			endpoint cannot correlate addresses based on timing or IP address.
		* Wallets may distribute requests across multiple RPC endpoints owned by
			separate entities for each wallet address, preventing each entity from
			learning more than one wallet address.
	`),
	ratingScale: {
		display: 'fail-pass',
		exhaustive: false,
		fail: [
			exampleRating(
				paragraph(
					'The wallet refreshes multiple address balances by grouping all of these addresses in the same request.',
				),
				bulkRequests(EvaluationContext.forTest(() => multiAddressCorrelation)),
			),
			exampleRating(
				paragraph(
					'The wallet only refreshes the currently-active wallet address balances, but such requests carry an identifier or cookie which can identify the same user across requests for different wallet addresses.',
				),
				activeAddressOnlyWithCorrelatableUserInfo(
					EvaluationContext.forTest(() => multiAddressCorrelation),
				),
			),
			exampleRating(
				paragraph(
					'The wallet refreshes each wallet address in a separate request, but the requests carry a tracking identifier shared across them, allowing an external provider to correlate the addresses.',
				),
				correlatableUserInfoCorrelation(EvaluationContext.forTest(() => multiAddressCorrelation)),
			),
			exampleRating(
				paragraph(
					"The wallet makes multiple simultaneous requests about each of the user's wallet balances, without proxying or staggering the requests.",
				),
				correlatableRequests(EvaluationContext.forTest(() => multiAddressCorrelation)),
			),
		],
		partial: [
			exampleRating(
				paragraph(
					"The wallet makes multiple requests about each of the user's wallet balances, staggering them over time to avoid time-based correlation. The receiving endpoint may still correlate these addresses through IP-address-based correlation.",
				),
				staggeredRequests(EvaluationContext.forTest(() => multiAddressCorrelation)),
			),
		],
		pass: [
			exampleRating(
				paragraph(
					"The wallet makes requests about each of the user's wallet balances that share no user identifier and are spaced far enough apart in time from the same IP that an external provider cannot link them together.",
				),
				uncorrelatedRequests(EvaluationContext.forTest(() => multiAddressCorrelation)),
			),
			exampleRating(
				paragraph(
					"The wallet distributes requests about each of the user's wallet balances across unique RPC endpoints owned by different entities, preventing any single entity from learning about more than one wallet address.",
				),
				uniqueDestinations(EvaluationContext.forTest(() => multiAddressCorrelation)),
			),
			exampleRating(
				paragraph(
					'The wallet only has one active wallet address at a time, and only ever makes requests about this wallet address and no other.',
				),
				activeAddressOnly(EvaluationContext.forTest(() => multiAddressCorrelation)),
			),
			exampleRating(
				paragraph(
					"The wallet runs by default with a user's own self-hosted node, preventing any external provider from learning about any of the user's wallet addresses.",
				),
				exampleRatingUnimplemented,
			),
		],
	},
	evaluate: ctx => {
		// Even with network capture data, we cannot guarantee exhaustiveness without source code access.
		ctx.setVerifiability(verifiabilityRequiresSourceCodeAccess({ coreOnlyIsSufficient: false }))

		if (ctx.features.multiAddress === null) {
			return unrated(ctx)
		}

		if (!isSupported(ctx.features.multiAddress)) {
			return unsupported(ctx)
		}

		const dataCollection = dataCollectionForAllSupportedFlows(ctx.features.privacy.dataCollection)

		if (dataCollection === null) {
			return unrated(ctx)
		}

		let worstHandling: DataCollectionByEntity | null = null
		let worstHandlingScore = -1

		for (const collected of dataCollection) {
			const dataCollection = qualifiedDataCollectionWithEndpoint(collected.dataCollection)

			if (!collectedByDefault(dataCollection[WalletInfo.ACCOUNT_ADDRESS])) {
				continue
			}

			if (!isQualifiedDataCollectionWithMultiAddress(dataCollection)) {
				return unrated(ctx)
			}

			ctx.addRef(collected)
			const score = rateHandling(dataCollection)

			if (worstHandling === null || score < worstHandlingScore) {
				worstHandling = collected
				worstHandlingScore = score
			}
		}

		if (worstHandling === null) {
			return unrated(ctx)
		}

		const worstCollection = qualifiedDataCollectionWithEndpoint(worstHandling.dataCollection)

		if (!isQualifiedDataCollectionWithMultiAddress(worstCollection)) {
			return unrated(ctx)
		}

		const handling = worstCollection.multiAddress

		switch (handling.type) {
			case MultiAddressPolicy.ACTIVE_ADDRESS_ONLY:
				if (anyCorrelatableUserInfoCollectedByDefault(worstCollection)) {
					return activeAddressOnlyWithCorrelatableUserInfo(ctx)
				}

				// If the wallet has a concept of a singular "active address" and only
				// ever makes requests about it, then other addresses are never exposed
				// and therefore not correlatable.
				return activeAddressOnly(ctx)
			case MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES:
				// If the wallet makes a single request with multiple addresses,
				// they are clearly correlatable.
				return bulkRequests(ctx)
			case MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS: {
				const chain = handling.bestChain

				if (chain !== null) {
					switch (chain.weakestEdge.kind) {
						case 'userInfo':
							// The strongest correlation link is a shared user identifier.
							return correlatableUserInfoCorrelation(ctx)

						case 'ipTime':
							if (chain.weakestEdge.gapMs < SIMULTANEOUS_WINDOW_MS) {
								// Requests for distinct addresses occur close together in
								// time from the same IP, so they are correlatable.
								return correlatableRequests(ctx)
							}

							// The weakest link is an IP-time link that is staggered beyond
							// the simultaneous window, so correlation is weaker.
							return staggeredRequests(ctx)
					}
				}

				switch (handling.destination) {
					case 'ISOLATED':
						// The wallet makes requests to different endpoints for each
						// address, so they are not correlatable.
						return uniqueDestinations(ctx)
					case 'SAME_FOR_ALL':
						// No request-correlation chain links any two distinct addresses.
						return uncorrelatedRequests(ctx)
				}
			}
		}
	},
	aggregate: pickWorstRating,
}
