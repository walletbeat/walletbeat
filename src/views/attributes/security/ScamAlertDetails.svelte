<script lang="ts">
	// Types/constants
	import type {
		ScamPreventionMetadata,
	} from '@/schema/attributes/security/scam-prevention'
	import type { Outcome } from '@/schema/attributes'
	import { isSupported } from '@/schema/features/support'
	import { toFullyQualified } from '@/schema/reference'
	import type { RatedWallet } from '@/schema/wallet'
	import { ContentType } from '@/types/content'
	import { commaListFormat } from '@/types/utils/text'
	import { getWalletEvalStrings } from '@/utils/evaluation-content'

	// Props
	const {
		wallet,
		outcome,
	}: {
		wallet: RatedWallet
		outcome: Outcome<ScamPreventionMetadata>
	} = $props()

	// Components
	import Typography from '@/components/Typography.svelte'
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'
</script>


<Typography
	content={outcome.shortExplanation}
	strings={getWalletEvalStrings(wallet)}
/>

{#if outcome.metadata?.scamAlerts}
	{@const scamUrlLeaks =
		!outcome.metadata.scamAlerts || !isSupported(outcome.metadata.scamAlerts.scamUrlWarning)
			? []
			: ([
					outcome.metadata.scamAlerts.scamUrlWarning.leaksIp && 'your IP',
					outcome.metadata.scamAlerts.scamUrlWarning.leaksUserAddress && 'your Ethereum address',
					outcome.metadata.scamAlerts.scamUrlWarning.leaksVisitedUrl === 'FULL_URL' &&
						'the full URL of the app',
					outcome.metadata.scamAlerts.scamUrlWarning.leaksVisitedUrl === 'DOMAIN_ONLY' &&
						'the domain name of the app',
				].filter(s => s !== ''))}

	<ul data-list="gap-4">
		{#if outcome.metadata.sendTransactionWarning?.required}
			<li data-list-item="gap-2">
				<Typography
					content={{
						contentType: ContentType.MARKDOWN,
						markdown: isSupported(outcome.metadata.scamAlerts.sendTransactionWarning)
							? `**{{WALLET_NAME}}** helps you stay safe when sending funds by ${
									outcome.metadata.scamAlerts.sendTransactionWarning.newRecipientWarning &&
									outcome.metadata.scamAlerts.sendTransactionWarning.userWhitelist
										? 'warning you when sending funds to an address you have not sent or received funds from in the past, and allowing you to build a contact book of addresses and warning you when sending funds to addresses not in it.'
										: outcome.metadata.scamAlerts.sendTransactionWarning.newRecipientWarning
											? 'warning you when sending funds to an address you have not sent or received funds from in the past.'
											: outcome.metadata.scamAlerts.sendTransactionWarning.userWhitelist
												? 'allowing you to build a contact book of addresses and warning you when sending funds to addresses not in it.'
												: 'providing transaction warnings.'
								}${
									!outcome.metadata.sendTransactionWarning.privacyPreserving
										? ` However, in doing so, it leaks ${commaListFormat(
												[
													outcome.metadata.scamAlerts.sendTransactionWarning.leaksUserIp && 'your IP',
													outcome.metadata.scamAlerts.sendTransactionWarning.leaksUserAddress &&
														'your Ethereum address',
													outcome.metadata.scamAlerts.sendTransactionWarning.leaksRecipient &&
														"the recipient's Ethereum address",
												].filter(s => s !== ''),
											)} to an external provider which can correlate them.`
										: ''
								}`
							: '**{{WALLET_NAME}}** does not warn you when sending funds to suspicious addresses.',
					}}
					strings={getWalletEvalStrings(wallet)}
				/>

				{#if isSupported(outcome.metadata.scamAlerts.sendTransactionWarning) && outcome.metadata.scamAlerts.sendTransactionWarning.ref}
					<ReferenceLinks
						references={toFullyQualified(outcome.metadata.scamAlerts.sendTransactionWarning.ref)}
					/>
				{/if}
			</li>
		{/if}

		{#if outcome.metadata.contractTransactionWarning?.required}
			{@const contractFeatures = isSupported(outcome.metadata.scamAlerts.contractTransactionWarning)
				? [
						outcome.metadata.scamAlerts.contractTransactionWarning.contractRegistry,
						outcome.metadata.scamAlerts.contractTransactionWarning.previousContractInteractionWarning,
						outcome.metadata.scamAlerts.contractTransactionWarning.recentContractWarning,
					].filter(Boolean)
				: []}

			<li data-list-item="gap-2">
				<Typography
					content={{
						contentType: ContentType.MARKDOWN,
						markdown: isSupported(outcome.metadata.scamAlerts.contractTransactionWarning)
							? `**{{WALLET_NAME}}** helps you stay safe when doing onchain transactions by${
									contractFeatures.length > 1
										? `: ${[
												outcome.metadata.scamAlerts.contractTransactionWarning.contractRegistry &&
													'Checking the contract or transaction data against a database of known scams',
												outcome.metadata.scamAlerts.contractTransactionWarning
													.previousContractInteractionWarning &&
													'Warning you when interacting with a contract you have not interacted with before',
												outcome.metadata.scamAlerts.contractTransactionWarning.recentContractWarning &&
													'Warning you when interacting with a contract that has only recently been created onchain',
											]
												.filter(s => s)
												.map(listItem => `\n* ${listItem}`)
												.join('')}`
										: outcome.metadata.scamAlerts.contractTransactionWarning.contractRegistry
											? 'checking the contract or transaction data against a database of known scams.'
											: outcome.metadata.scamAlerts.contractTransactionWarning
														.previousContractInteractionWarning
												? 'warning you when interacting with a contract you have not interacted with before.'
												: outcome.metadata.scamAlerts.contractTransactionWarning.recentContractWarning
													? 'warning you when interacting with a contract that has only recently been created onchain.'
													: 'providing contract warnings.'
								}${
									!outcome.metadata.contractTransactionWarning.privacyPreserving
										? ` However, in doing so, it leaks ${commaListFormat(
												[
													outcome.metadata.scamAlerts.contractTransactionWarning.leaksUserIp && 'your IP',
													outcome.metadata.scamAlerts.contractTransactionWarning.leaksUserAddress &&
														'your Ethereum address',
													outcome.metadata.scamAlerts.contractTransactionWarning.leaksContractAddress &&
														'the contract address',
												].filter(s => s),
											)} to an external provider which can correlate them ahead of the transaction being submitted.`
										: ''
								}`
							: '**{{WALLET_NAME}}** does not warn you when making arbitrary onchain transactions.',
					}}
					strings={getWalletEvalStrings(wallet)}
				/>

				{#if isSupported(outcome.metadata.scamAlerts.contractTransactionWarning) && outcome.metadata.scamAlerts.contractTransactionWarning.ref}
					<ReferenceLinks
						references={toFullyQualified(outcome.metadata.scamAlerts.contractTransactionWarning.ref)}
					/>
				{/if}
			</li>
		{/if}

		{#if outcome.metadata.scamUrlWarning?.required}
			<li data-list-item="gap-2">
				<Typography
					content={{
						contentType: ContentType.MARKDOWN,
						markdown: isSupported(outcome.metadata.scamAlerts.scamUrlWarning)
							? `**{{WALLET_NAME}}** helps you stay safe when connecting to onchain apps by checking its URL against a set of known scam apps.${
									!outcome.metadata.scamUrlWarning.privacyPreserving && scamUrlLeaks.length > 0
										? ` However, in doing so, it leaks ${commaListFormat(scamUrlLeaks)} to an external provider${
												scamUrlLeaks.length > 1 ? ' which can correlate them' : ''
											}.`
										: ''
								}`
							: '**{{WALLET_NAME}}** does not check URLs against known scam sites.',
					}}
					strings={getWalletEvalStrings(wallet)}
				/>

				{#if isSupported(outcome.metadata.scamAlerts.scamUrlWarning) && outcome.metadata.scamAlerts.scamUrlWarning.ref}
					<ReferenceLinks
						references={toFullyQualified(outcome.metadata.scamAlerts.scamUrlWarning.ref)}
					/>
				{/if}
			</li>
		{/if}
	</ul>
{/if}
