import { erc7828 } from '@/data/eips/erc-7828'
import { erc7831 } from '@/data/eips/erc-7831'
import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { isSupported, type Support, type Supported } from '@/schema/features/support'
import { type ReferenceArray, refs } from '@/schema/reference'
import { markdown, mdParagraph, mdSentence, paragraph, sentence } from '@/types/content'
import type { NonEmptyArray } from '@/types/utils/non-empty'

import { type Eip, eipMarkdownLink, eipMarkdownLinkAndTitle, eipShortLabel } from '../../eips'
import type {
	AddressResolution,
	AddressResolutionData,
} from '../../features/privacy/address-resolution'
import { pickWorstRating, unrated } from '../common'

export type AddressResolutionValue = Value & {
	addressResolution?: AddressResolution<Support<AddressResolutionData>>
}

function getOffchainProviderInfo(
	support: Supported<AddressResolutionData> & { medium: 'OFFCHAIN' },
): { rating: Rating; offchainInfo: string; walletShould?: string } {
	if (
		support.offchainDataVerifiability === 'VERIFIABLE' &&
		support.offchainProviderConnection === 'UNIQUE_PROXY_CIRCUIT'
	) {
		return {
			rating: Rating.PASS,
			offchainInfo:
				'It relies on an offchain data source to do so, but does so in a verifiable and privacy-preserving manner.',
			walletShould: undefined,
		}
	}

	if (support.offchainDataVerifiability === 'VERIFIABLE') {
		return {
			rating: Rating.PARTIAL,
			offchainInfo:
				'It relies on an offchain external provider to do so. The wallet verifies that the address is correct, but the offchain provider may learn your IP address.',
			walletShould:
				'contact the external provider using traffic anonymizing techniques, such as Tor or Oblivious HTTP',
		}
	}

	if (support.offchainProviderConnection === 'UNIQUE_PROXY_CIRCUIT') {
		return {
			rating: Rating.PARTIAL,
			offchainInfo:
				'It relies on an offchain external provider to do so. This offchain provider trick the wallet into sending funds to a different address than intended.',
			walletShould:
				'ensure the response from the external provider is correct using onchain data verified by a light client',
		}
	}

	return {
		rating: Rating.PARTIAL,
		offchainInfo:
			'It relies on an offchain external provider to do so. This offchain provider may trick the wallet into sending funds to a different address than intended, and may learn your IP address.',
		walletShould:
			'contact the external provider using traffic anonymizing techniques (such as Tor or Oblivious HTTP), and ensure the response from the external provider is correct using onchain data verified by a light client',
	}
}

function evaluateAddressResolution(
	addressResolution: AddressResolution<Support<AddressResolutionData>>,
	references: ReferenceArray,
): Evaluation<AddressResolutionValue> {
	const chainSpecificERCs: NonEmptyArray<[Eip, Support<AddressResolutionData>, string]> = [
		[erc7828, addressResolution.chainSpecificAddressing.erc7828, 'user@l2chain.eth'],
		[erc7831, addressResolution.chainSpecificAddressing.erc7831, 'user.eth:l2chain'],
	]

	for (const [erc, chainSpecificSupport, exampleAddress] of chainSpecificERCs) {
		if (!isSupported(chainSpecificSupport)) {
			continue
		}

		if (chainSpecificSupport.medium === 'CHAIN_CLIENT') {
			return {
				value: {
					id: `support_via_erc${erc.number}_onchain`,
					rating: Rating.PASS,
					displayName: `Resolves human-readable ${eipShortLabel(erc)} addresses`,
					addressResolution,
					shortExplanation: sentence(
						`{{WALLET_NAME}} supports chain-specific human-readable addresses in ${eipShortLabel(erc)} format.`,
					),
				},
				details: mdParagraph(
					`{{WALLET_NAME}} supports chain-specific human-readable addresses in ${eipShortLabel(erc)} format, such as \`${exampleAddress}\`. It does so using onchain data sources using the same code as when interacting with the chain in general, inheriting its privacy and verifiability properties. For more information on ${eipShortLabel(erc)} addresses, see ${eipMarkdownLinkAndTitle(erc)}.`,
				),
				references,
			}
		}

		const { rating, offchainInfo, walletShould } = getOffchainProviderInfo(chainSpecificSupport)

		return {
			value: {
				id: `support_via_erc${erc.number}_${chainSpecificSupport.offchainDataVerifiability.toLowerCase()}_${chainSpecificSupport.offchainProviderConnection.toLowerCase()}_provider`,
				rating,
				displayName: `Resolves human-readable ${eipShortLabel(erc)} addresses offchain`,
				addressResolution,
				shortExplanation: sentence(
					`{{WALLET_NAME}} supports chain-specific human-readable addresses in ${eipShortLabel(erc)} format using an offchain provider.`,
				),
			},
			details: mdParagraph(
				`{{WALLET_NAME}} supports chain-specific human-readable addresses in ${eipShortLabel(erc)} format, such as \`${exampleAddress}\`. ${offchainInfo} For more information on ${eipShortLabel(erc)} addresses, see ${eipMarkdownLinkAndTitle(erc)}.`,
			),
			howToImprove:
				walletShould === undefined
					? undefined
					: mdParagraph(
							`{{WALLET_NAME}} should use fully-onchain resolution to resolve the address, or should ${walletShould}.`,
						),
			references,
		}
	}

	if (addressResolution.nonChainSpecificEnsResolution.support === 'NOT_SUPPORTED') {
		return {
			value: {
				id: 'no_address_resolution',
				rating: Rating.FAIL,
				displayName: 'No human-readable address resolution',
				addressResolution,
				shortExplanation: sentence(
					'{{WALLET_NAME}} does not resolve human-readable addresses such as ENS names.',
				),
			},
			details: paragraph(
				'{{WALLET_NAME}} does not support resolving human-readable addresses, such as ENS (.eth) names.',
			),
			howToImprove: markdown(
				'When sending funds to a user-entered address, {{WALLET_NAME}} should automatically resolve such addresses when they are well-known human-readable formats such as ENS (.eth) names.',
			),
			references,
		}
	}

	if (addressResolution.nonChainSpecificEnsResolution.medium === 'CHAIN_CLIENT') {
		return {
			value: {
				id: 'support_plain_ens_onchain',
				rating: Rating.PARTIAL,
				displayName: 'Supports non-chain-specific ENS addresses',
				addressResolution,
				shortExplanation: sentence(
					'{{WALLET_NAME}} supports sending to plain ENS addresses but not chain-specific human-readable addresses.',
				),
			},
			details: markdown(`
				{{WALLET_NAME}} supports sending funds to human-readable ENS addresses such as \`username.eth\`, but does not support chain-specific address formats that specify the destination chain.

				It does so using onchain data sources using the same code as when interacting with the chain in general, inheriting its privacy and verifiability properties.
			`),
			howToImprove: markdown(`
				{{WALLET_NAME}} may want to add support for sending funds to chain-specific human-readable addresses, as specified by either:

				* ${eipMarkdownLinkAndTitle(erc7828)}: \`user@l2chain.eth\`
				* ${eipMarkdownLinkAndTitle(erc7831)}: \`user.eth:l2chain\`
			`),
			references,
		}
	}

	const { offchainInfo, walletShould } = getOffchainProviderInfo(
		addressResolution.nonChainSpecificEnsResolution,
	)

	return {
		value: {
			id: `support_basic_${addressResolution.nonChainSpecificEnsResolution.offchainDataVerifiability.toLowerCase()}_${addressResolution.nonChainSpecificEnsResolution.offchainProviderConnection.toLowerCase()}_provider`,
			rating: Rating.PARTIAL,
			displayName: 'Resolves ENS addresses using an offchain service',
			addressResolution,
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports sending to ENS addresses but uses an offchain service for resolution.',
			),
		},
		details: markdown(`
			{{WALLET_NAME}} supports sending funds to human-readable ENS addresses such as \`username.eth\`.

			${offchainInfo}
		`),
		howToImprove:
			walletShould === undefined
				? undefined
				: markdown(`
					{{WALLET_NAME}} should use fully-onchain resolution to resolve the address, or should ${walletShould}.

					{{WALLET_NAME}} may want to add support for sending funds to chain-specific human-readable addresses, as specified by either:

					* ${eipMarkdownLinkAndTitle(erc7828)}: \`user@l2chain.eth\`
					* ${eipMarkdownLinkAndTitle(erc7831)}: \`user.eth:l2chain\`
				`),
		references,
	}
}

export const addressResolution: Attribute<AddressResolutionValue> = {
	id: 'addressResolution',
	icon: '\u{1f4c7}', // Card index
	displayName: 'Address resolution',
	wording: {
		midSentenceName: 'address resolution',
	},
	question: sentence('Can you send funds to human-readable Ethereum addresses?'),
	why: markdown(`
		Ethereum addresses are hexadecimal strings (\`0x...\`) which are
		unreadable to humans. Phishing scams and exploits have used this to
		trick users into sending funds to invalid addresses, for example by
		generating lookalike-addresses and tricking users into copy/pasting
		them without noticing the difference.

		Additionally, Ethereum's transition to layer 2 chains has changed user
		needs when sending funds. The hexadecimal address isn't sufficient
		anymore; the user needs to ensure that they are sending funds to the
		correct hexadecimal address *on the correct chain*, increasing the
		potential for mistakenly sending funds to the wrong place or the wrong
		chain.

		Address naming registries like ENS partially solve this problem by
		allowing more human-readable names like \`username.eth\` to be
		automatically turned into the hexadecimal address. This is easier to
		share and to accurately transfer by humans. Additionally, some address
		format standards improve upon this further by including the destination
		chain information as part of the address itself. Such standards include:

		* ${eipMarkdownLinkAndTitle(erc7828)}: \`user@l2chain.eth\`
		* ${eipMarkdownLinkAndTitle(erc7831)}: \`user.eth:l2chain\`

		Wallets that support either of these standards are able to automatically
		determine the destination address and chain from a human-readable string,
		and can bridge funds across chains as appropriate. This improves the user
		experience of Ethereum and its layer 2 ecosystem while reducing the
		potential for mistakes when sending funds.
	`),
	methodology: markdown(`
		Wallets are rated based on the types of addresses they support sending
		funds to.

		Walletbeat recognizes the following destination address formats:

		* Plain ENS addresses (\`username.eth\`) without destination chain information
		* ${eipMarkdownLinkAndTitle(erc7828)}: \`user@l2chain.eth\`
		* ${eipMarkdownLinkAndTitle(erc7831)}: \`user.eth:l2chain\`

		Wallets receive a **pass** only if they support ${eipMarkdownLink(erc7828)} or
		${eipMarkdownLink(erc7831)} (chain-specific human-readable addresses).
		Wallets that support only plain ENS, with or without onchain resolution,
		receive a **partial** rating.

		For a pass, the mechanism used to perform the resolution must either:

		* Be done using onchain data and reusing the wallet's common chain
		  interaction client, inheriting its verifiability (e.g. via light
		  client) and privacy properties.
		* **OR** be done using an offchain external provider in such a way that
		  the address returned by the external provider is verifiable, and
		  without revealing the user's IP address to the provider.
		  This ensures that:
		  - The wallet cannot be tricked into sending funds to an attacker
		    compromising the offchain provider's responses
		  - The provider may not progressively learn the user's contacts list by
		    associating its successive resolution queries by IP over time.

		For addresses that **require** an offchain lookup (e.g. ENS names
		using [offchain resolvers with CCIP-Read](https://docs.ens.domains/resolvers/ccip-read)),
		only the portion of the work necessary to _arrive at the conclusion_
		that an offchain lookup is necessary is considered.
		In other words, wallets must verify that the CCIP-Read
		\`OffchainLookup\` details are as claimed and then perform the CCIP-Read
		themselves, rather than trust an offchain provider to do so on their
		behalf.
	`),
	ratingScale: {
		display: 'fail-pass',
		exhaustive: false,
		pass: [
			exampleRating(
				mdSentence(
					`The wallet resolves ${eipMarkdownLink(erc7828)} or ${eipMarkdownLink(erc7831)} addresses, using onchain data for resolution.`,
				),
				evaluateAddressResolution(
					{
						chainSpecificAddressing: {
							erc7828: {
								support: 'SUPPORTED',
								medium: 'CHAIN_CLIENT',
							},
							erc7831: {
								support: 'NOT_SUPPORTED',
							},
						},
						nonChainSpecificEnsResolution: {
							support: 'SUPPORTED',
							medium: 'CHAIN_CLIENT',
						},
					},
					[],
				),
			),
			exampleRating(
				mdSentence(
					`The wallet resolves ${eipMarkdownLink(erc7828)} or ${eipMarkdownLink(erc7831)} addresses using an offchain provider in a verifiable and privacy-preserving manner.`,
				),
				evaluateAddressResolution(
					{
						chainSpecificAddressing: {
							erc7828: {
								support: 'NOT_SUPPORTED',
							},
							erc7831: {
								support: 'SUPPORTED',
								medium: 'OFFCHAIN',
								offchainDataVerifiability: 'VERIFIABLE',
								offchainProviderConnection: 'UNIQUE_PROXY_CIRCUIT',
							},
						},
						nonChainSpecificEnsResolution: {
							support: 'NOT_SUPPORTED',
						},
					},
					[],
				),
			),
		],
		partial: [
			exampleRating(
				mdSentence(
					'The wallet resolves non-chain-specific ENS addresses (`username.eth`) when sending tokens, using onchain data for resolution.',
				),
				evaluateAddressResolution(
					{
						chainSpecificAddressing: {
							erc7828: {
								support: 'NOT_SUPPORTED',
							},
							erc7831: {
								support: 'NOT_SUPPORTED',
							},
						},
						nonChainSpecificEnsResolution: {
							support: 'SUPPORTED',
							medium: 'CHAIN_CLIENT',
						},
					},
					[],
				),
			),
			exampleRating(
				mdSentence(
					`The wallet resolves ${eipMarkdownLink(erc7828)} or ${eipMarkdownLink(erc7831)} addresses using an offchain external provider, without verifying the address.`,
				),
				evaluateAddressResolution(
					{
						chainSpecificAddressing: {
							erc7828: {
								support: 'SUPPORTED',
								medium: 'OFFCHAIN',
								offchainDataVerifiability: 'NOT_VERIFIABLE',
								offchainProviderConnection: 'UNIQUE_PROXY_CIRCUIT',
							},
							erc7831: {
								support: 'NOT_SUPPORTED',
							},
						},
						nonChainSpecificEnsResolution: {
							support: 'NOT_SUPPORTED',
						},
					},
					[],
				),
			),
			exampleRating(
				mdSentence(
					`The wallet resolves ${eipMarkdownLink(erc7828)} or ${eipMarkdownLink(erc7831)} addresses using an offchain external provider which may learn the user's IP address.`,
				),
				evaluateAddressResolution(
					{
						chainSpecificAddressing: {
							erc7828: {
								support: 'SUPPORTED',
								medium: 'OFFCHAIN',
								offchainDataVerifiability: 'VERIFIABLE',
								offchainProviderConnection: 'DIRECT_CONNECTION',
							},
							erc7831: {
								support: 'NOT_SUPPORTED',
							},
						},
						nonChainSpecificEnsResolution: {
							support: 'NOT_SUPPORTED',
						},
					},
					[],
				),
			),
		],
		fail: exampleRating(
			mdSentence('The wallet only supports sending funds to raw (`0x...`) addresses.'),
			evaluateAddressResolution(
				{
					chainSpecificAddressing: {
						erc7828: {
							support: 'NOT_SUPPORTED',
						},
						erc7831: {
							support: 'NOT_SUPPORTED',
						},
					},
					nonChainSpecificEnsResolution: {
						support: 'NOT_SUPPORTED',
					},
				},
				[],
			),
		),
	},
	evaluate: (features: ResolvedFeatures): Evaluation<AddressResolutionValue> => {
		if (features.addressResolution === null) {
			return unrated(addressResolution, {})
		}

		if (
			features.addressResolution.nonChainSpecificEnsResolution === null ||
			features.addressResolution.chainSpecificAddressing.erc7828 === null ||
			features.addressResolution.chainSpecificAddressing.erc7831 === null
		) {
			return unrated(addressResolution, {})
		}

		// We've checked all the nulls, so recreate the object without nulls in
		// the type description.
		const resolvedResolution: AddressResolution<Support<AddressResolutionData>> = {
			chainSpecificAddressing: {
				erc7828: features.addressResolution.chainSpecificAddressing.erc7828,
				erc7831: features.addressResolution.chainSpecificAddressing.erc7831,
			},
			nonChainSpecificEnsResolution: features.addressResolution.nonChainSpecificEnsResolution,
		}

		return evaluateAddressResolution(resolvedResolution, refs(features.addressResolution))
	},
	aggregate: pickWorstRating<AddressResolutionValue>,
}
