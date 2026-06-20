import { Enum } from '@/utils/enum'

export enum StringEntropyCharset {
	/** Digits only. */
	DIGITS = 'DIGITS',

	/** Hexadecimal (case-insensitive). */
	HEX = 'HEX',

	/** All alphanumeric characters, but all letters are either uppercase or lowercase, not a mix. */
	SINGLE_CASE = 'SINGLE_CASE',

	/** Base64. */
	BASE64 = 'BASE64',

	/** All alphanumeric characters, mixed-case. */
	ALPHANUMERIC = 'ALPHANUMERIC',

	/** All printable ASCII characters. */
	ASCII = 'ASCII',

	/** Anything broader than printable ASCII. */
	OTHER = 'OTHER',
}

export const stringEntropyCharset = new Enum<StringEntropyCharset>({
	[StringEntropyCharset.DIGITS]: true,
	[StringEntropyCharset.HEX]: true,
	[StringEntropyCharset.SINGLE_CASE]: true,
	[StringEntropyCharset.ALPHANUMERIC]: true,
	[StringEntropyCharset.BASE64]: true,
	[StringEntropyCharset.ASCII]: true,
	[StringEntropyCharset.OTHER]: true,
})

const CHARSET_RANGES: Record<StringEntropyCharset, Set<string>> = {
	[StringEntropyCharset.DIGITS]: new Set('0123456789'),
	[StringEntropyCharset.HEX]: new Set('0123456789abcdefABCDEF'),
	[StringEntropyCharset.SINGLE_CASE]: new Set(
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_+.:/ ',
	),
	[StringEntropyCharset.BASE64]: new Set(
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
	),
	[StringEntropyCharset.ALPHANUMERIC]: new Set(
		'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_+.:/ ',
	),
	[StringEntropyCharset.ASCII]: new Set(
		' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~',
	),
	[StringEntropyCharset.OTHER]: new Set(),
}

const CHARSET_SIZES: Record<StringEntropyCharset, number> = {
	[StringEntropyCharset.DIGITS]: CHARSET_RANGES[StringEntropyCharset.DIGITS].size,
	[StringEntropyCharset.HEX]: 16,
	[StringEntropyCharset.SINGLE_CASE]: CHARSET_RANGES[StringEntropyCharset.SINGLE_CASE].size - 26,
	[StringEntropyCharset.BASE64]: CHARSET_RANGES[StringEntropyCharset.BASE64].size,
	[StringEntropyCharset.ALPHANUMERIC]: CHARSET_RANGES[StringEntropyCharset.ALPHANUMERIC].size,
	[StringEntropyCharset.ASCII]: CHARSET_RANGES[StringEntropyCharset.ASCII].size,
	[StringEntropyCharset.OTHER]: 256,
}

function findNarrowestCharset(str: string): StringEntropyCharset {
	if (str.length === 0) {
		return StringEntropyCharset.DIGITS
	}

	// Get all unique characters in the string
	const uniqueChars = new Set(str)

	// Check from narrowest to widest
	for (const charset of [
		StringEntropyCharset.DIGITS,
		StringEntropyCharset.HEX,
		StringEntropyCharset.SINGLE_CASE,
		StringEntropyCharset.BASE64,
		StringEntropyCharset.ALPHANUMERIC,
	]) {
		const charsetSet = CHARSET_RANGES[charset]

		if (charsetSet && charsetSet.size > 0) {
			let fits = true

			for (const char of uniqueChars) {
				if (!charsetSet.has(char)) {
					fits = false
					break
				}
			}

			if (fits) {
				// For SINGLE_CASE, additionally verify that letters are only one case
				if (charset === StringEntropyCharset.SINGLE_CASE) {
					let hasUpper = false
					let hasLower = false

					for (const char of uniqueChars) {
						if (char >= 'A' && char <= 'Z') {
							hasUpper = true
						} else if (char >= 'a' && char <= 'z') {
							hasLower = true
						}
					}

					// SINGLE_CASE requires that letters are only one case (not mixed)
					if (hasUpper && hasLower) {
						continue
					}
				}

				return charset
			}
		}
	}

	// Check if all characters are printable ASCII (32-126)
	for (const char of uniqueChars) {
		const code = char.charCodeAt(0)

		if (code < 32 || code > 126) {
			return StringEntropyCharset.OTHER
		}
	}

	return StringEntropyCharset.ASCII
}

function computeShannonEntropy(str: string): number {
	if (str.length === 0) {
		return 0
	}

	// Count character frequencies
	const freqMap = new Map<string, number>()

	for (const char of str) {
		freqMap.set(char, (freqMap.get(char) ?? 0) + 1)
	}

	// Calculate Shannon entropy
	let entropy = 0
	const len = str.length

	for (const [_, count] of freqMap) {
		const p = count / len

		entropy -= p * Math.log2(p)
	}

	return entropy
}

export class StringEntropy {
	public static fromEncoded(s: string): StringEntropy {
		const pattern =
			/^v1:(DIGITS|HEX|SINGLE_CASE|ALPHANUMERIC|BASE64|ASCII|OTHER):([0-9]+\.?[0-9]*)$/
		const match = s.match(pattern)

		if (!match) {
			throw new Error(`Invalid encoded StringEntropy string: ${s}`)
		}

		const charset = stringEntropyCharset.assert(match[1])
		const entropy = parseFloat(match[2])

		return new StringEntropy(charset, entropy)
	}

	public static compute(str: string): StringEntropy {
		// Treat strings prefixed with `0x` as hexadecimal: strip the prefix before computation
		const strippedStr = str.toLowerCase().startsWith('0x') ? str.slice(2) : str

		const charset = findNarrowestCharset(strippedStr)
		const charsetNormalizedStr = ((): string => {
			switch (charset) {
				case StringEntropyCharset.HEX:
					return strippedStr.toLowerCase()
				case StringEntropyCharset.SINGLE_CASE:
					return strippedStr.toLowerCase()
				default:
					return strippedStr
			}
		})()
		const rawEntropy = computeShannonEntropy(charsetNormalizedStr)
		const charsetSize = CHARSET_SIZES[charset]
		const finalEntropy = rawEntropy * Math.sqrt(charsetSize)

		return new StringEntropy(charset, finalEntropy)
	}

	public readonly version = 'v1' as const
	public readonly charset: StringEntropyCharset
	public readonly entropy: number

	private constructor(charset: StringEntropyCharset, entropy: number) {
		this.charset = charset
		this.entropy = entropy
	}

	public encode(): `v1:${StringEntropyCharset}:${string}` {
		return `v1:${this.charset}:${this.entropy.toFixed(20)}`
	}
}
