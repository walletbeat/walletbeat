export type Strings = Record<string, any>

/**
 * @returns `Ok` if the text contains no invalid string keys, otherwise returns an error message
 */
export type ValidateText<
	Ok,
	Text extends string,
	Strings_ extends Strings,
> = (
	FindFirstInvalidStringKey<Text, Strings_> extends infer StringKey ?
		StringKey extends string ?
			[`${FormatStringKey<StringKey>} is not a valid string interpolation. Available interpolations:`, FormatStringKey<keyof Strings_ & string>]
		:
			Ok
	:
		Ok
)

type FindFirstInvalidStringKey<
	Text extends string,
	Strings_ extends Strings
> = (
	ExtractStringKeys<Text> extends infer StringKeys ?
		StringKeys extends keyof Strings_ ?
			never
		:
			StringKeys
	:
		never
)

type ExtractStringKeys<T extends string> = (
	T extends `${infer _Before}${FormatStringKey<infer StringKey>}${infer After}` ?
		StringKey | ExtractStringKeys<After>
	:
		never
)

type FormatStringKey<StringKey extends string> = (
	`{{${StringKey}}}`
)
