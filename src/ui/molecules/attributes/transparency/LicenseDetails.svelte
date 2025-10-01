<script lang="ts">
	// Types/constants
	import type { OpenSourceValue } from '@/schema/attributes/transparency/open-source'
	import type { RatedWallet } from '@/schema/wallet'
	import { License, FOSS, licenseIsFOSS, licenseName, licenseUrl } from '@/schema/features/transparency/license'
	import { ContentType } from '@/types/content'


	// Props
	let {
		wallet,
		value,
	}: {
		wallet: RatedWallet
		value: OpenSourceValue
	} = $props()


	// Components
	import Typography from '@/ui/atoms/Typography.svelte'
</script>


<Typography
	content={{
		contentType: ContentType.MARKDOWN,
		markdown: (
			value.license === License.PROPRIETARY ?
				`**{{WALLET_NAME}}** is licensed under a proprietary non-open-source license.`
			: value.license === License.PROPRIETARY_SOURCE_AVAILABLE ?
				`**{{WALLET_NAME}}** is licensed under a proprietary source-available non-FOSS license.`
			: value.license === License.UNLICENSED_VISIBLE ?
				`**{{WALLET_NAME}}** has no visible license information. Consequently, it should be assumed to be proprietary (not open-source).`
			:
				(() => {
					const url = licenseUrl(value.license)
					const fossText = (() => {
						switch (licenseIsFOSS(value.license)) {
							case FOSS.FOSS:
								return 'a Free and Open-Source (FOSS) license.'
							case FOSS.FUTURE_FOSS:
								return 'a non-open-source (non-FOSS) license. However, its license stipulates that it must transition to a Free and Open-Source (FOSS) license in the future.'
							case FOSS.NOT_FOSS:
								return 'a non-open-source (non-FOSS) license.'
							default:
								return 'an unknown license type.'
						}
					})()
					return (
						url === null ?
							`Invalid license: **${value.license}**`
						:
							`**{{WALLET_NAME}}** is licensed under the **${licenseName(value.license)}** license, ${fossText}`
					)
				})()
		)
	}}
	strings={{ WALLET_NAME: wallet.metadata.displayName }}
/>

{#if value.license !== License.PROPRIETARY && value.license !== License.UNLICENSED_VISIBLE}
	{@const url = licenseUrl(value.license)}
	{#if url !== null}
		<a href={url.url} target="_blank" rel="noopener noreferrer" class="license-link">
			View License
		</a>
	{/if}
{/if}


<style>
	.license-link {
		margin-top: 0.5rem;
		display: inline-block;
	}
</style> 