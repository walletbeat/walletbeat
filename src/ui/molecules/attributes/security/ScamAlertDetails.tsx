import { Box, Typography } from '@mui/material'
import type React from 'react'
import { subsectionWeight } from '@/components/constants'
import { WrapRatingIcon } from '../../../atoms/WrapRatingIcon'
import { ReferenceLinks } from '@/components/ui/atoms/ReferenceLinks'
import type { ScamAlertDetailsProps } from '@/types/content/scam-alert-details'
import { RenderTypographicContent } from '@/components/ui/atoms/RenderTypographicContent'
import { isSupported } from '@/schema/features/support'
import { commaListFormat, trimWhitespacePrefix } from '@/types/utils/text'

function listOrSingleText(prefix: string, items: Array<string | null>): React.ReactNode {
	const filtered = items.filter(item => item !== null)
	if (filtered.length === 1) {
		const stripped = trimWhitespacePrefix(filtered[0]).trim()
		return (
			<Typography variant="body1">
				{prefix} {stripped[0].toLocaleLowerCase() + stripped.slice(1)}.
			</Typography>
		)
	}
	return (
		<>
			<Typography variant="body1">{prefix}:</Typography>
			<ul>
				{filtered.map(item => {
					const stripped = trimWhitespacePrefix(item).trim()
					return (
						<li key={stripped}>
							<Typography variant="body1">
								{stripped[0].toUpperCase() + stripped.slice(1)}.
							</Typography>
						</li>
					)
				})}
			</ul>
		</>
	)
}

export function ScamAlertDetails({ wallet, value }: ScamAlertDetailsProps): React.JSX.Element {
	if (value.scamAlerts === null) {
		throw new Error('Cannot render ScamAlertDetails for undefined data')
	}
	const scamUrlLeaks: string[] = isSupported(value.scamAlerts.scamUrlWarning)
		? [
				value.scamAlerts.scamUrlWarning.leaksIp ? 'your IP' : null,
				value.scamAlerts.scamUrlWarning.leaksUserAddress ? 'your Ethereum address' : null,
				((): string | null => {
					switch (value.scamAlerts.scamUrlWarning.leaksVisitedUrl) {
						case 'FULL_URL':
							return 'the full URL of the app'
						case 'DOMAIN_ONLY':
							return 'the domain name of the app'
						case 'PARTIAL_HASH_OF_DOMAIN':
							return null
						case 'NO':
							return null
					}
				})(),
			].filter(val => val !== null)
		: []
	return (
		<>
			<WrapRatingIcon rating={value.rating}>
				<Typography fontWeight={subsectionWeight}>
					<RenderTypographicContent content={value.shortExplanation.render(wallet.metadata)} />
				</Typography>
			</WrapRatingIcon>
			<Box>
				<ul>
					{value.sendTransactionWarning.required && (
						<li>
							{isSupported(value.scamAlerts.sendTransactionWarning) ? (
								<>
									{listOrSingleText(
										`${wallet.metadata.displayName} helps you stay safe when sending funds by`,
										[
											value.scamAlerts.sendTransactionWarning.newRecipientWarning
												? `
													warning you when sending funds to an address you have
													not sent or received funds from in the past
												`
												: null,
											value.scamAlerts.sendTransactionWarning.userWhitelist
												? `
													Allowing you to build a contact book of addresses and
													warning you when sending funds to addresses not in it
												`
												: null,
										],
									)}
									{!value.sendTransactionWarning.privacyPreserving && (
										<Typography variant="body1">
											However, in doing so, it leaks{' '}
											{commaListFormat([
												value.scamAlerts.sendTransactionWarning.leaksUserIp ? 'your IP' : null,
												value.scamAlerts.sendTransactionWarning.leaksUserAddress
													? 'your Ethereum address'
													: null,
												value.scamAlerts.sendTransactionWarning.leaksRecipient
													? "the recipient's Ethereum address"
													: null,
											])}{' '}
											to a third party which can correlate them.
										</Typography>
									)}
									<ReferenceLinks
										nonEmptyPrefix={
											<Typography variant="body1" sx={{ display: 'inline' }}>
												References:
											</Typography>
										}
										ref={value.scamAlerts.sendTransactionWarning.ref}
									/>
								</>
							) : (
								<Typography variant="body1">
									{wallet.metadata.displayName} does not warn you when sending funds to suspicious
									addresses.
								</Typography>
							)}
						</li>
					)}
					{value.contractTransactionWarning.required && (
						<li>
							{isSupported(value.scamAlerts.contractTransactionWarning) ? (
								<>
									{listOrSingleText(
										`${wallet.metadata.displayName} helps you stay safe when doing onchain transactions by`,
										[
											value.scamAlerts.contractTransactionWarning.contractRegistry
												? `
													Checking the contract or transaction data against a database of known scams
												`
												: null,
											value.scamAlerts.contractTransactionWarning.previousContractInteractionWarning
												? `
													Warning you when interacting with a contract you have not interacted with
													before
												`
												: null,
											value.scamAlerts.contractTransactionWarning.recentContractWarning
												? `
													Warning you when interacting with a contract that has only recently been
													created onchain
												`
												: null,
										],
									)}
									{!value.contractTransactionWarning.privacyPreserving && (
										<Typography variant="body1">
											However, in doing so, it leaks{' '}
											{commaListFormat([
												value.scamAlerts.contractTransactionWarning.leaksUserIp ? 'your IP' : null,
												value.scamAlerts.contractTransactionWarning.leaksUserAddress
													? 'your Ethereum address'
													: null,
												value.scamAlerts.contractTransactionWarning.leaksContractAddress
													? 'the contract address'
													: null,
											])}{' '}
											to a third party which can correlate them ahead of the transaction being
											submitted.
										</Typography>
									)}
									<ReferenceLinks
										nonEmptyPrefix={
											<Typography variant="body1" sx={{ display: 'inline' }}>
												References:
											</Typography>
										}
										ref={value.scamAlerts.contractTransactionWarning.ref}
									/>
								</>
							) : (
								<Typography variant="body1">
									{wallet.metadata.displayName} does not warn you when making arbitrary onchain
									transactions.
								</Typography>
							)}
						</li>
					)}
					{value.scamUrlWarning.required && (
						<li>
							{isSupported(value.scamAlerts.scamUrlWarning) ? (
								<>
									<Typography variant="body1">
										{wallet.metadata.displayName} helps you stay safe when connecting to onchain
										apps by checking its URL against a set of known scam apps.
										{!value.scamUrlWarning.privacyPreserving && (
											<>
												{' '}
												However, in doing so, it leaks {commaListFormat(scamUrlLeaks)} to a third
												party{scamUrlLeaks.length > 1 && ' which can correlate them'}.
											</>
										)}
									</Typography>
									<ReferenceLinks
										nonEmptyPrefix={
											<Typography variant="body1" sx={{ display: 'inline' }}>
												References:
											</Typography>
										}
										ref={value.scamAlerts.scamUrlWarning.ref}
									/>
								</>
							) : (
								<Typography variant="body1">
									{wallet.metadata.displayName} does not warn you when making arbitrary onchain
									transactions.
								</Typography>
							)}
						</li>
					)}
				</ul>
			</Box>
		</>
	)
}
