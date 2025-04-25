import cx from 'classnames'
import type { ReactElement } from 'react'
import { LuInfo } from 'react-icons/lu'

import { getAttributeGroupInTree } from '@/schema/attribute-groups'
import type { AttributeGroup, ValueSet } from '@/schema/attributes'
import type { RatedWallet } from '@/schema/wallet'
import { Tooltip } from '@/ui/atoms/Tooltip'
import { percentageToColor } from '@/utils/colors'

/**
 * Renders a list of rating badges for each non-exempt attribute in the group.
 */
export function WalletSectionSummary<Vs extends ValueSet>(props: {
	wallet: RatedWallet
	attrGroup: AttributeGroup<Vs>
}): ReactElement {
	const { wallet, attrGroup } = props
	const evalGroup = getAttributeGroupInTree(wallet.overall, attrGroup)
	const score = attrGroup.score(evalGroup)
	const percentageScore = score != null ? `${Math.round(score.score * 100)}%` : null

	const color =
		score != null
			? score.hasUnratedComponent
				? 'bg-neutral-100 dark:bg-neutral-800'
				: percentageToColor(score.score)
			: ''

	return (
		<div>
			{score != null && (
				<div className={cx('flex flex-row gap-2 items-center w-fit p-2', color)}>
					{percentageScore}
					{score.hasUnratedComponent && (
						<Tooltip content="This attribute group contains unrated components.">
							<LuInfo />
						</Tooltip>
					)}
				</div>
			)}
		</div>
	)
}
