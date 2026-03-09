import { isNonEmptyArray, nonEmptyFirst, nonEmptyMap } from '@/types/utils/non-empty'

import {
	EvaluationContext,
	type Value,
	Verifiability,
	type VerifiabilityPredicate,
} from './attributes'
import { RpcEndpointConfiguration } from './features/self-sovereignty/chain-configurability'
import { isSupported } from './features/support'
import { licenseSourceIsVisible, LicensingType } from './features/transparency/license'

/**
 * Internal scoring function for Verifiability. Used for sorting only.
 */
function verifyScore(v: Verifiability): number {
	switch (v) {
		case Verifiability.UNKNOWN:
			return -1
		case Verifiability.UNVERIFIABLE:
			return 0
		case Verifiability.INDEPENDENTLY_AUDITED:
			return 1
		case Verifiability.VERIFIABLE:
			return 2
		case Verifiability.SELF_EVIDENT:
			return 3
	}
}

/**
 * Returns a level of `Verifiability` appropriate for an attribute where
 * verifying the claim requires at least one of multiple means of
 * verification.
 */
export function verifiabilityRequiresAnyOf<V extends Value>(
	...predicates: VerifiabilityPredicate<V>[]
): VerifiabilityPredicate<V> {
	if (!isNonEmptyArray(predicates)) {
		throw new Error('cannot compute the verifiability from no verifiability items')
	}

	return (ctx: EvaluationContext<V>) =>
		nonEmptyFirst(
			nonEmptyMap(predicates, predicate => predicate(ctx)),
			(a: Verifiability, b: Verifiability) => verifyScore(b) - verifyScore(a),
		)
}

/**
 * Returns a level of `Verifiability` appropriate for an attribute where
 * verifying the claim requires at least one of multiple means of
 * verification.
 */
export function verifiabilityRequiresAllOf<V extends Value>(
	...predicates: VerifiabilityPredicate<V>[]
): VerifiabilityPredicate<V> {
	if (!isNonEmptyArray(predicates)) {
		throw new Error('cannot compute the verifiability from no verifiability items')
	}

	return (ctx: EvaluationContext<V>) =>
		nonEmptyFirst(
			nonEmptyMap(predicates, predicate => predicate(ctx)),
			(a: Verifiability, b: Verifiability) => verifyScore(a) - verifyScore(b),
		)
}

/**
 * Returns a level of `Verifiability` appropriate for an attribute where
 * verifying the claim requires source-code-level access.
 */
export function verifiabilityRequiresSourceCodeAccess<V extends Value>(policy: {
	/**
	 * For wallets with split licenses between "core" wallet code and peripheral code,
	 * is having visibility over the "core" wallet code sufficient for verifiability?
	 */
	coreOnlyIsSufficient: boolean
}): VerifiabilityPredicate<V> {
	return (ctx: EvaluationContext<V>) => {
		if (ctx.features.licensing === null) {
			return Verifiability.UNKNOWN
		}

		switch (ctx.features.licensing.type) {
			case LicensingType.SINGLE_WALLET_REPO_AND_LICENSE:
				if (ctx.features.licensing.walletAppLicense === null) {
					return Verifiability.UNKNOWN
				}

				if (!licenseSourceIsVisible(ctx.features.licensing.walletAppLicense.license)) {
					return Verifiability.UNVERIFIABLE
				}

				return Verifiability.VERIFIABLE
			case LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE:
				if (ctx.features.licensing.coreLicense === null) {
					return Verifiability.UNKNOWN
				}

				if (!licenseSourceIsVisible(ctx.features.licensing.coreLicense.license)) {
					return Verifiability.UNVERIFIABLE
				}

				if (policy.coreOnlyIsSufficient) {
					return Verifiability.VERIFIABLE
				}

				if (ctx.features.licensing.walletAppLicense === null) {
					return Verifiability.UNKNOWN
				}

				if (!licenseSourceIsVisible(ctx.features.licensing.walletAppLicense.license)) {
					return Verifiability.UNVERIFIABLE
				}

				return Verifiability.VERIFIABLE
		}
	}
}

/**
 * Returns a level of `Verifiability` appropriate for an attribute where
 * verifying the claim requires the ability to update the chain RPC endpoint.
 */
export function verifiabilityRequiresCustomChainRpc<V extends Value>(policy: {
	/** Is the ability to configure the L1 RPC endpoint required? */
	mustBeAbleToConfigureL1: boolean

	/** Is the ability to configure specific L2s' RPC endpoints required? */
	mustBeAbleToConfigureSpecificL2s: boolean
}): VerifiabilityPredicate<V> {
	return (ctx: EvaluationContext<V>) => {
		if (ctx.features.chainConfigurability === null) {
			return Verifiability.UNKNOWN
		}

		if (!isSupported(ctx.features.chainConfigurability)) {
			return Verifiability.UNVERIFIABLE
		}

		if (policy.mustBeAbleToConfigureL1) {
			if (!isSupported(ctx.features.chainConfigurability.l1)) {
				return Verifiability.UNKNOWN
			}

			if (
				ctx.features.chainConfigurability.l1.rpcEndpointConfiguration ===
				RpcEndpointConfiguration.NO
			) {
				return Verifiability.UNVERIFIABLE
			}
		}

		if (policy.mustBeAbleToConfigureSpecificL2s) {
			if (!isSupported(ctx.features.chainConfigurability.nonL1)) {
				return Verifiability.UNKNOWN
			}

			if (
				ctx.features.chainConfigurability.nonL1.rpcEndpointConfiguration ===
				RpcEndpointConfiguration.NO
			) {
				return Verifiability.UNVERIFIABLE
			}
		}

		if (!isSupported(ctx.features.chainConfigurability.customChainRpcEndpoint)) {
			return Verifiability.UNVERIFIABLE
		}

		return Verifiability.VERIFIABLE
	}
}

export function verifiabilityRequiresAtLeastOneReference<V extends Value>(policy: {
	referenceCountsAs: Verifiability
}): VerifiabilityPredicate<V> {
	return (ctx: EvaluationContext<V>): Verifiability => {
		return ctx.references().length > 0 ? policy.referenceCountsAs : Verifiability.UNVERIFIABLE
	}
}
