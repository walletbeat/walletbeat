import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import {
	PasskeyVerificationLibrary,
	type PasskeyVerificationSupport,
} from '@/schema/features/security/passkey-verification'
import { isSupported } from '@/schema/features/support'
import { popRefs } from '@/schema/reference'
import { type AtLeastOneVariant } from '@/schema/variants'
import { WalletType } from '@/schema/wallet-types'
import { markdown, mdParagraph, mdSentence, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

const brand = 'attributes.security.passkey_implementation'

export type PasskeyImplementationValue = Value & {
	library: PasskeyVerificationLibrary | null
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
				'{{WALLET_NAME}} does not implement passkeys or does not use a recognized verification library.',
			),
			library: null,
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} either does not implement passkeys or does not use a recognized verification library for P256/R1 curve operations. Passkeys provide a more secure authentication method than traditional passwords, but proper implementation is crucial for security.',
		),
		howToImprove: mdParagraph(
			'{{WALLET_NAME}} should implement passkeys using a well-audited verification library such as [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib) 159K gas.',
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
				'{{WALLET_NAME}} implements passkeys with a less common verification library.',
			),
			library: PasskeyVerificationLibrary.OTHER,
			libraryUrl: support.libraryUrl,
			__brand: brand,
		},
		details: paragraph(
			'{{WALLET_NAME}} implements passkeys using a less common verification library. While this provides better security than no passkey support, using a well-audited and widely recognized library would provide stronger security guarantees.',
		),
		howToImprove: mdParagraph(
			'{{WALLET_NAME}} should consider upgrading to a more widely recognized and audited verification library such as [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib) (159K gas).',
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
				'{{WALLET_NAME}} implements passkeys using [Fresh Crypto Lib](https://github.com/rdubois-crypto/FreshCryptoLib).',
			),
			library: PasskeyVerificationLibrary.FRESH_CRYPTO_LIB,
			libraryUrl:
				support.libraryUrl !== undefined && support.libraryUrl !== ''
					? support.libraryUrl
					: 'https://github.com/rdubois-crypto/FreshCryptoLib',
			__brand: brand,
		},
		details: mdParagraph(
			'{{WALLET_NAME}} implements passkeys using [Fresh Crypto Lib](https://github.com/rdubois-crypto/FreshCryptoLib). While this is a well-regarded library, it has not undergone as extensive auditing and testing as [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib).',
		),
		howToImprove: mdParagraph(
			'{{WALLET_NAME}} should consider upgrading to [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib) (159K gas), which has undergone more extensive [auditing and testing.](https://github.com/get-smooth/crypto-lib/tree/main/doc/Audits)',
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
			displayName: 'Audited passkey implementation: Smooth Crypto Lib',
			shortExplanation: mdSentence(
				'{{WALLET_NAME}} implements passkeys using [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib).',
			),
			library: PasskeyVerificationLibrary.SMOOTH_CRYPTO_LIB,
			libraryUrl:
				support.libraryUrl !== undefined && support.libraryUrl !== ''
					? support.libraryUrl
					: 'https://github.com/get-smooth/crypto-lib',
			__brand: brand,
		},
		details: mdParagraph(
			'{{WALLET_NAME}} implements passkeys using [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib), at 159K this the most gas-efficient ( and [triple audited](https://github.com/get-smooth/crypto-lib/tree/main/doc/Audits) verification library for P256/R1 curve operations.',
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
				'{{WALLET_NAME}} implements passkeys using [Daimo P256 verifier](https://github.com/daimo-eth/p256-verifier).',
			),
			library: PasskeyVerificationLibrary.DAIMO_P256_VERIFIER,
			libraryUrl:
				support.libraryUrl !== undefined && support.libraryUrl !== ''
					? support.libraryUrl
					: 'https://github.com/daimo-eth/p256-verifier',
			__brand: brand,
		},
		details: mdParagraph(
			'{{WALLET_NAME}} implements passkeys using [Daimo P256 verifier](https://github.com/daimo-eth/p256-verifier), a well-audited verification library for P256/R1 curve operations. Costs 330K gas.',
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
				'{{WALLET_NAME}} implements passkeys using [OpenZeppelin P256 verifier.](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol)',
			),
			library: PasskeyVerificationLibrary.OPEN_ZEPPELIN_P256_VERIFIER,
			libraryUrl:
				support.libraryUrl !== undefined && support.libraryUrl !== ''
					? support.libraryUrl
					: 'https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol',
			__brand: brand,
		},
		details: mdParagraph(
			'{{WALLET_NAME}} implements passkeys using [OpenZeppelin P256 verifier](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol), a well-audited verification library for P256/R1 curve operations from the respected OpenZeppelin team. This implementation provides strong security guarantees and has been [thoroughly reviewed.](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/audits/2024-10-v5.1.pdf)',
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
			shortExplanation: mdSentence('{{WALLET_NAME}} implements passkeys using WebAuthn.sol.'),
			library: PasskeyVerificationLibrary.WEB_AUTHN_SOL,
			libraryUrl:
				support.libraryUrl !== undefined && support.libraryUrl !== ''
					? support.libraryUrl
					: 'https://github.com/base/webauthn-sol',
			__brand: brand,
		},
		details: mdParagraph(
			"{{WALLET_NAME}} implements passkeys using WebAuthn.sol from Base, a Solidity library for verifying WebAuthn authentication assertions. It builds on Daimo's WebAuthn.sol. This library is optimized for Ethereum layer 2 rollup chains but will work on all EVM chains. Signature verification always attempts to use the RIP-7212 precompile and, if this fails, falls back to using FreshCryptoLib. The library has been [audited](https://github.com/coinbase/smart-wallet/tree/main/audits)",
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
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do to improve its passkey implementation?',
		),
	},
	question: sentence(
		'Does {{WALLET_NAME}} use a secure and efficient passkey verification library?',
	),
	why: markdown(`
		Passkeys provide a secure and phishing-resistant way to authenticate users without relying on seed phrases. 
		Using gas-efficient and well-audited libraries for verification is crucial both for security and cost-effectiveness.
		
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
				mdParagraph(
					'The wallet implements passkeys using [Smooth Crypto Lib](https://github.com/get-smooth/crypto-lib), the most gas-efficient and triple-audited verification library for P256/R1 curve operations.',
				),
				smoothCryptoLibImplementation({
					library: PasskeyVerificationLibrary.SMOOTH_CRYPTO_LIB,
					libraryUrl: 'https://github.com/get-smooth/crypto-lib',
				}),
			),
			exampleRating(
				mdParagraph(
					'The wallet implements passkeys using [Daimo P256 verifier](https://github.com/daimo-eth/p256-verifier), which is well-audited and reasonably gas-efficient.',
				),
				daimoP256VerifierImplementation({
					library: PasskeyVerificationLibrary.DAIMO_P256_VERIFIER,
					libraryUrl: 'https://github.com/daimo-eth/p256-verifier',
				}),
			),
			exampleRating(
				mdParagraph(
					'The wallet implements passkeys using [OpenZeppelin P256 verifier](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol), a well-audited verification library from a respected team.',
				),
				openZeppelinP256VerifierImplementation({
					library: PasskeyVerificationLibrary.OPEN_ZEPPELIN_P256_VERIFIER,
					libraryUrl:
						'https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/P256.sol',
				}),
			),
			exampleRating(
				mdParagraph(
					"The wallet implements passkeys using [WebAuthn.sol](https://github.com/base/webauthn-sol), which builds on Daimo's WebAuthn.sol but falls back to the FreshCryptoLib.",
				),
				webAuthnSolImplementation({
					library: PasskeyVerificationLibrary.WEB_AUTHN_SOL,
					libraryUrl: 'https://github.com/base/webauthn-sol',
				}),
			),
		],
		partial: [
			exampleRating(
				mdParagraph(
					'The wallet implements passkeys using [Fresh Crypto Lib](https://github.com/rdubois-crypto/FreshCryptoLib), a well-regarded but suboptimal verification library for P256/R1 curve operations.',
				),
				freshCryptoLibImplementation({
					library: PasskeyVerificationLibrary.FRESH_CRYPTO_LIB,
					libraryUrl: 'https://github.com/rdubois-crypto/FreshCryptoLib',
				}),
			),
			exampleRating(
				mdSentence(
					'The wallet implements passkeys using a non audited / less common verification library.',
				),
				otherPasskeyImplementation({
					library: PasskeyVerificationLibrary.OTHER,
				}),
			),
		],
		fail: [
			exampleRating(
				mdParagraph(
					'The wallet does not implement passkeys or does not use a recognized verification library for P256/R1 curve operations.',
				),
				noPasskeyImplementation(),
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<PasskeyImplementationValue>>) =>
		pickWorstRating<PasskeyImplementationValue>(perVariant),
	evaluate: (features: ResolvedFeatures): Evaluation<PasskeyImplementationValue> => {
		// Hardware wallets don't use passkeys
		if (features.type === WalletType.HARDWARE) {
			return exempt(
				passkeyImplementation,
				sentence(
					"This attribute is not applicable for {{WALLET_NAME}} as it is a hardware wallet and doesn't use passkeys.",
				),
				brand,
				{ library: null },
			)
		}

		const passkeyVerification = features.security.passkeyVerification

		if (passkeyVerification === null) {
			return unrated(passkeyImplementation, brand, { library: null })
		}

		if (!isSupported(passkeyVerification)) {
			return noPasskeyImplementation()
		}

		// If the library is explicitly set to NONE, this means the wallet doesn't support passkeys
		// This handles EOA-only wallets like Frame, Rabby, Rainbow, etc.
		if (passkeyVerification.library === null) {
			return exempt(
				passkeyImplementation,
				sentence(
					"This attribute is not applicable for {{WALLET_NAME}} as it doesn't implement passkeys.",
				),
				brand,
				{ library: null },
			)
		}

		const { withoutRefs, refs: extractedRefs } =
			popRefs<PasskeyVerificationSupport>(passkeyVerification)

		const result = ((): Evaluation<PasskeyImplementationValue> => {
			switch (withoutRefs.library) {
				case PasskeyVerificationLibrary.SMOOTH_CRYPTO_LIB:
					return smoothCryptoLibImplementation(withoutRefs)
				case PasskeyVerificationLibrary.DAIMO_P256_VERIFIER:
					return daimoP256VerifierImplementation(withoutRefs)
				case PasskeyVerificationLibrary.OPEN_ZEPPELIN_P256_VERIFIER:
					return openZeppelinP256VerifierImplementation(withoutRefs)
				case PasskeyVerificationLibrary.FRESH_CRYPTO_LIB:
					return freshCryptoLibImplementation(withoutRefs)
				case PasskeyVerificationLibrary.WEB_AUTHN_SOL:
					return webAuthnSolImplementation(withoutRefs)
				case PasskeyVerificationLibrary.OTHER:
					return otherPasskeyImplementation(withoutRefs)
				default:
					return noPasskeyImplementation()
			}
		})()

		// Return result with references if any
		return {
			...result,
			...(extractedRefs.length > 0 && { references: extractedRefs }),
		}
	},
}
