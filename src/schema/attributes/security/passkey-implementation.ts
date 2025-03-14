import type { ResolvedFeatures } from '@/schema/features'
import {
	Rating,
	type Value,
	type Attribute,
	type Evaluation,
	exampleRating,
} from '@/schema/attributes'
import { pickWorstRating, unrated, exempt } from '../common'
import { markdown, paragraph, sentence, mdParagraph, mdSentence } from '@/types/content'
import type { WalletMetadata } from '@/schema/wallet'
import type { AtLeastOneVariant } from '@/schema/variants'
import { PasskeyVerificationLibrary, type PasskeyVerificationSupport } from '@/schema/features/security/passkey-verification'
import { popRefs } from '@/schema/reference'
import { WalletProfile } from '@/schema/features/profile'

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
			shortExplanation: mdSentence(
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
				such as [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib) 159K gas.
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
			shortExplanation: mdSentence(
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
				and audited verification library such as [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib) (159K gas).
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
			shortExplanation: mdSentence(
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
				${wallet.metadata.displayName} should consider upgrading to [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib) (159K gas),
				which has undergone more extensive [auditing and testing.](https://github.com/get-smooth/crypto-lib/tree/main/doc/Audits)
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
			displayName: 'Audited passkey implementation SCL',
			shortExplanation: mdSentence(
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
				${wallet.metadata.displayName} implements passkeys using [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib), at 159K this the most gas-efficient ( and [triple audited](https://github.com/get-smooth/crypto-lib/tree/main/doc/Audits) verification library for P256/R1 curve operations.
			`,
		),
		howToImprove: undefined,
	}
}

function daimoP256VerifierImplementation(
	support: PasskeyVerificationSupport,
): Evaluation<PasskeyImplementationValue> {
	return {
		value: {
			id: 'daimo_p256_verifier_implementation',
			rating: Rating.PASS,
			displayName: 'Audited passkey implementation (Daimo P256 verifier)',
			shortExplanation: mdSentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} implements passkeys using [Daimo P256 verifier](https://github.com/daimo-eth/p256-verifier).
				`,
			),
			library: PasskeyVerificationLibrary.DAIMO_P256_VERIFIER,
			libraryUrl: support.libraryUrl || 'https://github.com/daimo-eth/p256-verifier',
			__brand: brand,
		},
		details: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} implements passkeys using [Daimo P256 verifier](https://github.com/daimo-eth/p256-verifier),
				a well-audited verification library for P256/R1 curve operations. Costs 330K gas.
			`,
		),
		howToImprove: undefined,
	}
}

function openZeppelinP256VerifierImplementation(
	support: PasskeyVerificationSupport,
): Evaluation<PasskeyImplementationValue> {
	return {
		value: {
			id: 'open_zeppelin_p256_verifier_implementation',
			rating: Rating.PASS,
			displayName: 'Audited passkey implementation (OpenZeppelin P256 verifier)',
			shortExplanation: mdSentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} implements passkeys using [OpenZeppelin P256 verifier.](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol)
				`,
			),
			library: PasskeyVerificationLibrary.OPEN_ZEPPELIN_P256_VERIFIER,
			libraryUrl: support.libraryUrl || 'https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol',
			__brand: brand,
		},
		details: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} implements passkeys using [OpenZeppelin P256 verifier](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol),
				a well-audited verification library for P256/R1 curve operations from the respected OpenZeppelin team. This implementation provides strong security guarantees and has been (thoroughly reviewed.)[https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/audits/2024-10-v5.1.pdf]
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
		
		A wallet receives a passing rating if it uses either [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib), which is a well audited library at 159K gas. 
		[Daimo P256 verifier](https://github.com/daimo-eth/p256-verifier), which is also well-audited but has a higher gas cost at 330K gas. 
		Or [OpenZeppelin P256 verifier](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol),
		which is developed by OpenZeppelin team. 
		
		[Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib) is audited and the results of the completed audits are in the 
		[doc/audit](https://github.com/get-smooth/crypto-lib/tree/main/doc/Audits) folder.

		A wallet receives a partial rating if it uses [Fresh Crypto Lib](https://github.com/rdubois-crypto/FreshCryptoLib), which is also well-regarded
		but considered slightly less optimal than the passing verification libraries.
		
		A wallet receives a lower partial rating if it uses an unaudited less efficient library for passkey
		verification.
		
		A wallet fails this attribute if it either does not implement passkeys or does not use a
		recognized verification library for P256/R1 curve operations.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				mdParagraph(`
					The wallet implements passkeys using [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib), a well audited library at 159K gas.
				`),
				smoothCryptoLibImplementation({
					library: PasskeyVerificationLibrary.SMOOTH_CRYPTO_LIB,
					libraryUrl: 'https://github.com/get-smooth/crypto-lib',
				}).value,
			),
			exampleRating(
				mdParagraph(`
					The wallet implements passkeys using [Daimo P256 verifier](https://github.com/daimo-eth/p256-verifier), a well-audited
					verification library for P256/R1 curve operations with a 330K gas cost.
				`),
				daimoP256VerifierImplementation({
					library: PasskeyVerificationLibrary.DAIMO_P256_VERIFIER,
					libraryUrl: 'https://github.com/daimo-eth/p256-verifier',
				}).value,
			),
			exampleRating(
				mdParagraph(`
					The wallet implements passkeys using [OpenZeppelin P256 verifier](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol), a well-audited
					verification library for P256/R1 curve operations from the OpenZeppelin team.
				`),
				openZeppelinP256VerifierImplementation({
					library: PasskeyVerificationLibrary.OPEN_ZEPPELIN_P256_VERIFIER,
					libraryUrl: 'https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol',
				}).value,
			),
		],
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
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<PasskeyImplementationValue>>) => {
		return pickWorstRating<PasskeyImplementationValue>(perVariant)
	},
	evaluate: (features: ResolvedFeatures): Evaluation<PasskeyImplementationValue> => {
		// Hardware wallets don't use passkeys
		if (features.profile === WalletProfile.HARDWARE) {
			return exempt(
				passkeyImplementation, 
				sentence((walletMetadata: WalletMetadata) => 
					`This attribute is not applicable for ${walletMetadata.displayName} as it is a hardware wallet and doesn't use passkeys.`
				),
				brand,
				{ library: PasskeyVerificationLibrary.NONE }
			)
		}
		
		const passkeyVerification = features.security.passkeyVerification
		if (passkeyVerification === null) {
			return unrated(passkeyImplementation, brand, { library: PasskeyVerificationLibrary.NONE })
		}
		
		// If the library is explicitly set to NONE, this means the wallet doesn't support passkeys
		// This handles EOA-only wallets like Frame, Rabby, Rainbow, etc.
		if (passkeyVerification.library === PasskeyVerificationLibrary.NONE) {
			return exempt(
				passkeyImplementation, 
				sentence((walletMetadata: WalletMetadata) => 
					`This attribute is not applicable for ${walletMetadata.displayName} as it doesn't implement passkeys.`
				),
				brand,
				{ library: PasskeyVerificationLibrary.NONE }
			)
		}
		
		const { withoutRefs, refs: extractedRefs } = popRefs<PasskeyVerificationSupport>(passkeyVerification)
		
		let result: Evaluation<PasskeyImplementationValue>;
		
		switch (withoutRefs.library) {
			case PasskeyVerificationLibrary.SMOOTH_CRYPTO_LIB:
				result = smoothCryptoLibImplementation(withoutRefs);
				break;
			case PasskeyVerificationLibrary.DAIMO_P256_VERIFIER:
				result = daimoP256VerifierImplementation(withoutRefs);
				break;
			case PasskeyVerificationLibrary.OPEN_ZEPPELIN_P256_VERIFIER:
				result = openZeppelinP256VerifierImplementation(withoutRefs);
				break;
			case PasskeyVerificationLibrary.FRESH_CRYPTO_LIB:
				result = freshCryptoLibImplementation(withoutRefs);
				break;
			case PasskeyVerificationLibrary.OTHER:
				result = otherPasskeyImplementation(withoutRefs);
				break;
			default:
				result = noPasskeyImplementation();
				break;
		}
		
		// Return result with references if any
		return {
			...result,
			...(extractedRefs.length > 0 && { references: extractedRefs }),
		};
	},
} 