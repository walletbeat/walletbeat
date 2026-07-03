import { describe, expect, it } from 'vitest'

import {
	assertValidDomainToEntityIdMapping,
	entitiesForDomain,
	entitiesForDomainIn,
} from '@/data/entities/domains/entity-domains'

describe('assertValidDomainToEntityIdMapping', () => {
	it('accepts the bare entity ID form', () => {
		expect(assertValidDomainToEntityIdMapping({ 'sentry.io': 'sentry' })).toEqual({
			'sentry.io': 'sentry',
		})
	})

	it('accepts the operator + intermediaries form', () => {
		expect(
			assertValidDomainToEntityIdMapping({
				'sentry.io': { operator: 'sentry', intermediaries: ['cloudflare'] },
			}),
		).toEqual({ 'sentry.io': { operator: 'sentry', intermediaries: ['cloudflare'] } })
	})

	it('rejects unknown entity IDs', () => {
		expect(() => assertValidDomainToEntityIdMapping({ 'foo.com': 'notAnEntity' })).toThrow(
			/unknown entity ID/,
		)
		expect(() =>
			assertValidDomainToEntityIdMapping({
				'foo.com': { operator: 'notAnEntity', intermediaries: ['cloudflare'] },
			}),
		).toThrow(/unknown operator entity ID/)
		expect(() =>
			assertValidDomainToEntityIdMapping({
				'foo.com': { operator: 'sentry', intermediaries: ['notAnEntity'] },
			}),
		).toThrow(/unknown intermediary entity ID/)
	})

	it('rejects empty intermediaries (bare form must be used instead)', () => {
		expect(() =>
			assertValidDomainToEntityIdMapping({
				'foo.com': { operator: 'sentry', intermediaries: [] },
			}),
		).toThrow(/must be non-empty/)
	})

	it('rejects an operator that is also an intermediary', () => {
		expect(() =>
			assertValidDomainToEntityIdMapping({
				'foo.com': { operator: 'sentry', intermediaries: ['sentry'] },
			}),
		).toThrow(/must not also be listed/)
	})

	it('rejects duplicate intermediaries', () => {
		expect(() =>
			assertValidDomainToEntityIdMapping({
				'foo.com': { operator: 'sentry', intermediaries: ['cloudflare', 'cloudflare'] },
			}),
		).toThrow(/duplicates/)
	})

	it('rejects unsorted intermediaries', () => {
		expect(() =>
			assertValidDomainToEntityIdMapping({
				'foo.com': { operator: 'sentry', intermediaries: ['debank', 'cloudflare'] },
			}),
		).toThrow(/sorted alphabetically/)
	})

	it('rejects extra keys in the object form', () => {
		expect(() =>
			assertValidDomainToEntityIdMapping({
				'foo.com': { operator: 'sentry', intermediaries: ['cloudflare'], extra: true },
			}),
		).toThrow(/exactly the keys/)
	})
})

describe('entitiesForDomainIn', () => {
	const mapping = assertValidDomainToEntityIdMapping({
		'example.walletbeat.eth': { operator: 'walletbeat', intermediaries: ['cloudflare'] },
		'sentry.io': 'sentry',
		'walletbeat.eth': 'walletbeat',
	})

	it('resolves an exact bare mapping with no intermediaries', () => {
		const resolved = entitiesForDomainIn(mapping, 'sentry.io')

		expect(resolved?.operator.id).toBe('sentry')
		expect(resolved?.intermediaries).toEqual([])
	})

	it('resolves subdomains through the parent domain', () => {
		const resolved = entitiesForDomainIn(mapping, 'o1234.ingest.sentry.io')

		expect(resolved?.operator.id).toBe('sentry')
		expect(resolved?.intermediaries).toEqual([])
	})

	it('resolves intermediaries on an exact hostname without affecting the apex', () => {
		const withIntermediary = entitiesForDomainIn(mapping, 'example.walletbeat.eth')

		expect(withIntermediary?.operator.id).toBe('walletbeat')
		expect(withIntermediary?.intermediaries.map(e => e.id)).toEqual(['cloudflare'])

		const apex = entitiesForDomainIn(mapping, 'walletbeat.eth')

		expect(apex?.operator.id).toBe('walletbeat')
		expect(apex?.intermediaries).toEqual([])

		const sibling = entitiesForDomainIn(mapping, 'other.walletbeat.eth')

		expect(sibling?.operator.id).toBe('walletbeat')
		expect(sibling?.intermediaries).toEqual([])
	})

	it('prefers the longest matching parent domain', () => {
		const resolved = entitiesForDomainIn(mapping, 'deep.example.walletbeat.eth')

		expect(resolved?.operator.id).toBe('walletbeat')
		expect(resolved?.intermediaries.map(e => e.id)).toEqual(['cloudflare'])
	})

	it('returns null for unassociated domains', () => {
		expect(entitiesForDomainIn(mapping, 'unrelated.com')).toBeNull()
		expect(entitiesForDomainIn(mapping, 'not-sentry.io')).toBeNull()
	})
})

describe('entitiesForDomain', () => {
	it('resolves domains from entity-domains.json', () => {
		expect(entitiesForDomain('sentry.io')?.operator.id).toBe('sentry')
		expect(entitiesForDomain('walletbeat.eth')?.operator.id).toBe('walletbeat')
		expect(entitiesForDomain('unrelated.com')).toBeNull()
	})
})
