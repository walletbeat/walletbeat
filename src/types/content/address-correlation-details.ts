import type { Entity } from '@/schema/entity'
import {
	compareUserInfo,
	type UserInfo,
	userInfoName,
} from '@/schema/features/privacy/data-collection'
import { type FullyQualifiedReference, mergeRefs } from '@/schema/reference'
import type { NonEmptyArray } from '@/types/utils/non-empty'

/**
 * Who can correlate a wallet address with personal information.
 * `onchain` means the association is published on a public chain.
 */
export type AddressCorrelationSource = { kind: 'onchain' } | { kind: 'entity'; entity: Entity }

export interface AddressCorrelationLeak {
	source: AddressCorrelationSource

	/** The correlated personal information, deduplicated and ordered worst-first. */
	correlatedInfo: NonEmptyArray<UserInfo>

	references: FullyQualifiedReference[]
}

export interface AddressCorrelationDetails {
	type: 'addressCorrelation'
	leaks: AddressCorrelationLeak[]
}

export interface AddressCorrelationLinkable {
	info: UserInfo
	by: Entity | 'onchain'
	refs: FullyQualifiedReference[]
}

function sourceKey(by: Entity | 'onchain'): string {
	return by === 'onchain' ? 'onchain' : `entity:${by.id}`
}

/**
 * Build the canonical address-correlation details.
 *
 * Sources keep the order in which their worst leak appears, onchain records
 * last, matching how the evaluation ranks severity.
 */
export function buildAddressCorrelationDetails(
	linkables: NonEmptyArray<AddressCorrelationLinkable>,
): AddressCorrelationDetails {
	const sorted = [...linkables].sort((linkableA, linkableB) =>
		linkableA.by === 'onchain'
			? 1
			: linkableB.by === 'onchain'
				? -1
				: compareUserInfo(linkableA.info, linkableB.info),
	)
	const bySource = new Map<string, AddressCorrelationLinkable[]>()

	for (const linkable of sorted) {
		const key = sourceKey(linkable.by)
		const forSource = bySource.get(key)

		if (forSource === undefined) {
			bySource.set(key, [linkable])
		} else {
			forSource.push(linkable)
		}
	}

	const leaks: AddressCorrelationLeak[] = []

	for (const forSource of bySource.values()) {
		const [first, ...rest] = forSource
		const correlatedInfo: NonEmptyArray<UserInfo> = [first.info]

		for (const linkable of rest) {
			if (!correlatedInfo.includes(linkable.info)) {
				correlatedInfo.push(linkable.info)
			}
		}

		leaks.push({
			source: first.by === 'onchain' ? { kind: 'onchain' } : { kind: 'entity', entity: first.by },
			correlatedInfo,
			references: mergeRefs(...forSource.flatMap(linkable => linkable.refs)),
		})
	}

	return { type: 'addressCorrelation', leaks }
}

export function correlatedInfoNames(leak: AddressCorrelationLeak): string[] {
	return leak.correlatedInfo.map(info => userInfoName(info).long)
}
