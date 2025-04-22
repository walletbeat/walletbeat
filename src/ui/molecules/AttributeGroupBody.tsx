import type { RatedWallet } from "@/schema/wallet";
import type { FC } from "react";
import type { AttributeGroup, ValueSet } from "@/schema/attributes";
import { PizzaSliceChart } from "../organisms/PizzaSliceChart";
import { getAttributeGroupInTree } from "@/schema/attribute-groups";

export const AttributeGroupBody: FC<{ wallet: RatedWallet, attrGroup: AttributeGroup<ValueSet> }> = ({ wallet, attrGroup }) => {
	const evalGroup = getAttributeGroupInTree(wallet.overall, attrGroup)

	return (
		<div>
			<PizzaSliceChart attrGroup={attrGroup} evalGroup={evalGroup} wallet={wallet} />
		</div>
	)
};
