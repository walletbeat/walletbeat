import { describe, expect, it } from 'vitest'

import { unratedTemplate } from '@/data/software-wallets/unrated.tmpl'
import { EvaluationContext } from '@/schema/attributes'
import { appIsolation } from '@/schema/attributes/privacy/app-isolation'
import { duressResistance } from '@/schema/attributes/security/duress-resistance'
import { passkeyImplementation } from '@/schema/attributes/security/passkey-implementation'
import { chainVerification } from '@/schema/attributes/self-sovereignty/chain-verification'
import { permissionsManagement } from '@/schema/attributes/self-sovereignty/permissions-management'
import { type ResolvedFeatures, resolveFeatures } from '@/schema/features'
import { ExposedAccountsBehavior } from '@/schema/features/privacy/app-isolation'
import { BasicUnlockMechanism } from '@/schema/features/security/duress-resistance'
import { featureSupportedNoRef, notSupportedWithRef, supported } from '@/schema/features/support'
import { refNotNecessary } from '@/schema/reference'
import { Variant } from '@/schema/variants'

function unratedFeatures(variant: Variant): ResolvedFeatures {
	return resolveFeatures(unratedTemplate.features, unratedTemplate.variants, variant)
}

function referenceUrls(references: ReturnType<EvaluationContext['references']>): string[] {
	return references.flatMap(reference => reference.urls.map(url => url.url))
}

describe('unsupported references in directly rated attributes', () => {
	it('cites an unsupported passkey implementation', () => {
		const base = unratedFeatures(Variant.BROWSER)
		const features: ResolvedFeatures = {
			...base,
			security: {
				...base.security,
				passkeyVerification: notSupportedWithRef({
					ref: { url: 'https://example.com/no-passkeys' },
				}),
			},
		}
		const context = EvaluationContext.create(passkeyImplementation, features)
		const evaluation = passkeyImplementation.evaluate(context)

		expect(evaluation.outcome.id).toBe('no_passkey_implementation')
		expect(referenceUrls(context.references())).toContain('https://example.com/no-passkeys')
	})

	it('cites an unsupported L1 light client', () => {
		const base = unratedFeatures(Variant.BROWSER)
		const features: ResolvedFeatures = {
			...base,
			security: {
				...base.security,
				lightClient: {
					...base.security.lightClient,
					ethereumL1: notSupportedWithRef({
						ref: { url: 'https://example.com/no-light-client' },
					}),
				},
			},
		}
		const context = EvaluationContext.create(chainVerification, features)
		const evaluation = chainVerification.evaluate(context)

		expect(evaluation.outcome.id).toBe('no_chain_verification')
		expect(referenceUrls(context.references())).toContain('https://example.com/no-light-client')
	})

	it('cites unsupported permissions management', () => {
		const base = unratedFeatures(Variant.BROWSER)
		const features: ResolvedFeatures = {
			...base,
			selfSovereignty: {
				...base.selfSovereignty,
				permissionsManagement: notSupportedWithRef({
					ref: { url: 'https://example.com/no-permissions-management' },
				}),
			},
		}
		const context = EvaluationContext.create(permissionsManagement, features)
		const evaluation = permissionsManagement.evaluate(context)

		expect(evaluation.outcome.rating).toBe('FAIL')
		expect(referenceUrls(context.references())).toContain(
			'https://example.com/no-permissions-management',
		)
	})

	it('cites the unsupported app-isolation feature selected by an early failure', () => {
		const base = unratedFeatures(Variant.BROWSER)
		const features: ResolvedFeatures = {
			...base,
			privacy: {
				...base.privacy,
				appIsolation: {
					ethAccounts: supported({
						ref: refNotNecessary,
						defaultBehavior: ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY,
					}),
					erc7846WalletConnect: supported({
						ref: refNotNecessary,
						defaultBehavior: ExposedAccountsBehavior.ACTIVE_ACCOUNT_ONLY,
					}),
					createInAppConnectionFlow: notSupportedWithRef({
						ref: { url: 'https://example.com/no-app-account-creation' },
					}),
					useAppSpecificLastConnectedAddresses: featureSupportedNoRef,
				},
			},
		}
		const context = EvaluationContext.create(appIsolation, features)
		const evaluation = appIsolation.evaluate(context)

		expect(evaluation.outcome.id).toBe('no_account_creation_in_connection_flow')
		expect(referenceUrls(context.references())).toContain(
			'https://example.com/no-app-account-creation',
		)
	})

	it('cites an unsupported duress mode', () => {
		const base = unratedFeatures(Variant.MOBILE)
		const features: ResolvedFeatures = {
			...base,
			security: {
				...base.security,
				duressResistance: {
					basicUnlock: {
						mechanisms: {
							[BasicUnlockMechanism.PIN]: true,
							[BasicUnlockMechanism.PASSWORD]: false,
							[BasicUnlockMechanism.BIOMETRIC]: false,
							[BasicUnlockMechanism.PATTERN]: false,
						},
						ref: refNotNecessary,
					},
					duressMode: notSupportedWithRef({
						ref: { url: 'https://example.com/no-duress-mode' },
					}),
				},
			},
		}
		const context = EvaluationContext.create(duressResistance, features)
		const evaluation = duressResistance.evaluate(context)

		expect(evaluation.outcome.id).toBe('basic_lock_only')
		expect(referenceUrls(context.references())).toContain('https://example.com/no-duress-mode')
	})
})
