_Not complete yet!_

## Custom UI components for attributes

Most attributes can have basic details as Markdown. However, some attributes need more display richness to better explain why the wallet rating is what it is for that attribute. For example, it is useful to list the security audit history as part of the details of the "Security audits" attribute. This exceeds the rendering capabilities of Markdown, so such components should use a custom Svelte-based component which gives them full control over the rendering.

The pieces needed for custom components are as follows:

- Create a new component at `src/views/attributes/<attribute_group>/<YourAttributeId>Details.svelte`. See `src/views/attributes/security/SecurityAuditsDetails.svelte` for an example. Your props **must** contain a prop named `wallet` (type: `RatedWallet`) and a prop named `value` (type: your attribute's `Value` subtype). You may also add any other props you like, but note that the `value` prop being present means your component has access to any fields defined in your attribute's `Value` subtype already.

```typescript
// Props
const {
	wallet,
	value,
	// (You may add more props here if you'd like! But you must have the above two props.)
}: {
	wallet: RatedWallet
	value: YourAttributeIdValue
} = $props()
```

- Create a content data type that will act as the input to your component. See `src/types/content/security-audits-details.ts` as an example:

```typescript
import type { EvaluationData } from '@/schema/attributes'

// Your attribute's `Value` subtype:
import type { SecurityAuditsValue } from '@/schema/attributes/security/security-audits'

import { component, type Content } from '../content'

export interface SecurityAuditsDetailsProps extends EvaluationData<SecurityAuditsValue> {
	// Any extra props needed by your Svelte component
	// other than `wallet` and `value`:
	auditedInLastYear: boolean
	hasUnaddressedFlaws: boolean
}

// Boilerplate; adjust for your own attribute:
export interface SecurityAuditsDetailsContent {
	component: 'SecurityAuditsDetails'
	componentProps: SecurityAuditsDetailsProps
}

// Boilerplate; adjust for your own attribute:
export function securityAuditsDetailsContent(
	bakedProps: Omit<SecurityAuditsDetailsProps, keyof EvaluationData<SecurityAuditsValue>>,
): Content<{ WALLET_NAME: string }> {
	return component<SecurityAuditsDetailsContent, keyof typeof bakedProps>(
		'SecurityAuditsDetails',
		bakedProps,
	)
}
```

- Edit `src/types/content.ts`'s `ComponentAndProps` to add your own content type. In the example above, this would be `SecurityAuditsDetailsContent`.
- Edit the `rating-content`-class `div` in `src/views/WalletPage.svelte`, where you will see something like this (add your own):

```svelte
<div class="rating-content">
	<!-- ... -->
	<div data-column>
		{#if componentName === 'AddressCorrelationDetails'}
			<AddressCorrelationDetails {...componentProps} {wallet} {value} {references} />
		{:else if componentName === 'ChainVerificationDetails'}
			<ChainVerificationDetails {...componentProps} {wallet} {value} {references} />
		{:else if componentName === 'ScamAlertDetails'}
			<ScamAlertDetails {...componentProps} {wallet} {value} {references} />
		{:else if componentName === 'SecurityAuditsDetails'}
			<SecurityAuditsDetails {...componentProps} {wallet} {value} {references} />
		{:else if componentName === 'TransactionInclusionDetails'}
			<TransactionInclusionDetails {...componentProps} {wallet} {value} {references} />
		{:else if componentName === 'FundingDetails'}
			<FundingDetails {...componentProps} {wallet} {value} {references} />
		{:else if componentName === 'AccountRecoveryDetails'}
			<AccountRecoveryDetails {...componentProps} {wallet} {value} {references} />
		{:else if componentName === 'UnratedAttribute'}
			<UnratedAttribute {...componentProps} {wallet} {value} {references} />
		{/if}
	</div>
</div>
```

- Finally, in your attribute's `Evaluation`s, use the `<YourAttributeId>DetailsContent(...)` function in the `details` field, passing in any fields you added in `<YourAttributeId>DetailsProps`. Example for the security audits case:

```typescript
return {
	value: {
		id: `...`,
		rating,
		displayName,
		shortExplanation,
		securityAudits: audits,
		__brand: brand,
	},
	details: securityAuditsDetailsContent({
		// Props defined in SecurityAuditsDetailsProps:
		auditedInLastYear,
		hasUnaddressedFlaws,
	}),
	howToImprove,
	references,
}
```

- Run `pnpm dev` and observe your new component!
