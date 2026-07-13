import type { AttributeGroup } from '@/schema/attribute-groups.ts'
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
				attribute: (await import('@/schema/attributes/security/security-audits-bug-bounty'))
					.securityAudits,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/security/scam-prevention.ts')).scamPrevention,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/self-sovereignty/chain-verification.ts'))
					.chainVerification,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/security/transaction-legibility.ts'))
					.transactionLegibility,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/security/hardware-wallet-support.ts'))
					.hardwareWalletSupport,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/security/security-best-practices.ts'))
					.securityBestPractices,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/security/supply-chain-diy.ts'))
					.supplyChainDIY,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/security/supply-chain-factory.ts'))
					.supplyChainFactory,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/security/firmware.ts')).firmware,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/security/user-safety.ts')).userSafety,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/security/account-recovery.ts'))
					.accountRecovery,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/security/duress-resistance.ts'))
					.duressResistance,
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
				attribute: (await import('@/schema/attributes/privacy/address-correlation.ts'))
					.addressCorrelation,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/privacy/multi-address-correlation.ts'))
					.multiAddressCorrelation,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/privacy/private-transfers.ts'))
					.privateTransfers,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/privacy/hardware-privacy.ts'))
					.hardwarePrivacy,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/privacy/app-isolation.ts')).appIsolation,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/privacy/privacy-hygiene.ts')).privacyHygiene,
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
				attribute: (
					await import('@/schema/attributes/self-sovereignty/l1-provider-independence.ts')
				).l1ProviderIndependence,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/self-sovereignty/account-portability.ts'))
					.accountPortability,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/self-sovereignty/transaction-inclusion.ts'))
					.transactionInclusion,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/self-sovereignty/account-unruggability.ts'))
					.accountUnruggability,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/self-sovereignty/permissions-management.ts'))
					.permissionsManagement,
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
				attribute: (await import('@/schema/attributes/transparency/open-source.ts')).openSource,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/transparency/source-visibility.ts'))
					.sourceVisibility,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/transparency/funding.ts')).funding,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/transparency/fee-transparency.ts'))
					.feeTransparency,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/transparency/release-process.ts'))
					.releaseProcess,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/transparency/reputation.ts')).reputation,
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
				attribute: (await import('@/schema/attributes/ecosystem/account-abstraction.ts'))
					.accountAbstraction,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/ecosystem/address-resolution.ts'))
					.addressResolution,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/ecosystem/browser-integration.ts'))
					.browserIntegration,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/ecosystem/chain-abstraction.ts'))
					.chainAbstraction,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/ecosystem/transaction-batching.ts'))
					.transactionBatching,
				weight: 1.0,
			},
			{
				attribute: (
					await import('@/schema/attributes/ecosystem/hardware-wallet-interoperability.ts')
				).hardwareWalletInteroperability,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/self-sovereignty/interoperability.ts'))
					.interoperability,
				weight: 1.0,
			},
			{
				attribute: (await import('@/schema/attributes/ecosystem/hw-app-connection-support.ts'))
					.appConnectionSupport,
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
				attribute: (await import('@/schema/attributes/transparency/maintenance.ts')).maintenance,
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
