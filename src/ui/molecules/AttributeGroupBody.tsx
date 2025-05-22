import type { JSX } from 'react';

import { getAttributeGroupInTree } from '@/schema/attribute-groups';
import type { AttributeGroup, ValueSet } from '@/schema/attributes';
import type { RatedWallet } from '@/schema/wallet';

import { EvaluatedGroupOverview } from './wallet/heading/EvaluatedGroupOverview';

/**
 * Renders a pizza-chart for a specific attribute group of a wallet.
 */
export function AttributeGroupBody<Vs extends ValueSet>(props: {
  wallet: RatedWallet;
  attrGroup: AttributeGroup<Vs>;
}): JSX.Element {
  const { wallet, attrGroup } = props;
  const evalGroup = getAttributeGroupInTree(wallet.overall, attrGroup);

  return (
    <div className='pb-2 mb-2 card'>
      <EvaluatedGroupOverview
        wallet={wallet}
        // attrGroup={attrGroup}
        evalGroup={evalGroup}
        hardwareWalletModel={undefined}
      />
    </div>
  );
}
