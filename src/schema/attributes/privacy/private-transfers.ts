import { erc5564 } from '@/data/eips/erc-5564'
import { exampleNodeCompany } from '@/data/entities/example'
import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
	type WalletNameStrings,
} from '@/schema/attributes'
import { eipMarkdownLink, eipMarkdownLinkAndTitle } from '@/schema/eips'
import type { ResolvedFeatures } from '@/schema/features'
import {
	type FungibleTokenTransferMode,
	type PrivacyPoolsSupport,
	PrivateTransferTechnology,
	type StealthAddressSupport,
	StealthAddressUnlabeledBehavior,
	type TornadoCashNovaSupport,
} from '@/schema/features/privacy/transaction-privacy'
import {
	isSupported,
	notSupported,
	type Support,
	type Supported,
	supported,
} from '@/schema/features/support'
import { fullySponsoredFees } from '@/schema/features/transparency/fee-display'
import {
	markdown,
	type MarkdownParagraph,
	mdParagraph,
	mdSentence,
	paragraph,
	sentence,
} from '@/types/content'
import {
	extractPrivateTransferDetails,
	mergePrivateTransferDetails,
	privateTransfersDetailsContent,
} from '@/types/content/private-transfers-details'
import { isNonEmptyArray, type NonEmptyArray, nonEmptyFirst } from '@/types/utils/non-empty'
import { commaListFormat, markdownListFormat } from '@/types/utils/text'

import { entityMarkdownLink } from '../../entity'
import { mergeRefs, type ReferenceArray, refNotNecessary, refs } from '../../reference'
import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.privacy.private_transfers'

export type PrivateTransfersValue = Value & {
	__brand: 'attributes.privacy.private_transfers'
	defaultFungibleTokenTransferMode: FungibleTokenTransferMode
	perTechnology: Map<PrivateTransferTechnology, PrivateTransfersPrivacyLevels>
}

function singleTechnology<V>(
	tech: PrivateTransferTechnology,
	value: V,
): Map<PrivateTransferTechnology, V> {
	const singleEntryMap = new Map<PrivateTransferTechnology, V>()

	singleEntryMap.set(tech, value)

	return singleEntryMap
}

export interface PrivateTransfersPrivacyLevels {
	sendingPrivacy: PrivateTransfersPrivacyLevel
	receivingPrivacy: PrivateTransfersPrivacyLevel
	spendingPrivacy: PrivateTransfersPrivacyLevel
}

/** Level of privacy for a particular aspect of a private transfer. */
export enum PrivateTransfersPrivacyLevel {
	/** Not fully implemented. */
	NOT_FULLY_IMPLEMENTED = 'NOT_FULLY_IMPLEMENTED',

	/** No privacy at all. */
	NOT_PRIVATE = 'NOT_PRIVATE',

	/** Chain data reveals no private information, but external providers may have it. */
	CHAIN_DATA_PRIVATE = 'CHAIN_DATA_PRIVATE',

	/** Data is kept private from all but the wallet user. */
	FULLY_PRIVATE = 'FULLY_PRIVATE',
}

function privacyLevelScore(level: PrivateTransfersPrivacyLevel): number {
	switch (level) {
		case PrivateTransfersPrivacyLevel.NOT_FULLY_IMPLEMENTED:
			return 0
		case PrivateTransfersPrivacyLevel.NOT_PRIVATE:
			return 1
		case PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE:
			return 2
		case PrivateTransfersPrivacyLevel.FULLY_PRIVATE:
			return 3
	}
}

export function worstPrivateTransfersPrivacyLevel(
	levels: NonEmptyArray<PrivateTransfersPrivacyLevel>,
): PrivateTransfersPrivacyLevel {
	return nonEmptyFirst(levels, (a, b) => privacyLevelScore(a) - privacyLevelScore(b))
}

function mergeEvaluations(
	eval1: Evaluation<PrivateTransfersValue> | null,
	eval2: Evaluation<PrivateTransfersValue>,
): Evaluation<PrivateTransfersValue> {
	if (eval1 === null) {
		return eval2
	}

	const worse = pickWorstRating([eval1, eval2])
	const better = worse === eval1 ? eval2 : eval1
	const mergedMap = new Map<PrivateTransferTechnology, PrivateTransfersPrivacyLevels>()

	for (const [key, value] of worse.value.perTechnology) {
		mergedMap.set(key, value)
	}

	for (const [key, value] of better.value.perTechnology) {
		if (!mergedMap.has(key)) {
			mergedMap.set(key, value)
		}
	}
	const worseTransferDetails = extractPrivateTransferDetails(worse.details)
	const betterTransferDetails = extractPrivateTransferDetails(better.details)
	const details =
		worseTransferDetails !== null
			? privateTransfersDetailsContent(
					mergePrivateTransferDetails(betterTransferDetails, worseTransferDetails),
				)
			: worse.details

	return {
		value: {
			id: worse.value.id,
			defaultFungibleTokenTransferMode: worse.value.defaultFungibleTokenTransferMode,
			displayName: worse.value.displayName,
			rating: worse.value.rating,
			shortExplanation: worse.value.shortExplanation,
			icon: worse.value.icon,
			score: worse.value.score,
			perTechnology: mergedMap,
			__brand: brand,
		},
		details,
		howToImprove: worse.howToImprove,
		impact: worse.impact,
		references: mergeRefs(eval1.references, eval2.references),
	}
}

const noPrivateTransfers: Evaluation<PrivateTransfersValue> = {
	value: {
		id: 'no_transfer_privacy',
		rating: Rating.FAIL,
		displayName: 'Private token transfers are not supported',
		shortExplanation: sentence('{{WALLET_NAME}} does not support private token transfers.'),
		defaultFungibleTokenTransferMode: 'PUBLIC',
		perTechnology: new Map(),
		__brand: brand,
	},
	details: mdParagraph(
		`
			{{WALLET_NAME}} does not support any type of private token transfers.

			This means all token transfers made using {{WALLET_NAME}} are public
			information and are recorded forever.
			Therefore, {{WALLET_NAME}} users should only make token transfers if they
			would also be comfortable with continuously publishing their bank account
			statement or payment app transaction history for all to see online, as
			their level of privacy would be similar.
		`,
	),
	impact: mdParagraph(
		`
			As all token transfers will be recorded publicly onchain forever,
			{{WALLET_NAME}} should only be used for transactions where privacy is not
			and will never be needed, such as public DAO treasury operations.

			{{WALLET_NAME}} **should not be used for peer-to-peer transfers**, and
			users should keep their addresses to themselves to avoid creating
			permanent associations between their public transactions and their
			personal identity.

			Usage of {{WALLET_NAME}} for conducting real-world transactions is
			especially **not advisable**, as it exposes the user to the risk of the
			merchant looking up their customer's balance and initiating a
			[**wrench attack**](https://github.com/jlopp/physical-bitcoin-attacks/blob/master/README.md)
			on the user. This puts users of {{WALLET_NAME}} at risk of physical
			and financial harm.
		`,
	),
	howToImprove: mdParagraph(
		`
			{{WALLET_NAME}} should support some form of private token transfers,
			such as ${eipMarkdownLink(erc5564)}, and should make this the primary
			way to perform token transfers. Public token transfers should either be
			hidden under a power-user-only menu, come with important user safety
			warnings, or deleted from the wallet's feature set.
		`,
	),
}

const nonDefault: Evaluation<PrivateTransfersValue> = {
	value: {
		id: 'non_default_transfer_privacy',
		rating: Rating.FAIL,
		displayName: 'Private token transfers are not the default',
		shortExplanation: mdSentence(
			'Token transfers with {{WALLET_NAME}} are public by default despite it supporting private token transfers.',
		),
		defaultFungibleTokenTransferMode: 'PUBLIC',
		perTechnology: new Map(),
		__brand: brand,
	},
	details: privateTransfersDetailsContent({
		privateTransferDetails: new Map(),
	}),
	impact: paragraph(
		`
			{{WALLET_NAME}} users should always use private token transfers
			to protect their privacy.
		`,
	),
	howToImprove: paragraph(
		`
			{{WALLET_NAME}} should make token transfers private by default.
			Public token transfers should either be hidden under a
			power-user-only menu, come with important user safety warnings,
			or deleted from the wallet's feature set.
		`,
	),
}

function rateStealthAddressSupport(
	stealthAddresses: Supported<StealthAddressSupport>,
): Evaluation<PrivateTransfersValue> {
	const references: ReferenceArray = mergeRefs(
		stealthAddresses.ref,
		stealthAddresses.recipientAddressResolution.ref,
		stealthAddresses.balanceLookup.ref,
		stealthAddresses.privateKeyDerivation.ref,
		isSupported(stealthAddresses.userLabeling) ? stealthAddresses.userLabeling.ref : undefined,
	)
	const { sendingPrivacy, sendingDetails, sendingImprovements } = ((): {
		sendingPrivacy: PrivateTransfersPrivacyLevel
		sendingDetails: MarkdownParagraph<WalletNameStrings>
		sendingImprovements: string[]
	} => {
		switch (stealthAddresses.recipientAddressResolution.type) {
			case 'EXTERNAL_RESOLVER':
				return (() => {
					const externalServiceLink = entityMarkdownLink(
						stealthAddresses.recipientAddressResolution.externalResolver,
					)
					const learned = stealthAddresses.recipientAddressResolution.learns
					const learnedElements = commaListFormat([
						learned.senderIpAddress ? "the sender's IP address" : null,
						learned.senderMetaAddress ? "the sender's stealth meta-address" : null,
						learned.recipientMetaAddress ? "the recipient's stealth meta-address" : null,
						learned.recipientGeneratedStealthAddress
							? "the recipient's generated stealth address"
							: null,
					])
					const identifiedSender = learned.senderIpAddress || learned.senderMetaAddress
					const identifiedRecipient =
						learned.recipientMetaAddress || learned.recipientGeneratedStealthAddress

					if (identifiedSender && identifiedRecipient) {
						return {
							sendingPrivacy: PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE,
							sendingDetails: mdParagraph(`
								Sending funds relies on ${externalServiceLink} for address resolution, which learns ${learnedElements} in the process.
								While the onchain transaction data does not reveal these details, ${externalServiceLink} is in a position to learn
								a link between the sender and the recipient.
							`),
							sendingImprovements: [
								`avoid sending sender and recipient information to ${externalServiceLink}`,
							],
						}
					}

					if (learned.recipientMetaAddress && learned.recipientGeneratedStealthAddress) {
						return {
							sendingPrivacy: PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE,
							sendingDetails: mdParagraph(`
								Sending funds relies on ${externalServiceLink} for address resolution, which learns ${learnedElements} in the process.
								While the onchain transaction data does not reveal these details, ${externalServiceLink} is in a position to learn
								who the intended recipient of the transaction is.
							`),
							sendingImprovements: [
								`avoid sending recipient information to ${externalServiceLink}`,
							],
						}
					}

					if (
						learned.recipientMetaAddress &&
						stealthAddresses.balanceLookup.type === 'EXTERNAL_SERVICE' &&
						stealthAddresses.recipientAddressResolution.externalResolver.id ===
							stealthAddresses.balanceLookup.externalService.id &&
						stealthAddresses.balanceLookup.learns.userMetaAddress
					) {
						return {
							sendingPrivacy: PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE,
							sendingDetails: mdParagraph(`
								Sending funds relies on ${externalServiceLink} for address resolution, which learns ${learnedElements} in the process.
								In addition, this same provider is used for performing balance lookups, and learns your stealth meta-address
								in the process.
								This means that while the onchain transaction data does not reveal these details,
								${externalServiceLink} is in a position to know that you (as a stealth address user)
								have recently refreshed your balance, and which recipient *some* stealth address user
								may have recently sent funds to, allowing it to infer a link between you and your
								intended recipient.
							`),
							sendingImprovements: [
								`avoid relying on ${externalServiceLink} for both recipient address resolution and balance lookups`,
							],
						}
					}

					return {
						sendingPrivacy: PrivateTransfersPrivacyLevel.FULLY_PRIVATE,
						sendingDetails: mdParagraph(`
							Sending funds relies on ${externalServiceLink}, but it cannot learn any association between your IP address,
							stealth meta-address, recipient meta-address, or recipient generated stealth address.
							Onchain transaction data is fully private as well.
						`),
						sendingImprovements: [],
					}
				})()
			case 'DEFAULT_CHAIN_PROVIDER':
				throw new Error(
					'Stealth address implementations that use a chain provider for address resolution are not supported yet.',
				)
		}
	})()
	const { receivingPrivacy, receivingDetails, receivingImprovements } = ((): {
		receivingPrivacy: PrivateTransfersPrivacyLevel
		receivingDetails: MarkdownParagraph<WalletNameStrings>
		receivingImprovements: string[]
	} => {
		switch (stealthAddresses.balanceLookup.type) {
			case 'EXTERNAL_SERVICE':
				return (() => {
					const externalServiceLink = entityMarkdownLink(
						stealthAddresses.balanceLookup.externalService,
					)
					const learned = stealthAddresses.balanceLookup.learns

					if (learned.userMetaAddress && learned.generatedStealthAddresses) {
						return {
							receivingPrivacy: PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE,
							receivingDetails: mdParagraph(`
								Looking up your stealth address balance relies on
								${externalServiceLink}, which learns your stealth meta-address and
								generated stealth addresses.
								This means that while onchain transaction data is still private,
								${externalServiceLink} is in a position to de-anonymize all your past
								transactions.
							`),
							receivingImprovements: [
								'perform stealth address derivation from the meta-address locally',
							],
						}
					}

					if (learned.generatedStealthAddresses) {
						return {
							receivingPrivacy: PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE,
							receivingDetails: mdParagraph(`
								Looking up your balance relies on ${externalServiceLink}, which
								learns your generated stealth addresses.
								This means that while onchain transaction data is still private,
								${externalServiceLink} is in a position to de-anonymize all your past
								transactions.
							`),
							receivingImprovements: [
								'perform stealth address balance lookups across multiple providers, using unique proxy circuits for each address, in a time-staggered manner',
							],
						}
					}

					return {
						receivingPrivacy: PrivateTransfersPrivacyLevel.FULLY_PRIVATE,
						receivingDetails: mdParagraph(`
							Looking up your balance relies on ${externalServiceLink}, but does not
							leak sensitive information in the process.
						`),
						receivingImprovements: [],
					}
				})()
			case 'DEFAULT_CHAIN_PROVIDER':
				throw new Error(
					'Stealth address implementations that use a chain provider for balance lookups are not supported yet.',
				)
		}
	})()
	const { labelingPrivacy, labelingDetails, labelingImprovements } = ((): {
		labelingPrivacy: PrivateTransfersPrivacyLevel
		labelingDetails: MarkdownParagraph<WalletNameStrings>
		labelingImprovements: string[]
	} => {
		if (!isSupported(stealthAddresses.userLabeling)) {
			return {
				labelingPrivacy: PrivateTransfersPrivacyLevel.NOT_PRIVATE,
				labelingDetails: mdParagraph(`
					It is not possible to select which of your stealth addresses to use
					when spending your stealth address balance. This means spending funds
					received in your wallet may inadvertently create publicly-visible
					onchain links between your generated stealth addresses.
				`),
				labelingImprovements: [
					'add support for labeling or bucketing of generated stealth addresses',
				],
			}
		}

		switch (stealthAddresses.userLabeling.unlabeledBehavior) {
			case StealthAddressUnlabeledBehavior.TREAT_ALL_UNLABELED_AS_SINGLE_BUCKET:
				return {
					labelingPrivacy: PrivateTransfersPrivacyLevel.NOT_PRIVATE,
					labelingDetails: mdParagraph(`
						When spending funds from your stealth address balance, unlabeled
						receiving stealth addresses are treated as a single bucket and funds
						may be spent from multiple of them in the same transaction.
						This may inadvertently create undesired publicly-visible links
						between these generated stealth addresses.
					`),
					labelingImprovements: [
						'never spend funds from stealth addresses that have not been labeled',
					],
				}
			case StealthAddressUnlabeledBehavior.MUST_LABEL_BEFORE_SPENDING:
				return {
					labelingPrivacy: PrivateTransfersPrivacyLevel.FULLY_PRIVATE,
					labelingDetails: mdParagraph(`
						When spending funds from your stealth address balance, unlabeled
						receiving stealth addresses cannot be spent. This ensures that
						you do not inadvertently create undesired publicly-visible links
						between these generated stealth addresses.
					`),
					labelingImprovements: [],
				}
			case StealthAddressUnlabeledBehavior.TREAT_EACH_UNLABELED_AS_OWN_BUCKET:
				return {
					labelingPrivacy: PrivateTransfersPrivacyLevel.FULLY_PRIVATE,
					labelingDetails: mdParagraph(`
						When spending funds from your stealth address balance, unlabeled
						receiving stealth addresses are treated as unique.
						This ensures that you do not inadvertently create undesired
						publicly-visible links between these generated stealth addresses.
					`),
					labelingImprovements: [],
				}
		}
	})()
	const { derivationPrivacy, derivationDetails, derivationImprovements } = ((): {
		derivationPrivacy: PrivateTransfersPrivacyLevel
		derivationDetails: MarkdownParagraph<WalletNameStrings> | null
		derivationImprovements: string[]
	} => {
		switch (stealthAddresses.privateKeyDerivation.type) {
			case 'LOCALLY':
				return {
					derivationPrivacy: PrivateTransfersPrivacyLevel.FULLY_PRIVATE,
					derivationDetails: null,
					derivationImprovements: [],
				}
			case 'DEFAULT_CHAIN_PROVIDER':
				return {
					derivationPrivacy: PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE,
					derivationDetails: mdParagraph(`
						Deriving the private key of your generated stealth addresses
						uses the default chain provider, who is in a position to learn
						this private key and to spend your funds.
					`),
					derivationImprovements: ['perform stealth address private key derivation locally'],
				}
			case 'EXTERNAL_SERVICE':
				return {
					derivationPrivacy: PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE,
					derivationDetails: mdParagraph(`
						Deriving the private key of your generated stealth addresses relies on
						${entityMarkdownLink(stealthAddresses.privateKeyDerivation.externalService)},
						who is in a position to learn this private key and to spend your funds.
					`),
					derivationImprovements: ['perform stealth address private key derivation locally'],
				}
		}
	})()
	const walletShould = sendingImprovements
		.concat(receivingImprovements)
		.concat(labelingImprovements)
		.concat(derivationImprovements)
	const howToImprove = isNonEmptyArray(walletShould)
		? mdParagraph(
				`
					{{WALLET_NAME}} should${markdownListFormat(walletShould, {
						ifEmpty: { behavior: 'THROW_ERROR' },
						singleItemTemplate: ' ITEM.',
						uppercaseFirstCharacterOfListItems: true,
						multiItemPrefix: `:
					
					`,
						multiItemTemplate: `
					- ITEM`,
						multiItemSuffix: `
					
					`,
					})}
				`,
			)
		: undefined
	const worstLevel = worstPrivateTransfersPrivacyLevel([
		sendingPrivacy,
		receivingPrivacy,
		labelingPrivacy,
		derivationPrivacy,
	])
	const [spendingPrivacy, spendingDetails] =
		derivationDetails === null ||
		worstPrivateTransfersPrivacyLevel([labelingPrivacy, derivationPrivacy]) === labelingPrivacy
			? [labelingPrivacy, labelingDetails]
			: [derivationPrivacy, derivationDetails]
	const perTechnology = singleTechnology<PrivateTransfersPrivacyLevels>(
		PrivateTransferTechnology.STEALTH_ADDRESSES,
		{
			sendingPrivacy,
			receivingPrivacy,
			spendingPrivacy,
		},
	)
	const details = privateTransfersDetailsContent({
		privateTransferDetails: singleTechnology(PrivateTransferTechnology.STEALTH_ADDRESSES, {
			sendingDetails,
			receivingDetails,
			spendingDetails,
			extraNotes: [],
		}),
	})

	switch (worstLevel) {
		case PrivateTransfersPrivacyLevel.NOT_FULLY_IMPLEMENTED:
			throw new Error('Unreachable')
		case PrivateTransfersPrivacyLevel.NOT_PRIVATE:
			return {
				value: {
					id: 'not_private_stealth_addresses',
					rating: Rating.FAIL,
					displayName: 'Non-private ERC-5564 stealth address support',
					shortExplanation: mdSentence(
						`{{WALLET_NAME}} implements ${eipMarkdownLink(erc5564)} stealth addresses but may create unintended onchain links.`,
					),
					defaultFungibleTokenTransferMode: PrivateTransferTechnology.STEALTH_ADDRESSES,
					perTechnology,
					__brand: brand,
				},
				details,
				howToImprove,
				references,
			}
		case PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE:
			return {
				value: {
					id: 'chain_private_stealth_addresses',
					rating: Rating.PARTIAL,
					displayName: 'ERC-5564 stealth addresses reliant on trusted provider',
					shortExplanation: mdSentence(
						`{{WALLET_NAME}} implements ${eipMarkdownLink(erc5564)} stealth addresses but relies on a trusted external provider.`,
					),
					defaultFungibleTokenTransferMode: PrivateTransferTechnology.STEALTH_ADDRESSES,
					perTechnology,
					__brand: brand,
				},
				details,
				howToImprove,
				references,
			}
		case PrivateTransfersPrivacyLevel.FULLY_PRIVATE:
			return {
				value: {
					id: 'fully_private_stealth_addresses',
					rating: Rating.PASS,
					icon: '\u{1f48c}', // Love letter
					displayName: 'Full ERC-5564 stealth address support',
					shortExplanation: mdSentence(
						`{{WALLET_NAME}} fully implements ${eipMarkdownLink(erc5564)} stealth addresses.`,
					),
					defaultFungibleTokenTransferMode: PrivateTransferTechnology.STEALTH_ADDRESSES,
					perTechnology,
					__brand: brand,
				},
				details,
				howToImprove,
				references,
			}
	}
}

function rateTornadoCashNovaSupport(
	tornadoCashNova: Supported<TornadoCashNovaSupport>,
): Evaluation<PrivateTransfersValue> {
	const references: ReferenceArray = refs(tornadoCashNova)
	const extraNotes: MarkdownParagraph<WalletNameStrings>[] = []
	const { sendingPrivacy, sendingDetails, sendingImprovements } = ((): {
		sendingPrivacy: PrivateTransfersPrivacyLevel
		sendingDetails: MarkdownParagraph<WalletNameStrings>
		sendingImprovements: string[]
	} => {
		switch (tornadoCashNova.integrationType) {
			case 'THROUGH_ENTITY':
				if (tornadoCashNova.entityLearnsUserUtxos) {
					return {
						sendingPrivacy: PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE,
						sendingDetails: mdParagraph(`
							When sending tokens to the Tornado Cash Nova pool,
							${entityMarkdownLink(tornadoCashNova.entity)} learns about the
							depositor and recipient of the transaction.
						`),
						sendingImprovements: [
							`only reveal UTXO **commitment** information to ${entityMarkdownLink(tornadoCashNova.entity)}`,
						],
					}
				}

				if (tornadoCashNova.entityLearnsUserIpAddress) {
					return {
						sendingPrivacy: PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE,
						sendingDetails: mdParagraph(`
							When sending tokens to the Tornado Cash Nova pool,
							${entityMarkdownLink(tornadoCashNova.entity)} learns about the
							depositor's IP address.
						`),
						sendingImprovements: [
							`only contact ${entityMarkdownLink(tornadoCashNova.entity)} through a mixnet`,
						],
					}
				}

				return {
					sendingPrivacy: PrivateTransfersPrivacyLevel.FULLY_PRIVATE,
					sendingDetails: mdParagraph(`
							Token deposit transactions are sent through
							${entityMarkdownLink(tornadoCashNova.entity)}, but it does not
							learn the depositor's identity nor IP address.
					`),
					sendingImprovements: [],
				}
			case 'DIRECT':
				return {
					sendingPrivacy: PrivateTransfersPrivacyLevel.FULLY_PRIVATE,
					sendingDetails: mdParagraph('Token deposit transactions are sent directly to the pool.'),
					sendingImprovements: [],
				}
		}
	})()
	const { receivingPrivacy, receivingDetails, receivingImprovements } = ((): {
		receivingPrivacy: PrivateTransfersPrivacyLevel
		receivingDetails: MarkdownParagraph<WalletNameStrings>
		receivingImprovements: string[]
	} => {
		switch (tornadoCashNova.utxoFiltering) {
			case 'EXTERNAL':
				return {
					receivingPrivacy: PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE,
					receivingDetails: mdParagraph(`
						The user's private notes (UTXOs) are filtered externally,
						allowing an external provider to correlate the user's funds within
						the pool.
					`),
					receivingImprovements: ['should perform UTXO filtering client-side'],
				}
			case 'WALLET_SIDE':
				return {
					receivingPrivacy: PrivateTransfersPrivacyLevel.FULLY_PRIVATE,
					receivingDetails: mdParagraph(`
						The user's private notes (UTXOs) are filtered by the wallet
						itself, ensuring that no external provider may correlate the
						user's received funds in the pool.
					`),
					receivingImprovements: [],
				}
		}
	})()
	const { spendingPrivacy, spendingDetails, spendingImprovements } = ((): {
		spendingPrivacy: PrivateTransfersPrivacyLevel
		spendingDetails: MarkdownParagraph<WalletNameStrings>
		spendingImprovements: string[]
	} => {
		if (!isSupported(tornadoCashNova.novaInternalTransfers)) {
			return {
				spendingPrivacy: PrivateTransfersPrivacyLevel.NOT_PRIVATE,
				spendingDetails: mdParagraph(`
					Pool-internal token transfers are not supported; this means
					spending your private balance requires an out-of-pool withdrawal
					followed by another deposit, which is challenging to do in a
					fully privacy-preserving way.
				`),
				spendingImprovements: ['integrate pool-internal transfers'],
			}
		}

		if (!isSupported(tornadoCashNova.warnAboutSuccessiveOperations)) {
			return {
				spendingPrivacy: PrivateTransfersPrivacyLevel.NOT_PRIVATE,
				spendingDetails: mdParagraph(`
					The user is not warned when performing multiple transfers in quick
					succession. This could allow an observer to correlate multiple pool
					operations and infer information about the user's identity.
				`),
				spendingImprovements: ['warn the user when doing multiple operations in quick succession'],
			}
		}

		return {
			spendingPrivacy: PrivateTransfersPrivacyLevel.FULLY_PRIVATE,
			spendingDetails: mdParagraph(`
				Pool-internal transfers are supported, and the user is cautioned
				against doing too many operations in quick succession to avoid
				time-based correlation.
			`),
			spendingImprovements: [],
		}
	})()

	switch (tornadoCashNova.integrationType) {
		case 'THROUGH_ENTITY':
			extraNotes.push(
				mdParagraph(`
					All Tornado Cash Nova operations go through
					${entityMarkdownLink(tornadoCashNova.entity)}, who is in a position
					to censor or block transactions.
				`),
			)
			spendingImprovements.push(
				'allow the user to spend pool funds directly through a configurable relayer endpoint',
			)
			break
		case 'DIRECT':
			if (!isSupported(tornadoCashNova.customizableRelayer)) {
				extraNotes.push(
					mdParagraph(`
						The Tornado Cash Nova relayer is not user-customizable, and is in
						a position to censor or block transactions.
					`),
				)
				spendingImprovements.push('allow the user to customize the relayer endpoint')
			}

			break
	}

	const walletShould = sendingImprovements
		.concat(receivingImprovements)
		.concat(spendingImprovements)
	const howToImprove = isNonEmptyArray(walletShould)
		? mdParagraph(
				`
					{{WALLET_NAME}} should${markdownListFormat(walletShould, {
						ifEmpty: { behavior: 'THROW_ERROR' },
						singleItemTemplate: ' ITEM.',
						uppercaseFirstCharacterOfListItems: true,
						multiItemPrefix: `:
					
					`,
						multiItemTemplate: `
					- ITEM`,
						multiItemSuffix: `
					
					`,
					})}
				`,
			)
		: undefined
	const perTechnology = singleTechnology<PrivateTransfersPrivacyLevels>(
		PrivateTransferTechnology.TORNADO_CASH_NOVA,
		{
			sendingPrivacy,
			receivingPrivacy,
			spendingPrivacy,
		},
	)
	const details = privateTransfersDetailsContent({
		privateTransferDetails: singleTechnology(PrivateTransferTechnology.TORNADO_CASH_NOVA, {
			sendingDetails,
			receivingDetails,
			spendingDetails,
			extraNotes,
		}),
	})
	const worstLevel = worstPrivateTransfersPrivacyLevel([
		sendingPrivacy,
		receivingPrivacy,
		spendingPrivacy,
	])

	switch (worstLevel) {
		case PrivateTransfersPrivacyLevel.NOT_FULLY_IMPLEMENTED:
			throw new Error('Unreachable')
		case PrivateTransfersPrivacyLevel.NOT_PRIVATE:
			return {
				value: {
					id: 'non_private_tornado_cash_nova',
					rating: Rating.FAIL,
					displayName: 'Non-private Tornado Cash Nova integration',
					shortExplanation: mdSentence(
						'{{WALLET_NAME}} integrates Tornado Cash Nova in a non-privacy-preserving way.',
					),
					defaultFungibleTokenTransferMode: PrivateTransferTechnology.TORNADO_CASH_NOVA,
					perTechnology,
					__brand: brand,
				},
				details,
				howToImprove,
				references,
			}
		case PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE:
			return {
				value: {
					id: 'chain_private_tornado_cash_nova',
					rating: Rating.PARTIAL,
					displayName: 'Tornado Cash Nova integration relying on external provider',
					shortExplanation: mdSentence(
						'{{WALLET_NAME}} integrates Tornado Cash Nova but relies on an external provider.',
					),
					defaultFungibleTokenTransferMode: PrivateTransferTechnology.TORNADO_CASH_NOVA,
					perTechnology,
					__brand: brand,
				},
				details,
				howToImprove,
				references,
			}
		case PrivateTransfersPrivacyLevel.FULLY_PRIVATE:
			if (howToImprove !== undefined) {
				return {
					value: {
						id: 'partial_tornado_cash_nova_integration',
						rating: Rating.PARTIAL,
						displayName: 'Imperfect Tornado Cash Nova integration',
						shortExplanation: mdSentence(
							'{{WALLET_NAME}} integrates Tornado Cash Nova with some important compromises.',
						),
						defaultFungibleTokenTransferMode: PrivateTransferTechnology.TORNADO_CASH_NOVA,
						perTechnology,
						__brand: brand,
					},
					details,
					howToImprove,
					references,
				}
			}

			return {
				value: {
					id: 'full_tornado_cash_nova_integration',
					rating: Rating.PASS,
					icon: '\u{1f48c}', // Love letter
					displayName: 'Full Tornado Cash Nova integration',
					shortExplanation: mdSentence(
						'{{WALLET_NAME}} integrates Tornado Cash Nova for private transfers.',
					),
					defaultFungibleTokenTransferMode: PrivateTransferTechnology.TORNADO_CASH_NOVA,
					perTechnology,
					__brand: brand,
				},
				details,
				howToImprove,
				references,
			}
	}
}

function ratePrivacyPoolsSupport(
	privacyPools: Supported<PrivacyPoolsSupport>,
): Evaluation<PrivateTransfersValue> {
	const references: ReferenceArray = refs(privacyPools)
	const extraNotes: MarkdownParagraph<WalletNameStrings>[] = []
	const { sendingPrivacy, sendingDetails, sendingImprovements } = ((): {
		sendingPrivacy: PrivateTransfersPrivacyLevel
		sendingDetails: MarkdownParagraph<WalletNameStrings>
		sendingImprovements: string[]
	} => {
		if (!isSupported(privacyPools.capabilities.etherL1Pool)) {
			return {
				sendingPrivacy: PrivateTransfersPrivacyLevel.NOT_FULLY_IMPLEMENTED,
				sendingDetails: mdParagraph(`
					Ether deposits are not supported; this means it is not possible
					for users to send Ether privately.
				`),
				sendingImprovements: ['implement Ether pool support'],
			}
		}

		if (!isSupported(privacyPools.capabilities.usdcL1Pool)) {
			return {
				sendingPrivacy: PrivateTransfersPrivacyLevel.NOT_FULLY_IMPLEMENTED,
				sendingDetails: mdParagraph(`
					ERC-20 deposits are not supported; this means it is not possible
					for users to send tokens privately.
				`),
				sendingImprovements: ['implement ERC-20 pool support'],
			}
		}

		if (!isSupported(privacyPools.capabilities.ragequit)) {
			return {
				sendingPrivacy: PrivateTransfersPrivacyLevel.NOT_FULLY_IMPLEMENTED,
				sendingDetails: mdParagraph(`
					[Ragequitting](https://docs.privacypools.com/protocol/ragequit) is
					not implemented; this means user funds can be held hostage by the
					operator of the Privacy Pool, thereby making them effectively
					frozen.
				`),
				sendingImprovements: ['implement permissionless ragequitting support'],
			}
		}

		return {
			sendingPrivacy: PrivateTransfersPrivacyLevel.FULLY_PRIVATE,
			sendingDetails: mdParagraph(`
				The wallet supports sending Ether and ERC-20 into their corresponding
				Privacy Pool, along with the
				[ragequitting](https://docs.privacypools.com/protocol/ragequit)
				functionality to ensure deposited funds can be permissionlessly
				recovered.
			`),
			sendingImprovements: [],
		}
	})()
	const { receivingPrivacy, receivingDetails, receivingImprovements } = ((): {
		receivingPrivacy: PrivateTransfersPrivacyLevel
		receivingDetails: MarkdownParagraph<WalletNameStrings>
		receivingImprovements: string[]
	} => {
		return {
			receivingPrivacy: PrivateTransfersPrivacyLevel.FULLY_PRIVATE,
			receivingDetails: mdParagraph(`
				Receiving funds through Privacy Pools requires no special wallet
				support, as funds show up in the recipient's wallet directly once
				the sender sends them.
			`),
			receivingImprovements: [],
		}
	})()
	const { spendingPrivacy, spendingDetails, spendingImprovements } = ((): {
		spendingPrivacy: PrivateTransfersPrivacyLevel
		spendingDetails: MarkdownParagraph<WalletNameStrings>
		spendingImprovements: string[]
	} => {
		if (!isSupported(privacyPools.depositData.exportable)) {
			return {
				spendingPrivacy: PrivateTransfersPrivacyLevel.NOT_FULLY_IMPLEMENTED,
				spendingDetails: mdParagraph(`
					Exporting deposit data is not supported; this means users may not
					be able to spend funds they had deposited into Privacy Pools if
					they lose access to their wallet or switch to another wallet.
				`),
				spendingImprovements: ['allow users to export deposit data'],
			}
		}

		if (!isSupported(privacyPools.capabilities.importDeposits)) {
			return {
				spendingPrivacy: PrivateTransfersPrivacyLevel.NOT_FULLY_IMPLEMENTED,
				spendingDetails: mdParagraph(`
					Importing deposit data is not supported; this means users may not
					be able to spend funds they had deposited into Privacy Pools while
					using another wallet.
				`),
				spendingImprovements: ['allow users to import deposit data'],
			}
		}

		if (
			privacyPools.depositData.type === 'CUSTODIAN_ONLY' ||
			privacyPools.depositData.type === 'CUSTODIAN_OR_LOCAL'
		) {
			if (privacyPools.depositData.custodianCanLearnDepositData) {
				return {
					spendingPrivacy: PrivateTransfersPrivacyLevel.NOT_FULLY_IMPLEMENTED,
					spendingDetails: mdParagraph(`
						Deposit data
						${privacyPools.depositData.type === 'CUSTODIAN_ONLY' ? 'is' : privacyPools.depositData.useOfCustodian === 'BY_DEFAULT' ? 'is by default' : 'may be'}
						stored by
						${entityMarkdownLink(privacyPools.depositData.custodian)},
						who is in a position to be able to spend it without the user's
						consent.
					`),
					spendingImprovements: [
						"prevent the custodian from being able to learn users' deposits data",
					],
				}
			}

			if (
				privacyPools.depositData.type === 'CUSTODIAN_ONLY' ||
				privacyPools.depositData.exportable.exportFunctionDependsOnCustodian
			) {
				return {
					spendingPrivacy: PrivateTransfersPrivacyLevel.NOT_FULLY_IMPLEMENTED,
					spendingDetails: mdParagraph(`
						Users cannot export their Privacy Pools deposit data without
						relying on
						${entityMarkdownLink(privacyPools.depositData.custodian)};
						this means users may not
						be able to spend funds they had deposited into Privacy Pools while
						using another wallet.
					`),
					spendingImprovements: ['store user deposit data locally and allow permissionless export'],
				}
			}
		}

		if (!isSupported(privacyPools.capabilities.withdrawalWithoutRelayer)) {
			if (!isSupported(privacyPools.capabilities.withdrawalWithRelayer)) {
				throw new Error('Unreachable; should be prevented by the type system.')
			}

			// Need a relayer; can we use it without leaking data?
			if (
				privacyPools.capabilities.withdrawalWithRelayer.defaultRelayer !== 'NO_DEFAULT_RELAYER' &&
				privacyPools.capabilities.withdrawalWithRelayer.relayerLearnsUserIpAddress
			) {
				if (!isSupported(privacyPools.capabilities.withdrawalWithRelayer.customizableRelayer)) {
					return {
						spendingPrivacy: PrivateTransfersPrivacyLevel.NOT_PRIVATE,
						spendingDetails: mdParagraph(`
							Withdrawal is only possible through a non-customizable relayer
							operated by
							${entityMarkdownLink(privacyPools.capabilities.withdrawalWithRelayer.defaultRelayer)},
							which learns the user's IP address.
						`),
						spendingImprovements: ['use an anonymizing proxy for relayer withdrawals'],
					}
				}

				return {
					spendingPrivacy: PrivateTransfersPrivacyLevel.NOT_PRIVATE,
					spendingDetails: mdParagraph(`
						Withdrawal is only possible through a relayer, the default
						being operated by
						${entityMarkdownLink(privacyPools.capabilities.withdrawalWithRelayer.defaultRelayer)},
						which learns the user's IP address.
					`),
					spendingImprovements: ['use an anonymizing proxy for relayer withdrawals'],
				}
			}
		}

		if (!isSupported(privacyPools.capabilities.withdrawalWithRelayer)) {
			return {
				spendingPrivacy: PrivateTransfersPrivacyLevel.NOT_PRIVATE,
				spendingDetails: mdParagraph(`
					Withdrawal is only possible without a relayer, making it
					impossible for a user to spend funds without revealing their
					address by spending gas interacting with the Privacy Pools
					contract directly.
				`),
				spendingImprovements: ['implement relayed withdrawals'],
			}
		}

		if (!isSupported(privacyPools.capabilities.warnAboutSuccessiveOperations)) {
			return {
				spendingPrivacy: PrivateTransfersPrivacyLevel.NOT_PRIVATE,
				spendingDetails: mdParagraph(`
					The user is not warned when performing multiple transfers in quick
					succession. This could allow an observer to correlate multiple pool
					operations and infer information about the user's identity.
				`),
				spendingImprovements: ['warn the user when doing multiple operations in quick succession'],
			}
		}

		if (
			privacyPools.depositData.type !== 'LOCAL_ONLY' &&
			privacyPools.depositData.custodianCanLearnUserIpAddress
		) {
			return {
				spendingPrivacy: PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE,
				spendingDetails: mdParagraph(`
					Encrypted deposit data
					${privacyPools.depositData.useOfCustodian === 'BY_DEFAULT' ? 'is by default' : 'may be'}
					stored by
					${entityMarkdownLink(privacyPools.depositData.custodian)},
					who learn the user's IP address, enabling time-based correlation
					against onchain depositors into the Privacy Pool.
				`),
				spendingImprovements: ['use an anonymizing proxy for custodian interactions'],
			}
		}

		return {
			spendingPrivacy: PrivateTransfersPrivacyLevel.FULLY_PRIVATE,
			spendingDetails: mdParagraph(`
				The wallet supports importing and permissionlessly exporting deposit
				data, privacy-preserving relayer-based withdrawals, and warns against
				quick successive operations to protect privacy.
			`),
			spendingImprovements: [],
		}
	})()

	const walletShould = sendingImprovements
		.concat(receivingImprovements)
		.concat(spendingImprovements)
	const howToImprove = isNonEmptyArray(walletShould)
		? mdParagraph(
				`
					{{WALLET_NAME}} should${markdownListFormat(walletShould, {
						ifEmpty: { behavior: 'THROW_ERROR' },
						singleItemTemplate: ' ITEM.',
						uppercaseFirstCharacterOfListItems: true,
						multiItemPrefix: `:

					`,
						multiItemTemplate: `
					- ITEM`,
						multiItemSuffix: `

					`,
					})}
				`,
			)
		: undefined
	const perTechnology = singleTechnology<PrivateTransfersPrivacyLevels>(
		PrivateTransferTechnology.PRIVACY_POOLS,
		{
			sendingPrivacy,
			receivingPrivacy,
			spendingPrivacy,
		},
	)
	const details = privateTransfersDetailsContent({
		privateTransferDetails: singleTechnology(PrivateTransferTechnology.PRIVACY_POOLS, {
			sendingDetails,
			receivingDetails,
			spendingDetails,
			extraNotes,
		}),
	})
	const worstLevel = worstPrivateTransfersPrivacyLevel([
		sendingPrivacy,
		receivingPrivacy,
		spendingPrivacy,
	])

	switch (worstLevel) {
		case PrivateTransfersPrivacyLevel.NOT_FULLY_IMPLEMENTED:
			return {
				value: {
					id: 'incomplete_private_privacy_pools',
					rating: Rating.FAIL,
					displayName: 'Incomplete Privacy Pools integration',
					shortExplanation: mdSentence(
						'{{WALLET_NAME}} integrates some Privacy Pools features, but with severe gaps.',
					),
					defaultFungibleTokenTransferMode: PrivateTransferTechnology.PRIVACY_POOLS,
					perTechnology,
					__brand: brand,
				},
				details,
				howToImprove,
				references,
			}
		case PrivateTransfersPrivacyLevel.NOT_PRIVATE:
			return {
				value: {
					id: 'non_private_privacy_pools',
					rating: Rating.FAIL,
					displayName: 'Non-private Privacy Pools integration',
					shortExplanation: mdSentence(
						'{{WALLET_NAME}} integrates Privacy Pools in a non-privacy-preserving way.',
					),
					defaultFungibleTokenTransferMode: PrivateTransferTechnology.PRIVACY_POOLS,
					perTechnology,
					__brand: brand,
				},
				details,
				howToImprove,
				references,
			}
		case PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE:
			return {
				value: {
					id: 'chain_private_privacy_pools',
					rating: Rating.PARTIAL,
					displayName: 'Privacy Pools integration relying on external provider',
					shortExplanation: mdSentence(
						'{{WALLET_NAME}} integrates Privacy Pools but relies on an external provider.',
					),
					defaultFungibleTokenTransferMode: PrivateTransferTechnology.PRIVACY_POOLS,
					perTechnology,
					__brand: brand,
				},
				details,
				howToImprove,
				references,
			}
		case PrivateTransfersPrivacyLevel.FULLY_PRIVATE:
			if (howToImprove !== undefined) {
				return {
					value: {
						id: 'partial_privacy_pools_integration',
						rating: Rating.PARTIAL,
						displayName: 'Imperfect Privacy Pools integration',
						shortExplanation: mdSentence(
							'{{WALLET_NAME}} integrates Privacy Pools with some important compromises.',
						),
						defaultFungibleTokenTransferMode: PrivateTransferTechnology.PRIVACY_POOLS,
						perTechnology,
						__brand: brand,
					},
					details,
					howToImprove,
					references,
				}
			}

			return {
				value: {
					id: 'full_privacy_pools_integration',
					rating: Rating.PASS,
					icon: '\u{1f48c}', // Love letter
					displayName: 'Full Privacy Pools integration',
					shortExplanation: mdSentence(
						'{{WALLET_NAME}} integrates Privacy Pools for private transfers.',
					),
					defaultFungibleTokenTransferMode: PrivateTransferTechnology.PRIVACY_POOLS,
					perTechnology,
					__brand: brand,
				},
				details,
				howToImprove,
				references,
			}
	}
}

export const privateTransfers: Attribute<PrivateTransfersValue> = {
	id: 'privateTransfers',
	icon: '\u{1f4e8}', // Incoming envelope
	displayName: 'Private token transfers',
	wording: {
		midSentenceName: 'token transfer privacy',
	},
	question: sentence(
		'Can you send and receive tokens without revealing your transaction history to others?',
	),
	why: mdParagraph(`
		Data posted on public blockchains like Ethereum is publicly available to
		everyone. This means that anyone can see your transaction history.
		You would not voluntarily post your bank statements or private purchase
		history online, yet this is what happens by default when transacting
		on public blockchains.

		Many privacy solutions have emerged to solve this problem. However, to
		be actually usable by users, **these solutions must be tightly integrated
		in wallets** and easy to use. Walletbeat looks at whether wallets
		let users send, receive, and spend tokens privately by default.
	`),
	methodology: markdown(`
		In order to get a passing rating, wallets must ensure that sending Ether
		or ERC-20 tokens to other addresses comes with privacy guarantees
		**by default**. In addition, they must ensure that users can receive and
		spend such tokens privately.

		"Privately" here means that other than the wallet user, no single entity
		(including any external provider) can infer or reconstruct the user's
		transaction history.

		Walletbeat currently recognizes the following privacy-preserving token
		transfer solutions:

		- ${eipMarkdownLinkAndTitle(erc5564)}
		- [Tornado Cash Nova](https://nova.tornadocash.eth.limo/)
		- [Privacy Pools](https://privacypools.com/)
	`),
	ratingScale: {
		display: 'fail-pass',
		exhaustive: false,
		fail: [
			exampleRating(
				paragraph(`
					The wallet does not support private token transfers.
				`),
				noPrivateTransfers,
			),
			exampleRating(
				paragraph(`
					The wallet's default option when sending tokens is to perform a public token transfer.
				`),
				nonDefault,
			),
			exampleRating(
				mdParagraph(`
					The wallet implements ${eipMarkdownLink(erc5564)} Stealth Addresses and uses it by default for transfers.
					However, it does not let the user control which stealth addresses' balance is used when spending
					private balances, thereby potentially exposing unintended public onchain links between their
					stealth addresses.
				`),
				rateStealthAddressSupport(
					supported({
						ref: refNotNecessary,
						balanceLookup: {
							ref: refNotNecessary,
							type: 'EXTERNAL_SERVICE',
							externalService: exampleNodeCompany,
							learns: {
								generatedStealthAddresses: false,
								userMetaAddress: false,
							},
						},
						recipientAddressResolution: {
							ref: refNotNecessary,
							type: 'EXTERNAL_RESOLVER',
							externalResolver: exampleNodeCompany,
							learns: {
								recipientGeneratedStealthAddress: false,
								recipientMetaAddress: false,
								senderIpAddress: false,
								senderMetaAddress: false,
							},
						},
						privateKeyDerivation: {
							ref: refNotNecessary,
							type: 'LOCALLY',
						},
						userLabeling: notSupported,
						fees: fullySponsoredFees,
					}),
				),
			),
		],
		partial: [
			exampleRating(
				mdParagraph(`
					The wallet's token transfers are implemented using ${eipMarkdownLink(erc5564)} Stealth Addresses by default.
					However, an external provider may learn of the correlation between the user's stealth addresses.
				`),
				rateStealthAddressSupport(
					supported({
						ref: refNotNecessary,
						balanceLookup: {
							ref: refNotNecessary,
							type: 'EXTERNAL_SERVICE',
							externalService: exampleNodeCompany,
							learns: {
								generatedStealthAddresses: true,
								userMetaAddress: true,
							},
						},
						recipientAddressResolution: {
							ref: refNotNecessary,
							type: 'EXTERNAL_RESOLVER',
							externalResolver: exampleNodeCompany,
							learns: {
								recipientGeneratedStealthAddress: false,
								recipientMetaAddress: false,
								senderIpAddress: false,
								senderMetaAddress: false,
							},
						},
						privateKeyDerivation: {
							ref: refNotNecessary,
							type: 'LOCALLY',
						},
						userLabeling: supported({
							ref: refNotNecessary,
							unlabeledBehavior: StealthAddressUnlabeledBehavior.MUST_LABEL_BEFORE_SPENDING,
						}),
						fees: fullySponsoredFees,
					}),
				),
			),
			exampleRating(
				mdParagraph(`
					The wallet's token transfers are implemented using ${eipMarkdownLink(erc5564)} Stealth Addresses by default.
					However, when sending tokens, an external provider may learn of the correlation between the recipient's
					meta-address and their newly-generated stealth address, thereby de-anonymizing the recipient.
				`),
				rateStealthAddressSupport(
					supported({
						ref: refNotNecessary,
						balanceLookup: {
							ref: refNotNecessary,
							type: 'EXTERNAL_SERVICE',
							externalService: exampleNodeCompany,
							learns: {
								generatedStealthAddresses: false,
								userMetaAddress: false,
							},
						},
						recipientAddressResolution: {
							ref: refNotNecessary,
							type: 'EXTERNAL_RESOLVER',
							externalResolver: exampleNodeCompany,
							learns: {
								recipientGeneratedStealthAddress: true,
								recipientMetaAddress: true,
								senderIpAddress: false,
								senderMetaAddress: false,
							},
						},
						privateKeyDerivation: {
							ref: refNotNecessary,
							type: 'LOCALLY',
						},
						userLabeling: supported({
							ref: refNotNecessary,
							unlabeledBehavior: StealthAddressUnlabeledBehavior.MUST_LABEL_BEFORE_SPENDING,
						}),
						fees: fullySponsoredFees,
					}),
				),
			),
			exampleRating(
				mdParagraph(`
					The wallet's token transfers are implemented using ${eipMarkdownLink(erc5564)} Stealth Addresses by default.
					However, when sending tokens, an external provider may learn of the correlation between the sender's
					meta-address or IP, and the recipient's newly-generated stealth address, thereby de-anonymizing the
					sender and recipient of the transfer.
				`),
				rateStealthAddressSupport(
					supported({
						ref: refNotNecessary,
						balanceLookup: {
							ref: refNotNecessary,
							type: 'EXTERNAL_SERVICE',
							externalService: exampleNodeCompany,
							learns: {
								generatedStealthAddresses: false,
								userMetaAddress: false,
							},
						},
						recipientAddressResolution: {
							ref: refNotNecessary,
							type: 'EXTERNAL_RESOLVER',
							externalResolver: exampleNodeCompany,
							learns: {
								recipientGeneratedStealthAddress: true,
								recipientMetaAddress: false,
								senderIpAddress: false,
								senderMetaAddress: true,
							},
						},
						privateKeyDerivation: {
							ref: refNotNecessary,
							type: 'LOCALLY',
						},
						userLabeling: supported({
							ref: refNotNecessary,
							unlabeledBehavior: StealthAddressUnlabeledBehavior.MUST_LABEL_BEFORE_SPENDING,
						}),
						fees: fullySponsoredFees,
					}),
				),
			),
		],
		pass: [
			exampleRating(
				mdParagraph(`
					The wallet's token transfers are implemented using ${eipMarkdownLink(erc5564)} Stealth Addresses by default.
					Each stealth address is refreshed in such a way that no external provider may learn about the
					correlation between these stealth addresses.
					When spending private balances, users control which stealth addresses are used.
					When sending tokens to another user's stealth address, no external provider may learn of the correlation between
					the sender and the recipient, or of the correlation between the recipient's meta-address and their
					newly-generated stealth address.
				`),
				rateStealthAddressSupport(
					supported({
						ref: refNotNecessary,
						balanceLookup: {
							ref: refNotNecessary,
							type: 'EXTERNAL_SERVICE',
							externalService: exampleNodeCompany,
							learns: {
								generatedStealthAddresses: false,
								userMetaAddress: true,
							},
						},
						recipientAddressResolution: {
							ref: refNotNecessary,
							type: 'EXTERNAL_RESOLVER',
							externalResolver: exampleNodeCompany,
							learns: {
								recipientGeneratedStealthAddress: false,
								recipientMetaAddress: false,
								senderIpAddress: true,
								senderMetaAddress: false,
							},
						},
						privateKeyDerivation: {
							ref: refNotNecessary,
							type: 'LOCALLY',
						},
						userLabeling: supported({
							ref: refNotNecessary,
							unlabeledBehavior: StealthAddressUnlabeledBehavior.MUST_LABEL_BEFORE_SPENDING,
						}),
						fees: fullySponsoredFees,
					}),
				),
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<PrivateTransfersValue> => {
		if (features.privacy.transactionPrivacy === null) {
			return unrated(privateTransfers, brand, {
				defaultFungibleTokenTransferMode: 'PUBLIC',
				perTechnology: new Map(),
			})
		}

		let evaluation: Evaluation<PrivateTransfersValue> | null = null
		let atLeastOneTechnologySupported = false

		const maybeEvaluateTechnology = <T extends object>(
			support: Support<T>,
			evaluate: (supported: Supported<T>) => Evaluation<PrivateTransfersValue>,
		): Evaluation<PrivateTransfersValue> | null => {
			if (!isSupported(support)) {
				return null
			}

			return evaluate(support)
		}

		for (const maybeEvaluation of [
			maybeEvaluateTechnology(
				features.privacy.transactionPrivacy.stealthAddresses,
				rateStealthAddressSupport,
			),
			maybeEvaluateTechnology(
				features.privacy.transactionPrivacy.tornadoCashNova,
				rateTornadoCashNovaSupport,
			),
			maybeEvaluateTechnology(
				features.privacy.transactionPrivacy.privacyPools,
				ratePrivacyPoolsSupport,
			),
		]) {
			if (maybeEvaluation === null) {
				continue
			}

			atLeastOneTechnologySupported = true
			evaluation = mergeEvaluations(evaluation, maybeEvaluation)
		}

		if (features.privacy.transactionPrivacy.defaultFungibleTokenTransferMode === 'PUBLIC') {
			evaluation = mergeEvaluations(
				evaluation,
				atLeastOneTechnologySupported ? nonDefault : noPrivateTransfers,
			)
		}

		// Sanity checks.
		if (evaluation === null) {
			throw new Error(
				'Evaluation for private token transfer was still null despite checking every possibility',
			)
		}

		if (atLeastOneTechnologySupported && evaluation.value.perTechnology.size === 0) {
			throw new Error(
				'Private transfer evaluation perTechnology map empty despite supporting some form of private transfer',
			)
		}

		const privateTransferDetails = extractPrivateTransferDetails(evaluation.details)

		if (privateTransferDetails !== null) {
			// Sanity check that the set of keys are consistent.
			for (const [key] of evaluation.value.perTechnology) {
				if (!privateTransferDetails.privateTransferDetails.has(key)) {
					throw new Error(
						`Private transfer evaluation details does not include expected key ${key}`,
					)
				}
			}

			for (const [key] of privateTransferDetails.privateTransferDetails) {
				if (!evaluation.value.perTechnology.has(key)) {
					throw new Error(`Private transfer value does not include expected key ${key}`)
				}
			}
		} else if (atLeastOneTechnologySupported) {
			throw new Error(
				'Private transfer evaluation details is of incorrect type given that the wallet supports private transfers',
			)
		}

		evaluation.value.defaultFungibleTokenTransferMode =
			features.privacy.transactionPrivacy.defaultFungibleTokenTransferMode

		return evaluation
	},
	aggregate: pickWorstRating<PrivateTransfersValue>,
}
