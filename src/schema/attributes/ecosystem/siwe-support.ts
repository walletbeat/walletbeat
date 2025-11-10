import { type Attribute, type Evaluation, Rating, type Value } from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import type { SiweImplementation } from '@/schema/features/ecosystem/siwe-support'
import { popRefs } from '@/schema/reference'
import { paragraph, sentence } from '@/types/content'

import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.ecosystem.siwe_support'

export type SiweValue = Value & {
	supported: boolean
	builtInUI: boolean
	__brand: typeof brand
}

function evaluateSiwe(support: SiweImplementation): Evaluation<SiweValue> {
	const { withoutRefs, refs } = popRefs(support)
	const { supported, builtInUI, eip4361Compliant } = withoutRefs

	if (supported && eip4361Compliant) {
		return {
			value: {
				id: 'siwe_supported',
				rating: Rating.PASS,
				displayName: 'SIWE supported',
				shortExplanation: sentence('{{WALLET_NAME}} supports Sign-In With Ethereum.'),
				supported,
				builtInUI,
				__brand: brand,
			},
			details: paragraph(
				`{{WALLET_NAME}} implements EIP-4361 Sign-In With Ethereum${builtInUI ? ' with a built-in authentication UI' : ''}, allowing users to authenticate to web services using their Ethereum accounts instead of traditional passwords.`,
			),
			impact: paragraph(
				'SIWE support enables users to authenticate to web services using their Ethereum identity, improving security and user experience by eliminating the need for separate passwords.',
			),
			references: refs,
		}
	}

	return {
		value: {
			id: 'no_siwe',
			rating: Rating.FAIL,
			displayName: 'No SIWE support',
			shortExplanation: sentence('{{WALLET_NAME}} does not support Sign-In With Ethereum.'),
			supported: false,
			builtInUI: false,
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} does not implement EIP-4361 Sign-In With Ethereum. Users cannot use their Ethereum account to authenticate to web services that support SIWE.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should implement EIP-4361 SIWE support to allow users to authenticate using their Ethereum identity.',
		),
	}
}

export const siweSupport: Attribute<SiweValue> = {
	id: 'siweSupport',
	icon: '\u{1f511}', // Key
	displayName: 'Sign-In With Ethereum Support',
	wording: {
		midSentenceName: 'SIWE support',
	},
	question: sentence('Does the wallet support Sign-In With Ethereum (EIP-4361)?'),
	why: paragraph(
		'Sign-In With Ethereum (SIWE) allows users to authenticate to web services using their Ethereum account instead of traditional passwords. This provides self-sovereign identity, better security, privacy, and portability across services.',
	),
	methodology: sentence(
		'Wallets that implement EIP-4361 SIWE standard for authentication pass this attribute.',
	),
	ratingScale: {
		display: 'simple',
		content: paragraph(
			'Wallets that support EIP-4361 SIWE pass. Wallets that do not support SIWE fail.',
		),
	},
	evaluate: (features: ResolvedFeatures) => {
		if (features.ecosystem.siweSupport === null) {
			return unrated<SiweValue>(siweSupport, brand, {
				supported: false,
				builtInUI: false,
			})
		}

		return evaluateSiwe(features.ecosystem.siweSupport)
	},
	aggregate: pickWorstRating<SiweValue>,
}
