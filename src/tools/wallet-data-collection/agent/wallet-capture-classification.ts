/**
 * Classification diff and open-mutation state-machine helpers for the
 * wallet-data-collection harness.
 *
 * The transitions (open-mutation detection, justify merge, auto-close, CLI
 * validation) are pure functions so they can be unit-tested without a live Pi
 * session. File-system side effects (revert / audit-log append / syncBackup)
 * live in the harness's post-hook.
 */
import {
	type JustifyEntry,
	type OpenMutationEntry,
	parseRequestId,
	requestIdEquals,
	requestIdToString,
	type WalletCaptureImpactedRequestId,
} from '../wallet-capture-classification-audit-log'
import type { WalletRequestClassification } from '../wallet-capture-file'

/** The frozen state held while an open mutation is outstanding. */
export interface OpenMutationState {
	/** The bash command that caused the change. */
	command: string
	/** The request IDs impacted across the entire repository. */
	impacted: WalletCaptureImpactedRequestId[]
	/** Request IDs already justified in this open-mutation (as `walletId:walletVariant:sessionTime`). */
	justified: Set<`${string}:${string}:${string}`>
	/** Classification cache as of the pre-command state (restored on rollback). */
	frozenClassificationCache: Map<string, WalletRequestClassification>
}

/**
 * The request IDs whose classification differs between two fingerprint maps.
 * IDs present in only one map count as changed (e.g. a newly added capture
 * file's requests went from absent to present). Sorted for determinism.
 */
export function diffClassifications(
	before: ReadonlyMap<string, WalletRequestClassification>,
	after: ReadonlyMap<string, WalletRequestClassification>,
): WalletCaptureImpactedRequestId[] {
	const impacted: WalletCaptureImpactedRequestId[] = []
	const allIds = new Set<string>([...before.keys(), ...after.keys()])

	for (const id of allIds) {
		const b = before.get(id)
		const a = after.get(id)

		if (JSON.stringify(b) !== JSON.stringify(a)) {
			impacted.push(parseRequestId(id))
		}
	}

	return impacted.sort((x, y) => {
		const keyX = requestIdToString(x)
		const keyY = requestIdToString(y)

		return keyX.localeCompare(keyY)
	})
}

/**
 * Merge a `justify` entry into an open-mutation state and report whether every
 * impacted ID is now justified (which closes the mutation).
 */
export function mergeJustifyIntoOpenMutation(
	state: OpenMutationState,
	entry: JustifyEntry,
): { nextState: OpenMutationState; autoClose: boolean } {
	const justified = new Set(state.justified)

	for (const id of entry.justified) {
		justified.add(requestIdToString(id))
	}

	const impactedSet = new Set(state.impacted.map(requestIdToString))
	const autoClose = [...impactedSet].every(id => justified.has(id))

	return {
		nextState: { ...state, justified },
		autoClose,
	}
}

/**
 * True when a request ID is in the open-mutation's impacted list and has not
 * yet been justified (used by the CLI's `justify` validation).
 */
export function isUnjustifiedImpacted(
	openMutation: OpenMutationEntry,
	justified: ReadonlySet<string>,
	id: WalletCaptureImpactedRequestId,
): boolean {
	const key = requestIdToString(id)

	if (justified.has(key)) {
		return false
	}

	return openMutation.impacted.some((impacted: WalletCaptureImpactedRequestId) =>
		requestIdEquals(impacted, id),
	)
}
