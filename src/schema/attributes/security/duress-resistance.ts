import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	Rating,
	type Value,
	Verifiability,
} from '@/schema/attributes'
import {
	BasicUnlockMechanism,
	basicUnlockMechanismName,
	DuressAction,
	type DuressMode,
	type DuressResistance as DuressResistanceFeature,
} from '@/schema/features/security/duress-resistance'
import { isSupported, notSupported, type Supported } from '@/schema/features/support'
import { refNotNecessary, type WithRef } from '@/schema/reference'
import { type AtLeastOneVariant, Variant } from '@/schema/variants'
import { verifiabilityRequiresAtLeastOneReference } from '@/schema/verifiability'
import { markdown, mdParagraph, paragraph, sentence } from '@/types/content'
import { commaListFormat } from '@/types/utils/text'

import { exempt, pickWorstRating, unrated } from '../common'

export type DuressResistanceValue = Value

function noLockScreen(
	ctx: EvaluationContext<DuressResistanceValue>,
): Evaluation<DuressResistanceValue> {
	return ctx.build({
		value: {
			id: 'no_lock_screen',
			rating: Rating.FAIL,
			displayName: 'No lock screen',
			shortExplanation: sentence('{{WALLET_NAME}} has no PIN, password, or biometric lock.'),
		},
		details: paragraph(
			'{{WALLET_NAME}} does not require any authentication before granting access to funds. Anyone who picks up the device or opens the app can immediately access and transfer assets. This provides no protection against physical coercion or theft.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should require a PIN, password, or biometric (Face ID, fingerprint) before granting access. This is the minimum bar for duress resistance and a prerequisite for any stronger protections such as a duress PIN or decoy wallet.',
		),
	})
}

function basicLockOnly(
	ctx: EvaluationContext<DuressResistanceValue>,
	feature: DuressResistanceFeature,
): Evaluation<DuressResistanceValue> {
	const mechanisms = feature.basicUnlock!.mechanisms
	const mechNames = commaListFormat(mechanisms.map(basicUnlockMechanismName))

	return ctx.build({
		value: {
			id: 'basic_lock_only',
			rating: Rating.PARTIAL,
			displayName: 'Lock screen only',
			shortExplanation: sentence(
				`{{WALLET_NAME}} has a lock screen (${mechNames}) but no duress mode.`,
			),
		},
		details: paragraph(
			`{{WALLET_NAME}} protects access behind a lock screen (${mechNames}). This slows down an opportunistic attacker, but does not protect against a determined coercer who can watch you enter the credential or physically force you to unlock the wallet. There is no duress PIN, decoy wallet, or self-destruct mechanism.`,
		),
		howToImprove: markdown(`
			{{WALLET_NAME}} should implement a duress mode triggered by a separate duress PIN or passphrase. When entered, this should either:

			- Open a **decoy wallet** with a different set of accounts and balances (provides plausible deniability), or
			- **Wipe the device and forward all funds** to a pre-configured external address that is not unilaterally user-controlled (e.g. a multisig or time-locked contract).
		`),
	})
}

function hasDuressMode(
	ctx: EvaluationContext<DuressResistanceValue>,
	duressMode: Supported<WithRef<DuressMode>>,
): Evaluation<DuressResistanceValue> {
	switch (duressMode.action) {
		case DuressAction.DECOY_WALLET:
			return ctx.build({
				value: {
					id: 'decoy_wallet',
					rating: Rating.PASS,
					displayName: 'Decoy wallet',
					shortExplanation: sentence(
						'{{WALLET_NAME}} supports a duress PIN that opens a separate decoy wallet.',
					),
				},
				details: paragraph(
					'{{WALLET_NAME}} implements a duress mode: entering a separate duress PIN or passphrase opens a different wallet with a distinct set of accounts and balances. The attacker cannot distinguish the decoy from the real wallet, giving the user plausible deniability under coercion.',
				),
			})
	}
}

export const duressResistance: Attribute<DuressResistanceValue> = {
	id: 'duressResistance',
	icon: '\u{1F527}', // Wrench (references the "wrench attack" threat model)
	displayName: 'Duress Resistance',
	wording: {
		midSentenceName: 'duress resistance',
	},
	question: sentence(
		'Does {{WALLET_NAME}} protect users from being physically coerced into surrendering their funds?',
	),
	why: markdown(`
		A "wrench attack" is when an adversary physically coerces a user into handing over their funds.
		Unlike remote attacks, no amount of cryptographic security can stop an attacker who is standing
		next to you with a weapon.

		Wallets can mitigate this threat by:

		1. **Lock screen (basic)**: Requiring a PIN, password, or biometric before granting access.
		   This protects against opportunistic thieves and buys time, but a determined coercer can
		   watch you unlock it.

		2. **Duress mode (strong)**: A separate duress PIN or passphrase that, when entered,
		   either opens a decoy wallet (providing plausible deniability) or wipes the device and
		   immediately forwards all funds to a pre-configured address not controlled by the user alone.

		This attribute is only evaluated for **hardware wallets** and **mobile app wallets**, as
		desktop and browser extension wallets do not meaningfully face this threat model.
	`),
	methodology: markdown(`
		Wallets are rated based on the strongest duress protection they provide:

		1. **Pass**: Implements a duress PIN or passphrase that triggers either:
			- A decoy wallet (different accounts and balances, plausible deniability), or
			- A wipe-and-forward mechanism (wipes device, sends funds to a pre-configured address not unilaterally user-controlled).

		2. **Partial**: Has a lock screen (PIN, password, biometric, or pattern) but no dedicated duress mode.

		3. **Fail**: No lock screen at all — the wallet is accessible to anyone who picks up the device or opens the app.

		4. **Exempt**: Desktop and browser extension wallets, and embedded wallets.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: false,
		pass: [
			exampleRating(
				mdParagraph(
					'The wallet supports a duress PIN that opens a separate decoy wallet with different accounts and balances.',
				),
				hasDuressMode(
					EvaluationContext.forTest(() => duressResistance),
					{ support: 'SUPPORTED', action: DuressAction.DECOY_WALLET, ref: refNotNecessary },
				),
			),
		],
		partial: [
			exampleRating(
				mdParagraph(
					'The wallet has a lock screen (PIN, password, or biometric) but no dedicated duress PIN or decoy wallet.',
				),
				basicLockOnly(
					EvaluationContext.forTest(() => duressResistance),
					{
						basicUnlock: {
							mechanisms: [BasicUnlockMechanism.PIN],
							ref: refNotNecessary,
						},
						duressMode: notSupported,
					},
				),
			),
		],
		fail: [
			exampleRating(
				mdParagraph('The wallet has no lock screen and is accessible to anyone who opens it.'),
				noLockScreen(EvaluationContext.forTest(() => duressResistance)),
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<DuressResistanceValue>>) =>
		pickWorstRating<DuressResistanceValue>(perVariant),
	evaluate: (ctx: EvaluationContext<DuressResistanceValue>): Evaluation<DuressResistanceValue> => {
		ctx.setVerifiability(
			verifiabilityRequiresAtLeastOneReference({ referenceCountsAs: Verifiability.VERIFIABLE }),
		)

		// Only applicable to hardware and mobile wallets.
		if (
			ctx.features.variant === Variant.BROWSER ||
			ctx.features.variant === Variant.DESKTOP ||
			ctx.features.variant === Variant.EMBEDDED
		) {
			return exempt(
				ctx,
				sentence(
					'Duress resistance is not applicable to browser extension, desktop, and embedded wallets.',
				),
				null,
			)
		}

		const feature = ctx.features.security.duressResistance

		if (feature === null) {
			return unrated(ctx, null)
		}

		if (feature.basicUnlock === null) {
			return noLockScreen(ctx)
		}

		ctx.addRef(feature.basicUnlock)

		// Implied that basicUnlock is non-null here; a duress mode requires a basic lock screen.
		if (!isSupported(feature.duressMode)) {
			return basicLockOnly(ctx, feature)
		}

		ctx.addRef(feature.duressMode)

		return hasDuressMode(ctx, feature.duressMode)
	},
}
