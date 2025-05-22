import { Typography } from '@mui/material'
import type React from 'react'

import { subsectionWeight } from '@/components/constants'
import type { WalletAddressLinkableBy } from '@/schema/attributes/privacy/address-correlation'
import { compareLeakedInfo, leakedInfoName } from '@/schema/features/privacy/data-collection'
import { mergeRefs } from '@/schema/reference'
import { isUrl } from '@/schema/url'
import type { AddressCorrelationDetailsProps } from '@/types/content/address-correlation-details'
import { type NonEmptyArray, nonEmptyGet, nonEmptySorted } from '@/types/utils/non-empty'
import { EntityLink } from '@/ui/atoms/EntityLink'

import { ExternalLink } from '../../../atoms/ExternalLink'
import { JoinedList } from '../../../atoms/JoinedList'
import { ReferenceLinks } from '../../../atoms/ReferenceLinks'
import { WrapRatingIcon } from '../../../atoms/WrapRatingIcon'

export function AddressCorrelationDetails({
	wallet,
	value,
	linkables,
}: AddressCorrelationDetailsProps): React.JSX.Element {
	const bySource = new Map<string, NonEmptyArray<WalletAddressLinkableBy>>()
	for (const linkable of nonEmptySorted(
		linkables,
		(linkableA: WalletAddressLinkableBy, linkableB: WalletAddressLinkableBy) => {
			if (linkableA.by === 'onchain') {
				return 1
			}
			if (linkableB.by === 'onchain') {
				return -1
			}
			return compareLeakedInfo(linkableA.info, linkableB.info)
		},
		true,
	)) {
		const sourceName = typeof linkable.by === 'string' ? linkable.by : linkable.by.name
		const forSource = bySource.get(sourceName)
		if (forSource === undefined) {
			bySource.set(sourceName, [linkable])
		} else {
			forSource.push(linkable)
		}
	}
	const leaksList: React.ReactNode[] = []
	bySource.forEach((linkables, sourceName) => {
		const linkableInfos = (
			<JoinedList
				data={linkables.map(linkable => ({
					key: linkable.info,
					value: <strong>{leakedInfoName(linkable.info).long}</strong>,
				}))}
			/>
		)
		const refs = mergeRefs(...linkables.flatMap(linkable => linkable.refs))
		const entity = nonEmptyGet(linkables).by
		if (entity === 'onchain') {
			leaksList.push(
				<li key={sourceName}>
					<Typography>
						An onchain record permanently associates your {linkableInfos} with your wallet address.{' '}
						<ReferenceLinks references={refs} />
					</Typography>
				</li>,
			)
			return
		}
		leaksList.push(
			<li key={sourceName}>
				<Typography>
					<EntityLink entity={entity} />{' '}
					{isUrl(entity.privacyPolicy) ? (
						<>
							{' ('}
							<ExternalLink url={entity.privacyPolicy} defaultLabel="Privacy policy" />
							{')'}
						</>
					) : null}{' '}
					may link your wallet address to your {linkableInfos}. <ReferenceLinks references={refs} />
				</Typography>
			</li>,
		)
	})
	return (
		<>
			<WrapRatingIcon rating={value.rating}>
				<Typography fontWeight={subsectionWeight}>
					By default, {wallet.metadata.displayName} allows your wallet address to be correlated with
					your personal information:
				</Typography>
				<ul style={{ paddingLeft: '1.5rem', marginBottom: '0px', fontWeight: subsectionWeight }}>
					{leaksList}
				</ul>
			</WrapRatingIcon>
		</>
	)
}
