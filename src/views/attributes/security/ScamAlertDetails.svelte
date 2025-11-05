<script lang="ts">
	// Types/constants
	import type { ScamPreventionValue } from '@/schema/attributes/security/scam-prevention'
	import { isSupported } from '@/schema/features/support'
	import { toFullyQualified } from '@/schema/reference'
	import type { RatedWallet } from '@/schema/wallet'
	import { ContentType } from '@/types/content'
	import { commaListFormat } from '@/types/utils/text'

	// Props
	const {
		wallet,
		value,
	}: {
		wallet: RatedWallet
		value: ScamPreventionValue
	} = $props()

	// Components
	import Typography from '@/components/Typography.svelte'
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'
</script>

<Typography
	content={value.shortExplanation}
	strings={{
		WALLET_NAME: wallet.metadata.displayName,
		WALLET_PSEUDONYM_SINGULAR: wallet.metadata.pseudonymType?.singular ?? null,
		WALLET_PSEUDONYM_PLURAL: wallet.metadata.pseudonymType?.plural ?? null,
	}}
/>

{#if value.scamAlerts}
	{@const scamUrlLeaks =
		!value.scamAlerts || !isSupported(value.scamAlerts.scamUrlWarning)
			? []
			: ([
					value.scamAlerts.scamUrlWarning.leaksIp && 'your IP',
					value.scamAlerts.scamUrlWarning.leaksUserAddress && 'your Ethereum address',
					value.scamAlerts.scamUrlWarning.leaksVisitedUrl === 'FULL_URL' &&
						'the full URL of the app',
					value.scamAlerts.scamUrlWarning.leaksVisitedUrl === 'DOMAIN_ONLY' &&
						'the domain name of the app',
				].filter(s => s !== ''))}

	<ul class="features-list">
		{#if value.sendTransactionWarning?.required}
			<li>
				<Typography
					content={{
						contentType: ContentType.MARKDOWN,
						markdown: isSupported(value.scamAlerts.sendTransactionWarning)
							? `**{{WALLET_NAME}}** helps you stay safe when sending funds by ${
									value.scamAlerts.sendTransactionWarning.newRecipientWarning &&
									value.scamAlerts.sendTransactionWarning.userWhitelist
										? 'warning you when sending funds to an address you have not sent or received funds from in the past, and allowing you to build a contact book of addresses and warning you when sending funds to addresses not in it.'
										: value.scamAlerts.sendTransactionWarning.newRecipientWarning
											? 'warning you when sending funds to an address you have not sent or received funds from in the past.'
											: value.scamAlerts.sendTransactionWarning.userWhitelist
												? 'allowing you to build a contact book of addresses and warning you when sending funds to addresses not in it.'
												: 'providing transaction warnings.'
								}${
									!value.sendTransactionWarning.privacyPreserving
										? ` However, in doing so, it leaks ${commaListFormat(
												[
													value.scamAlerts.sendTransactionWarning.leaksUserIp && 'your IP',
													value.scamAlerts.sendTransactionWarning.leaksUserAddress &&
														'your Ethereum address',
													value.scamAlerts.sendTransactionWarning.leaksRecipient &&
														"the recipient's Ethereum address",
												].filter(s => s !== ''),
											)} to an external provider which can correlate them.`
										: ''
								}`
							: '**{{WALLET_NAME}}** does not warn you when sending funds to suspicious addresses.',
					}}
					strings={{ WALLET_NAME: wallet.metadata.displayName }}
				/>

				{#if isSupported(value.scamAlerts.sendTransactionWarning) && value.scamAlerts.sendTransactionWarning.ref}
					<hr />

					<ReferenceLinks
						references={toFullyQualified(value.scamAlerts.sendTransactionWarning.ref)}
					/>
				{/if}
			</li>
		{/if}

		{#if value.contractTransactionWarning?.required}
			{@const contractFeatures = isSupported(value.scamAlerts.contractTransactionWarning)
				? [
						value.scamAlerts.contractTransactionWarning.contractRegistry,
						value.scamAlerts.contractTransactionWarning.previousContractInteractionWarning,
						value.scamAlerts.contractTransactionWarning.recentContractWarning,
					].filter(Boolean)
				: []}

			<li>
				<Typography
					content={{
						contentType: ContentType.MARKDOWN,
						markdown: isSupported(value.scamAlerts.contractTransactionWarning)
							? `**{{WALLET_NAME}}** helps you stay safe when doing onchain transactions by ${
									contractFeatures.length > 1
										? `:${[
												value.scamAlerts.contractTransactionWarning.contractRegistry &&
													'Checking the contract or transaction data against a database of known scams',
												value.scamAlerts.contractTransactionWarning
													.previousContractInteractionWarning &&
													'Warning you when interacting with a contract you have not interacted with before',
												value.scamAlerts.contractTransactionWarning.recentContractWarning &&
													'Warning you when interacting with a contract that has only recently been created onchain',
											]
												.filter(s => s !== '')
												.map(listItem => `\n* ${listItem}`)
												.join('')}`
										: value.scamAlerts.contractTransactionWarning.contractRegistry
											? 'checking the contract or transaction data against a database of known scams.'
											: value.scamAlerts.contractTransactionWarning
														.previousContractInteractionWarning
												? 'warning you when interacting with a contract you have not interacted with before.'
												: value.scamAlerts.contractTransactionWarning.recentContractWarning
													? 'warning you when interacting with a contract that has only recently been created onchain.'
													: 'providing contract warnings.'
								}${
									!value.contractTransactionWarning.privacyPreserving
										? ` However, in doing so, it leaks ${commaListFormat(
												[
													value.scamAlerts.contractTransactionWarning.leaksUserIp && 'your IP',
													value.scamAlerts.contractTransactionWarning.leaksUserAddress &&
														'your Ethereum address',
													value.scamAlerts.contractTransactionWarning.leaksContractAddress &&
														'the contract address',
												].filter(s => s !== ''),
											)} to an external provider which can correlate them ahead of the transaction being submitted.`
										: ''
								}`
							: '**{{WALLET_NAME}}** does not warn you when making arbitrary onchain transactions.',
					}}
					strings={{ WALLET_NAME: wallet.metadata.displayName }}
				/>

				{#if isSupported(value.scamAlerts.contractTransactionWarning) && value.scamAlerts.contractTransactionWarning.ref}
					<hr />

					<ReferenceLinks
						references={toFullyQualified(value.scamAlerts.contractTransactionWarning.ref)}
					/>
				{/if}
			</li>
		{/if}

		{#if value.scamUrlWarning?.required}
			<li>
				<Typography
					content={{
						contentType: ContentType.MARKDOWN,
						markdown: isSupported(value.scamAlerts.scamUrlWarning)
							? `**{{WALLET_NAME}}** helps you stay safe when connecting to onchain apps by checking its URL against a set of known scam apps.${
									!value.scamUrlWarning.privacyPreserving && scamUrlLeaks.length > 0
										? ` However, in doing so, it leaks ${commaListFormat(scamUrlLeaks)} to an external provider${
												scamUrlLeaks.length > 1 ? ' which can correlate them' : ''
											}.`
										: ''
								}`
							: '**{{WALLET_NAME}}** does not check URLs against known scam sites.',
					}}
					strings={{ WALLET_NAME: wallet.metadata.displayName }}
				/>

				{#if isSupported(value.scamAlerts.scamUrlWarning) && value.scamAlerts.scamUrlWarning.ref}
					<hr />

					<ReferenceLinks references={toFullyQualified(value.scamAlerts.scamUrlWarning.ref)} />
				{/if}
			</li>
		{/if}
	</ul>
{/if}

<style>
	.features-list {
		margin: 0.5rem 0 0 0;
		padding-left: 1.5rem;
		> li + li {
			margin-top: 1rem;
		}

		> li {
			> :global(* + *) {
				margin-top: 0.5rem;
			}
		}
	}
</style>
