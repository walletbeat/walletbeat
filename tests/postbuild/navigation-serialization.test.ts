import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { type HastNode, htmlToHast } from 'satteri'
import { describe, expect, it } from 'vitest'

import { getRepositoryRoot } from '@/utils/codebase'

function navigationIslands(node: HastNode): unknown[] {
	if (node.type === 'element' && node.tagName === 'astro-island') {
		if (String(node.properties['component-url']).includes('/NavigationItems.')) {
			return [JSON.parse(String(node.properties.props))]
		}
	}
	if (node.type === 'root' || node.type === 'element') {
		return node.children.flatMap(navigationIslands)
	}
	return []
}

describe('site navigation serialization', () => {
	it('ships the grouped tree once in the home page NavigationItems island', () => {
		const html = readFileSync(join(getRepositoryRoot(), 'dist/index.html'), 'utf8')
		const props = navigationIslands(htmlToHast(html))

		expect(props).toHaveLength(1)
		expect(props[0]).toHaveProperty('groups')
		expect(props[0]).not.toHaveProperty('items')
	})
})
