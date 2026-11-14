import { erc7828 } from '@/data/eips/erc-7828'
import { erc7831 } from '@/data/eips/erc-7831'
import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	Rating,
	Verifiability,
} from '@/schema/attributes'
import { isSupported, notSupported, type Support, type Supported } from '@/schema/features/support'
import { markdown, mdParagraph, mdSentence, paragraph, sentence } from '@/types/content'
import type { NonEmptyArray } from '@/types/utils/non-empty'

import { type Eip, eipMarkdownLink, eipMarkdownLinkAndTitle, eipShortLabel } from '../../eips'
import type {
	AddressResolution,
	AddressResolutionData,
	NameService,
	NameServiceSupport,
} from '../../features/privacy/address-resolution'
import { nameServiceInfo, trackedNameServices } from '../../features/privacy/address-resolution'
import { hasRefs } from '../../reference'
import { pickWorstRating, unrated } from '../common'

export type AddressResolutionMetadata = {
	addressResolution?: AddressResolution<Support<AddressResolutionData> | null>
}

/** The minimum number of naming services a wallet must support to earn a partial rating. */
const MINIMUM_NAME_SERVICES_FOR_PARTIAL = 2

type SupportedNameService = {
	service: NameService
	support: Supported<AddressResolutionData>
}

function getSupportedNameServices(
	nameServices: NameServiceSupport<Support<AddressResolutionData> | null>,
): SupportedNameService[] {
	const supported: SupportedNameService[] = []

	for (const service of trackedNameServices.items) {
		const support = nameServices[service]

		if (support !== null && isSupported(support)) {
			supported.push({ service, support })
		}
	}

	return supported
}

/** @returns A comma-separated list of every tracked naming service, with its suffix. */
function nameServiceExamplesMarkdown(): string {
	return trackedNameServices.items
		.map(service => {
			const info = nameServiceInfo[service]

			return `${info.displayName} (\`${info.suffix}\`)`
		})
		.join(', ')
}

/**
 * Lower values are better: onchain resolution is preferred over offchain
 * resolution, and verifiable or anonymized offchain resolution is preferred
 * over alternatives.
 */
function resolutionPriority(support: Supported<AddressResolutionData>): number {
	if (support.medium === 'CHAIN_CLIENT') {
		return 0
	}

	const isVerifiable = support.offchainDataVerifiability === 'VERIFIABLE'
	const isProxied = support.offchainProviderConnection === 'UNIQUE_PROXY_CIRCUIT'

	if (isVerifiable) {
		return isProxied ? 1 : 2
	}

	return isProxied ? 3 : 4
}

function nameServiceListMarkdown(supported: SupportedNameService[]): string {
	return supported
		.map(({ service }) => {
			const info = nameServiceInfo[service]

			return `* ${info.displayName} (\`${info.suffix}\`), such as \`${info.exampleName}\``
		})
		.join('\n')
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
			'contact the external provider using traffic anonymizing techniques (such as Tor or Oblivious HTTP). {{WALLET_NAME}} should also ensure the response from the external provider is correct using onchain data verified by a light client',
	}
}

const chainSpecificAddressFormats = `
	{{WALLET_NAME}} may want to add support for sending funds to chain-specific human-readable addresses, as specified by either:

	* ${eipMarkdownLinkAndTitle(erc7828)}: \`user@l2chain.eth\`
	* ${eipMarkdownLinkAndTitle(erc7831)}: \`user.eth:l2chain\`
`

function evaluateAddressResolution(
	ctx: EvaluationContext<AddressResolutionMetadata>,
	addressResolution: AddressResolution<Support<AddressResolutionData> | null>,
): Evaluation<AddressResolutionMetadata> {
	const chainSpecificERCs: NonEmptyArray<[Eip, Support<AddressResolutionData> | null, string]> = [
		[erc7828, addressResolution.chainSpecificAddressing.erc7828, 'user@l2chain.eth'],
		[erc7831, addressResolution.chainSpecificAddressing.erc7831, 'user.eth:l2chain'],
	]

	for (const [erc, chainSpecificSupport, exampleAddress] of chainSpecificERCs) {
		if (chainSpecificSupport === null) {
			return unrated(ctx, { addressResolution })
		}

		if (!isSupported(chainSpecificSupport)) {
			continue
		}

		if (chainSpecificSupport.medium === 'CHAIN_CLIENT') {
			return ctx.build({
				outcome: {
					id: `support_via_erc${erc.number}_onchain`,
					rating: Rating.PASS,
					displayName: `Resolves human-readable ${eipShortLabel(erc)} addresses`,
					metadata: {
						addressResolution,
					},
					shortExplanation: sentence(
						`{{WALLET_NAME}} supports chain-specific human-readable addresses in ${eipShortLabel(erc)} format.`,
					),
				},
				details: mdParagraph(
					`{{WALLET_NAME}} supports chain-specific human-readable addresses in ${eipShortLabel(erc)} format, such as \`${exampleAddress}\`. It does so using onchain data sources using the same code as when interacting with the chain in general, inheriting its privacy and verifiability properties. For more information on ${eipShortLabel(erc)} addresses, see ${eipMarkdownLinkAndTitle(erc)}.`,
				),
			})
		}

		const { rating, offchainInfo, walletShould } = getOffchainProviderInfo(chainSpecificSupport)

		return ctx.build({
			outcome: {
				id: `support_via_erc${erc.number}_${chainSpecificSupport.offchainDataVerifiability.toLowerCase()}_${chainSpecificSupport.offchainProviderConnection.toLowerCase()}_provider`,
				rating,
				displayName: `Resolves human-readable ${eipShortLabel(erc)} addresses offchain`,
				metadata: {
					addressResolution,
				},
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
		})
	}

	const supportedNameServices = getSupportedNameServices(addressResolution.nameServices)
	const hasUnknownNameService = trackedNameServices.items.some(
		service => addressResolution.nameServices[service] === null,
	)

	if (supportedNameServices.length === 0) {
		if (hasUnknownNameService) {
			return unrated(ctx, { addressResolution })
		}

		const nameServiceExamples = nameServiceExamplesMarkdown()

		return ctx.build({
			outcome: {
				id: 'no_address_resolution',
				rating: Rating.FAIL,
				displayName: 'No human-readable address resolution',
				metadata: {
					addressResolution,
				},
				shortExplanation: sentence(
					`{{WALLET_NAME}} does not resolve human-readable names such as ${nameServiceExamples}.`,
				),
			},
			details: paragraph(
				`{{WALLET_NAME}} does not support resolving human-readable names, such as ${nameServiceExamples}.`,
			),
			howToImprove: markdown(
				`When sending funds to a user-entered address, {{WALLET_NAME}} should automatically resolve such addresses when they are well-known human-readable formats such as ${nameServiceExamples}.`,
			),
		})
	}

	if (supportedNameServices.length < MINIMUM_NAME_SERVICES_FOR_PARTIAL) {
		const supportedNameService = supportedNameServices[0]
		const supportedInfo = nameServiceInfo[supportedNameService.service]
		const supportedNameServiceList = nameServiceListMarkdown(supportedNameServices)
		const nameServiceExamples = nameServiceExamplesMarkdown()

		return ctx.build({
			outcome: {
				id: 'support_only_one_name_service',
				rating: Rating.FAIL,
				displayName: `Supports only ${supportedInfo.displayName} addresses`,
				metadata: {
					addressResolution,
				},
				shortExplanation: sentence(
					`{{WALLET_NAME}} only supports plain ${supportedInfo.displayName} (\`${supportedInfo.suffix}\`) addresses, which is not enough for a partial rating.`,
				),
			},
			details: markdown(`
				{{WALLET_NAME}} supports sending funds to human-readable addresses from only one naming service:

				${supportedNameServiceList}

				Walletbeat requires support for at least ${MINIMUM_NAME_SERVICES_FOR_PARTIAL} naming services to earn a partial rating, so that users are not locked into a single naming service.
			`),
			howToImprove: markdown(`
				{{WALLET_NAME}} should add support for names from at least one more naming service, such as ${nameServiceExamples}.
			`),
		})
	}

	const bestNameService = supportedNameServices.reduce((best, candidate) =>
		resolutionPriority(candidate.support) < resolutionPriority(best.support) ? candidate : best,
	)
	const supportedNameServiceList = nameServiceListMarkdown(supportedNameServices)
	const displayName = `Supports human-readable addresses from ${supportedNameServices.length} naming services`

	if (bestNameService.support.medium === 'CHAIN_CLIENT') {
		return ctx.build({
			outcome: {
				id: 'support_plain_name_service_onchain',
				rating: Rating.PARTIAL,
				displayName,
				metadata: {
					addressResolution,
				},
				shortExplanation: sentence(
					'{{WALLET_NAME}} supports sending to plain name service addresses but not chain-specific human-readable addresses.',
				),
			},
			details: markdown(`
				{{WALLET_NAME}} supports sending funds to human-readable addresses from the following naming services:

				${supportedNameServiceList}

				It does so using onchain data sources using the same code as when interacting with the chain in general, inheriting its privacy and verifiability properties.
			`),
			howToImprove: markdown(chainSpecificAddressFormats),
		})
	}

	const { offchainInfo, walletShould } = getOffchainProviderInfo(bestNameService.support)

	return ctx.build({
		outcome: {
			id: `support_plain_${bestNameService.support.offchainDataVerifiability.toLowerCase()}_${bestNameService.support.offchainProviderConnection.toLowerCase()}_provider`,
			rating: Rating.PARTIAL,
			displayName,
			metadata: {
				addressResolution,
			},
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports sending to plain name service addresses but uses an offchain service for resolution.',
			),
		},
		details: markdown(`
			{{WALLET_NAME}} supports sending funds to human-readable addresses from the following naming services:

			${supportedNameServiceList}

			${offchainInfo}
		`),
		howToImprove:
			walletShould === undefined
				? markdown(chainSpecificAddressFormats)
				: markdown(`
					{{WALLET_NAME}} should use fully-onchain resolution to resolve the address, or should ${walletShould}.

					${chainSpecificAddressFormats}
				`),
	})
}

export const addressResolution: Attribute<AddressResolutionMetadata> = {
	id: 'addressResolution',
	icon: 'address_resolution',
	displayName: 'Address resolution',
	wording: {
		midSentenceName: 'address resolution',
	},
	question: sentence(
		'Can you send funds to human-readable names instead of hexadecimal addresses?',
	),
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

		Address naming registries like ENS, Gwei Name Service, Wei Name
		Service, MegaNames, and Hyperliquid Names partially solve this problem
		by allowing more human-readable names like \`username.eth\` to be
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

		Walletbeat tracks names from the following naming services:

		* ENS (\`.eth\`)
		* Gwei Name Service (\`.gwei\`)
		* Wei Name Service (\`.wei\`)
		* MegaNames (\`.mega\`) on MegaETH
		* Hyperliquid Names (\`.hl\`) on HyperEVM

		Each naming service is tracked separately because naming services have
		different registries, resolution methods, and privacy properties. A
		wallet may resolve names from one naming service without resolving names
		from another.

		Walletbeat recognizes the following destination address formats:

		* Plain name service addresses without destination chain information,
		  such as \`username.eth\`, \`username.gwei\`, \`username.wei\`,
		  \`username.mega\`, or \`username.hl\`
		* ${eipMarkdownLinkAndTitle(erc7828)}: \`user@l2chain.eth\`
		* ${eipMarkdownLinkAndTitle(erc7831)}: \`user.eth:l2chain\`

		Wallets receive a **pass** only if they support ${eipMarkdownLink(erc7828)} or
		${eipMarkdownLink(erc7831)} (chain-specific human-readable addresses).
		Wallets that support plain names from two or more naming services, with
		or without onchain resolution, receive a **partial** rating.
		Wallets that support plain names from only one naming service, or from
		no naming service at all, receive a **fail** rating.
		Wallets with too little information to determine support are left
		**unrated**.

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

		Only naming services with meaningful adoption are tracked.
		Smaller-reach services may be added once there is an agreed inclusion
		criterion.
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
					EvaluationContext.forTest(() => addressResolution),
					{
						nameServices: {
							ens: { support: 'SUPPORTED', medium: 'CHAIN_CLIENT' },
							gwei: notSupported,
							wei: notSupported,
							mega: notSupported,
							hyperliquid: notSupported,
						},
						chainSpecificAddressing: {
							erc7828: {
								support: 'SUPPORTED',
								medium: 'CHAIN_CLIENT',
							},
							erc7831: {
								support: 'NOT_SUPPORTED',
							},
						},
					},
				),
			),
			exampleRating(
				mdSentence(
					`The wallet resolves ${eipMarkdownLink(erc7828)} or ${eipMarkdownLink(erc7831)} addresses using an offchain provider in a verifiable and privacy-preserving manner.`,
				),
				evaluateAddressResolution(
					EvaluationContext.forTest(() => addressResolution),
					{
						nameServices: {
							ens: notSupported,
							gwei: notSupported,
							wei: notSupported,
							mega: notSupported,
							hyperliquid: notSupported,
						},
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
					},
				),
			),
		],
		partial: [
			exampleRating(
				mdSentence(
					'The wallet resolves ENS and Gwei Name Service addresses (`username.eth`, `username.gwei`) when sending tokens, using onchain data for resolution.',
				),
				evaluateAddressResolution(
					EvaluationContext.forTest(() => addressResolution),
					{
						nameServices: {
							ens: { support: 'SUPPORTED', medium: 'CHAIN_CLIENT' },
							gwei: { support: 'SUPPORTED', medium: 'CHAIN_CLIENT' },
							wei: notSupported,
							mega: notSupported,
							hyperliquid: notSupported,
						},
						chainSpecificAddressing: {
							erc7828: {
								support: 'NOT_SUPPORTED',
							},
							erc7831: {
								support: 'NOT_SUPPORTED',
							},
						},
					},
				),
			),
			exampleRating(
				mdSentence(
					'The wallet resolves Gwei Name Service and Wei Name Service addresses (`username.gwei`, `username.wei`) when sending tokens, using onchain data for resolution.',
				),
				evaluateAddressResolution(
					EvaluationContext.forTest(() => addressResolution),
					{
						nameServices: {
							ens: notSupported,
							gwei: { support: 'SUPPORTED', medium: 'CHAIN_CLIENT' },
							wei: { support: 'SUPPORTED', medium: 'CHAIN_CLIENT' },
							mega: notSupported,
							hyperliquid: notSupported,
						},
						chainSpecificAddressing: {
							erc7828: {
								support: 'NOT_SUPPORTED',
							},
							erc7831: {
								support: 'NOT_SUPPORTED',
							},
						},
					},
				),
			),
			exampleRating(
				mdSentence(
					`The wallet resolves ${eipMarkdownLink(erc7828)} or ${eipMarkdownLink(erc7831)} addresses using an offchain external provider, without verifying the address.`,
				),
				evaluateAddressResolution(
					EvaluationContext.forTest(() => addressResolution),
					{
						nameServices: {
							ens: notSupported,
							gwei: notSupported,
							wei: notSupported,
							mega: notSupported,
							hyperliquid: notSupported,
						},
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
					},
				),
			),
			exampleRating(
				mdSentence(
					`The wallet resolves ${eipMarkdownLink(erc7828)} or ${eipMarkdownLink(erc7831)} addresses using an offchain external provider which may learn the user's IP address.`,
				),
				evaluateAddressResolution(
					EvaluationContext.forTest(() => addressResolution),
					{
						nameServices: {
							ens: notSupported,
							gwei: notSupported,
							wei: notSupported,
							mega: notSupported,
							hyperliquid: notSupported,
						},
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
					},
				),
			),
		],
		fail: [
			exampleRating(
				mdSentence(
					'The wallet resolves ENS addresses (`username.eth`) but supports no other naming service.',
				),
				evaluateAddressResolution(
					EvaluationContext.forTest(() => addressResolution),
					{
						nameServices: {
							ens: { support: 'SUPPORTED', medium: 'CHAIN_CLIENT' },
							gwei: notSupported,
							wei: notSupported,
							mega: notSupported,
							hyperliquid: notSupported,
						},
						chainSpecificAddressing: {
							erc7828: {
								support: 'NOT_SUPPORTED',
							},
							erc7831: {
								support: 'NOT_SUPPORTED',
							},
						},
					},
				),
			),
			exampleRating(
				mdSentence('The wallet only supports sending funds to raw (`0x...`) addresses.'),
				evaluateAddressResolution(
					EvaluationContext.forTest(() => addressResolution),
					{
						nameServices: {
							ens: notSupported,
							gwei: notSupported,
							wei: notSupported,
							mega: notSupported,
							hyperliquid: notSupported,
						},
						chainSpecificAddressing: {
							erc7828: {
								support: 'NOT_SUPPORTED',
							},
							erc7831: {
								support: 'NOT_SUPPORTED',
							},
						},
					},
				),
			),
		],
	},
	evaluate: (
		ctx: EvaluationContext<AddressResolutionMetadata>,
	): Evaluation<AddressResolutionMetadata> => {
		ctx.setVerifiability(Verifiability.VERIFIABLE) // Trivially self-testable.

		const feature = ctx.features.addressResolution

		if (feature === null) {
			return unrated(ctx, {})
		}

		ctx.addRef(feature)

		for (const nestedResolution of [
			...trackedNameServices.items.map(service => feature.nameServices[service]),
			feature.chainSpecificAddressing.erc7828,
			feature.chainSpecificAddressing.erc7831,
		]) {
			if (hasRefs(nestedResolution)) {
				ctx.addRef(nestedResolution)
			}
		}

		return evaluateAddressResolution(ctx, feature)
	},
	aggregate: pickWorstRating<AddressResolutionMetadata>,
}
