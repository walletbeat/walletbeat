import { describe, expect, it } from 'vitest'

import { allRatedWallets, attributeTreeForWallet } from '@/data/wallets'
import {
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import { Rating, Verifiability } from '@/schema/attributes'
import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
import { EthereumL1LightClient } from '@/schema/features/security/light-client'
import { toFullyQualified } from '@/schema/reference'
import {
	ContentType,
	type CustomContent,
	isCustomContent,
	mdParagraph,
	sentence,
} from '@/types/content'
import { chainVerificationDetailsContent } from '@/types/content/chain-verification-details'
import { privateTransfersDetailsContent } from '@/types/content/private-transfers-details'
import {
	type CustomContentContext,
	NO_MARKDOWN_DETAILS,
	renderCustomContentToMarkdown,
} from '@/utils/custom-content-markdown'

/** A real wallet, since every detail component takes a full `RatedWallet`. */
const wallet = allRatedWallets.rabby
const walletName = wallet.metadata.displayName

/** Context for synthetic content that does not come from a real evaluation. */
const syntheticContext: CustomContentContext = {
	wallet,
	outcome: {
		id: 'synthetic',
		rating: Rating.PASS,
		displayName: 'Synthetic outcome',
		shortExplanation: sentence('Synthetic outcome.'),
		verifiability: Verifiability.SELF_EVIDENT,
	},
	references: [],
}

/**
 * Every `CustomContent` detail across every rated wallet, paired with the
 * context the wallet page would render it with.
 */
interface CustomContentEntry {
	walletName: string
	attributeId: string
	componentName: string
	content: CustomContent
	context: CustomContentContext
}

const realCustomContents: CustomContentEntry[] = Object.values(allRatedWallets).flatMap(w =>
	mapNonExemptAttributeGroupsInTree(
		attributeTreeForWallet(w),
		w.overall,
		(_attrGroup, evalGroup): CustomContentEntry[] =>
			mapNonExemptGroupAttributes(evalGroup, (evalAttr): CustomContentEntry | null => {
				const { attribute, evaluation } = evalAttr

				if (!isCustomContent(evaluation.details)) {
					return null
				}

				return {
					walletName: w.metadata.displayName,
					attributeId: attribute.id,
					componentName: evaluation.details.component.component,
					content: evaluation.details,
					context: {
						wallet: w,
						outcome: evaluation.outcome,
						references:
							evaluation.references === undefined ? [] : toFullyQualified(evaluation.references),
					},
				}
			}).filter(entry => entry !== null),
	).flat(),
)

/** Assertions that must hold for the Markdown of any detail component. */
function expectWellFormedMarkdown(markdown: string): void {
	// No HTML survived the conversion, including Svelte's SSR comment markers.
	expect(markdown).not.toMatch(/<\/?[a-zA-Z][^>]*>/)
	expect(markdown).not.toContain('<!--')

	// `ReferenceLinks` sections are stripped; the wallet page emits its own
	// `#### References` section for the attribute instead.
	expect(markdown).not.toMatch(/^#{1,6} Sources?\b/m)

	// Component headings sit under the attribute's own `###` heading, as
	// siblings of the `#### Impact` / `#### References` sections the wallet
	// page emits for the same attribute.
	for (const [, hashes] of markdown.matchAll(/^(#+) /gm)) {
		expect(hashes.length).toBeGreaterThanOrEqual(4)
	}

	// Bullets use the same single-space `- ` marker as the rest of the page.
	expect(markdown).not.toMatch(/^\s*-\s{2,}\S/m)

	expect(markdown).not.toContain('[object Object]')
	expect(markdown).not.toMatch(/\{\{[^}]+\}\}/)
}

/**
 * Render the first real instance of a component, labeled with where it came
 * from, for exact-output assertions.
 */
function renderFirstInstanceOf(componentName: string): string {
	const entry = realCustomContents.find(e => e.componentName === componentName)

	if (entry === undefined) {
		throw new Error(`No wallet currently uses ${componentName}`)
	}

	const markdown = renderCustomContentToMarkdown(entry.content, entry.context)

	if (typeof markdown !== 'string') {
		throw new Error(`${componentName} did not render to Markdown`)
	}

	return `${entry.walletName} / ${entry.attributeId}\n\n${markdown}`
}

describe('renderCustomContentToMarkdown', () => {
	it('renders every component found in the real wallet data', () => {
		expect(realCustomContents.length).toBeGreaterThan(0)
		expect([...new Set(realCustomContents.map(entry => entry.componentName))].toSorted())
			.toMatchInlineSnapshot(`
			[
			  "AccountRecoveryDetails",
			  "AccountUnruggabilityDetails",
			  "AddressCorrelationDetails",
			  "FundingDetails",
			  "ScamAlertDetails",
			  "SecurityAuditsDetails",
			  "TransactionInclusionDetails",
			  "UnratedAttribute",
			]
		`)
	})

	describe('real wallet data', () => {
		for (const entry of realCustomContents) {
			it(`${entry.walletName} / ${entry.attributeId} (${entry.componentName})`, () => {
				const markdown = renderCustomContentToMarkdown(entry.content, entry.context)

				// Every component in `ComponentAndProps` is handled, so `null`
				// (meaning "not custom content") must never come back here.
				expect(markdown).not.toBeNull()

				if (entry.componentName === 'UnratedAttribute') {
					expect(markdown).toBe(NO_MARKDOWN_DETAILS)

					return
				}

				if (typeof markdown !== 'string') {
					throw new TypeError(`${entry.componentName} did not render to Markdown`)
				}

				expectWellFormedMarkdown(markdown)
			})
		}
	})

	// The two components below are wired up but no wallet currently uses them,
	// so they get synthetic props rather than being exercised by the sweep above.
	describe('components with no real wallet data', () => {
		it('renders ChainVerificationDetails and strips its inline sources', () => {
			const markdown = renderCustomContentToMarkdown(
				chainVerificationDetailsContent({ lightClients: [EthereumL1LightClient.helios] }),
				{
					...syntheticContext,
					references: [
						{
							urls: [{ url: 'https://example.com/chain-verification', label: 'Example source' }],
						},
					],
				},
			)

			expect(markdown).toBe(
				`**${walletName}** performs L1 chain state verification using [helios](https://helios.a16zcrypto.com/) light client.`,
			)
			expect(markdown).not.toContain('https://example.com/chain-verification')
		})

		it('renders PrivateTransfersDetails', () => {
			const markdown = renderCustomContentToMarkdown(
				privateTransfersDetailsContent({
					privateTransferDetails: new Map([
						[
							PrivateTransferTechnology.STEALTH_ADDRESSES,
							{
								sendingDetails: mdParagraph('{{WALLET_NAME}} can send to stealth addresses.'),
								receivingDetails: mdParagraph('{{WALLET_NAME}} can receive at stealth addresses.'),
								spendingDetails: mdParagraph('{{WALLET_NAME}} can spend from stealth addresses.'),
								extraNotes: [mdParagraph('Scanning is done locally.')],
							},
						],
					]),
				}),
				syntheticContext,
			)

			expect(markdown).toBe(
				[
					'##### ERC-5564 Stealth Addresses',
					'',
					'**Sending:**',
					'',
					`${walletName} can send to stealth addresses.`,
					'',
					'**Receiving:**',
					'',
					`${walletName} can receive at stealth addresses.`,
					'',
					'**Spending:**',
					'',
					`${walletName} can spend from stealth addresses.`,
					'',
					'Scanning is done locally.',
				].join('\n'),
			)
		})
	})

	// Exact output for one real instance of each component. The wallet and
	// attribute are part of the snapshot so that it is obvious when the
	// representative instance changes along with the Markdown.
	describe('exact output', () => {
		it('AddressCorrelationDetails', () => {
			expect(renderFirstInstanceOf('AddressCorrelationDetails')).toMatchInlineSnapshot(`
				"Ambire / addressCorrelation

				By default, **Ambire** allows your wallet address to be correlated with your personal information:

				- **Ambire Wallet** ([Privacy policy](https://www.ambire.com/Ambire%20ToS%20and%20PP%20%2826%20November%202021%29.pdf)) may link your wallet address to your **IP address**.
				- **Monad** may link your wallet address to your **IP address**.
				- **Citrea** may link your wallet address to your **IP address**.
				- **Pimlico** ([Privacy policy](https://www.pimlico.io/privacy)) may link your wallet address to your **IP address**.
				- **Biconomy** ([Privacy policy](https://biconomy.zendesk.com/hc/en-us/articles/360036040012-Privacy-policy)) may link your wallet address to your **IP address**."
			`)
		})

		it('ScamAlertDetails', () => {
			expect(renderFirstInstanceOf('ScamAlertDetails')).toMatchInlineSnapshot(`
				"Ambire / scamPrevention

				Ambire warns the user about outgoing transactions to unknown addresses, transactions with potential scam contracts, and connections to potential scam applications but not about transactions that grant unlimited token approvals

				- **Ambire** helps you stay safe when sending funds by warning you when sending funds to an address you have not sent or received funds from in the past. However, in doing so, it leaks your IP and the recipient's Ethereum address to an external provider which can correlate them.

				- **Ambire** helps you stay safe when doing onchain transactions by:

				  - Checking the contract or transaction data against a database of known scams
				  - Warning you when interacting with a contract you have not interacted with before However, in doing so, it leaks your IP and the contract address to an external provider which can correlate them.

				- **Ambire** helps you stay safe when connecting to onchain apps by checking its URL against a set of known scam apps.

				- **Ambire** does not warn you when granting unlimited token approvals."
			`)
		})

		it('SecurityAuditsDetails', () => {
			expect(renderFirstInstanceOf('SecurityAuditsDetails')).toMatchInlineSnapshot(`
				"Ambire / securityAuditsAndBounties

				**Ambire** was last audited on February 20, 2025, which was over a year ago.

				##### Audit by [Hunter Security](https://www.huntersec.co/)

				February 20, 2025

				No security flaws of severity level medium or higher were found.

				##### Audit by [Pashov Audit Group](https://www.pashov.net/)

				January 26, 2024

				All security flaws of severity level medium or higher were addressed.

				##### Bug bounty program

				The program covers all aspects of the wallet.

				Note that the program is currently inactive and not accepting new reports.

				The program is self-hosted.

				Unfortunately, the wallet does not provide a clear upgrade path for users when security issues are identified."
			`)
		})

		it('AccountRecoveryDetails', () => {
			expect(renderFirstInstanceOf('AccountRecoveryDetails')).toMatchInlineSnapshot(`
				"Ambire / accountRecovery

				Ambire does not implement guardian-based account recovery. The user will lose access to their account if they lose their seed phrase.

				#### Account recovery drills

				Ambire does not run the following recommended account recovery drills:

				- private key check-ups
				- seed phrase check-ups"
			`)
		})

		it('TransactionInclusionDetails', () => {
			expect(renderFirstInstanceOf('TransactionInclusionDetails')).toMatchInlineSnapshot(`
				"Ambire / transactionInclusion

				**Ambire** does not support L2 force-inclusion withdrawal transactions on **Arbitrum or OP Stack** L2s.

				This means users rely on intermediaries in order to withdraw their funds from these L2s.

				**Ambire** supports connecting to a user's self-hosted Ethereum node, which can be used to broadcast L1 transactions without trusting intermediaries."
			`)
		})

		it('AccountUnruggabilityDetails', () => {
			expect(renderFirstInstanceOf('AccountUnruggabilityDetails')).toMatchInlineSnapshot(`
				"Ambire / accountUnruggability

				Private key material never leaves Ambire, so no external entity may take over your account."
			`)
		})

		it('FundingDetails', () => {
			expect(renderFirstInstanceOf('FundingDetails')).toMatchInlineSnapshot(`
				"Ambire / funding

				**Ambire** is funded by **ecosystem grants, self-funding, transparent fees, venture capital**."
			`)
		})
	})

	it('returns null for typographic content', () => {
		expect(
			renderCustomContentToMarkdown(
				{ contentType: ContentType.TEXT, text: 'hello' },
				syntheticContext,
			),
		).toBeNull()
	})
})
