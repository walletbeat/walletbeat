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

/** One group of personal information correlatable by a single source. */
export interface AddressCorrelationLeak {
	source: AddressCorrelationSource

	/** The correlated personal information, deduplicated and ordered worst-first. */
	correlatedInfo: NonEmptyArray<UserInfo>

	/** References backing this source's claim. */
	references: FullyQualifiedReference[]
}

/**
 * Canonical detail model for address correlation.
 *
 * Leaks are grouped by stable source identity (entity id, or the onchain
 * source), never by display name, so two entities that happen to share a name
 * cannot be merged into one claim. Grouping, ordering and deduplication happen
 * once here rather than in each adapter.
 */
export interface AddressCorrelationDetails {
	type: 'addressCorrelation'
	leaks: AddressCorrelationLeak[]
}

/** A linkable fact: some personal information correlatable by some source. */
export interface AddressCorrelationLinkable {
	info: UserInfo
	by: Entity | 'onchain'
	refs: FullyQualifiedReference[]
}

/** Stable identity for a correlation source. */
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

/** Long human-readable names of the correlated information, in model order. */
export function correlatedInfoNames(leak: AddressCorrelationLeak): string[] {
	return leak.correlatedInfo.map(info => userInfoName(info).long)
}
