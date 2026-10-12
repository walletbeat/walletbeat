import type { AttributeGroup } from '@/schema/attribute-groups.ts'
import { accountAbstraction } from '@/schema/attributes/ecosystem/account-abstraction.ts'
import { addressResolution } from '@/schema/attributes/ecosystem/address-resolution.ts'
import { browserIntegration } from '@/schema/attributes/ecosystem/browser-integration.ts'
import { chainAbstraction } from '@/schema/attributes/ecosystem/chain-abstraction.ts'
import { hardwareWalletInteroperability } from '@/schema/attributes/ecosystem/hardware-wallet-interoperability.ts'
import { appConnectionSupport } from '@/schema/attributes/ecosystem/hw-app-connection-support.ts'
import { transactionBatching } from '@/schema/attributes/ecosystem/transaction-batching.ts'
import { addressCorrelation } from '@/schema/attributes/privacy/address-correlation.ts'
import { appIsolation } from '@/schema/attributes/privacy/app-isolation.ts'
import { hardwarePrivacy } from '@/schema/attributes/privacy/hardware-privacy.ts'
import { multiAddressCorrelation } from '@/schema/attributes/privacy/multi-address-correlation.ts'
import { privacyHygiene } from '@/schema/attributes/privacy/privacy-hygiene.ts'
import { privateTransfers } from '@/schema/attributes/privacy/private-transfers.ts'
import { accountRecovery } from '@/schema/attributes/security/account-recovery.ts'
import { duressResistance } from '@/schema/attributes/security/duress-resistance.ts'
import { firmware } from '@/schema/attributes/security/firmware.ts'
import { hardwareWalletSupport } from '@/schema/attributes/security/hardware-wallet-support.ts'
import { scamPrevention } from '@/schema/attributes/security/scam-prevention.ts'
import { securityAuditsAndBounties } from '@/schema/attributes/security/security-audits-bounties'
import { securityBestPractices } from '@/schema/attributes/security/security-best-practices.ts'
import { supplyChainDIY } from '@/schema/attributes/security/supply-chain-diy.ts'
import { supplyChainFactory } from '@/schema/attributes/security/supply-chain-factory.ts'
import { transactionLegibility } from '@/schema/attributes/security/transaction-legibility.ts'
import { userSafety } from '@/schema/attributes/security/user-safety.ts'
import { accountPortability } from '@/schema/attributes/self-sovereignty/account-portability.ts'
import { accountUnruggability } from '@/schema/attributes/self-sovereignty/account-unruggability.ts'
import { chainVerification } from '@/schema/attributes/self-sovereignty/chain-verification.ts'
import { interoperability } from '@/schema/attributes/self-sovereignty/interoperability.ts'
import { l1ProviderIndependence } from '@/schema/attributes/self-sovereignty/l1-provider-independence.ts'
import { permissionsManagement } from '@/schema/attributes/self-sovereignty/permissions-management.ts'
import { transactionInclusion } from '@/schema/attributes/self-sovereignty/transaction-inclusion.ts'
import { feeTransparency } from '@/schema/attributes/transparency/fee-transparency.ts'
import { funding } from '@/schema/attributes/transparency/funding.ts'
import { maintenance } from '@/schema/attributes/transparency/maintenance.ts'
import { openSource } from '@/schema/attributes/transparency/open-source.ts'
import { orderflowTransparency } from '@/schema/attributes/transparency/orderflow-transparency.ts'
import { releaseProcess } from '@/schema/attributes/transparency/release-process.ts'
import { reputation } from '@/schema/attributes/transparency/reputation.ts'
import { sentence } from '@/types/content'

export enum AttributeGroupId {
	Security = 'security',
	Privacy = 'privacy',
	SelfSovereignty = 'selfSovereignty',
	Transparency = 'transparency',
	Ecosystem = 'ecosystem',
	Maintenance = 'maintenance',
}

const attributeGroupDefinitions = [
	{
		id: AttributeGroupId.Security,
		displayName: 'Security',
		attributes: [
			{
				attribute: securityAuditsAndBounties,
				weight: 1.0,
			},
			{
				attribute: scamPrevention,
				weight: 1.0,
			},
			{
				attribute: chainVerification,
				weight: 1.0,
			},
			{
				attribute: transactionLegibility,
				weight: 1.0,
			},
			{
				attribute: hardwareWalletSupport,
				weight: 1.0,
			},
			{
				attribute: securityBestPractices,
				weight: 1.0,
			},
			{
				attribute: supplyChainDIY,
				weight: 1.0,
			},
			{
				attribute: supplyChainFactory,
				weight: 1.0,
			},
			{
				attribute: firmware,
				weight: 1.0,
			},
			{
				attribute: userSafety,
				weight: 1.0,
			},
			{
				attribute: accountRecovery,
				weight: 1.0,
			},
			{
				attribute: duressResistance,
				weight: 1.0,
			},
		],
		icon: 'security',
		perWalletQuestion: sentence('How secure is {{WALLET_NAME}}?'),
	},

	{
		id: AttributeGroupId.Privacy,
		displayName: 'Privacy',
		attributes: [
			{
				attribute: addressCorrelation,
				weight: 1.0,
			},
			{
				attribute: multiAddressCorrelation,
				weight: 1.0,
			},
			{
				attribute: privateTransfers,
				weight: 1.0,
			},
			{
				attribute: hardwarePrivacy,
				weight: 1.0,
			},
			{
				attribute: appIsolation,
				weight: 1.0,
			},
			{
				attribute: privacyHygiene,
				weight: 1.0,
			},
		],
		icon: 'privacy',
		perWalletQuestion: sentence('How well does {{WALLET_NAME}} protect your privacy?'),
	},

	{
		id: AttributeGroupId.SelfSovereignty,
		displayName: 'Self-sovereignty',
		attributes: [
			{
				attribute: l1ProviderIndependence,
				weight: 1.0,
			},
			{
				attribute: accountPortability,
				weight: 1.0,
			},
			{
				attribute: transactionInclusion,
				weight: 1.0,
			},
			{
				attribute: accountUnruggability,
				weight: 1.0,
			},
			{
				attribute: permissionsManagement,
				weight: 1.0,
			},
		],
		icon: 'self_sovereignty',
		perWalletQuestion: sentence(
			'How much control and ownership over your account does {{WALLET_NAME}} give you?',
		),
	},

	{
		id: AttributeGroupId.Transparency,
		displayName: 'Transparency',
		attributes: [
			{
				attribute: openSource,
				weight: 1.0,
			},
			{
				attribute: funding,
				weight: 1.0,
			},
			{
				attribute: feeTransparency,
				weight: 1.0,
			},
			{
				attribute: releaseProcess,
				weight: 1.0,
			},
			{
				attribute: orderflowTransparency,
				weight: 1.0,
			},
			{
				attribute: reputation,
				weight: 1.0,
			},
		],
		icon: 'transparency',
		perWalletQuestion: sentence(
			"How transparent and sustainable is {{WALLET_NAME}}'s development model?",
		),
	},

	{
		id: AttributeGroupId.Ecosystem,
		displayName: 'Ecosystem',
		attributes: [
			{
				attribute: accountAbstraction,
				weight: 1.0,
			},
			{
				attribute: addressResolution,
				weight: 1.0,
			},
			{
				attribute: browserIntegration,
				weight: 1.0,
			},
			{
				attribute: chainAbstraction,
				weight: 1.0,
			},
			{
				attribute: transactionBatching,
				weight: 1.0,
			},
			{
				attribute: hardwareWalletInteroperability,
				weight: 1.0,
			},
			{
				attribute: interoperability,
				weight: 1.0,
			},
			{
				attribute: appConnectionSupport,
				weight: 1.0,
			},
		],
		icon: 'ecosystem',
		perWalletQuestion: sentence('How well does {{WALLET_NAME}} align with the ecosystem?'),
	},

	{
		id: AttributeGroupId.Maintenance,
		displayName: 'Maintenance',
		attributes: [
			{
				attribute: maintenance,
				weight: 1.0,
			},
		],
		icon: 'transparency',
		perWalletQuestion: sentence('How well-maintained is {{WALLET_NAME}}?'),
	},
] as const satisfies readonly AttributeGroup<AttributeGroupId>[]

export const attributeTree = Object.fromEntries(
	attributeGroupDefinitions.map(attrGroup => [attrGroup.id, attrGroup] as const),
) satisfies {
	[K in (typeof attributeGroupDefinitions)[number]['id']]: Extract<
		(typeof attributeGroupDefinitions)[number],
		{ readonly id: K }
	>
}

/**
 * Build a narrowed attribute tree that contains only the given group ids.
 *
 * @param ids Tuple of `AttributeGroupId` keys that must exist on `attributeTree`.
 *   The `number extends Ids['length'] ? never` constraint rejects plain `string[]`
 *   so callers must pass a fixed-length tuple (preserves literal union keys for `Pick`).
 * @returns The same shape as `attributeTree` but restricted to those keys.
 */
export const attributeTreeForIds = <const Ids extends readonly (keyof typeof attributeTree)[]>(
	ids: Ids & (number extends Ids['length'] ? never : unknown),
): Pick<typeof attributeTree, Ids[number]> => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- each id is in Ids; values are attributeTree[id]
	return Object.fromEntries(ids.map(id => [id, attributeTree[id]] as const)) as Pick<
		typeof attributeTree,
		Ids[number]
	>
}
