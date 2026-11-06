import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import { hardwareWalletAttributeTree, unratedHardwareWallet } from '@/data/hardware-wallets'
import { unratedHardwareTemplate } from '@/data/hardware-wallets/unrated.tmpl'
import { softwareWalletAttributeTree, unratedSoftwareWallet } from '@/data/software-wallets'
import { unratedTemplate } from '@/data/software-wallets/unrated.tmpl'
import { allRatedWallets, attributeTreeForWallet } from '@/data/wallets'
import {
	type AttributeTree,
	evaluateAttributes,
	mapAttributesGetter,
} from '@/schema/attribute-groups'
import { walletEipSupport } from '@/schema/eip-support'
import { resolveFeatures } from '@/schema/features'
import type { Erc7730MetadataSource } from '@/schema/features/security/erc7730-metadata'
import { Variant } from '@/schema/variants'
import type { RatedWallet, ResolvedWallet } from '@/schema/wallet'
import { nonEmptyEntries } from '@/types/utils/non-empty'
import { ratedWalletJsonExport } from '@/utils/wallet-json-export'
import { walletPageMarkdown } from '@/utils/wallet-page-markdown'
import Erc7730MetadataSources from '@/views/Erc7730MetadataSources.svelte'

const sources: Erc7730MetadataSource[] = [
	{
		name: 'Example metadata registry',
		registry: 'https://example.org/registry',
		endpoint: 'https://example.org/descriptors',
		ref: 'https://example.org/wallet-integration',
	},
	{
		name: 'Example local collection',
		registry: 'https://example.org/local-registry',
		endpoint: null,
		ref: 'https://example.org/local-integration',
	},
]

describe('ERC-7730 metadata source disclosure', () => {
	it('renders unknown, confirmed absence and source links distinctly', () => {
		const unknown = render(Erc7730MetadataSources, { props: { sources: null } }).body
		const absent = render(Erc7730MetadataSources, { props: { sources: [] } }).body
		const known = render(Erc7730MetadataSources, { props: { sources } }).body

		expect(unknown).toContain('The metadata sources have not been confirmed.')
		expect(absent).toContain('confirmed not to use an ERC-7730 metadata source')

		for (const source of sources) {
			expect(known).toContain(source.name)
			expect(known).toContain('https://example.org/')
		}
		expect(known).toContain('href="https://example.org/registry"')
		expect(known).toContain('href="https://example.org/descriptors"')
		expect(known).toContain('href="https://example.org/wallet-integration"')
		expect(known).toContain('Not confirmed.')
	})

	it('preserves unknown, absent and multiple sources for each variant', () => {
		const features = structuredClone(unratedTemplate.features)
		const variants = {
			[Variant.BROWSER]: true,
			[Variant.MOBILE]: true,
			[Variant.DESKTOP]: true,
		} as const

		features.security.erc7730MetadataSources = {
			[Variant.BROWSER]: sources,
			[Variant.MOBILE]: [],
			[Variant.DESKTOP]: null,
		}

		expect(
			resolveFeatures(features, variants, Variant.BROWSER).security.erc7730MetadataSources,
		).toEqual(sources)
		expect(
			resolveFeatures(features, variants, Variant.MOBILE).security.erc7730MetadataSources,
		).toEqual([])
		expect(
			resolveFeatures(features, variants, Variant.DESKTOP).security.erc7730MetadataSources,
		).toBeNull()
	})

	it('does not infer sources from decoding support or change EIP support and ratings', () => {
		for (const wallet of Object.values(allRatedWallets)) {
			const tree = attributeTreeForWallet(wallet)

			for (const resolved of Object.values(wallet.variants)) {
				if (resolved === undefined) {
					continue
				}

				const features = structuredClone(resolved.features)

				features.security.erc7730MetadataSources = sources
				expect(walletEipSupport(features)).toEqual(walletEipSupport(resolved.features))
				const evaluations = evaluateAttributes(tree, features, wallet.metadata)

				mapAttributesGetter(evaluations, getter => {
					expect(getter(evaluations)?.evaluation.outcome).toEqual(
						getter(resolved.attributes)?.evaluation.outcome,
					)
				})
			}
		}
	})

	it('includes source URLs and evidence in software and hardware exports', () => {
		function expectExports<A extends string>(wallet: RatedWallet<A>, tree: AttributeTree<A>): void {
			const copy = { ...wallet, variants: { ...wallet.variants } }

			for (const [variant, resolved] of nonEmptyEntries<Variant, ResolvedWallet<A>>(
				copy.variants,
			)) {
				copy.variants[variant] = {
					...resolved,
					features: {
						...resolved.features,
						security: { ...resolved.features.security, erc7730MetadataSources: sources },
					},
				}
			}

			const markdown = walletPageMarkdown(tree, copy, 'https://walletbeat.test')
			const json = JSON.stringify(ratedWalletJsonExport(tree, copy))

			for (const source of sources) {
				expect(markdown).toContain(source.name)
				expect(json).toContain(source.name)
				expect(markdown).toContain(source.ref)

				if (source.endpoint !== null) {
					expect(markdown).toContain(source.endpoint)
				}
			}
			expect(markdown).toContain('Endpoint: Not confirmed.')
		}
		expectExports(unratedSoftwareWallet, softwareWalletAttributeTree)
		expectExports(unratedHardwareWallet, hardwareWalletAttributeTree)
	})

	it('initializes unresearched software and hardware sources to unknown', () => {
		for (const [features, variants, variant] of [
			[unratedTemplate.features, unratedTemplate.variants, Variant.BROWSER],
			[unratedHardwareTemplate.features, unratedHardwareTemplate.variants, Variant.HARDWARE],
		] as const) {
			expect(
				resolveFeatures(features, variants, variant).security.erc7730MetadataSources,
			).toBeNull()
		}
	})
})
