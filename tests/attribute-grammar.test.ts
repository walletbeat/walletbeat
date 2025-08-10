import { describe, it } from 'vitest'

import { attributeTree } from '@/schema/attribute-groups'

import { contentGrammarLint } from './utils/grammar'

describe('attribute', () => {
	for (const [attributeGroupName, attributeGroup] of Object.entries(attributeTree)) {
		describe(`group ${attributeGroupName}`, () => {
			for (const attribute of Object.values(attributeGroup.attributes)) {
				describe(`attribute ${attribute.displayName}`, () => {
					describe('methodology', () => {
						it('has correct grammar', async () => {
							await contentGrammarLint(attribute.methodology)
						})
					})
				})
			}
		})
	}
})
