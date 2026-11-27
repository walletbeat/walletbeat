import type { SoftwareAttributeGroupId } from '@/data/software-wallets'
import { sentence } from '@/types/content'
import { commaListFormat } from '@/types/utils/text'
import { setContains } from '@/types/utils/non-empty'

import { accountPortability } from '../attributes/self-sovereignty/account-portability'
import { accountUnruggability } from '../attributes/self-sovereignty/account-unruggability'
import { l1ProviderIndependence } from '../attributes/self-sovereignty/l1-provider-independence'
import { transactionInclusion } from '../attributes/self-sovereignty/transaction-inclusion'
import { isSupported } from '../features/support'
import {
	type StageCriterionEvaluation,
	stageCriterionEvaluationPerVariant,
	StageCriterionRating,
	variantsMustPassAttribute,
} from '../stages'
import {
	softwareWalletSourceAvailability,
	softwareWalletVariants,
} from '../stages/software-wallet-stages'
import type { WalletWalkawayTest } from '../walkaway'
import { WalletType } from '../wallet-types'

/**
 * Evaluates whether all of a software wallet's variants can be rebuilt from
 * source by anyone, which requires both reproducible and hermetic builds.
 */
const softwareWalletBuildVerification =
	stageCriterionEvaluationPerVariant<SoftwareAttributeGroupId>(
		softwareWalletVariants,
		(variantWallet): StageCriterionEvaluation => {
			const { reproducibleBuilds, hermeticBuilds } =
				variantWallet.features.transparency.releaseTransparency
			const unsupported = commaListFormat([
				reproducibleBuilds !== null && !isSupported(reproducibleBuilds) && 'reproducible',
				hermeticBuilds !== null && !isSupported(hermeticBuilds) && 'hermetic',
			])

			if (unsupported !== '') {
				return {
					rating: StageCriterionRating.FAIL,
					explanation: sentence(`{{WALLET_NAME}} does not have ${unsupported} builds.`),
				}
			}

			if (reproducibleBuilds === null || hermeticBuilds === null) {
				return { rating: StageCriterionRating.UNRATED }
			}

			return {
				rating: StageCriterionRating.PASS,
				explanation: sentence('{{WALLET_NAME}} has reproducible and hermetic builds.'),
			}
		},
	)

/** The walkaway test for software wallets. */
export const softwareWalletWalkawayTest: WalletWalkawayTest<SoftwareAttributeGroupId> = {
	id: 'walkaway:software',
	label: 'Walkaway Test',
	description: sentence(
		'The wallet keeps working, and its users stay in control of their funds, even if its development team and servers disappear.',
	),
	criteria: [
		{
			id: 'l1_provider_independence',
			description: sentence(
				'The wallet must perform basic operations on Ethereum L1 using only a self-hosted node.',
			),
			rationale: sentence(`
				If the wallet team's default infrastructure goes away, users must still be able to
				see their balances and send transactions through a node they control.
			`),
			evaluate: variantsMustPassAttribute(softwareWalletVariants, l1ProviderIndependence),
			displayName: 'L1 Provider Independence',
		},
		{
			id: 'transaction_inclusion',
			description: sentence(
				'The wallet must allow users to withdraw L2 funds to Ethereum L1 without relying on intermediaries.',
			),
			rationale: sentence(`
				If L2 operators stop including the user's transactions, users must still be able to
				get their funds out by force-withdrawing through Ethereum L1.
			`),
			evaluate: variantsMustPassAttribute(softwareWalletVariants, transactionInclusion),
			displayName: 'Transaction Inclusion',
		},
		{
			id: 'account_portability',
			description: sentence(
				'The wallet must allow users to freely export their account to another wallet.',
			),
			rationale: sentence(`
				If the wallet stops working, users must be able to take their account to a
				different wallet and keep using it there.
			`),
			evaluate: variantsMustPassAttribute(softwareWalletVariants, accountPortability),
			displayName: 'Account Portability',
		},
		{
			id: 'account_unruggability',
			description: sentence(
				"No external party must be able to take over the account without the user's consent.",
			),
			rationale: sentence(`
				If the wallet team or its infrastructure is compromised, the attacker must not be
				able to take over existing user accounts after the fact.
			`),
			evaluate: variantsMustPassAttribute(softwareWalletVariants, accountUnruggability, {
				allowPartial: false,
				ifUnverifiable: sentence(
					"{{WALLET_NAME}}'s account unruggability cannot be publicly verified.",
				),
				ifNoVariantInScope: null,
			}),
			displayName: 'Account Unruggability',
		},
		{
			id: 'source_available',
			description: sentence("The wallet's source code must be publicly available."),
			rationale: sentence(`
				If the wallet team stops publishing releases, anyone must be able to take the source
				code and build the wallet on their own.
			`),
			evaluate: softwareWalletSourceAvailability,
			displayName: 'Source Availability',
		},
		{
			id: 'build_verification',
			description: sentence('The wallet must have reproducible and hermetic builds.'),
			rationale: sentence(`
				Access to the source code is not enough on its own. Hermetic builds make sure the
				wallet can be built from the source code alone, without fetching from servers that
				may go away. Reproducible builds make sure such a build matches the released wallet.
			`),
			evaluate: softwareWalletBuildVerification,
			displayName: 'Build Verification',
		},
	],
	applicableTo: wallet => setContains<WalletType>(wallet.types, WalletType.SOFTWARE),
}
