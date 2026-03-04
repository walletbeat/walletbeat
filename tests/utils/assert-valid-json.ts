import fs from 'node:fs'
import path from 'node:path'
import * as url from 'node:url'

import Ajv2020 from 'ajv/dist/2020'

const schemaFilePath = path.join(
	path.dirname(url.fileURLToPath(import.meta.url)),
	'../fixtures/rated-wallet-export-schema.json',
)
const schemaJson = fs.readFileSync(schemaFilePath, { encoding: 'utf-8' })
const parsedSchema: unknown = JSON.parse(schemaJson)

if (typeof parsedSchema !== 'object' || parsedSchema === null) {
	throw new Error('Rated wallet export schema must be a JSON object')
}

const schema = parsedSchema

const ajv = new Ajv2020({ allErrors: true })
const validate = ajv.compile(schema)

function jsonSnippet(jsonString: string): string {
	const normalized = jsonString.replaceAll('\n', '\\n')

	return normalized.length > 240 ? `${normalized.slice(0, 240)}...` : normalized
}

function validationErrorMessage(): string {
	const errors = validate.errors ?? []

	return errors
		.map(error => {
			const pointer = error.instancePath === '' ? '/' : error.instancePath
			const suffix = error.message === undefined ? '' : ` ${error.message}`

			return `${pointer}${suffix}`.trim()
		})
		.join('\n')
}

/**
 * Parse JSON and validate it against the rated wallet export JSON schema.
 * Throws with clear parse/validation details when the input is invalid.
 */
export function assertValidJson(jsonString: string) {
	let parsed: unknown

	try {
		parsed = JSON.parse(jsonString)
	} catch (error) {
		throw new Error(`Invalid JSON: ${String(error)}\nSnippet: ${jsonSnippet(jsonString)}`)
	}

	if (!validate(parsed)) {
		throw new Error(`JSON schema validation failed:\n${validationErrorMessage()}`)
	}
}
