import { Typography } from '@mui/material'
import type React from 'react'

import { subsectionWeight } from '@/components/constants'
import { Rating, ratingToIcon } from '@/schema/attributes'
import {
	PrivateTransfersPrivacyLevel,
	worstPrivateTransfersPrivacyLevel,
} from '@/schema/attributes/privacy/private-transfers'
import {
	PrivateTransferTechnology,
	isPrivateTransferTechnology,
} from '@/schema/features/privacy/transaction-privacy'
import type { PrivateTransfersDetailsProps } from '@/types/content/private-transfers-details'
import { assertNonEmptyArray } from '@/types/utils/non-empty'
import { commaListFormat } from '@/types/utils/text'
import { RenderTypographicContent } from '@/ui/atoms/RenderTypographicContent'

import { WrapRatingIcon } from '../../../atoms/WrapRatingIcon'
import { StyledListItem } from '../AttributeMethodology'

function privateTransferTechnologyName(tech: PrivateTransferTechnology): string {
	switch (tech) {
		case PrivateTransferTechnology.STEALTH_ADDRESSES:
			return 'stealth addresses'
	}
}

function privateTransferLevelToIcon(level: PrivateTransfersPrivacyLevel): string {
	switch (level) {
		case PrivateTransfersPrivacyLevel.NOT_PRIVATE:
			return ratingToIcon(Rating.FAIL)
		case PrivateTransfersPrivacyLevel.CHAIN_DATA_PRIVATE:
			return ratingToIcon(Rating.PARTIAL)
		case PrivateTransfersPrivacyLevel.FULLY_PRIVATE:
			return ratingToIcon(Rating.PASS)
	}
}

export function PrivateTransfersDetails({
	wallet,
	value,
	privateTransferDetails,
}: PrivateTransfersDetailsProps): React.JSX.Element {
	if (value.perTechnology.size === 0) {
		throw new Error(
			'This component should only be used when wallets support at least one form of private transfers',
		)
	}

	const worstLevel = worstPrivateTransfersPrivacyLevel(
		assertNonEmptyArray(
			Array.from(value.perTechnology.values()).map(levels =>
				worstPrivateTransfersPrivacyLevel([
					levels.sendingPrivacy,
					levels.receivingPrivacy,
					levels.spendingPrivacy,
				]),
			),
		),
	)

	return (
		<>
			<WrapRatingIcon rating={value.rating}>
				<Typography fontWeight={subsectionWeight}>
					<strong>{wallet.metadata.displayName}</strong> supports{' '}
					<strong>
						{commaListFormat(
							Array.from(value.perTechnology.keys()).map(privateTransferTechnologyName),
						)}
					</strong>{' '}
					for private token transfers.
					{value.defaultFungibleTokenTransferMode === 'PUBLIC' &&
						' However, the default option for token transfers is public by default. Users must be careful to select private token transfers in order to transact privately.'}
					{value.defaultFungibleTokenTransferMode === 'EXPLICIT_CHOICE' &&
						' Users must explicitly select private token transfers in order to transact privately.'}
					{isPrivateTransferTechnology(value.defaultFungibleTokenTransferMode) &&
						value.perTechnology.size === 1 &&
						' Token transfers are private by default.'}
					{isPrivateTransferTechnology(value.defaultFungibleTokenTransferMode) &&
						value.perTechnology.size > 1 &&
						` Token transfers use ${privateTransferTechnologyName(value.defaultFungibleTokenTransferMode)} by default.`}
					{worstLevel !== PrivateTransfersPrivacyLevel.FULLY_PRIVATE && (
						<>
							{' '}
							However, <strong>there are important limitations in its implementation.</strong>
						</>
					)}
				</Typography>
				<ul
					style={{
						marginBottom: '0px',
						fontWeight: subsectionWeight,
						listStyleType: value.perTechnology.size > 2 ? 'disc' : 'none',
					}}
				>
					{Array.from(value.perTechnology.entries()).map(([tech, levels]) => {
						const details = privateTransferDetails.get(tech)

						if (details === undefined) {
							throw new Error(`Wallet implements ${tech} but rating details do not contain it`)
						}

						return (
							<li key={tech} style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
								<em>
									How private is {wallet.metadata.displayName}&apos;s{' '}
									<strong>{privateTransferTechnologyName(tech)}</strong> implementation?
								</em>
								<ul style={{ marginLeft: '1.5rem', marginTop: '0.25rem' }}>
									<StyledListItem
										isFirstItem={true}
										bulletText={privateTransferLevelToIcon(levels.sendingPrivacy)}
										bulletFontSize="60%"
										spaceBetweenItems="0.5rem"
									>
										<strong>Sending tokens privately</strong>:{' '}
										<RenderTypographicContent content={details.sendingDetails} />
									</StyledListItem>
									<StyledListItem
										isFirstItem={false}
										bulletText={privateTransferLevelToIcon(levels.receivingPrivacy)}
										bulletFontSize="60%"
										spaceBetweenItems="0.5rem"
									>
										<strong>Receiving tokens privately</strong>:{' '}
										<RenderTypographicContent content={details.receivingDetails} />
									</StyledListItem>
									<StyledListItem
										isFirstItem={false}
										bulletText={privateTransferLevelToIcon(levels.spendingPrivacy)}
										bulletFontSize="60%"
										spaceBetweenItems="0.5rem"
									>
										<strong>Spending privately-received tokens</strong>:{' '}
										<RenderTypographicContent content={details.spendingDetails} />
									</StyledListItem>
								</ul>
							</li>
						)
					})}
				</ul>
			</WrapRatingIcon>
		</>
	)
}
