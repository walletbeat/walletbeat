import { describe, expect, it } from 'vitest'

import { completedTemplate } from '@/data/software-wallets/completed.tmpl'
import { mapAttributesGetter } from '@/schema/attribute-groups'
import { Rating } from '@/schema/attributes'
import { rateWallet } from '@/schema/wallet'

describe('completed.tmpl', () => {
	it('rates PASS or EXEMPT on all attributes, never UNRATED', () => {
		const rated = rateWallet(completedTemplate)

		mapAttributesGetter(rated.overall, getter => {
			const evalAttr = getter(rated.overall)

			if (evalAttr === undefined) {
				return
			}

			const { attribute, evaluation } = evalAttr
			const { rating } = evaluation.outcome

			/**
			 * Pass or exempt for attributes that are only for hardware wallets.
			 */
			expect(
				rating === Rating.PASS || rating === Rating.EXEMPT,
				`Attribute "${attribute.id}" got ${rating}, expected PASS or EXEMPT`,
			).toBe(true)
		})
	})
})
