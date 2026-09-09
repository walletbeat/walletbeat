import { describe, expect, it } from 'vitest'

import { EvaluationContext } from '@/schema/attributes'
import { permissionsManagement } from '@/schema/attributes/self-sovereignty/permissions-management'
import {
	featureSupportedNoRef,
	notSupported,
	notSupportedWithRef,
	supported,
} from '@/schema/features/support'
import { refNotNecessary, refTodo } from '@/schema/reference'

function context(): EvaluationContext {
	return EvaluationContext.forTest(() => permissionsManagement)
}

describe('EvaluationContext.addRef', () => {
	it('collects supported feature references', () => {
		const ctx = context()

		ctx.addRef(
			supported({
				ref: {
					url: 'https://example.com/supported',
					explanation: 'The feature is supported.',
				},
			}),
		)

		expect(ctx.references()).toEqual([
			{
				urls: [{ url: 'https://example.com/supported', label: 'example.com' }],
				explanation: 'The feature is supported.',
			},
		])
	})

	it('collects unsupported feature references without losing metadata', () => {
		const ctx = context()

		ctx.addRef(
			notSupportedWithRef({
				ref: {
					url: 'https://example.com/unsupported',
					label: 'Unsupported feature evidence',
					explanation: 'The feature is absent.',
					lastRetrieved: '2026-09-08',
				},
			}),
		)

		expect(ctx.references()).toEqual([
			{
				urls: [
					{
						url: 'https://example.com/unsupported',
						label: 'Unsupported feature evidence',
						explanation: 'The feature is absent.',
						lastRetrieved: '2026-09-08',
					},
				],
				explanation: 'The feature is absent.',
				lastRetrieved: '2026-09-08',
			},
		])
	})

	it('ignores support sentinels without references', () => {
		const ctx = context()

		ctx.addRef(
			notSupported,
			featureSupportedNoRef,
			notSupportedWithRef({ ref: refNotNecessary }),
			notSupportedWithRef({ ref: refTodo }),
		)

		expect(ctx.references()).toEqual([])
	})

	it('does not recursively collect unrelated nested references', () => {
		const ctx = context()

		ctx.addRef(
			supported({
				ref: refNotNecessary,
				nested: notSupportedWithRef({
					ref: { url: 'https://example.com/unrelated' },
				}),
			}),
		)

		expect(ctx.references()).toEqual([])
	})
})
