import type { WithRef } from '../../reference'

/**
 * Transaction simulation support types.
 * Wallets can simulate transactions before broadcasting to preview outcomes.
 */
export enum TransactionSimulationType {
	/** No transaction simulation support */
	NOT_SUPPORTED = 'NOT_SUPPORTED',
	/** Third-party simulation service (e.g., Tenderly, Blocknative) */
	THIRD_PARTY = 'THIRD_PARTY',
	/** Wallet provides its own simulation backend */
	WALLET_BACKEND = 'WALLET_BACKEND',
	/** Client-side simulation using local node or light client */
	LOCAL = 'LOCAL',
}

/**
 * What information is shown in the simulation preview?
 */
export type SimulationPreviewCapabilities = {
	/** Shows balance changes (token transfers in/out) */
	balanceChanges: boolean
	/** Shows state changes (storage updates, approvals) */
	stateChanges: boolean
	/** Shows gas estimation */
	gasEstimation: boolean
	/** Shows potential errors or warnings */
	errorPrediction: boolean
	/** Shows NFT transfers */
	nftTransfers: boolean
	/** Shows contract interaction details */
	contractInteraction: boolean
}

/**
 * Transaction simulation feature support data.
 */
export type TransactionSimulationSupport = {
	/** Type of simulation support provided */
	simulationType: TransactionSimulationType

	/** What information is displayed in the simulation */
	previewCapabilities: SimulationPreviewCapabilities | null

	/**
	 * Whether simulation is automatic (shown by default) or opt-in.
	 * null if simulation not supported.
	 */
	automaticSimulation: boolean | null

	/**
	 * Whether the wallet supports simulating before signing,
	 * or only after signing but before broadcasting.
	 * null if simulation not supported.
	 */
	preSignSimulation: boolean | null
}

/**
 * Transaction simulation implementation with references.
 */
export type TransactionSimulationImplementation = WithRef<TransactionSimulationSupport>

/**
 * Default (empty) transaction simulation support.
 */
export const noTransactionSimulation: TransactionSimulationSupport = {
	simulationType: TransactionSimulationType.NOT_SUPPORTED,
	previewCapabilities: null,
	automaticSimulation: null,
	preSignSimulation: null,
}
