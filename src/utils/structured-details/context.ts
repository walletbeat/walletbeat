import type { ConcreteWalletEvalStrings } from '@/schema/attributes'

/**
 * The minimal immutable context every structured-details adapter receives.
 *
 * Adapters get exactly what formatting requires: the wallet string
 * substitutions used by canonical prose templates. They never receive the
 * wallet, the evaluation, or the outcome, so they cannot reconstruct meaning
 * that the evaluator did not already put in the canonical model.
 */
export interface StructuredDetailsContext {
	strings: ConcreteWalletEvalStrings
}
