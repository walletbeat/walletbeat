import chalk from 'chalk'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import process from 'process'
import prompts from 'prompts'
import { fileURLToPath } from 'url'

import { type EntityId, isValidEntityId } from '@/data/entities'
import {
	assertValidDomainToEntityIdMapping,
	entityForDomain,
} from '@/data/entities/domains/entity-domains'
import { allWallets, isValidWalletName, type WalletName } from '@/data/wallets'
import {
	CollectionPolicy,
	collectionPolicyEnum,
	collectionPolicyExplanation,
	DataCollectionPurpose,
	dataCollectionPurpose,
	dataCollectionPurposeToText,
	UserFlow,
	type UserInfo,
	userInfoEnums,
	userInfoName,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import { type Variant, variantEnum } from '@/schema/variants'
import { WalletType, walletTypes } from '@/schema/wallet-types'
import { getErrorMessage } from '@/types/errors'
import { type Erc55Address, ethereumErc55Address } from '@/types/utils/ethereum-address'
import {
	isNonEmptyArray,
	type NonEmptyArray,
	nonEmptyMap,
	type NonEmptySet,
	nonEmptySetFromArray,
	setContains,
	setItems,
} from '@/types/utils/non-empty'
import { Enum } from '@/utils/enum'

import {
	type SaveOptions,
	WalletCaptureAnnotations,
	WalletRequestMatcher,
} from './wallet-capture-annotations'
import {
	flowsNotRequiringWalletAddress,
	type RecordedFlow,
	recordedFlow,
	RecordedOnlyFlow,
	type UserDataDict,
	UserDataString,
	WalletCaptureFile,
	WalletCaptureIssue,
	WalletDataString,
	WalletDataStrings,
	WalletRequest,
	WalletRequestReview,
} from './wallet-capture-file'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function flowInstructions(flow: RecordedFlow): string {
	switch (flow) {
		case RecordedOnlyFlow.IDLE_PRE_INSTALL:
			return 'Leave the browser or device open for a few minutes.'
		case UserFlow.INSTALL:
			return 'Open the wallet download page and install the wallet.'
		case UserFlow.ONBOARDING_NEW:
			return 'Create two new user accounts in the wallet.'
		case UserFlow.ONBOARDING_IMPORT:
			return 'Import two user accounts into the wallet, one of which must already have some Ether and USDC.'
		case UserFlow.SEND_ETHER:
			return 'Send Ether from one account to the other.'
		case UserFlow.SEND_USDC:
			return 'Send USDC from one account to the other.'
		case UserFlow.NATIVE_SWAP:
			return 'Perform a built-in token swap from Ether to USDC.'
		case UserFlow.APP_CONNECTION:
			return 'Connect to the Walletbeat test page.'
		case UserFlow.MAKE_TRANSACTION:
			return 'Send a transaction using the Walletbeat test page.'
	}
}

export function getNextFlow(flow: RecordedFlow): RecordedFlow | 'DONE' {
	switch (flow) {
		case RecordedOnlyFlow.IDLE_PRE_INSTALL:
			return UserFlow.INSTALL
		case UserFlow.INSTALL:
			return UserFlow.ONBOARDING_NEW
		case UserFlow.ONBOARDING_NEW:
			return UserFlow.ONBOARDING_IMPORT
		case UserFlow.ONBOARDING_IMPORT:
			return UserFlow.SEND_ETHER
		case UserFlow.SEND_ETHER:
			return UserFlow.SEND_USDC
		case UserFlow.SEND_USDC:
			return UserFlow.NATIVE_SWAP
		case UserFlow.NATIVE_SWAP:
			return UserFlow.APP_CONNECTION
		case UserFlow.APP_CONNECTION:
			return UserFlow.MAKE_TRANSACTION
		case UserFlow.MAKE_TRANSACTION:
			return 'DONE'
	}
}

// ============================================================================
// Option Interfaces
// ============================================================================

type Option<O> = (x: unknown) => Promise<O>

function optionOneOf<O1, O2>(opt1: Option<O1>, opt2: Option<O2>): Option<O1 | O2> {
	return async (x: unknown): Promise<O1 | O2> => {
		try {
			return await opt1(x)
		} catch (e1) {
			try {
				return await opt2(x)
			} catch (e2) {
				throw new Error(`${getErrorMessage(e1)} & ${getErrorMessage(e2)}`)
			}
		}
	}
}

async function stringOption(x: unknown): Promise<string> {
	if (x === undefined) {
		throw new Error('flag not specified')
	}

	if (typeof x !== 'string') {
		throw new Error(`not a string (got ${typeof x}: ${JSON.stringify(x)})`)
	}

	return await Promise.resolve(x)
}

function typedStringOption<T extends string>(
	typeName: string,
	predicate: (s: string) => s is T,
	helpText: string,
): Option<T> {
	return async (x: unknown): Promise<T> => {
		const s = await stringOption(x)

		if (!predicate(s)) {
			throw new Error(
				`not a valid ${typeName}: '${s}'${helpText !== '' ? ' (' + helpText + ')' : ''}`,
			)
		}

		return s
	}
}

async function stringListOption(x: unknown): Promise<NonEmptyArray<string>> {
	if (x === undefined) {
		throw new Error('flag not specified')
	}

	if (typeof x !== 'string') {
		throw new Error(`not a string (got ${typeof x})`)
	}

	const split = x
		.split(',')
		.map(v => v.trim())
		.filter(v => v !== '')

	if (!isNonEmptyArray(split)) {
		throw new Error('nothing specified')
	}

	return await Promise.resolve(split)
}

async function walletAddressesSet(x: unknown): Promise<NonEmptySet<Erc55Address>> {
	const set = nonEmptySetFromArray(nonEmptyMap(await stringListOption(x), ethereumErc55Address))

	if (setItems(set).length < 4) {
		throw new Error(
			'Wallet addresses list must contain at least 4 addresses (2 that you created using the wallet onboarding + 2 that you are importing)',
		)
	}

	return set
}

async function booleanOption(x: unknown): Promise<boolean> {
	if (x === undefined) {
		throw new Error('flag not specified')
	}

	if (typeof x !== 'string') {
		throw new Error(`not a string (got ${typeof x})`)
	}

	const lower = x.toLowerCase()

	if (lower !== 'true' && lower !== 'yes' && lower !== 'false' && lower !== 'no') {
		throw new Error(`"${x}": not a valid boolean (want either "true" or "false")`)
	}

	return await Promise.resolve(lower == 'true' || lower === 'yes')
}

async function numberOption(x: unknown): Promise<number> {
	if (x === undefined) {
		throw new Error('flag not specified')
	}

	if (typeof x === 'number') {
		return x
	}

	if (typeof x === 'string' && x.trim() !== '') {
		const n = Number(x)

		if (Number.isFinite(n)) {
			return await Promise.resolve(n)
		}
	}

	throw new Error('not a number')
}

function enumOption<E extends string>(e: Enum<E>): Option<E> {
	return async (x: unknown): Promise<E> => {
		if (x === undefined) {
			throw new Error('flag not specified')
		}

		if (typeof x !== 'string') {
			throw new Error(`not a string (got ${typeof x})`)
		}

		if (!e.is(x)) {
			const upper = x.toUpperCase()

			if (e.is(upper)) {
				return upper
			}

			throw new Error(`invalid: "${x}" (must be one of: ${e.items.join(', ')})`)
		}

		return await Promise.resolve(x)
	}
}

function enumSetOption<E extends string>(e: Enum<E>): Option<NonEmptySet<E>> {
	return async (x: unknown): Promise<NonEmptySet<E>> => {
		if (x === undefined) {
			throw new Error('flag not specified')
		}

		if (typeof x !== 'string') {
			throw new Error(`not a string (got ${typeof x})`)
		}

		const items: E[] = []

		for (const val of x.split(',')) {
			const trimmed = val.trim()

			if (trimmed === '') {
				continue
			}

			if (!e.is(trimmed)) {
				const upper = trimmed.toUpperCase()

				if (e.is(upper)) {
					items.push(upper)
					continue
				}

				throw new Error(`invalid: "${trimmed}" (must be one of: ${e.items.join(', ')})`)
			}

			items.push(trimmed)
		}

		if (!isNonEmptyArray(items)) {
			throw new Error('need at least one item')
		}

		return await Promise.resolve(nonEmptySetFromArray(items))
	}
}

/**
 * Checks if a string value is one that `cac` would coerce to a JavaScript number.
 * `cac` uses JavaScript's `Number()` internally, which accepts:
 * - Plain integers and decimals (123, -45.6)
 * - Hex literals (0xabcd, 0XABCDEF)
 * - Scientific notation (1e10, 1.5e-3)
 * - Special values (Infinity, -Infinity, NaN)
 */
function looksLikeCoercibleNumber(s: string): boolean {
	const trimmed = s.trim()

	if (trimmed === '') {
		return false
	}

	// Check special values first
	if (trimmed === 'Infinity' || trimmed === '-Infinity' || trimmed === 'NaN') {
		return true
	}

	// Check hex literals (0x or 0X prefix followed by hex digits)
	if (/^0[xX][0-9a-fA-F]+$/.test(trimmed)) {
		return true
	}

	// Check if Number() parses it as a finite number or NaN
	const n = Number(trimmed)

	return !Number.isNaN(n)
}

/**
 * Recovers the raw string value for a CLI flag from `process.argv`.
 * Supports both `--fieldName=value` and `--fieldName value` formats.
 * Returns `null` if the flag is not found in `process.argv`.
 */
function recoverRawArgValue(fieldName: string): string | null {
	const flagEquals = `--${fieldName}=`
	const flagSpace = `--${fieldName}`

	for (let i = 0; i < process.argv.length; i++) {
		const arg = process.argv[i]

		// Check --fieldName=value format
		if (arg.startsWith(flagEquals) && arg.length > flagEquals.length) {
			return arg.slice(flagEquals.length)
		}

		// Check --fieldName value format
		if (arg === flagSpace && i + 1 < process.argv.length) {
			const next = process.argv[i + 1]

			// If the next arg looks like another flag, the value was not provided
			if (next.startsWith('-')) {
				return null
			}

			return next
		}
	}

	return null
}

function optionalOption<O>(nonOptional: Option<O>): Option<O | null> {
	return async (x: unknown): Promise<O | null> => {
		if (x === undefined || x === null) {
			return null
		}

		return await nonOptional(x)
	}
}

class Options<T extends object> {
	private fields: Partial<{ [K in keyof T]: Option<T[K]> }>
	private chained: Options<object> | null
	constructor(fields: Partial<{ [K in keyof T]: Option<T[K]> }>, chained?: Options<object>) {
		this.fields = fields
		this.chained = chained === undefined ? null : chained
	}
	public async process(x: unknown): Promise<T> {
		if (x === null || x === undefined) {
			throw new Error('provided null options')
		}

		if (typeof x !== 'object') {
			throw new Error('provided non-object')
		}

		// Pre-process: recover raw string values from process.argv for fields
		// that `cac` incorrectly coerced to numbers (e.g., hex strings like 0x...).
		const input = x as Partial<Record<keyof T, unknown>>
		const fieldNames = Object.keys(this.fields)

		for (const fieldName of fieldNames) {
			if (!Object.hasOwn(this.fields, fieldName) || typeof fieldName !== 'string') {
				throw new Error(`unexpected non-string argument name: ${String(fieldName)}`)
			}

			const value = input[fieldName]

			if (typeof value === 'number') {
				const rawValue = recoverRawArgValue(fieldName)

				if (rawValue === null) {
					throw new Error(
						`Flag --${fieldName.toString()}: cac coerced this value to a number, ` +
							'but the original flag could not be found in process.argv',
					)
				}

				if (!looksLikeCoercibleNumber(rawValue)) {
					throw new Error(
						`Flag --${fieldName.toString()}: cac coerced this value to a number, ` +
							`but the original value '${rawValue}' does not look like a number-like string`,
					)
				}

				input[fieldName] = rawValue
			}
		}

		let result: Partial<T> = {}

		if (this.chained !== null) {
			const culled: Partial<T> = {}

			for (const fieldName of Object.keys(x)) {
				if (!Object.hasOwn(this.fields, fieldName)) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we just checked it is in this.fields.
					culled[fieldName as keyof T] = (x as Partial<T>)[fieldName as keyof T]
				}
			}
			result = { ...result, ...(await this.chained.process(culled)) }
		}

		for (const fieldName of Object.keys(x)) {
			if (fieldName === '--') {
				continue
			}

			if (!Object.hasOwn(this.fields, fieldName) && !Object.hasOwn(result, fieldName)) {
				throw new Error(`invalid option: ${fieldName}`)
			}
		}

		for (const fieldName of fieldNames) {
			const option = this.fields[fieldName]

			if (option === undefined) {
				throw new Error(`unexpected field ${fieldName.toString()}`)
			}

			try {
				const processed = await option(input[fieldName])

				result = { [fieldName]: processed, ...result }
			} catch (e) {
				throw new Error(`Flag --${fieldName.toString()}: ${getErrorMessage(e)}`)
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We assume that all fields were enumerated by now.
		return result as T
	}
}

export interface GlobalOptions {
	id: WalletName
	variant: Variant
	type: WalletType
}

export const globalOptions = new Options<GlobalOptions>({
	id: async (x: unknown): Promise<WalletName> => {
		if (x === undefined) {
			throw new Error('must specify wallet ID')
		}

		if (typeof x !== 'string') {
			throw new Error(`not a string (got ${typeof x})`)
		}

		if (x === '') {
			throw new Error('must specify wallet ID')
		}

		if (!isValidWalletName(x)) {
			throw new Error(`not a valid wallet ID: ${x}`)
		}

		return await Promise.resolve(x)
	},
	variant: enumOption(variantEnum),
	type: enumOption(walletTypes),
})

export async function getSaveOptions(opts: GlobalOptions): Promise<SaveOptions> {
	return await Promise.resolve({
		verifyExisting: false,
		walletId: opts.id,
		walletVariants: allWallets[opts.id].variants,
	})
}

export function getCommandPrefix(opts: GlobalOptions): string {
	return `pnpm wallet-data-collection --id=${opts.id} --variant=${opts.variant}${opts.type === WalletType.SOFTWARE ? '' : ` --type=${opts.type}`}`
}

export interface CaptureOptions extends GlobalOptions {
	flow: RecordedFlow
	walletAddresses: NonEmptySet<Erc55Address> | null
	port: number
}

export const captureOptions = new Options<CaptureOptions>(
	{
		flow: enumOption(recordedFlow),
		walletAddresses: optionalOption(walletAddressesSet),
		port: numberOption,
	},
	globalOptions,
)

export interface DeleteCaptureOptions extends GlobalOptions {
	session: number
}

export const deleteCaptureOptions = new Options<DeleteCaptureOptions>(
	{
		session: numberOption,
	},
	globalOptions,
)

export interface MarkFlowUnsupportedOptions extends GlobalOptions {
	flow: RecordedFlow
}

export const markFlowUnsupportedOptions = new Options<MarkFlowUnsupportedOptions>(
	{
		flow: enumOption(recordedFlow),
	},
	globalOptions,
)

export interface MarkStringOptions extends GlobalOptions {
	string: string
	data: NonEmptySet<UserInfo> | 'BENIGN'
	global: boolean | null
}

export const markStringOptions = new Options<MarkStringOptions>(
	{
		string: stringOption,
		data: optionOneOf(
			enumSetOption(userInfoEnums),
			typedStringOption('BENIGN', (s: string): s is 'BENIGN' => s === 'BENIGN', ''),
		),
		global: optionalOption(booleanOption),
	},
	globalOptions,
)

export interface MarkDomainOptions extends GlobalOptions {
	domain: string
	entity: EntityId
}

export const markDomainOptions = new Options<MarkDomainOptions>(
	{
		domain: stringOption,
		entity: typedStringOption(
			'entity ID',
			isValidEntityId,
			'ensure the entity is registered in `/data/entities.ts` → `allEntities`',
		),
	},
	globalOptions,
)

export interface ExplainRequestOptions extends GlobalOptions {
	domain: string
	path: string | null
	method: string | null
	purposes: NonEmptySet<DataCollectionPurpose> | 'NOT_WALLET_INITIATED'
	policy: CollectionPolicy | null
	global: boolean | null
	force: boolean | null
}

export const explainRequestOptions = new Options<ExplainRequestOptions>(
	{
		domain: stringOption,
		path: optionalOption(stringOption),
		method: optionalOption(stringOption),
		purposes: optionOneOf(
			enumSetOption(dataCollectionPurpose),
			typedStringOption(
				'NOT_WALLET_INITIATED',
				(s: string): s is 'NOT_WALLET_INITIATED' => s === 'NOT_WALLET_INITIATED',
				'',
			),
		),
		policy: optionalOption(enumOption(collectionPolicyEnum)),
		global: optionalOption(booleanOption),
		force: optionalOption(booleanOption),
	},
	globalOptions,
)

function scriptDir(): string {
	return __dirname
}

function repoDir(): string {
	return path.join(scriptDir(), '../../..')
}

function capturePath(options: GlobalOptions): string {
	const { type, id, variant } = options

	return `data/${type.toLocaleLowerCase()}-wallets/collection/${id.toLocaleLowerCase()}/${id.toLocaleLowerCase()}.${variant.toLocaleLowerCase()}.capture.json`
}

function annotationsPath(options: GlobalOptions): string {
	const { type, id } = options

	return `data/${type.toLocaleLowerCase()}-wallets/collection/${id.toLocaleLowerCase()}/${id.toLocaleLowerCase()}.annotations.json`
}

function globalAnnotationsPath(): string {
	return 'data/collection/global.annotations.json'
}

async function openCaptureFile(options: GlobalOptions): Promise<WalletCaptureFile> {
	const annotations = WalletCaptureAnnotations.fromFile(
		options.id,
		annotationsPath(options),
		globalAnnotationsPath(),
	)
	const captureFile = await WalletCaptureFile.fromFile(
		{
			walletId: options.id,
			walletType: options.type,
			walletVariant: options.variant,
		},
		capturePath(options),
		annotations,
	)

	return captureFile
}

async function runCommand(argv: string[]): Promise<void> {
	if (!isNonEmptyArray(argv)) {
		throw new Error('Cannot spawn empty subcommand')
	}

	return new Promise((resolve, reject) => {
		log('Spawning subcommand:', argv.join(' '))
		const child = spawn(argv[0], argv.slice(1), {
			stdio: 'inherit',
		})
		let killed = false
		const killSubprocess = () => {
			if (!killed) {
				log('')
				log('Got interrupt signal. Terminating.')
				killed = true
				child.kill()
			}
		}

		process.on('SIGINT', killSubprocess)

		child.on('close', code => {
			process.removeListener('SIGINT', killSubprocess)

			if (code === 0 || killed) {
				resolve()
			} else {
				reject(new Error(`Command failed with exit code ${code}`))
			}
		})

		child.on('error', err => {
			process.removeListener('SIGINT', killSubprocess)

			if (killed) {
				resolve()
			} else {
				reject(err)
			}
		})
	})
}

// ============================================================================
// Subcommand Handlers (Stubs)
// ============================================================================

function log(...text: string[]) {
	process.stderr.write(text.join(' ') + '\n')
}

function logInstructions(instructions: string[]) {
	const logBox = (s: string) => {
		log(`  ${s}`)
	}

	log('')

	for (const instruction of instructions) {
		logBox(instruction)
	}
	log('')
}

export async function handleCapture(opts: CaptureOptions): Promise<void> {
	const sessionsBefore = (await openCaptureFile(opts)).getSessions()

	const argv = [
		'mitmdump',
		`--listen-port=${opts.port}`,
		'--mode=regular',
		'--set=upstream_cert=false',
		'--set=http2=false',
		`--set=wallet_type=${opts.type}`,
		`--set=wallet_id=${opts.id}`,
		`--set=wallet_variant=${opts.variant}`,
		`--set=ux_flow=${opts.flow}`,
	]

	if (opts.walletAddresses === null) {
		if (!setContains(flowsNotRequiringWalletAddress, opts.flow)) {
			throw new Error(`Must specify --wallet-addresses for flow ${opts.flow}.`)
		}
	} else {
		const captureFile = await openCaptureFile(opts)

		for (const walletAddr of setItems(opts.walletAddresses)) {
			captureFile.userData.add(new UserDataString(walletAddr, [WalletInfo.ACCOUNT_ADDRESS]))
		}
		await captureFile.save(await getSaveOptions(opts))
	}

	argv.push('-s', path.join(scriptDir(), 'mitmproxy_wallet_data_collection.py'))

	logInstructions([
		'',
		'Starting mitmproxy...',
		`➡️ Current flow: ${opts.flow}`,
		`🏁 Your goal: ${flowInstructions(opts.flow)}`,
		'When done, kill this process (Ctrl+C) for instructions on what to do next.',
		'',
	])

	await runCommand(argv)
	log('mitmproxy finished.')
	const sessionsAfter = (await openCaptureFile(opts)).getSessions()
	const sessionsDiff = sessionsAfter.difference(sessionsBefore)

	const nextFlow = getNextFlow(opts.flow)

	if (nextFlow === 'DONE') {
		logInstructions([
			'✅ You are done with network captures!',
			'➡️ Please run the `check` subcommand for further instructions.',
			'⚙️ Command:',
			`  ${getCommandPrefix(opts)} check`,
		])
	} else {
		const captureOptions: string[] = []
		const extraInstructions: string[] = []

		if (opts.port != 8080) {
			captureOptions.push(`--port=${opts.port}`)
		}

		if (opts.walletAddresses !== null) {
			captureOptions.push(`--wallet-addresses=${setItems(opts.walletAddresses).join(',')}`)
		} else if (!setContains(flowsNotRequiringWalletAddress, nextFlow)) {
			captureOptions.push('--wallet-addresses=0x123...,0x456...,0x789...,0xabc...')
			extraInstructions.push(
				'(You must supply at least 4 addresses: Two that you created using the wallet itself, and two that you are importing into the wallet.)',
			)
			extraInstructions.push(
				'(Make sure the two wallet addresses you import into the wallet are pre-funded with Ether and USDC!)',
			)
		}

		const nextInstructions: string[] = []

		if (sessionsDiff.size === 0) {
			nextInstructions.push(
				'',
				`⚠️ Done with flow: ${opts.flow}. ⚠️ Nothing recorded.`,
				'  ➡️ If you forgot to actually run the flow, simply re-run the previous command and do it.',
				`  ➡️ Otherwise, move on to the next flow: ${nextFlow}.`,
				`    ⚙️ ${getCommandPrefix(opts)} capture${captureOptions.length === 0 ? '' : ' ' + captureOptions.join(' ')} --flow=${nextFlow}`,
			)
		} else if (sessionsDiff.size > 1) {
			throw new Error(
				`Multiple new sessions (${sessionsDiff.size}) found: ${Array.from(sessionsDiff).join(', ')}`,
			)
		} else {
			const onlySession = (() => {
				for (const session of sessionsDiff) {
					return session
				}
			})()

			nextInstructions.push(
				'',
				`✅ Done with flow: ${opts.flow}`,
				'  ➡️ If you forgot to test something, simply re-run the previous command and do it.',
				'  ➡️ If you made a mistake, you may delete the data you just recorded using this command:',
				`    ⚙️ ${getCommandPrefix(opts)} delete-capture --session=${onlySession}`,
				`  ➡️ Otherwise, move on to the next flow: ${nextFlow}.`,
				`    ⚙️ ${getCommandPrefix(opts)} capture --flow=${nextFlow}${captureOptions.length === 0 ? '' : ' ' + captureOptions.join(' ')}`,
			)
		}

		for (const extraInstruction of extraInstructions) {
			nextInstructions.push(extraInstruction)
		}
		nextInstructions.push('')
		logInstructions(nextInstructions)
	}
}

export async function handleDeleteCapture(opts: DeleteCaptureOptions): Promise<void> {
	const capture = await openCaptureFile(opts)

	capture.deleteSession(opts.session)
	await capture.save(await getSaveOptions(opts))
	log(`✅ Successfully deleted all data for session ${opts.session}.`)
}

export async function handleCheck(opts: GlobalOptions): Promise<number> {
	const capture = await openCaptureFile(opts)
	const issues = await capture.check()

	if (issues.length == 0) {
		log('✅ No issues found! Wallet capture process complete. Well done.')

		return 0
	}

	const perSection = new Map<string, NonEmptyArray<WalletCaptureIssue>>()
	const sectionOrder: string[] = []

	for (const issue of issues) {
		const strSection = issue.section.join(' > ')
		const sectionIssues = perSection.get(strSection)

		if (sectionIssues === undefined) {
			perSection.set(strSection, [issue])
			sectionOrder.push(strSection)
		} else {
			sectionIssues.push(issue)
		}
	}

	for (const strSection of sectionOrder) {
		const sectionIssues = perSection.get(strSection)

		if (sectionIssues === undefined) {
			continue
		}

		log(`# ${strSection} (${sectionIssues.length} issue${sectionIssues.length === 1 ? '' : 's'}):`)

		for (const issue of sectionIssues) {
			log(`  > ${issue.issue}`)

			if (issue.suggestions.length > 0) {
				if (issue.suggestions.length === 1) {
					log('    Suggestion:')
				} else {
					log('    Suggestions:')
				}

				for (const suggestion of issue.suggestions) {
					log(`      - ${suggestion.suggestion}`)

					if (suggestion.subcommand !== undefined) {
						log(`        $ ${getCommandPrefix(opts)} ${suggestion.subcommand}`)
					}
				}
			}
		}
		log('')
	}
	await Promise.resolve()

	return issues.length
}

export async function handleMarkFlowUnsupported(opts: MarkFlowUnsupportedOptions): Promise<void> {
	const capture = await openCaptureFile(opts)

	capture.markFlowUnsupported(opts.flow)
	await capture.save(await getSaveOptions(opts))
	log(`Flow ${opts.flow} marked as unsupported.`)
	log(`Run \`${getCommandPrefix(opts)} check\` to see if there are any more issues to address.`)
}

export async function handleMarkDomain(opts: MarkDomainOptions): Promise<void> {
	const domainFile = path.join(repoDir(), 'data/entities/domains/entity-domains.json')
	const targetDomain = opts.domain.toLowerCase().trim()
	const targetEntityId = opts.entity

	let existingDomains: Record<string, EntityId> = {}

	// Read existing domains
	if (fs.existsSync(domainFile)) {
		try {
			const content = await fs.promises.readFile(domainFile, 'utf8')

			existingDomains = assertValidDomainToEntityIdMapping(JSON.parse(content) as unknown)
		} catch (e) {
			throw new Error(`Failed to parse entity domains file: ${getErrorMessage(e)}`)
		}
	}

	// Validation: Check for conflicts with existing domains
	for (const existingDomain of Object.keys(existingDomains)) {
		// Check if target matches exactly
		if (existingDomain === targetDomain) {
			throw new Error(
				`Domain '${targetDomain}' is already marked as belonging to entity '${existingDomains[existingDomain]}'.`,
			)
		}

		// Check if target is a subdomain of an existing domain (e.g., target 'api.foo.com' vs existing 'foo.com')
		if (targetDomain.endsWith('.' + existingDomain)) {
			throw new Error(
				`Domain '${targetDomain}' is a subdomain of already marked '${existingDomain}' (${existingDomains[existingDomain]}). You do not need to mark it separately.`,
			)
		}

		// Check if an existing domain is a subdomain of the target (e.g., target 'foo.com' vs existing 'api.foo.com')
		// This suggests the user should have marked the parent domain instead of the child previously.
		if (existingDomain.endsWith('.' + targetDomain)) {
			const existingEntity = entityForDomain(existingDomain)

			if (existingEntity !== null && targetEntityId !== existingEntity.id) {
				throw new Error(
					`Existing domain ${existingDomain} is already marked as belonging to entity ID ${existingEntity.id}, so cannot mark ${targetDomain} as belonging to ${targetEntityId}.`,
				)
			}

			log(
				`ℹ️ Consolidating: Removing '${existingDomain}' as it is a subdomain of the new target '${targetDomain}'.`,
			)
			delete existingDomains[existingDomain]
			// We continue the loop to ensure no other subdomains exist (e.g. both api.foo.com and images.foo.com existed)
		}
	}

	// Add new entry
	existingDomains[targetDomain] = targetEntityId

	// Sort keys alphabetically
	const sortedDomains: Record<string, string> = {}

	Object.keys(existingDomains)
		.sort()
		.forEach(key => {
			sortedDomains[key] = existingDomains[key]
		})

	// Save file with formatting
	await fs.promises.mkdir(path.dirname(domainFile), { recursive: true })
	await fs.promises.writeFile(domainFile, JSON.stringify(sortedDomains, null, '\t') + '\n', 'utf8')

	log(`✅ Successfully marked '${targetDomain}' as belonging to entity '${targetEntityId}'.`)
}

export async function handleExplainRequest(opts: ExplainRequestOptions): Promise<void> {
	const capture = await openCaptureFile(opts)

	const matched = capture.addRequestMatcher(
		new WalletRequestMatcher(
			{
				domain: opts.domain,
				path: opts.path,
				method: opts.method,
				purposes: opts.purposes,
				policy: opts.policy,
			},
			opts.global ?? false,
		),
		opts.force ?? false,
	)

	await capture.save(await getSaveOptions(opts))
	log(`✅ Matched ${matched.length} request${matched.length === 1 ? '' : 's'}`)

	for (const req of matched) {
		log(`  - ${req.toString()}`)
	}
}

export async function handleMarkString(opts: MarkStringOptions): Promise<void> {
	const capture = await openCaptureFile(opts)

	if (opts.data === 'BENIGN') {
		capture.addBenignString(opts.string, opts.global !== null && opts.global)
		log(
			`✅ Marked string "${opts.string}" as benign${opts.global !== null && opts.global ? ' globally' : ''}.`,
		)

		return
	}

	if (opts.global !== null && opts.global) {
		throw new Error('Cannot use --global option for non-BENIGN strings')
	}

	capture.userData.add(new UserDataString(opts.string, setItems(opts.data)))

	await capture.save(await getSaveOptions(opts))
	log(`✅ Marked string "${opts.string}" as ${setItems(opts.data).join(', ')}.`)
}

function displayRequestInfo(
	request: WalletRequest,
	options: {
		captureStrings: WalletDataStrings | null
		isBenignString: ((str: string) => boolean) | null
		highlight: ((s: string) => string) | null
		headerPrefix: string | null
	},
): void {
	function formatStr(str: string): string {
		if (options.highlight !== null) {
			const highlighted = options.highlight(str)

			if (highlighted !== str) {
				return highlighted
			}
		}

		if (options.isBenignString !== null && options.isBenignString(str)) {
			return chalk.green(str)
		}

		if (options.captureStrings !== null) {
			const s = options.captureStrings.get(str)

			if (s !== undefined) {
				return chalk.yellow(str)
			}
		}

		return str
	}
	function fadedOut(str: string): string {
		return chalk.gray(str)
	}
	function formatUserDataDict(dict: UserDataDict): string {
		return Object.entries(dict)
			.map(
				([key, values]) => `${formatStr(key)}${fadedOut('=')}${values.map(formatStr).join(', ')}`,
			)
			.join(`${fadedOut(';')} `)
	}
	const entity = entityForDomain(request.domain)

	if (entity === null) {
		throw new Error(`no entity associated with ${request.domain}`)
	}

	function header(header: string): string {
		return (
			(options.headerPrefix === null ? '' : options.headerPrefix) +
			' '.repeat(12 - header.length) +
			chalk.bold(header) +
			fadedOut(':') +
			' '
		)
	}

	log(`${header('URL')}${fadedOut('https://')}${chalk.blue(request.domain)}${request.path}`)
	log(
		`${header('Domain')}${chalk.blue(request.domain)} ${fadedOut('(')}${chalk.cyan(entity.name)}${fadedOut(')')}`,
	)

	if (Object.keys(request.query).length > 0) {
		log(`${header('Query')}${formatUserDataDict(request.query)}`)
	}

	if (request.jsonRpcMethods.length > 0) {
		log(`${header('JSON-RPC')}${request.jsonRpcMethods.map(formatStr).join(`${fadedOut(',')} `)}`)
	}

	if (request.content !== null && request.content.trim() !== '') {
		log(`${header('Content')}${formatStr(request.content.toString())}`)
	}

	if (Object.keys(request.cookies).length > 0) {
		log(`${header('Cookies')}${formatUserDataDict(request.cookies)}`)
	}

	if (request.refererDomain !== null) {
		const refEntity = entityForDomain(request.refererDomain)

		if (refEntity === null) {
			throw new Error(`no entity associated with referer domain ${request.refererDomain}`)
		}

		log(
			`${header('Referer')}${chalk.blue(request.refererDomain)} ${fadedOut('(')}${chalk.cyan(refEntity.name)}${fadedOut(')')}`,
		)
	}

	if (Object.keys(request.oddHeaders).length > 0) {
		log(`${header('Headers')}${formatUserDataDict(request.oddHeaders)}`)
	}

	if (Object.keys(request.oddTrailers).length > 0) {
		log(`${header('Trailers')}${formatUserDataDict(request.oddTrailers)}`)
	}
}

export async function handleReviewStrings(opts: GlobalOptions): Promise<void> {
	let capture = await openCaptureFile(opts)

	let walletDataStrings = capture.gatherStrings()
	let allStrings = walletDataStrings.strings()
	const isWorthReviewing = (str: WalletDataString): boolean => {
		if (capture.isBenignString(str.str.str)) {
			return false
		}

		return str.str.pieces.size === 0
	}
	let firstUnreviewedStringIndex = allStrings.findIndex(isWorthReviewing)
	let userStopped = false
	const highlightStr = chalk.bgRed.whiteBright.bold

	while (firstUnreviewedStringIndex !== -1 && !userStopped) {
		// Process the highest-score string first
		const strEntry = allStrings[firstUnreviewedStringIndex]
		const strValue = strEntry.str

		// Display the string and its occurrences
		log('\n' + chalk.bgBlue.gray('='.repeat(80)))
		const headerLineLen = `String ${firstUnreviewedStringIndex + 1} of ${allStrings.length}`.length

		log(
			chalk.bgBlue(
				`${chalk.whiteBright('String ')}${chalk.yellowBright((firstUnreviewedStringIndex + 1).toString())}${chalk.whiteBright(' of ')}${chalk.yellowBright(allStrings.length.toString())}${chalk.whiteBright(' '.repeat(80 - headerLineLen))}`,
			),
		)
		log(chalk.bgBlue.gray('='.repeat(80)))
		function header(header: string): string {
			return ' '.repeat(16 - header.length) + chalk.bold(header) + chalk.gray(':') + ' '
		}
		log(`${header('String')}${highlightStr(strValue.str)}`)

		if (strValue.pieces.size > 0) {
			log(`${header('Info')}${Array.from(strValue.pieces).toSorted().join(', ')}`)
		}

		log(`${header('Entropy')}${strEntry.score.toFixed(2)}`)
		log(header('Occurrences'))

		for (const [roughKey, count] of Array.from(strEntry.getRoughOccurrences()).toSorted(
			(a, b) => b[1] - a[1],
		)) {
			const highlightedKey = roughKey.split(strValue.str).join(highlightStr(strValue.str))

			log(
				`       ${chalk.gray('-')} ${highlightedKey}${count === 1 ? '' : ` ${chalk.gray('(')}seen ${chalk.bold(count.toString())} times${chalk.gray(')')}`}`,
			)
		}

		log(header('Sample Request'))
		displayRequestInfo(strEntry.firstOrigin.request, {
			captureStrings: walletDataStrings,
			highlight: (s: string): string => {
				if (!s.includes(strValue.str)) {
					return s
				}

				return s.split(strValue.str).join(highlightStr(strValue.str))
			},
			isBenignString: (s: string) => capture.isBenignString(s),
			headerPrefix: ' '.repeat(4),
		})

		// Build prompt choices
		const userInfoChoices: prompts.PromptObject<'selected'>['choices'] = userInfoEnums.items.map(
			u => {
				const hasInfo = strEntry.str.pieces.has(u)

				return {
					title: userInfoName(u)
						.long.replaceAll('{{WALLET_PSEUDONYM_SINGULAR}}', 'wallet-specific pseudonym')
						.replace(/^[a-z]/, x => x.toUpperCase()),
					value: u,
					description: `${u}${hasInfo ? ' (already tagged as such)' : ''}`,
					selected: hasInfo,
					disabled: hasInfo,
				}
			},
		)

		const allChoices: prompts.PromptObject<'selected'>['choices'] = [
			{
				title: 'Benign (no user data)',
				value: '__BENIGN__',
				description: 'Mark this string as benign (non-globally).',
				selected: false,
			},
			{
				title: 'Globally benign (no user data, ignored in all captures)',
				value: '__GLOBAL_BENIGN__',
				description:
					'Mark this string as globally benign. All instances across all captures will be ignored.',
				selected: false,
			},
			{
				title: 'Not wallet-related (all requests that sent it were not initiated by the wallet)',
				value: '__NOT_WALLET_RELATED__',
				description:
					'Select this if the string only belongs to requests that were not wallet-initiated (included in the capture by accident).',
				selected: false,
			},
			{
				title: '---',
				value: '__SEPARATOR__',
				description: '',
				selected: false,
				disabled: true,
			},
			...userInfoChoices,
			{
				title: '---',
				value: '__SEPARATOR2__',
				description: '',
				selected: false,
				disabled: true,
			},
			{
				title: 'Stop and save',
				value: '__STOP_AND_SAVE__',
				description: 'Stop reviewing strings and save progress so far.',
				selected: false,
			},
		]

		let confirmed = false

		while (!confirmed) {
			const response = await prompts({
				type: 'multiselect',
				name: 'selection',
				message: 'How would you like to classify this string?',
				choices: allChoices,
				hint: '- Space to select. Return to submit.',
			})

			if (response.selection === undefined) {
				log('\nReview cancelled.')

				return
			}

			if (!Array.isArray(response.selection)) {
				throw new Error('Unexpected type for response.selection')
			}

			const selectedValues = response.selection.map((v): string => {
				if (typeof v !== 'string') {
					throw new Error('Unexpected value')
				}

				return v
			})

			// Check if nothing selected
			if (selectedValues.length === 0) {
				log('\n⚠️  Please select at least one option.')
				continue
			}

			// Check for special options
			const specialOptions = selectedValues.filter(v =>
				['__BENIGN__', '__GLOBAL_BENIGN__', '__NOT_WALLET_RELATED__', '__STOP_AND_SAVE__'].includes(
					v,
				),
			)

			// Check for mutual exclusion of special options
			if (specialOptions.length > 1) {
				log('\n⚠️  Cannot select multiple special options simultaneously. Try again.')
				continue
			}

			if (specialOptions.length === 1) {
				const specialOption = specialOptions[0]

				// Check if any UserInfo was also selected with a special option
				const userInfoSelected = selectedValues.filter(v => userInfoEnums.is(v))

				if (userInfoSelected.length > 0) {
					log('\n⚠️  Cannot select a special option together with UserInfo options. Try again.')
					continue
				}

				// Handle the special options
				if (specialOption === '__STOP_AND_SAVE__') {
					await capture.save(await getSaveOptions(opts))
					log('\n✅ Progress saved. Stopping string review.')
					userStopped = true
					confirmed = true
					continue
				}

				if (specialOption === '__GLOBAL_BENIGN__') {
					capture.addBenignString(strValue.str, true)
					await capture.save(await getSaveOptions(opts))
					log(`✅ Marked string "${strValue.str}" as globally benign.`)
					confirmed = true
					continue
				}

				if (specialOption === '__BENIGN__') {
					capture.addBenignString(strValue.str, false)
					await capture.save(await getSaveOptions(opts))
					log(`✅ Marked string "${strValue.str}" as benign.`)
					confirmed = true
					continue
				}

				if (specialOption === '__NOT_WALLET_RELATED__') {
					await capture.save(await getSaveOptions(opts))
					log('\n💾 Progress saved. Stopping string review.')
					log('If you are seeing non-wallet-initiated requests, you should either:')
					log('  - Create matchers for these requests using the `explain-request` subcommand.')
					log('  - Manually review requests using the `review-requests` subcommand.')
					userStopped = true
					confirmed = true
					continue
				}

				throw new Error('Logic error; unreachable')
			}

			// All selected values are UserInfo
			const selectedUserInfoValues = selectedValues.filter(v => userInfoEnums.is(v))

			if (selectedUserInfoValues.length === 0) {
				log('\n⚠️  Please select at least one UserInfo option.')
				continue
			}

			// Mark the string with the selected UserInfo pieces
			const merged = strValue.withMerged(...selectedUserInfoValues)

			capture.userData.add(merged)
			await capture.save(await getSaveOptions(opts))
			log(
				`✅ Marked string "${strValue.str}" as ${Array.from(merged.pieces).toSorted().join(', ')}.`,
			)
			confirmed = true
		}

		// Refresh strings:
		capture = await openCaptureFile(opts)
		walletDataStrings = capture.gatherStrings()
		allStrings = walletDataStrings.strings()
		firstUnreviewedStringIndex = allStrings.findIndex(isWorthReviewing)
	}

	if (!userStopped) {
		log('\n' + '='.repeat(80))
		log('✅ All strings have been reviewed!')
		log(`Run \`${getCommandPrefix(opts)} check\` to verify your work.`)
		log('='.repeat(80))
	}
}

export async function handleReviewRequests(opts: GlobalOptions): Promise<void> {
	const capture = await openCaptureFile(opts)
	const allStrings = capture.gatherStrings()

	// Collect all unreviewed requests across all flows
	const unreviewedRequests: Array<{ flow: RecordedFlow; review: WalletRequestReview }> = []

	for (const f of recordedFlow.items) {
		const flow = capture.getFlow(f)

		if (flow === null || flow === 'NOT_SUPPORTED') {
			continue
		}

		for (const req of flow.requests) {
			for (const domain of req.domains()) {
				if (entityForDomain(domain) === null) {
					throw new Error(
						`There are still unassociated domains (e.g. ${domain}); please address these first before reviewing requests manually.`,
					)
				}
			}
		}

		for (const review of flow.unreviewedRequests()) {
			unreviewedRequests.push({ flow: f, review })
		}
	}

	if (unreviewedRequests.length === 0) {
		log('✅ No unreviewed requests. All requests have been manually reviewed.')

		return
	}

	log(`Found ${unreviewedRequests.length} unreviewed request(s).`)

	for (let i = 0; i < unreviewedRequests.length; i++) {
		const { flow, review } = unreviewedRequests[i]
		const request = review.request

		let confirmed = false

		while (!confirmed) {
			// Display delimiter for new request
			log('\n' + '='.repeat(80))
			log(`Request ${i + 1} of ${unreviewedRequests.length} (Flow: ${flow})`)
			log('='.repeat(80))

			// Display request information
			displayRequestInfo(request, {
				captureStrings: allStrings,

				isBenignString: (s: string) => capture.isBenignString(s),
				highlight: null,
				headerPrefix: null,
			})

			// Get matcher if any
			const matcher = capture.findMatcherForReq(request)
			const matcherPurposes: DataCollectionPurpose[] = []

			// Display matcher info
			if (matcher !== null) {
				if (matcher.purposes !== null && matcher.purposes !== 'NOT_WALLET_INITIATED') {
					matcherPurposes.push(...setItems(matcher.purposes))
				}

				log(`\n  Matched by: ${matcher.toString()}`)

				if (matcher.purposes === 'NOT_WALLET_INITIATED') {
					log('    → This request is marked as NOT_WALLET_INITIATED via matcher.')
				} else if (matcher.purposes !== null) {
					log(`    → Purposes from matcher: ${setItems(matcher.purposes).join(', ')}`)
				}
			} else {
				log('  ⚠️  No matcher found for this request; proceeding fully manually.')
				log('      Consider creating a matcher instead:')
				log(
					`        $ ${getCommandPrefix(opts)} explain-request --domain='${request.domain}' [--path='${request.path}']${request.jsonRpcMethods.length === 0 ? '' : ` [--method=${request.jsonRpcMethods[0]}]`} --purposes='purpose1,purpose2,...|NOT_WALLET_INITIATED' --policy='${CollectionPolicy.BY_DEFAULT}|${CollectionPolicy.ALWAYS}|...'`,
				)
			}

			// Handle NOT_WALLET_INITIATED case
			if (matcher !== null && matcher.purposes === 'NOT_WALLET_INITIATED') {
				const confirmResponse = await prompts({
					type: 'confirm',
					name: 'value',
					message: 'This request is marked as NOT_WALLET_INITIATED. Is this correct?',
					initial: true,
				})

				if (confirmResponse.value === undefined) {
					log('\nReview cancelled.')

					return
				}

				if (typeof confirmResponse.value !== 'boolean') {
					throw new Error('invalid response type')
				}

				if (confirmResponse.value) {
					review.markAsReviewed()
					await capture.save(await getSaveOptions(opts))
					log('✅ Review saved.')
					confirmed = true
				}

				continue
			}

			// Purposes selection
			let purposesConfirmed = false
			let selectedPurposes: DataCollectionPurpose[] | 'NOT_WALLET_INITIATED' = []

			while (!purposesConfirmed) {
				const purposeChoices = [
					{
						title: 'This request was not initiated by the wallet',
						value: 'NOT_WALLET_INITIATED',
						description:
							'Select this for requests that were not actually initiated by the wallet, but caught in the capture nonetheless.',
						selected: false,
					},
				].concat(
					dataCollectionPurpose.items.map(p => ({
						title: dataCollectionPurposeToText(p),
						value: p,
						description: p,
						selected: matcherPurposes.includes(p) || review.getExtraPurposes().includes(p),
					})),
				)

				const purposeResponse = await prompts({
					type: 'multiselect',
					name: 'purposes',
					message: 'Select the purposes of this request:',
					choices: purposeChoices,
					hint: '- Space to select. Return to submit.',
				})

				if (purposeResponse.purposes === undefined) {
					log('\nReview cancelled.')

					return
				}

				if (!Array.isArray(purposeResponse.purposes)) {
					throw new Error('Unexpected type for purposeResponse.purposes')
				}

				if (purposeResponse.purposes.includes('NOT_WALLET_INITIATED')) {
					if (purposeResponse.purposes.length > 1) {
						log(
							'\n⚠️  Cannot simultaneously mark the request as not-wallet-initiated while also assigning it to other purposes. Try again.',
						)
						continue
					}

					selectedPurposes = 'NOT_WALLET_INITIATED'
				} else {
					selectedPurposes = dataCollectionPurpose.assertArray(purposeResponse.purposes)

					// Check if any matcher purpose was unselected
					const unselectedMatcherPurposes = matcherPurposes.filter(
						p => !selectedPurposes.includes(p),
					)

					if (unselectedMatcherPurposes.length > 0 && matcher !== null) {
						log(
							`\n⚠️  You unselected purpose(s) from a matcher: ${unselectedMatcherPurposes.join(', ')}`,
						)
						log(`   Matcher: ${matcher.toString()}`)

						const removeMatcherResponse = await prompts({
							type: 'confirm',
							name: 'value',
							message:
								'Would you like to delete this matcher? (Selecting "No" will restart the purpose selection)',
							initial: false,
						})

						if (removeMatcherResponse.value === undefined) {
							log('\nReview cancelled.')

							return
						}

						if (typeof removeMatcherResponse.value !== 'boolean') {
							throw new Error('invalid response type')
						}

						if (removeMatcherResponse.value) {
							capture.removeRequestMatcher(matcher)
							await capture.save(await getSaveOptions(opts))
							log('✅ Matcher deleted. Restarting this request review...')
						}

						continue
					}
				}

				purposesConfirmed = true
			}

			// Collect detected user info from request. CollectionPolicy is irrelevant here since we
			// only look at the keys (`UserInfo`s).
			const detectedUserInfo = new Set(request.userInfo(null, false).keys())

			if (detectedUserInfo.size > 0) {
				log(`\n  Auto-detected user data: ${Array.from(detectedUserInfo).join(', ')}`)
			}

			// User info selection
			let userInfoConfirmed = false
			let selectedUserInfo: UserInfo[] = []

			while (selectedPurposes != 'NOT_WALLET_INITIATED' && !userInfoConfirmed) {
				const userInfoChoices = userInfoEnums.items.map(u => ({
					title: userInfoName(u)
						.long.replaceAll('{{WALLET_PSEUDONYM_SINGULAR}}', 'wallet-specific pseudonym')
						.replace(/^[a-z]/, x => x.toUpperCase()),
					value: u,
					description: u,
					selected: detectedUserInfo.has(u) || review.getExtraUserData().includes(u),
				}))

				const userInfoResponse = await prompts({
					type: 'multiselect',
					name: 'userInfo',
					message: 'Select user data sent in this request (pre-selected = auto-detected):',
					choices: userInfoChoices,
					hint: '- Space to select. Return to submit.',
				})

				if (userInfoResponse.userInfo === undefined) {
					log('\nReview cancelled.')

					return
				}

				selectedUserInfo = userInfoEnums.assertArray(userInfoResponse.userInfo)

				// Check if any detected user info was unselected
				const unselectedDetected = Array.from(detectedUserInfo).filter(
					u => !selectedUserInfo.includes(u),
				)

				if (unselectedDetected.length > 0) {
					log(`\n⚠️  You unselected auto-detected user data: ${unselectedDetected.join(', ')}`)
					log('Auto-detected user data is based on marked strings, which cannot be unmarked.')
					log('Restarting selection.')
					continue
				}

				userInfoConfirmed = true
			}

			// Determine collection policy.
			let collectionPolicy: CollectionPolicy | null = null
			let collectionPolicyFromManualReview = true

			if (
				selectedPurposes != 'NOT_WALLET_INITIATED' &&
				matcher !== null &&
				matcher.policy !== null
			) {
				const confirmPolicyResponse = await prompts({
					type: 'confirm',
					name: 'value',
					message: `This request's collection policy is marked as ${matcher.policy}. Is this correct?`,
					initial: false,
				})

				if (confirmPolicyResponse.value === undefined) {
					log('\nReview cancelled.')

					return
				}

				if (typeof confirmPolicyResponse.value !== 'boolean') {
					throw new Error('invalid response type')
				}

				if (confirmPolicyResponse.value) {
					collectionPolicy = matcher.policy
					collectionPolicyFromManualReview = false
				}
			}

			if (selectedPurposes != 'NOT_WALLET_INITIATED' && collectionPolicy === null) {
				const possiblePolicies = collectionPolicyEnum.items.filter(
					p => p !== CollectionPolicy.NEVER,
				)
				const manualPolicyResponse = await prompts({
					type: 'select',
					name: 'value',
					message: 'Pick the appropriate collection policy.',
					choices: possiblePolicies.map(p => ({
						title: collectionPolicyExplanation(p),
						description: p.toString(),
						value: p,
					})),
					initial: possiblePolicies.indexOf(CollectionPolicy.ALWAYS),
				})

				if (manualPolicyResponse.value === undefined) {
					log('\nReview cancelled.')

					return
				}

				collectionPolicy = collectionPolicyEnum.assert(manualPolicyResponse.value)
			}

			// Calculate extra purposes and user info
			const extraPurposes = Array.isArray(selectedPurposes)
				? selectedPurposes.filter(p => !matcherPurposes.includes(p))
				: selectedPurposes
			const extraUserInfo = selectedUserInfo.filter(u => !detectedUserInfo.has(u))

			// Show final result
			log('\n' + '-'.repeat(40))
			log('Review Summary:')
			log('-'.repeat(40))
			displayRequestInfo(request, {
				captureStrings: allStrings,
				isBenignString: (s: string) => capture.isBenignString(s),
				highlight: null,
				headerPrefix: null,
			})

			log('\n   Purposes:')

			if (matcherPurposes.length > 0) {
				log(`     From matcher: ${matcherPurposes.join(', ')}`)
			}

			if (extraPurposes === 'NOT_WALLET_INITIATED') {
				log('     After review: ignoring as non-wallet-initiated')
			} else if (extraPurposes.length > 0) {
				log(`  Added by review: ${extraPurposes.join(', ')}`)
			} else if (matcherPurposes.length === 0 && extraPurposes.length === 0) {
				log('     (none selected)')
			}

			if (extraPurposes !== 'NOT_WALLET_INITIATED') {
				log('\n  User Data:')

				if (detectedUserInfo.size > 0) {
					log(`    Auto-detected: ${Array.from(detectedUserInfo).join(', ')}`)
				}

				if (extraUserInfo.length > 0) {
					log(`       Additional: ${extraUserInfo.join(', ')}`)
				}

				if (detectedUserInfo.size === 0 && extraUserInfo.length === 0) {
					log('     (none)')
				}

				log('\n  Collection policy:')

				if (collectionPolicy === null) {
					throw new Error('Unreachable')
				}

				if (collectionPolicyFromManualReview) {
					log(
						`    Classified as: ${collectionPolicy} (${collectionPolicyExplanation(collectionPolicy)})`,
					)
				} else {
					log(
						`     From matcher: ${collectionPolicy} (${collectionPolicyExplanation(collectionPolicy)})`,
					)
				}
			}

			// Confirmation
			log('')
			const finalConfirm = await prompts({
				type: 'confirm',
				name: 'value',
				message: 'Confirm this review? (You will NOT be prompted about this request again)',
				initial: true,
			})

			if (finalConfirm.value === undefined) {
				log('\nReview cancelled.')

				return
			}

			if (typeof finalConfirm.value !== 'boolean') {
				throw new Error('invalid response type')
			}

			if (finalConfirm.value) {
				if (extraPurposes === 'NOT_WALLET_INITIATED') {
					review.setNotWalletInitiated()
				} else {
					if (collectionPolicy === null) {
						throw new Error('Unreachable')
					}

					for (const extraPurpose of extraPurposes) {
						review.addPurpose(extraPurpose)
					}

					for (const userInfo of extraUserInfo) {
						review.addUserInfo(userInfo)
					}

					if (collectionPolicyFromManualReview) {
						review.setCollectionPolicy(collectionPolicy)
					}
				}

				review.markAsReviewed()
				await capture.save(await getSaveOptions(opts))
				log('✅ Review saved.')
				confirmed = true
			} else {
				log('\nRestarting review for this request...')
				review.reset()
			}
		}
	}

	log('\n' + '='.repeat(80))
	log('✅ All requests have been reviewed!')
	log(`Run \`${getCommandPrefix(opts)} check\` to verify your work.`)
	log('='.repeat(80))
}

export async function handleLintFix(): Promise<void> {
	const dataDir = path.join(repoDir(), 'data')
	const walletTypeDirs = fs.readdirSync(dataDir).filter(entry => {
		const fullPath = path.join(dataDir, entry)

		return fs.statSync(fullPath).isDirectory() && entry.endsWith('-wallets')
	})

	for (const walletTypeDir of walletTypeDirs) {
		const collectionDir = path.join(dataDir, walletTypeDir, 'collection')

		if (!fs.existsSync(collectionDir)) {
			continue
		}

		for (const walletId of fs.readdirSync(collectionDir)) {
			if (!isValidWalletName(walletId)) {
				continue
			}

			const walletDir = path.join(collectionDir, walletId)

			if (!fs.statSync(walletDir).isDirectory()) {
				continue
			}

			const wallet = allWallets[walletId]

			if (wallet === undefined) {
				throw new Error(
					`Wallet '${walletId}' has a collection directory but is not defined in allWallets.`,
				)
			}

			const annotationsPath = path.join(walletDir, `${walletId}.annotations.json`)

			if (!fs.existsSync(annotationsPath)) {
				continue
			}

			const annotations = WalletCaptureAnnotations.fromFile(
				walletId,
				annotationsPath,
				globalAnnotationsPath(),
			)
			const capturePattern = new RegExp(
				`^${walletId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(.*?)\\.capture\\.json$`,
			)

			for (const filename of fs.readdirSync(walletDir)) {
				const match = filename.match(capturePattern)

				if (match === null) {
					continue
				}

				const variant = match[1].toUpperCase()

				if (!variantEnum.is(variant)) {
					throw new Error(`invalid capture filename: "${filename}"`)
				}

				if (wallet.variants[variant] === undefined) {
					throw new Error(
						`Variant '${variant}' found in file '${filename}' for wallet '${walletId}' is not defined in allWallets[${walletId}].variants.`,
					)
				}

				const capturePath = path.join(walletDir, filename)
				const captureFile = await WalletCaptureFile.fromFile(null, capturePath, annotations)

				const saveOptions: SaveOptions = {
					verifyExisting: false,
					walletId,
					walletVariants: wallet.variants,
				}

				const filesChanged = await captureFile.save(saveOptions)

				filesChanged.sort()

				for (const fileChanged of filesChanged) {
					log(`✅ Linted: ${path.relative(repoDir(), fileChanged)}`)
				}
			}
		}
	}
}
