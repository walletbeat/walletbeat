import fs from 'node:fs'
import path from 'node:path'

import Ajv2020 from 'ajv/dist/2020'

import { ratedWalletExportSchemaPath } from '@/constants'

import { getRepositoryRoot } from './codebase'

function readRatedWalletExportSchema(): object {
	const schemaFilePath = path.join(getRepositoryRoot(), 'public', ratedWalletExportSchemaPath)
	const schemaJson = fs.readFileSync(schemaFilePath, { encoding: 'utf-8' })
	const parsedSchema: unknown = JSON.parse(schemaJson)

	if (typeof parsedSchema !== 'object' || parsedSchema === null) {
		throw new Error('Rated wallet export schema must be a JSON object')
	}

	return parsedSchema
}

/**
 * Encapsulates the rated wallet export JSON schema and a single AJV validator instance.
 * Each instance has its own validator so that validate.errors is not shared across callers.
 */
class RatedWalletExportValidator {
	private readonly validate: ReturnType<Ajv2020['compile']>

	constructor() {
		const ajv = new Ajv2020({ allErrors: true })

		this.validate = ajv.compile(readRatedWalletExportSchema())
	}

	private jsonSnippet(jsonString: string): string {
		const normalized = jsonString.replaceAll('\n', '\\n')

		return normalized.length > 240 ? `${normalized.slice(0, 240)}...` : normalized
	}

	private validationErrorMessage(): string {
		const errors = this.validate.errors ?? []

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
	assert(jsonString: string): void {
		let parsed: unknown

		try {
			parsed = JSON.parse(jsonString)
		} catch (error) {
			throw new Error(`Invalid JSON: ${String(error)}\nSnippet: ${this.jsonSnippet(jsonString)}`, {
				cause: error,
			})
		}

		if (!this.validate(parsed)) {
			throw new Error(`JSON schema validation failed:\n${this.validationErrorMessage()}`)
		}
	}
}

/**
 * Validates one structured-details payload against the published
 * `structuredDetails` definition, so every variant is checked directly rather
 * than only through a whole wallet export that happens to contain it.
 */
function assertValidStructuredDetails(details: unknown): void {
	const ajv = new Ajv2020({ allErrors: true })

	ajv.addSchema(readRatedWalletExportSchema(), 'ratedWalletExport')

	const validate = ajv.compile({ $ref: 'ratedWalletExport#/$defs/structuredDetails' })

	if (!validate(details)) {
		const errors = validate.errors ?? []

		throw new Error(
			`Structured details failed schema validation:\n${errors
				.map(error =>
					`${error.instancePath === '' ? '/' : error.instancePath} ${error.message ?? ''}`.trim(),
				)
				.join('\n')}`,
		)
	}
}

export { assertValidStructuredDetails, RatedWalletExportValidator }
