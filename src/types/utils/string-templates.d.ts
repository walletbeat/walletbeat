import type { NonEmptyRecord } from './non-empty'

/**
 * Strings is the input to a string template.
 * It should be null if the text does not contain any string keys.
 */
export type Strings = NonEmptyRecord<string, string | null> | null

/**
 * @returns `Ok` if the text contains no invalid string keys, otherwise returns an error message
 */
export type ValidateText<Ok, Text extends string, Strings_ extends Strings> =
	FindInvalidStringKeys<Text, Strings_> extends infer StringKey
		? StringKey extends string
			? [
					`${FormatStringKey<StringKey>} is not a valid string interpolation. Available interpolations:`,
					FormatStringKey<keyof Strings_ & string>,
				]
			: Ok
		: Ok

type FindInvalidStringKeys<Text extends string, Strings_ extends Strings> = Exclude<
	ExtractStringKeys<Text>,
	keyof Strings_
>

type ExtractStringKeys<T extends string> =
	T extends `${infer _Before}${FormatStringKey<infer Key>}${infer After}`
		? Key | ExtractStringKeys<After>
		: never

type FormatStringKey<StringKey extends string> = `{{${StringKey}}}`

/** Infers the required strings type from a template string when no strings object is passed. */
export type StringsFromTemplate<T extends string> =
	ExtractStringKeys<T> extends never ? null : { [K in ExtractStringKeys<T>]: string }
