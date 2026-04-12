import { describe, expect, it } from 'vitest'

import { attributeTree } from '@/data/attribute-groups'

describe('attribute', () => {
	for (const [attributeGroupName, attributeGroup] of Object.entries(attributeTree)) {
		describe(`group ${attributeGroupName}`, () => {
			it('has the correct ID', () => {
				expect(attributeGroupName).toBe(attributeGroup.id)
			})

			for (const { attribute } of attributeGroup.attributes) {
				describe(`attribute ${attribute.displayName}`, () => {
					it('has a lowerCamelCased ID', () => {
						expect(attribute.id).toMatch(/^[a-z][A-Za-z0-9]*$/u)
					})
				})
			}
		})
	}
})
