<script lang="ts">
	import type { WalletSecurityNews } from '@/types/content/news'
	import type { SecurityAuditsMetadata } from '@/schema/attributes/security/security-audits-bounties'
	import { ambire } from '@/data/software-wallets/ambire'
	import SecurityNews from '@/views/SecurityNews.svelte'
	import SecurityAuditsDetails from '@/views/attributes/security/SecurityAuditsDetails.svelte'

	const { parentHeadingLevel, news, audits }: {
		parentHeadingLevel: 1 | 2 | 3 | 4
		news: WalletSecurityNews[]
		audits: SecurityAuditsMetadata
	} = $props()
</script>

<section id="news-composition">
	{#snippet heading(_id: string, title: string)}
		<svelte:element this={`h${parentHeadingLevel}`}>{title}</svelte:element>
	{/snippet}
	<SecurityNews {news} {heading} {parentHeadingLevel} />
</section>

<section id="audit-composition">
	<svelte:element this={`h${parentHeadingLevel}`}>Security audits</svelte:element>
	<SecurityAuditsDetails references={[]} wallet={ambire} metadata={audits} {parentHeadingLevel} />
</section>
