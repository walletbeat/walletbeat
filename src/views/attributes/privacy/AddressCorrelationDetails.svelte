<script lang="ts">
	// Types/constants
	import type { AddressCorrelationValue, WalletAddressLinkableBy } from '@/schema/attributes/privacy/address-correlation'
	import type { FullyQualifiedReference } from '@/schema/reference'
	import type { RatedWallet } from '@/schema/wallet'
	import { ContentType } from '@/types/content'
	import type { NonEmptyArray } from '@/types/utils/non-empty'

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
	// eslint-disable-next-line svelte/no-unused-props -- Consistent prop types for all content components.
	const {
		wallet,
		linkables,
	}: {
		wallet: RatedWallet
		value: AddressCorrelationValue
		linkables?: NonEmptyArray<WalletAddressLinkableBy> | undefined
	} = $props()


	// Functions
	import { compareUserInfo, userInfoName } from '@/schema/features/privacy/data-collection'
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
	import Typography from '@/components/Typography.svelte'
</script>


{#if !linkables}
	<Typography
		content={{
			contentType: ContentType.MARKDOWN,
			markdown: 'By default, **{{WALLET_NAME}}** allows your wallet address to be correlated with your personal information:'
		}}
		strings={{
			WALLET_NAME: wallet.metadata.displayName,
			WALLET_PSEUDONYM_SINGULAR: wallet.metadata.pseudonymType?.singular ?? null,
			WALLET_PSEUDONYM_PLURAL: wallet.metadata.pseudonymType?.plural ?? null,
		}}
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
				compareUserInfo(linkableA.info, linkableB.info)
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
			let linkableInfos: LeakInfo[] = linkables.map(linkable => ({
				key: linkable.info,
				value: userInfoName(linkable.info).long
			}))

			linkableInfos = linkableInfos.filter((info, index) => linkableInfos.slice(index+1).every(otherInfo => otherInfo.key != info.key))
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
		:
			(() => {
				const privacyPolicyText = (
					isUrl(leak.entity.privacyPolicy) ?
						` ([Privacy policy](${typeof leak.entity.privacyPolicy === 'string' ? leak.entity.privacyPolicy : leak.entity.privacyPolicy.url}))`
					:
						''
				)

				return `- **${leak.entity.name}**${privacyPolicyText} may link your wallet address to your **${joinedListText(leak.linkableInfos)}**.`
			})()
	)).join('\n')}

	<Typography
		content={{
			contentType: ContentType.MARKDOWN,
			markdown: `By default, **{{WALLET_NAME}}** allows your wallet address to be correlated with your personal information:

${leaksText}`
		}}
		strings={{
			WALLET_NAME: wallet.metadata.displayName,
			WALLET_PSEUDONYM_SINGULAR: wallet.metadata.pseudonymType?.singular ?? null,
			WALLET_PSEUDONYM_PLURAL: wallet.metadata.pseudonymType?.plural ?? null,
		}}
	/>
{/if}
