import type { ConcreteWalletEvalStrings } from '@/schema/attributes'

export interface StructuredDetailsContext {
	strings: ConcreteWalletEvalStrings
}

/** The context's strings with the wallet name emphasized, shared by the Markdown adapters. */
export function emphasizedStrings(context: StructuredDetailsContext): ConcreteWalletEvalStrings {
	return { ...context.strings, WALLET_NAME: `**${context.strings.WALLET_NAME}**` }
}
