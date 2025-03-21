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
import {
	PasskeyVerificationLibrary,
	type PasskeyVerificationSupport,
} from '@/schema/features/security/passkey-verification'
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
			libraryUrl:
				support.libraryUrl ||
				'https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol',
			__brand: brand,
		},
		details: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} implements passkeys using [OpenZeppelin P256 verifier](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol),
				a well-audited verification library for P256/R1 curve operations from the respected OpenZeppelin team. This implementation provides strong security guarantees and has been [thoroughly reviewed.](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/audits/2024-10-v5.1.pdf)
			`,
		),
		howToImprove: undefined,
	}
}

function webAuthnSolImplementation(
	support: PasskeyVerificationSupport,
): Evaluation<PasskeyImplementationValue> {
	return {
		value: {
			id: 'web_authn_sol_implementation',
			rating: Rating.PASS,
			displayName: 'Audited passkey implementation (WebAuthn.sol)',
			shortExplanation: mdSentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} implements passkeys using WebAuthn.sol.
				`,
			),
			library: PasskeyVerificationLibrary.WEB_AUTHN_SOL,
			libraryUrl: support.libraryUrl || 'https://github.com/base/webauthn-sol',
			__brand: brand,
		},
		details: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} implements passkeys using WebAuthn.sol from Base, a Solidity library for verifying WebAuthn authentication assertions. It builds on Daimo's WebAuthn.sol.
				This library is optimized for Ethereum layer 2 rollup chains but will work on all EVM chains. Signature verification always attempts to use the RIP-7212 precompile and, if this fails, falls back to using FreshCryptoLib.
				The library has been [audited](https://github.com/coinbase/smart-wallet/tree/main/audits)
			`,
		),
		howToImprove: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} could improve by updating the fallback mechanism to use Smooth Crypto Library instead of FreshCryptoLib for better performance and security.
			`,
		),
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
	question: sentence(
		(walletMetadata: WalletMetadata) =>
			`Does ${walletMetadata.displayName} use a secure and efficient passkey verification library?`,
	),
	why: markdown(`
		Passkeys provide a secure and phishing-resistant way to authenticate users without relying on seed phrases. 
		Using gas-efficient and well-audited libraries for verification is crucial for both security and cost-effectiveness.
		
		P256 signature verification is computationally expensive on-chain, so using optimized libraries reduces transaction costs.
		
		Some verification libraries have undergone multiple security audits while others may have fewer or no publicly available audits.
	`),
	methodology: markdown(`
		Wallets are assessed based on the passkey verification library they use:

		1. **Pass (Best)**: Using the most gas-efficient and well-audited library like:
			- [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib)
			- [Daimo P256 verifier](https://github.com/daimo-eth/p256-verifier)
			- [OpenZeppelin P256 verifier](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol)
			- [WebAuthn.sol](https://github.com/base/webauthn-sol) which falls back to Fresh Crypto Lib

		2. **Partial**: Using libraries that work but are less optimal:
			- [Fresh Crypto Lib](https://github.com/rdubois-crypto/FreshCryptoLib)
			- Other less common verification libraries

		3. **Fail**: Not implementing passkeys or using a non-recognized library.

		Wallets that don't support smart contract accounts or are hardware wallets are exempt from this rating.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				mdParagraph(`
					The wallet implements passkeys using [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib), the most gas-efficient and triple-audited verification library for P256/R1 curve operations.
				`),
				smoothCryptoLibImplementation({
					library: PasskeyVerificationLibrary.SMOOTH_CRYPTO_LIB,
					libraryUrl: 'https://github.com/get-smooth/crypto-lib',
				}).value,
			),
			exampleRating(
				mdParagraph(`
					The wallet implements passkeys using [Daimo P256 verifier](https://github.com/daimo-eth/p256-verifier), which is well-audited and reasonably gas-efficient.
				`),
				daimoP256VerifierImplementation({
					library: PasskeyVerificationLibrary.DAIMO_P256_VERIFIER,
					libraryUrl: 'https://github.com/daimo-eth/p256-verifier',
				}).value,
			),
			exampleRating(
				mdParagraph(`
					The wallet implements passkeys using [OpenZeppelin P256 verifier](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol), a well-audited verification library from a respected team.
				`),
				openZeppelinP256VerifierImplementation({
					library: PasskeyVerificationLibrary.OPEN_ZEPPELIN_P256_VERIFIER,
					libraryUrl:
						'https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol',
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
					The wallet implements passkeys using [WebAuthn.sol](https://github.com/base/webauthn-sol), which builds on Daimo's WebAuthn.sol but falls back to the less efficient FreshCryptoLib.
				`),
				webAuthnSolImplementation({
					library: PasskeyVerificationLibrary.WEB_AUTHN_SOL,
					libraryUrl: 'https://github.com/base/webauthn-sol',
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
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<PasskeyImplementationValue>>) => pickWorstRating<PasskeyImplementationValue>(perVariant),
	evaluate: (features: ResolvedFeatures): Evaluation<PasskeyImplementationValue> => {
		// Hardware wallets don't use passkeys
		if (features.profile === WalletProfile.HARDWARE) {
			return exempt(
				passkeyImplementation,
				sentence(
					(walletMetadata: WalletMetadata) =>
						`This attribute is not applicable for ${walletMetadata.displayName} as it is a hardware wallet and doesn't use passkeys.`,
				),
				brand,
				{ library: PasskeyVerificationLibrary.NONE },
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
				sentence(
					(walletMetadata: WalletMetadata) =>
						`This attribute is not applicable for ${walletMetadata.displayName} as it doesn't implement passkeys.`,
				),
				brand,
				{ library: PasskeyVerificationLibrary.NONE },
			)
		}

		const { withoutRefs, refs: extractedRefs } =
			popRefs<PasskeyVerificationSupport>(passkeyVerification)

		let result: Evaluation<PasskeyImplementationValue>

		switch (withoutRefs.library) {
			case PasskeyVerificationLibrary.SMOOTH_CRYPTO_LIB:
				result = smoothCryptoLibImplementation(withoutRefs)
				break
			case PasskeyVerificationLibrary.DAIMO_P256_VERIFIER:
				result = daimoP256VerifierImplementation(withoutRefs)
				break
			case PasskeyVerificationLibrary.OPEN_ZEPPELIN_P256_VERIFIER:
				result = openZeppelinP256VerifierImplementation(withoutRefs)
				break
			case PasskeyVerificationLibrary.FRESH_CRYPTO_LIB:
				result = freshCryptoLibImplementation(withoutRefs)
				break
			case PasskeyVerificationLibrary.WEB_AUTHN_SOL:
				result = webAuthnSolImplementation(withoutRefs)
				break
			case PasskeyVerificationLibrary.OTHER:
				result = otherPasskeyImplementation(withoutRefs)
				break
			default:
				result = noPasskeyImplementation()
				break
		}

		// Return result with references if any
		return {
			...result,
			...(extractedRefs.length > 0 && { references: extractedRefs }),
		}
	},
}
