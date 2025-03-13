import type { ResolvedFeatures } from '@/schema/features'
import {
	Rating,
	type Value,
	type Attribute,
	type Evaluation,
	exampleRating,
} from '@/schema/attributes'
import { pickWorstRating, unrated } from '../common'
import { markdown, paragraph, sentence, mdParagraph } from '@/types/content'
import type { WalletMetadata } from '@/schema/wallet'
import type { AtLeastOneVariant } from '@/schema/variants'
import { PasskeyVerificationLibrary, type PasskeyVerificationSupport } from '@/schema/features/security/passkey-verification'
import { popRefs } from '@/schema/reference'

const brand = 'attributes.security.passkey_implementation'
export type PasskeyImplementationValue = Value & {
	library: PasskeyVerificationLibrary
	libraryUrl?: string
	__brand: 'attributes.security.passkey_implementation'
}

function noPasskeyImplementation(): Evaluation<PasskeyImplementationValue> {
	return {
		value: {
			id: 'no_passkey_implementation',
			rating: Rating.FAIL,
			displayName: 'No passkey implementation',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} does not implement passkeys or does not use a recognized verification library.
				`,
			),
			library: PasskeyVerificationLibrary.NONE,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} either does not implement passkeys or does not use a recognized
				verification library for P256/R1 curve operations. Passkeys provide a more secure authentication
				method than traditional passwords, but proper implementation is crucial for security.
			`,
		),
		howToImprove: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should implement passkeys using a well-audited verification library
				such as [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib).
			`,
		),
	}
}

function otherPasskeyImplementation(
	support: PasskeyVerificationSupport,
): Evaluation<PasskeyImplementationValue> {
	return {
		value: {
			id: 'other_passkey_implementation',
			rating: Rating.PARTIAL,
			displayName: 'Basic passkey implementation',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} implements passkeys with a less common verification library.
				`,
			),
			library: PasskeyVerificationLibrary.OTHER,
			libraryUrl: support.libraryUrl,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} implements passkeys using a less common verification library.
				While this provides better security than no passkey support, using a well-audited and
				widely recognized library would provide stronger security guarantees.
			`,
		),
		howToImprove: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should consider upgrading to a more widely recognized
				and audited verification library such as [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib).
			`,
		),
	}
}

function freshCryptoLibImplementation(
	support: PasskeyVerificationSupport,
): Evaluation<PasskeyImplementationValue> {
	return {
		value: {
			id: 'fresh_crypto_lib_implementation',
			rating: Rating.PARTIAL,
			displayName: 'outdated passkey verification implementation',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} implements passkeys using [Fresh Crypto Lib](https://github.com/rdubois-crypto/FreshCryptoLib).
				`,
			),
			library: PasskeyVerificationLibrary.FRESH_CRYPTO_LIB,
			libraryUrl: support.libraryUrl || 'https://github.com/rdubois-crypto/FreshCryptoLib',
			__brand: brand,
		},
		details: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} implements passkeys using [Fresh Crypto Lib](https://github.com/rdubois-crypto/FreshCryptoLib).
				While this is a well-regarded library, it has not undergone as extensive auditing and testing. 
				as [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib).
			`,
		),
		howToImprove: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should consider upgrading to [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib),
				which has undergone more extensive auditing and testing.
			`,
		),
	}
}

function smoothCryptoLibImplementation(
	support: PasskeyVerificationSupport,
): Evaluation<PasskeyImplementationValue> {
	return {
		value: {
			id: 'smooth_crypto_lib_implementation',
			rating: Rating.PASS,
			displayName: 'Excellent passkey implementation',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} implements passkeys using [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib).
				`,
			),
			library: PasskeyVerificationLibrary.SMOOTH_CRYPTO_LIB,
			libraryUrl: support.libraryUrl || 'https://github.com/get-smooth/crypto-lib',
			__brand: brand,
		},
		details: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} implements passkeys using [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib),
				the most secure and well-audited verification library for P256/R1 curve operations.
			`,
		),
		howToImprove: undefined,
	}
}

export const passkeyImplementation: Attribute<PasskeyImplementationValue> = {
	id: 'passkeyImplementation',
	icon: '\u{1F5F9}', // Check mark
	displayName: 'Passkey implementation',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's passkey implementation evaluated?",
		whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
			`What can ${walletMetadata.displayName} do to improve its passkey implementation?`,
	},
	question: sentence(`
		Does the wallet implement passkeys with a secure verification library?
	`),
	why: markdown(`
		Passkeys are a more secure alternative to passwords, using public key cryptography
		for authentication. However, the security and gas cost of passkeys depends heavily on the
		implementation, particularly the library used for verification of P256/R1 curve operations.
		
		Using a well-audited and secure verification library is crucial to prevent vulnerabilities
		that could compromise the authentication process. Different libraries offer varying levels
		of security, with some providing more robust protection against potential attacks.
		
		A wallet with a strong passkey implementation using a high-quality verification library
		offers users better protection for their accounts and assets.
	`),
	methodology: markdown(`
		Wallets are evaluated based on the verification library they use for passkey implementation,
		specifically for P256/R1 curve operations.
		
		A wallet receives a passing rating if it uses [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib), which is considered the
		most efficient verification library for passkey verification. [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib) is also audited. The results of the completed audits are in the [doc/audit](https://github.com/get-smooth/crypto-lib/tree/main/doc/Audits) folder.

		A wallet receives a partial rating if it uses [Fresh Crypto Lib](https://github.com/rdubois-crypto/FreshCryptoLib), which is also well-regarded
		A wallet receives a partial rating if it uses Fresh Crypto Lib, which is also well-regarded
		but considered slightly less optimal than [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib).
		
		A wallet receives a lower partial rating if it uses an unaudited less efficient library for passkey
		verification.
		
		A wallet fails this attribute if it either does not implement passkeys or does not use a
		recognized verification library for P256/R1 curve operations.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			mdParagraph(`
				The wallet implements passkeys using [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib), at 159K gas cost it's the most efficient
				verification library for P256/R1 curve operations.
			`),
			smoothCryptoLibImplementation({
				library: PasskeyVerificationLibrary.SMOOTH_CRYPTO_LIB,
				libraryUrl: 'https://github.com/get-smooth/crypto-lib',
			}).value,
		),
		partial: [
			exampleRating(
				mdParagraph(`
					The wallet implements passkeys using [Fresh Crypto Lib](https://github.com/rdubois-crypto/FreshCryptoLib), a well-regarded but suboptimal
					verification library for P256/R1 curve operations.
				`),
				freshCryptoLibImplementation({
					library: PasskeyVerificationLibrary.FRESH_CRYPTO_LIB,
					libraryUrl: 'https://github.com/rdubois-crypto/FreshCryptoLib',
				}).value,
			),
			exampleRating(
				mdParagraph(`
					The wallet implements passkeys using a non audited / less common verification library.
				`),
				otherPasskeyImplementation({
					library: PasskeyVerificationLibrary.OTHER,
				}).value,
			),
		],
		fail: [
			exampleRating(
				mdParagraph(`
					The wallet does not implement passkeys or does not use a recognized
					verification library for P256/R1 curve operations.
				`),
				noPasskeyImplementation().value,
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<PasskeyImplementationValue> => {
		const passkeyVerification = features.security.passkeyVerification
		if (passkeyVerification === null) {
			return unrated(passkeyImplementation, brand, { library: PasskeyVerificationLibrary.NONE })
		}
		
		const { withoutRefs } = popRefs<PasskeyVerificationSupport>(passkeyVerification)
		
		switch (withoutRefs.library) {
			case PasskeyVerificationLibrary.SMOOTH_CRYPTO_LIB:
				return smoothCryptoLibImplementation(withoutRefs)
			case PasskeyVerificationLibrary.FRESH_CRYPTO_LIB:
				return freshCryptoLibImplementation(withoutRefs)
			case PasskeyVerificationLibrary.OTHER:
				return otherPasskeyImplementation(withoutRefs)
			case PasskeyVerificationLibrary.NONE:
			default:
				return noPasskeyImplementation()
		}
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<PasskeyImplementationValue>>) => {
		return pickWorstRating<PasskeyImplementationValue>(perVariant)
	},
} 