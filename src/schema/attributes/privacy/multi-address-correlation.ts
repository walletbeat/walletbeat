import {
	type Attribute,
	type Evaluation,
	exampleRating,
	exampleRatingUnimplemented,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import {
	collectedByDefault,
	type DataCollectionByEntity,
	dataCollectionForAllSupportedFlows,
	type Endpoint,
	type MultiAddressHandling,
	MultiAddressPolicy,
	qualifiedDataCollectionWithEndpoint,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import { isSupported } from '@/schema/features/support'
import { type ReferenceArray, refs } from '@/schema/reference'
import { markdown, paragraph, sentence } from '@/types/content'

import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.privacy.multi_address_correlation'

export type MultiAddressCorrelationValue = Value & {
	__brand: 'attributes.privacy.multi_address_correlation'
}

function uniqueDestinations(references: ReferenceArray): Evaluation<MultiAddressCorrelationValue> {
	return {
		value: {
			id: 'unique_destinations',
			rating: Rating.PASS,
			icon: '\u{26d3}', // Broken chain
			displayName: 'Wallet uses unique endpoints per address',
			shortExplanation: sentence(
				'{{WALLET_NAME}} uses unique endpoints for each wallet address, which keeps them uncorrelated.',
			),
			__brand: brand,
		},
		details: paragraph(
			'When configured with multiple addresses, {{WALLET_NAME}} uses unique RPC endpoints for each wallet address. Therefore, no single RPC endpoint gets to learn about more than one of your addresses.',
		),
		references,
	}
}

function activeAddressOnly(references: ReferenceArray): Evaluation<MultiAddressCorrelationValue> {
	return {
		value: {
			id: 'active_address_only',
			rating: Rating.PASS,
			icon: '\u{1f4ce}', // Single paperclip
			displayName: 'Wallet only handles one active address at a time',
			shortExplanation: sentence(
				"{{WALLET_NAME}} only makes requests about one active address at a time, so it can't be correlated with other addresses.",
			),
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} only has one active address at a time, and all outgoing RPC requests are only about that address. Additionally, the account switching UI does not perform bulk queries about all configured addresses in close succession.',
		),
		impact: paragraph(
			'Multi-address privacy is generally well-preserved by {{WALLET_NAME}}. However, you should avoid quickly switching between active addresses in order to avoid making successive requests to the same RPC endpoint about different addresses.',
		),
		references,
	}
}

function bulkRequests(references: ReferenceArray): Evaluation<MultiAddressCorrelationValue> {
	return {
		value: {
			id: 'bulkRequests',
			rating: Rating.FAIL,
			displayName: 'Multiple addresses are correlatable by a third party',
			shortExplanation: sentence(
				'{{WALLET_NAME}} makes bulk requests containing multiple addresses to the same endpoint, which allows it to correlate your addresses.',
			),
			__brand: brand,
		},
		details: paragraph(
			'When configured with multiple addresses, {{WALLET_NAME}} makes requests that contain multiple addresses simultaneously.',
		),
		impact: paragraph(
			'Using multiple addresses in {{WALLET_NAME}} will allow them to be correlated by a third-party. You should avoid configuring multiple addresses with {{WALLET_NAME}}.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should first ensure that it never makes requests containing multiple addresses simultaneously. Next, it should ensure that these requests are staggered and are proxied through different proxies and RPC endpoints to prevent correlation. This can be done through the use of privacy solutions such as Oblivious HTTP, Tor, and others.',
		),
		references,
	}
}

function correlatableRequests(
	references: ReferenceArray,
): Evaluation<MultiAddressCorrelationValue> {
	return {
		value: {
			id: 'correlatableRequests',
			rating: Rating.FAIL,
			displayName: 'Multiple addresses are correlatable by a third party',
			shortExplanation: sentence(
				'{{WALLET_NAME}} makes requests about multiple addresses simultaneously to the same endpoint, which allows it to correlate your addresses.',
			),
			__brand: brand,
		},
		details: paragraph(
			'When configured with multiple addresses, {{WALLET_NAME}} makes separate requests for each wallet address, but these requests are sent simultaneously and without proxying. This allows the RPC endpoint to correlate your addresses.',
		),
		impact: paragraph(
			'Using multiple addresses in {{WALLET_NAME}} will allow them to be correlated by a third-party. You should avoid configuring multiple addresses with {{WALLET_NAME}}.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should ensure that its requests are staggered and are proxied through different proxies and RPC endpoints to prevent correlation. This can be done through the use of privacy solutions such as Oblivious HTTP, Tor, and others.',
		),
		references,
	}
}

function staggeredRequests(references: ReferenceArray): Evaluation<MultiAddressCorrelationValue> {
	return {
		value: {
			id: 'staggered_requests',
			rating: Rating.PARTIAL,
			displayName: 'Requests for multiple addresses are staggered across time',
			shortExplanation: sentence(
				'{{WALLET_NAME}} staggers requests about multiple addresses over time time, which makes it harder to correlate your addresses.',
			),
			__brand: brand,
		},
		details: paragraph(
			'When configured with multiple addresses, {{WALLET_NAME}} makes requests that contain only one of your addresses at a time. While each of these requests go to the same endpoint, they are staggered over time. Depending on the delay between such requests, this can provide an imperfect degree of privacy, as this makes it harder for the endpoint to correlate these requests as coming from the same user due to the time elapsed between the requests. However, since these requests are still unproxied, the endpoint is still able to correlate the requests due to their identical origin IP address.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should ensure requests are proxied through distinct proxies in order to prevent the RPC endpoint from learning the correlation between addresses. This can be done through the use of privacy solutions such as Oblivious HTTP, Tor, and others.',
		),
		references,
	}
}

function separateCircuits(references: ReferenceArray): Evaluation<MultiAddressCorrelationValue> {
	return {
		value: {
			id: 'separate_circuits',
			rating: Rating.PARTIAL,
			displayName: 'Requests for multiple addresses use separate proxies',
			shortExplanation: sentence(
				'{{WALLET_NAME}} uses distinct proxies to make requests about multiple addresses, which makes it harder to correlate your addresses.',
			),
			__brand: brand,
		},
		details: paragraph(
			'When configured with multiple addresses, {{WALLET_NAME}} makes requests that contain only one of your addresses at a time. While each of these requests go to the same endpoint, they each use a different proxy circuit in order to appear as coming from different IPs from the perspective of the endpoint. This provides an imperfect degree of privacy, as it makes it harder for the endpoint to correlate these requests as coming from the same user. However, since these requests are all made together simultaneously, the endpoint is still able to correlate them by grouping them across time.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should add randomized delays between refreshes of separate addresses in order to reduce time-based correlatability of addresses by the RPC endpoint.',
		),
		references,
	}
}

function staggeredAndSeparateCircuits(
	references: ReferenceArray,
): Evaluation<MultiAddressCorrelationValue> {
	return {
		value: {
			id: 'staggered_and_separate_circuits',
			rating: Rating.PASS,
			icon: '\u{26d3}', // Broken chain
			displayName: 'Requests for multiple addresses are uncorrelated',
			shortExplanation: sentence(
				'{{WALLET_NAME}} uses distinct proxies and staggers requests about multiple addresses over time, which makes it harder to correlate your addresses.',
			),
			__brand: brand,
		},
		details: paragraph(
			'When configured with multiple addresses, {{WALLET_NAME}} makes requests that contain only one of your addresses at a time. While each of these requests go to the same endpoint, they each use a different proxy circuit in order to appear as coming from different IPs from the perspective of the endpoint, and they are staggered over time. This provides a good degree of privacy, as it makes it harder for the endpoint to correlate these requests as coming from the same user. From the perspective of the endpoint, these requests come in from random IPs at random times, avoiding both IP-based and time-based correlation.',
		),
		references,
	}
}

function unsupported(): Evaluation<MultiAddressCorrelationValue> {
	return {
		value: {
			id: 'unsupported',
			rating: Rating.UNRATED,
			icon: '\u{1f4ce}', // Single paperclip
			displayName: 'Multiple addresses unsupported',
			shortExplanation: sentence('You can only use one address in {{WALLET_NAME}}.'),
			__brand: brand,
		},
		details: paragraph(
			'You can only use one address in {{WALLET_NAME}}, so multi-address privacy is irrelevant.',
		),
		references: [],
	}
}

function rateHandling(handling: MultiAddressHandling, endpoint: Endpoint): number {
	switch (handling.type) {
		case MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES:
			return 0
		case MultiAddressPolicy.ACTIVE_ADDRESS_ONLY:
			return 1000
		case MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS: {
			const destinationScore = { SAME_FOR_ALL: 0, ISOLATED: 1 }[handling.destination] * 1000
			const enclaveScore =
				(() => {
					switch (endpoint.type) {
						case 'REGULAR':
							return 0
						case 'SECURE_ENCLAVE':
							switch (endpoint.externalLogging.type) {
								case 'UNKNOWN':
									return 0
								case 'YES':
									return 0
								case 'NO':
									switch (endpoint.endToEndEncryption.type) {
										case 'NONE':
											return 0
										case 'TERMINATED_OUT_OF_ENCLAVE':
											return 0
										case 'TERMINATED_INSIDE_ENCLAVE':
											if (
												!endpoint.verifiability.sourceAvailable ||
												!endpoint.verifiability.reproducibleBuilds
											) {
												// Server can be running anything, so all bets are off.
												return 0
											}

											switch (endpoint.verifiability.clientVerification.type) {
												case 'NOT_VERIFIED':
													return 1
												case 'VERIFIED_BUT_NO_SOURCE_AVAILABLE':
													return 2
												case 'VERIFIED':
													return 3
											}
									}
							}
					}
				})() * 100
			const proxyScore = { NONE: 0, SAME_CIRCUIT: 1, SEPARATE_CIRCUITS: 2 }[handling.proxy] * 10
			const timingScore = { SIMULTANEOUS: 0, STAGGERED: 1 }[handling.timing]

			return 1 + destinationScore + enclaveScore + proxyScore + timingScore
		}
	}
}

export const multiAddressCorrelation: Attribute<MultiAddressCorrelationValue> = {
	id: 'multiAddressCorrelation',
	icon: '\u{1f587}', // Linked paperclips
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
		Wallets are assessed based on whether a third-party can learn that
		two or more of the user's wallet addresses belong to the same user.

		A third-party may learn of this correlation either through:

		- The wallet software explicitly sending this data (e.g. through
		  analytics)
		- Requesting data about multiple wallet addresses in bulk, allowing
		  the receiving endpoint to learn that all of these addresses belong to
		  the same user. Similar correlations are also possible by IP and/or
			time-based correlation of requests that each contain one wallet address.

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
			endpoint cannot correlate addressed based on timing or IP address.
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
				bulkRequests([]).value,
			),
			exampleRating(
				paragraph(
					"The wallet makes multiple simultaneous requests about each of the user's wallet balances, without proxying or staggering the requests.",
				),
				correlatableRequests([]).value,
			),
		],
		partial: [
			exampleRating(
				paragraph(
					"The wallet makes multiple simultaneous requests about each of the user's wallet balances, proxying each of them through a different proxy circuit (e.g. Tor with unique circuits for each wallet address). The receiving endpoint may still correlate these addresses through time-based correlation.",
				),
				separateCircuits([]).value,
			),
			exampleRating(
				paragraph(
					"The wallet makes multiple requests about each of the user's wallet balances, staggering them over time to avoid time-based correlation. The receiving endpoint may still correlate these addresses through IP-address-based correlation.",
				),
				staggeredRequests([]).value,
			),
		],
		pass: [
			exampleRating(
				paragraph(
					"The wallet makes multiple requests about each of the user's wallet balances, staggering them over time to avoid time-based correlation, and using unique proxy circuits for each wallet address to avoid IP-address-based correlation.",
				),
				staggeredAndSeparateCircuits([]).value,
			),
			exampleRating(
				paragraph(
					"The wallet distributes requests about each of the user's wallet balances across unique RPC endpoints owned by different entities, preventing any single entity from learning about more than one wallet address.",
				),
				uniqueDestinations([]).value,
			),
			exampleRating(
				paragraph(
					'The wallet only has one active wallet address at a time, and only ever makes requests about this wallet address and no other.',
				),
				activeAddressOnly([]).value,
			),
			exampleRating(
				paragraph(
					"The wallet runs by default with a user's own self-hosted node, preventing any third-party from learning about any of the user's wallet addresses.",
				),
				exampleRatingUnimplemented,
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<MultiAddressCorrelationValue> => {
		if (features.multiAddress === null) {
			return unrated(multiAddressCorrelation, brand, null)
		}

		if (!isSupported(features.multiAddress)) {
			return unsupported()
		}

		const dataCollection = dataCollectionForAllSupportedFlows(features.privacy.dataCollection)

		if (dataCollection === null) {
			return unrated(multiAddressCorrelation, brand, null)
		}

		let worstHandling: DataCollectionByEntity | null = null
		let worstHandlingScore = -1
		const allRefs: ReferenceArray = []

		for (const collected of dataCollection) {
			const leaks = qualifiedDataCollectionWithEndpoint(collected.dataCollection)

			if (!collectedByDefault(leaks[WalletInfo.ACCOUNT_ADDRESS])) {
				continue
			}

			if (leaks.multiAddress === undefined) {
				return unrated(multiAddressCorrelation, brand, null)
			}

			allRefs.push(...refs(collected))
			const score = rateHandling(leaks.multiAddress, leaks.endpoint)

			if (worstHandling === null || score < worstHandlingScore) {
				worstHandling = collected
				worstHandlingScore = score
			}
		}

		if (worstHandling === null) {
			return unrated(multiAddressCorrelation, brand, null)
		}

		const handling = worstHandling.dataCollection.multiAddress

		if (handling === undefined) {
			return unrated(multiAddressCorrelation, brand, null)
		}

		switch (handling.type) {
			case MultiAddressPolicy.ACTIVE_ADDRESS_ONLY:
				// If the wallet has a concept of a singular "active address" and only
				// ever makes requests about it, then other addresses are never exposed
				// and therefore not correlatable.
				return activeAddressOnly(allRefs)
			case MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES:
				// If the wallet makes a single request with multiple addresses,
				// they are clearly correlatable.
				return bulkRequests(allRefs)
			case MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS:
				if (handling.destination === 'ISOLATED') {
					// The wallet makes requests to different endpoints for each
					// address, so they are not correlatable.
					return uniqueDestinations(allRefs)
				}

				if (handling.proxy === 'SEPARATE_CIRCUITS' && handling.timing === 'STAGGERED') {
					// The wallet mitigates correlation both at the network level and by
					// time. Not correlated.
					return staggeredAndSeparateCircuits(allRefs)
				}

				if (handling.proxy === 'SEPARATE_CIRCUITS' && handling.timing !== 'STAGGERED') {
					// Requests not staggered, but coming from different IPs.
					// Better than nothing.
					return separateCircuits(allRefs)
				}

				if (handling.proxy !== 'SEPARATE_CIRCUITS' && handling.timing === 'STAGGERED') {
					// Requests staggered, but coming from the same IP.
					// Better than nothing.
					return staggeredRequests(allRefs)
				}

				// Requests not staggered, and all coming from the same IP.
				// That is correlated.
				return correlatableRequests(allRefs)
		}
	},
	aggregate: pickWorstRating<MultiAddressCorrelationValue>,
}
