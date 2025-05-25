<script lang="ts">
	// Types/constants
	import type { AddressCorrelationValue } from '@/schema/attributes/privacy/address-correlation'
	import type { WalletAddressLinkableBy } from '@/schema/attributes/privacy/address-correlation'
	import type { FullyQualifiedReference } from '@/schema/reference'
	import type { RatedWallet } from '@/schema/wallet'
	import type { NonEmptyArray } from '@/types/utils/non-empty'
	import { ContentType } from '@/types/content'

	type LeakInfo = {
		key: string
		value: string
	}

	type LeaksListItem = {
		sourceName: string
		linkables: NonEmptyArray<WalletAddressLinkableBy>
		linkableInfos: LeakInfo[]
		refs: FullyQualifiedReference[]
		entity: WalletAddressLinkableBy['by']
	}

	// Props
	let {
		wallet,
		value,
		linkables,
	}: {
		wallet: RatedWallet
		value: AddressCorrelationValue
		linkables?: NonEmptyArray<WalletAddressLinkableBy> | undefined
	} = $props()

	// Functions
	import { compareLeakedInfo, leakedInfoName } from '@/schema/features/privacy/data-collection'
	import { mergeRefs } from '@/schema/reference'
	import { isUrl } from '@/schema/url'
	import { nonEmptyGet, nonEmptySorted } from '@/types/utils/non-empty'

	const joinedListText = (
		items: LeakInfo[],
		separator = ', ',
		lastSeparator = ' and ',
	): string => (
		items
			.map((item, index) => (
				item.value + (
					index === items.length - 2 ?
						lastSeparator 
					: index !== items.length - 1 ?
						separator 
					:
						''
				)
			))
			.join('')
	)

	// Components
	import Typography from '@/ui/atoms/Typography.svelte'
</script>

{#if !linkables}
	<Typography 
		content={{
			contentType: ContentType.MARKDOWN,
			markdown: 'By default, **{{WALLET_NAME}}** allows your wallet address to be correlated with your personal information:'
		}}
		strings={{ WALLET_NAME: wallet.metadata.displayName }}
	/>
{:else}
	{@const sortedLinkables = nonEmptySorted(
		linkables,
		(linkableA: WalletAddressLinkableBy, linkableB: WalletAddressLinkableBy) => (
			linkableA.by === 'onchain' ?
				1
			: linkableB.by === 'onchain' ?
				-1
			:
				compareLeakedInfo(linkableA.info, linkableB.info)
		),
		true,
	)}
	
	{@const bySource = (() => {
		const map = new Map<string, NonEmptyArray<WalletAddressLinkableBy>>()
		
		for (const linkable of sortedLinkables) {
			const sourceName = typeof linkable.by === 'string' ? linkable.by : linkable.by.name
			const forSource = map.get(sourceName)
			if (forSource === undefined) {
				map.set(sourceName, [linkable] as NonEmptyArray<WalletAddressLinkableBy>)
			} else {
				forSource.push(linkable)
			}
		}
		
		return map
	})()}
	
	{@const leaksList = (() => {
		const list: LeaksListItem[] = []
		
		bySource.forEach((linkables, sourceName) => {
			const linkableInfos: LeakInfo[] = linkables.map(linkable => ({
				key: linkable.info,
				value: leakedInfoName(linkable.info).long
			}))
			const refs = mergeRefs(...linkables.flatMap(linkable => linkable.refs))
			const entity = nonEmptyGet(linkables).by
			
			list.push({
				sourceName,
				linkables,
				linkableInfos,
				refs,
				entity
			})
		})
		
		return list
	})()}
	
	{@const leaksText = leaksList.map(leak => (
		leak.entity === 'onchain' ?
			`- An onchain record permanently associates your **${joinedListText(leak.linkableInfos)}** with your wallet address.`
		: typeof leak.entity !== 'string' ?
			(() => {
				const privacyPolicyText = (
					isUrl(leak.entity.privacyPolicy) ?
						` ([Privacy policy](${typeof leak.entity.privacyPolicy === 'string' ? leak.entity.privacyPolicy : leak.entity.privacyPolicy.url}))`
					:
						''
				)
				return `- **${leak.entity.name}**${privacyPolicyText} may link your wallet address to your **${joinedListText(leak.linkableInfos)}**.`
			})()
		:
			`- **${leak.entity}** may link your wallet address to your **${joinedListText(leak.linkableInfos)}**.`
	)).join('\n')}
	
	<Typography 
		content={{
			contentType: ContentType.MARKDOWN,
			markdown: `By default, **{{WALLET_NAME}}** allows your wallet address to be correlated with your personal information:

${leaksText}`
		}}
		strings={{ WALLET_NAME: wallet.metadata.displayName }}
	/>
{/if} 