import type { OutcomeMetadata } from '@/schema/attributes'

import { component, type Content } from '../content'

export interface UnratedAttributeContent {
	component: 'UnratedAttribute'
	componentProps: Record<never, never>
}

export function unratedAttributeContent<_OutcomeMetadata extends OutcomeMetadata>(): Content<{
	WALLET_NAME: string
}> {
	return component('UnratedAttribute', {})
}
