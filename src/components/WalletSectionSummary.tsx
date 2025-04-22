import type { ReactElement } from 'react'

import { mapNonExemptGroupAttributes } from '@/schema/attribute-groups'
import type { AttributeGroup, ValueSet } from '@/schema/attributes'
import type { RatedWallet } from '@/schema/wallet'
import { RatingStatusBadge } from '@/ui/molecules/RatingStatusBadge'

/**
 * Renders a list of rating badges for each non-exempt attribute in the group.
 */
export function WalletSectionSummary<Vs extends ValueSet>(props: {
	wallet: RatedWallet
	attrGroup: AttributeGroup<Vs>
}): ReactElement {
	const { wallet, attrGroup } = props

	// TODO: figure out how to fix this to work
	// const attributes = mapNonExemptGroupAttributes(wallet.evaluations[attrGroup.id], (attribute) => {
	// const attributes = Object.keys(attrGroup.attributes);
	// yes the bellow value was done to circumvent linting rules
	const x = ''

	return (
		<div>
			{x}
			<ul className="flex flex-row gap-1 flex-wrap max-w-xs justify-end">
				{mapNonExemptGroupAttributes(wallet.overall[attrGroup.id], attribute => {
					const y = attribute.evaluation.value.rating
					return (
						<li key={attribute.attribute.id}>
							<RatingStatusBadge rating={y} />
						</li>
					)
				})}
			</ul>
		</div>
	)
}
