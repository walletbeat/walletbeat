import type React from 'react';

import { subsectionWeight } from '@/components/constants';
import {
	monetizationStrategies,
	monetizationStrategyName,
} from '@/schema/features/transparency/monetization';
import { refs } from '@/schema/reference';
import type { FundingDetailsProps } from '@/types/content/funding-details';

import { JoinedList } from '../../../atoms/JoinedList';
import { ReferenceList } from '../../../atoms/ReferenceList';
import { WrapRatingIcon } from '../../../atoms/WrapRatingIcon';

export function FundingDetails({
	wallet,
	value,
	monetization,
}: FundingDetailsProps): React.JSX.Element {
	const strategies = monetizationStrategies(monetization)
		.filter(({ value }) => value === true)
		.map(({ strategy }) => strategy);
	const ref = refs(monetization);

	return (
		<WrapRatingIcon rating={value.rating}>
			<div style={{ fontWeight: subsectionWeight }}>
				<strong>{wallet.metadata.displayName}</strong> is funded by{' '}
				<JoinedList
					data={strategies.map(strategy => ({
						key: strategy,
						value: monetizationStrategyName(strategy),
					}))}
				/>
				.{' '}
				<ReferenceList ref={ref} ulStyle={{ paddingLeft: '1.5rem', marginBottom: '0px' }} />
			</div>
		</WrapRatingIcon>
	);
}
