import type { RatedWallet } from '@/schema/wallet'
import type { JSX } from 'react'
import type { AttributeGroup, ValueSet } from '@/schema/attributes'
import { PizzaSliceChart } from '../organisms/PizzaSliceChart'
import { getAttributeGroupInTree } from '@/schema/attribute-groups'

/**
 * Renders a pizza-chart for a specific attribute group of a wallet.
 */
export function AttributeGroupBody<Vs extends ValueSet>(props: {
	wallet: RatedWallet
	attrGroup: AttributeGroup<Vs>
}): JSX.Element {
	const { wallet, attrGroup } = props
	const evalGroup = getAttributeGroupInTree(wallet.overall, attrGroup)

	return (
		<div>
			<PizzaSliceChart attrGroup={attrGroup} evalGroup={evalGroup} wallet={wallet} />
		</div>
	)
}
