import { describe, it } from 'vitest'

import { type Support, supported } from '@/schema/features/support'
import type { WithRef } from '@/schema/reference'
import type { VariantFeature } from '@/schema/variants'

interface Payload {
	known: boolean
	nested: { inner: number }
}

/** Gives `supported(...)` calls the contextual types used across wallet data. */
function features(_features: {
	plain: Support<Payload>
	withRef: WithRef<Support<Payload>> | null
	perVariant: VariantFeature<Support<WithRef<Payload>>>
}): void {}

describe('supported', () => {
	it('rejects fields that the feature type does not declare', () => {
		features({
			plain: supported({
				known: true,
				nested: { inner: 1 },
				// @ts-expect-error -- Not a field of `Payload`.
				unknownField: true,
			}),
			withRef: supported({
				ref: [],
				known: true,
				// @ts-expect-error -- Not a field of `Payload['nested']`.
				nested: { inner: 1, unknownField: true },
			}),
			perVariant: supported({
				ref: [],
				known: true,
				nested: { inner: 1 },
				// @ts-expect-error -- Not a field of `WithRef<Payload>`.
				unknownField: true,
			}),
		})
	})
})
