export type Strings = Record<string, any>

/**
 * @returns `Ok` if the text contains no invalid string keys, otherwise returns an error message
 */
export type ValidateText<
	Ok,
	Text extends string,
	Strings_ extends Strings,
> = (
	FindInvalidStringKeys<Text, Strings_> extends infer StringKey ?
		StringKey extends string ?
			[`${FormatStringKey<StringKey>} is not a valid string interpolation. Available interpolations:`, FormatStringKey<keyof Strings_ & string>]
		:
			Ok
	:
		Ok
)

type FindInvalidStringKeys<
	Text extends string,
	Strings_ extends Strings
> = (
	Exclude<ExtractStringKeys<Text>, keyof Strings_>
)

type ExtractStringKeys<T extends string> = (
	T extends `${infer Before}${FormatStringKeyWithFallback<infer Key, infer Fallback>}${infer After}` ?
		| Key
		| (Fallback extends string ? ExtractStringKeys<Fallback> : never)
		| ExtractStringKeys<After>
	:
		never
)

type FormatStringKey<StringKey extends string> = (
	`{{${StringKey}}}`
)

type FormatStringKeyWithFallback<
	StringKey extends string,
	Fallback extends string | any
> = (
	`{{${Fallback extends string ? `${StringKey}|${Fallback}` : StringKey}}}`
)
