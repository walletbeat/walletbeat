/**
 * Dict forces TypeScript to treat a type as a dictionary.
 * This removes index types and that means the type will not accept
 * additional properties.
 * See: https://stackoverflow.com/questions/37006008/typescript-index-signature-is-missing-in-type
 */
export type Dict<T> = {
	[K in keyof T]: T[K]
}
