import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import process from 'process'
import prompts from 'prompts'
import { fileURLToPath } from 'url'

import { type EntityId, isValidEntityId } from '@/data/entities'
import {
	domainMappingForDomain,
	entitiesForDomain,
	updateDomainMapping,
} from '@/data/entities/domains/entity-domains'
import { allWallets, isValidWalletName, type WalletName } from '@/data/wallets'
import {
	assertValidDomainToEntityIdMapping,
	type DomainMapping,
	type DomainToEntityIdMapping,
	type ResolvedDomain,
} from '@/schema/entity-domains'
import {
	CollectionPolicy,
	collectionPolicyEnum,
	collectionPolicyExplanation,
	DataCollectionPurpose,
	dataCollectionPurpose,
	dataCollectionPurposeToText,
	PersonalInfo,
	UserFlow,
	type UserInfo,
	userInfoEnums,
	userInfoName,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import { type Variant, variantEnum } from '@/schema/variants'
import { variantToWalletType, WalletType, walletTypes } from '@/schema/wallet-types'
import { getErrorMessage } from '@/types/errors'
import { type Erc55Address, ethereumErc55Address } from '@/types/utils/ethereum-address'
import {
	assertNonEmptyArray,
	isNonEmptyArray,
	type NonEmptyArray,
	nonEmptyDedup,
	nonEmptyMap,
	type NonEmptySet,
	nonEmptySetFromArray,
	setContains,
	setItems,
} from '@/types/utils/non-empty'
import { Enum } from '@/utils/enum'

import { type ChalkLike, getChalk as _getChalk } from './chalk-like'
import {
	chunkBinaryAwareString,
	classifyStringHeuristically,
	looksBinary,
} from './string-classification-heuristics'
import {
	domainMatches,
	type SaveOptions,
	WalletCaptureAnnotations,
	WalletRequestMatcher,
} from './wallet-capture-annotations'
import {
	CaptureInfo,
	CaptureInfoTransaction,
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

export { type ChalkLike, noopChalk } from './chalk-like'

export function getChalk(opts: GlobalOptions): ChalkLike {
	return _getChalk(
		opts.actor === DataCollectionActor.CI || opts.actor === DataCollectionActor.HUMAN,
	)
}

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

type Option<O> = (x: string | null) => O

function optionOneOf<O1, O2>(opt1: Option<O1>, opt2: Option<O2>): Option<O1 | O2> {
	return (x: string | null): O1 | O2 => {
		try {
			return opt1(x)
		} catch (e1) {
			try {
				return opt2(x)
			} catch (e2) {
				throw new Error(`${getErrorMessage(e1)} & ${getErrorMessage(e2)}`, { cause: e2 })
			}
		}
	}
}

function stringOption(x: string | null): string {
	if (x === null) {
		throw new Error('flag not specified')
	}

	return x
}

function typedStringOption<T extends string>(
	typeName: string,
	predicate: (s: string) => s is T,
	helpText: string,
): Option<T> {
	return (x: string | null): T => {
		const s = stringOption(x)

		if (!predicate(s)) {
			throw new Error(
				`not a valid ${typeName}: '${s}'${helpText !== '' ? ' (' + helpText + ')' : ''}`,
			)
		}

		return s
	}
}

function stringListOption(x: string | null): NonEmptyArray<string> {
	if (x === null) {
		throw new Error('flag not specified')
	}

	const split = x
		.split(',')
		.map(v => v.trim())
		.filter(v => v !== '')

	if (!isNonEmptyArray(split)) {
		throw new Error('nothing specified')
	}

	return split
}

function walletAddressesSet(x: string | null): NonEmptySet<Erc55Address> {
	const set = nonEmptySetFromArray(nonEmptyMap(stringListOption(x), ethereumErc55Address))

	if (setItems(set).length < 4) {
		throw new Error(
			'Wallet addresses list must contain at least 4 addresses (2 that you created using the wallet onboarding + 2 that you are importing)',
		)
	}

	return set
}

function booleanOption(x: string | null): boolean {
	if (x === null) {
		throw new Error('flag not specified')
	}

	const lower = x.toLowerCase()

	if (lower !== 'true' && lower !== 'yes' && lower !== 'false' && lower !== 'no') {
		throw new Error(`"${x}": not a valid boolean (want either "true" or "false")`)
	}

	return lower == 'true' || lower === 'yes'
}

function numberOption(x: string | null): number {
	if (x === null) {
		throw new Error('flag not specified')
	}

	if (x.trim() !== '') {
		const n = Number(x)

		if (Number.isFinite(n)) {
			return n
		}
	}

	throw new Error('not a number')
}

function enumOption<E extends string>(e: Enum<E>): Option<E> {
	return (x: string | null): E => {
		if (x === null) {
			throw new Error('flag not specified')
		}

		if (!e.is(x)) {
			const upper = x.toUpperCase()

			if (e.is(upper)) {
				return upper
			}

			throw new Error(`invalid: "${x}" (must be one of: ${e.items.join(', ')})`)
		}

		return x
	}
}

function enumSetOption<E extends string>(e: Enum<E>): Option<NonEmptySet<E>> {
	return (x: string | null): NonEmptySet<E> => {
		if (x === null) {
			throw new Error('flag not specified')
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

		return nonEmptySetFromArray(items)
	}
}

function optionalOption<O>(nonOptional: Option<O>): Option<O | null> {
	return (x: string | null): O | null => {
		if (x === null) {
			return null
		}

		return nonOptional(x)
	}
}

function camelToKebab(name: string): string {
	return name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
}

/**
 * Re-parse `process.argv` to recover the raw string that was passed for the
 * option flag `--name`. This is necessary because `cac` coerces option values
 * that look like JS literals (e.g. full-length hex addresses like `0xabc...`)
 * into numbers, losing the original string. Returns `undefined` when the flag
 * is not present on the command line.
 */
function rawArgvOption(name: string): string | undefined {
	const spellings = [name, camelToKebab(name)]

	for (const spelling of spellings) {
		const dash = `--${spelling}`

		for (const arg of process.argv) {
			if (arg.startsWith(`${dash}=`)) {
				return arg.slice(dash.length + 1)
			}
		}

		for (let i = 0; i < process.argv.length - 1; i++) {
			if (process.argv[i] === dash) {
				const next = process.argv[i + 1]

				if (!next.startsWith('-')) {
					return next
				}
			}
		}
	}

	return undefined
}

class Options<T extends object> {
	private fields: Partial<{ [K in keyof T]: Option<T[K]> }>
	private chained: Options<object> | null
	constructor(fields: Partial<{ [K in keyof T]: Option<T[K]> }>, chained?: Options<object>) {
		this.fields = fields
		this.chained = chained === undefined ? null : chained
	}
	public process(x: unknown): T {
		if (x === null || x === undefined) {
			throw new Error('provided null options')
		}

		if (typeof x !== 'object') {
			throw new Error('provided non-object')
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
			result = { ...result, ...this.chained.process(culled) }
		}

		for (const fieldName of Object.keys(x)) {
			if (fieldName === '--') {
				continue
			}

			if (!Object.hasOwn(this.fields, fieldName) && !Object.hasOwn(result, fieldName)) {
				throw new Error(`invalid option: ${fieldName}`)
			}
		}

		for (const fieldName of Object.keys(this.fields)) {
			const option = this.fields[fieldName]

			if (option === undefined) {
				throw new Error(`unexpected field ${fieldName.toString()}`)
			}

			try {
				const raw = rawArgvOption(fieldName.toString())
				const cacValue = (x as Partial<T>)[fieldName]
				const input: string | null =
					raw !== undefined ? raw : cacValue === undefined ? null : String(cacValue)

				const processed = option(input)

				result = { [fieldName]: processed, ...result }
			} catch (e) {
				throw new Error(`Flag --${fieldName.toString()}: ${getErrorMessage(e)}`, { cause: e })
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We assume that all fields were enumerated by now.
		return result as T
	}
}

export enum DataCollectionActor {
	HUMAN = 'HUMAN',
	AGENT = 'AGENT',
	CI = 'CI',
}

export const dataCollectionActor = new Enum<DataCollectionActor>({
	[DataCollectionActor.HUMAN]: true,
	[DataCollectionActor.AGENT]: true,
	[DataCollectionActor.CI]: true,
})

export interface GlobalOptions {
	id: WalletName
	variant: Variant
	type: WalletType
	actor: DataCollectionActor
}

export const globalOptions = new Options<GlobalOptions>({
	id: (x: string | null): WalletName => {
		if (x === null) {
			throw new Error('must specify wallet ID')
		}

		if (x === '') {
			throw new Error('must specify wallet ID')
		}

		if (!isValidWalletName(x)) {
			throw new Error(`not a valid wallet ID: ${x}`)
		}

		return x
	},
	variant: enumOption(variantEnum),
	type: enumOption(walletTypes),
	actor: (x: string | null): DataCollectionActor => {
		const enumVal = enumOption(dataCollectionActor)(x)

		if (enumVal === DataCollectionActor.HUMAN && !process.stdin.isTTY) {
			throw new Error(
				'You are not a human. You should be using the `pnpm wallet-data-collection:agent` command. Do not cheat.',
			)
		}

		if (
			process.env.WALLETBEAT_ENV !== undefined &&
			dataCollectionActor.is(process.env.WALLETBEAT_ENV) &&
			process.env.WALLETBEAT_ENV !== enumVal
		) {
			throw new Error(
				'Incoherent --actor setting. If you are an agent, You should be using the `pnpm wallet-data-collection:agent` command. Do not cheat.',
			)
		}

		return enumVal
	},
})

export function getSaveOptions(opts: GlobalOptions): SaveOptions {
	return {
		verifyExisting: false,
		walletId: opts.id,
		walletVariants: allWallets[opts.id].variants,
	}
}

/**
 * The `wallet-data-collection:agent` and `wallet-data-collection:ci` pnpm scripts set
 * `WALLETBEAT_ENV` to `AGENT` / `CI`. Mirror that suffix in generated command prefixes so
 * an agent or CI runner sees commands matching the variant they are actually using.
 */
export function actorEnvSuffixFromEnv(): string {
	const env = process.env.WALLETBEAT_ENV

	if (env === DataCollectionActor.AGENT || env === DataCollectionActor.CI) {
		return `:${env.toLowerCase()}`
	}

	return ''
}

/**
 * Crude pass over the process arguments to see whether `--actor HUMAN|AGENT|CI` was
 * explicitly set on the command line, and reflect it in the prefix if so.
 */
export function actorFlagFromArgv(): string {
	const argv = process.argv

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]

		if (arg === '--actor' && i + 1 < argv.length) {
			return ` --actor ${argv[i + 1]}`
		}

		const match = /^--actor=(.+)$/.exec(arg)

		if (match) {
			return ` --actor ${match[1]}`
		}
	}

	return ''
}

export function getCommandPrefix(opts: GlobalOptions): string {
	return `pnpm wallet-data-collection${actorEnvSuffixFromEnv()}${actorFlagFromArgv()} --id=${opts.id} --variant=${opts.variant}${opts.type === WalletType.SOFTWARE ? '' : ` --type=${opts.type}`}`
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

const entityIdOption = typedStringOption(
	'entity ID',
	isValidEntityId,
	'ensure the entity is registered in `/data/entities.ts` → `allEntities`',
)

function entityIdListOption(x: string | null): NonEmptyArray<EntityId> {
	return nonEmptyMap(stringListOption(x), entityIdOption)
}

export interface MarkDomainOptions extends GlobalOptions {
	domain: string
	entity: EntityId
	intermediaries: NonEmptyArray<EntityId> | null
}

export const markDomainOptions = new Options<MarkDomainOptions>(
	{
		domain: stringOption,
		entity: entityIdOption,
		intermediaries: optionalOption(entityIdListOption),
	},
	globalOptions,
)

export interface MarkDomainUpdateOptions extends GlobalOptions {
	domain: string
	setOperator: EntityId | null
	setIntermediaries: NonEmptyArray<EntityId> | null
	addIntermediaries: NonEmptyArray<EntityId> | null
	removeIntermediaries: NonEmptyArray<EntityId> | null
}

export const markDomainUpdateOptions = new Options<MarkDomainUpdateOptions>(
	{
		domain: stringOption,
		setOperator: optionalOption(entityIdOption),
		setIntermediaries: optionalOption(entityIdListOption),
		addIntermediaries: optionalOption(entityIdListOption),
		removeIntermediaries: optionalOption(entityIdListOption),
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

export enum CheckFormat {
	SUMMARY = 'SUMMARY',
	FULL = 'FULL',
}

const checkFormat = new Enum<CheckFormat>({
	[CheckFormat.SUMMARY]: true,
	[CheckFormat.FULL]: true,
})

export interface ReviewStringsOptions extends GlobalOptions {
	limit: number
}

export const reviewStringsOptions = new Options<ReviewStringsOptions>(
	{
		limit: (x: string | null): number => {
			if (x === null) {
				return 10
			}

			const n = numberOption(x)

			if (n < 1 || !Number.isInteger(n)) {
				throw new Error('must be an integer >= 1')
			}

			return n
		},
	},
	globalOptions,
)

export interface SearchOptions extends GlobalOptions {
	string: string | null
	domain: string | null
	path: string | null
	pathRegexp: string | null
	reviewed: 'true' | 'false' | 'any'
	limit: number
	offset: number
}

const reviewedOption = typedStringOption(
	'reviewed filter',
	(s: string): s is 'true' | 'false' | 'any' => s === 'true' || s === 'false' || s === 'any',
	'',
)

export const searchOptions = new Options<SearchOptions>(
	{
		string: optionalOption(stringOption),
		domain: optionalOption(stringOption),
		path: optionalOption(stringOption),
		pathRegexp: optionalOption(stringOption),
		reviewed: (x: string | null): 'true' | 'false' | 'any' => {
			if (x === null) {
				return 'any'
			}

			return reviewedOption(x)
		},
		limit: (x: string | null): number => {
			if (x === null) {
				return 10
			}

			const n = numberOption(x)

			if (n < 1 || !Number.isInteger(n)) {
				throw new Error('must be an integer >= 1')
			}

			return n
		},
		offset: (x: string | null): number => {
			if (x === null) {
				return 0
			}

			const n = numberOption(x)

			if (n < 0 || !Number.isInteger(n)) {
				throw new Error('must be an integer >= 0')
			}

			return n
		},
	},
	globalOptions,
)

export interface CheckOptions extends GlobalOptions {
	format: CheckFormat | null
}

export const checkOptions = new Options<CheckOptions>(
	{
		format: optionalOption(enumOption(checkFormat)),
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
			captureFile.userData.add(
				new UserDataString(walletAddr, [WalletInfo.ACCOUNT_ADDRESS], 'MANUAL'),
			)
		}
		await captureFile.save(getSaveOptions(opts))
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
			extraInstructions.push(
				'(If the wallet cannot import addresses after having already created a new account, then reinstall the wallet from scratch, import two or your pre-seeded accounts through the wallet account import flow. You do not need to actually re-import the two accounts you created during the ONBOARDING_NEW flow, but you should specify them in the --wallet-addresses flag nonetheless.)',
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
				`    🏁 Your goal during this next flow: ${nextFlow}`,
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
				`    🏁 Your goal during this next flow: ${nextFlow}`,
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
	await capture.save(getSaveOptions(opts))
	log(`✅ Successfully deleted all data for session ${opts.session}.`)
}

export async function handleCheck(opts: CheckOptions): Promise<number> {
	const capture = await openCaptureFile(opts)
	const issues = await capture.check({
		reviewType: opts.actor === DataCollectionActor.AGENT ? 'MUST_MAKE_REVIEWABLE' : 'MUST_REVIEW',
		isAgent: opts.actor === DataCollectionActor.AGENT,
		walletVariants: getSaveOptions(opts).walletVariants,
	})
	const showFormatFull = opts.actor !== DataCollectionActor.AGENT

	if (
		opts.actor === DataCollectionActor.AGENT &&
		opts.format === CheckFormat.FULL &&
		issues.length > 10
	) {
		log(
			'REMINDER: As an agent, you do not need to solve every issue at once. You only need to make *some* amount of forward progress. Tackle one issue at a time.',
		)
	}

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

	const isSummary = opts.format === null || opts.format === CheckFormat.SUMMARY
	let numSectionsLogged = 0

	for (const strSection of sectionOrder) {
		const sectionIssues = perSection.get(strSection)

		if (sectionIssues === undefined) {
			continue
		}

		log(`# ${strSection} (${sectionIssues.length} issue${sectionIssues.length === 1 ? '' : 's'}):`)
		numSectionsLogged++

		if (isSummary && numSectionsLogged > 3) {
			log(
				`  (Elided until the above issues are addressed first${showFormatFull ? '; use --format=FULL to show all)' : ''}`,
			)
			continue
		}

		let issuesLogged = 0

		for (const issue of sectionIssues) {
			issuesLogged++

			if (isSummary && issuesLogged > 5) {
				log(
					`  > (Other issues elided until the above issues are addressed first${showFormatFull ? '; use --format=FULL to show all)' : ''}`,
				)
				break
			}

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

	return issues.length
}

export async function handleMarkFlowUnsupported(opts: MarkFlowUnsupportedOptions): Promise<void> {
	const capture = await openCaptureFile(opts)

	capture.markFlowUnsupported(opts.flow)
	await capture.save(getSaveOptions(opts))
	log(`Flow ${opts.flow} marked as unsupported.`)
	log(`Run \`${getCommandPrefix(opts)} check\` to see if there are any more issues to address.`)
}

function domainMappingFilePath(): string {
	return path.join(repoDir(), 'data/entities/domains/entity-domains.json')
}

async function readDomainMappingFile(): Promise<DomainToEntityIdMapping> {
	const domainFile = domainMappingFilePath()

	if (!fs.existsSync(domainFile)) {
		return {}
	}

	try {
		const content = await fs.promises.readFile(domainFile, 'utf8')

		return assertValidDomainToEntityIdMapping(JSON.parse(content) as unknown)
	} catch (e) {
		throw new Error(`Failed to parse entity domains file: ${getErrorMessage(e)}`, { cause: e })
	}
}

/**
 * Build the canonical `DomainMapping` for an operator and a set of
 * intermediaries: intermediaries are deduplicated and sorted, the bare
 * entity ID form is used when there are no intermediaries, and an operator
 * that is also listed as an intermediary is rejected.
 */
function canonicalDomainMapping(operator: EntityId, intermediaries: EntityId[]): DomainMapping {
	const sorted = Array.from(new Set(intermediaries)).toSorted()

	if (sorted.some(id => id === operator)) {
		throw new Error(`Entity '${operator}' cannot be both the operator and an intermediary.`)
	}

	if (!isNonEmptyArray(sorted)) {
		return operator
	}

	return { operator, intermediaries: sorted }
}

function domainMappingOperator(mapping: DomainMapping): EntityId {
	return typeof mapping === 'string' ? mapping : mapping.operator
}

function domainMappingIntermediaries(mapping: DomainMapping): EntityId[] {
	return typeof mapping === 'string' ? [] : mapping.intermediaries
}

function domainMappingEquals(a: DomainMapping, b: DomainMapping): boolean {
	return (
		domainMappingOperator(a) === domainMappingOperator(b) &&
		domainMappingIntermediaries(a).join(',') === domainMappingIntermediaries(b).join(',')
	)
}

function domainMappingToString(mapping: DomainMapping): string {
	const intermediaries = domainMappingIntermediaries(mapping)

	return `operator '${domainMappingOperator(mapping)}'${intermediaries.length === 0 ? '' : ` via intermediaries ${intermediaries.map(i => `'${i}'`).join(', ')}`}`
}

async function writeDomainMappingFile(mapping: DomainToEntityIdMapping): Promise<void> {
	const domainFile = domainMappingFilePath()

	// Sort keys alphabetically
	const sortedDomains: DomainToEntityIdMapping = {}

	for (const key of Object.keys(mapping).toSorted()) {
		sortedDomains[key] = mapping[key]
	}

	// Re-validate to enforce all invariants before writing.
	assertValidDomainToEntityIdMapping(sortedDomains)

	// Save file with formatting, atomically (write to a temp file, then rename).
	const tmpPath = domainFile + '.tmp'

	await fs.promises.mkdir(path.dirname(domainFile), { recursive: true })
	await fs.promises.writeFile(tmpPath, JSON.stringify(sortedDomains, null, '\t') + '\n', 'utf8')
	await fs.promises.rename(tmpPath, domainFile)

	// Keep the module-level mapping in sync with the file it was loaded from.
	updateDomainMapping(sortedDomains)
}

export async function handleMarkDomain(opts: MarkDomainOptions): Promise<void> {
	const targetDomain = opts.domain.toLowerCase().trim()
	const targetMapping = canonicalDomainMapping(opts.entity, opts.intermediaries ?? [])

	const existingDomains = await readDomainMappingFile()

	// Validation: Check for conflicts with existing domains
	for (const existingDomain of Object.keys(existingDomains)) {
		const existingMapping = existingDomains[existingDomain]

		// Check if target matches exactly
		if (existingDomain === targetDomain) {
			throw new Error(
				`Domain '${targetDomain}' is already marked with ${domainMappingToString(existingMapping)}. Use \`mark-domain-update\` to modify it.`,
			)
		}

		// Check if target is a subdomain of an existing domain (e.g., target 'api.foo.com' vs existing 'foo.com').
		// This is only useful if the new mapping differs (e.g. a CDN-fronted subdomain with extra intermediaries);
		// a redundant identical entry is rejected.
		if (targetDomain.endsWith('.' + existingDomain)) {
			if (domainMappingEquals(existingMapping, targetMapping)) {
				throw new Error(
					`Domain '${targetDomain}' is a subdomain of already marked '${existingDomain}' with the same mapping (${domainMappingToString(existingMapping)}). You do not need to mark it separately.`,
				)
			}

			if (domainMappingOperator(existingMapping) !== domainMappingOperator(targetMapping)) {
				throw new Error(
					`Domain '${targetDomain}' is a subdomain of already marked '${existingDomain}' (${domainMappingToString(existingMapping)}), which has a different operator. Fix the parent domain mapping instead, or remove it in case it was made in error.`,
				)
			}

			log(
				`ℹ️ '${targetDomain}' overrides parent domain '${existingDomain}' (${domainMappingToString(existingMapping)}); the more specific entry takes precedence.`,
			)
		}

		// Check if an existing domain is a subdomain of the target (e.g., target 'foo.com' vs existing 'api.foo.com')
		// This suggests the user should have marked the parent domain instead of the child previously.
		if (existingDomain.endsWith('.' + targetDomain)) {
			if (domainMappingOperator(existingMapping) !== domainMappingOperator(targetMapping)) {
				throw new Error(
					`Existing domain ${existingDomain} is already marked with ${domainMappingToString(existingMapping)}, so cannot mark ${targetDomain} as belonging to a different operator.`,
				)
			}

			if (domainMappingEquals(existingMapping, targetMapping)) {
				log(
					`ℹ️ Consolidating: Removing '${existingDomain}' as it is a subdomain of the new target '${targetDomain}' with the same mapping.`,
				)
				delete existingDomains[existingDomain]
				// We continue the loop to ensure no other subdomains exist (e.g. both api.foo.com and images.foo.com existed)
			} else {
				log(
					`ℹ️ Keeping '${existingDomain}' (${domainMappingToString(existingMapping)}): it is a subdomain of '${targetDomain}' but has a different mapping, so the more specific entry takes precedence.`,
				)
			}
		}
	}

	// Add new entry
	existingDomains[targetDomain] = targetMapping

	await writeDomainMappingFile(existingDomains)

	log(`✅ Successfully marked '${targetDomain}' with ${domainMappingToString(targetMapping)}.`)
}

export async function handleMarkDomainUpdate(opts: MarkDomainUpdateOptions): Promise<void> {
	const targetDomain = opts.domain.toLowerCase().trim()

	if (
		opts.setIntermediaries !== null &&
		(opts.addIntermediaries !== null || opts.removeIntermediaries !== null)
	) {
		throw new Error(
			'--set-intermediaries cannot be combined with --add-intermediaries or --remove-intermediaries.',
		)
	}

	if (
		opts.setOperator === null &&
		opts.setIntermediaries === null &&
		opts.addIntermediaries === null &&
		opts.removeIntermediaries === null
	) {
		throw new Error(
			'Nothing to update; specify at least one of --set-operator, --set-intermediaries, --add-intermediaries, --remove-intermediaries.',
		)
	}

	const existingDomains = await readDomainMappingFile()

	if (!Object.hasOwn(existingDomains, targetDomain)) {
		const suffixMapping = domainMappingForDomain(targetDomain)

		throw new Error(
			`Domain '${targetDomain}' has no exact mapping entry to update.${
				suffixMapping === null
					? ''
					: ` It currently resolves through a parent domain entry (${domainMappingToString(suffixMapping)}); use \`mark-domain\` to create a more specific entry for it.`
			}`,
		)
	}

	const existingMapping = existingDomains[targetDomain]
	const operator = opts.setOperator ?? domainMappingOperator(existingMapping)
	let intermediaries = domainMappingIntermediaries(existingMapping)

	if (opts.setIntermediaries !== null) {
		intermediaries = opts.setIntermediaries
	}

	if (opts.addIntermediaries !== null) {
		for (const id of opts.addIntermediaries) {
			if (intermediaries.includes(id)) {
				throw new Error(`Entity '${id}' is already an intermediary for '${targetDomain}'.`)
			}
		}

		intermediaries = intermediaries.concat(opts.addIntermediaries)
	}

	if (opts.removeIntermediaries !== null) {
		const toRemove = opts.removeIntermediaries

		for (const id of toRemove) {
			if (!intermediaries.includes(id)) {
				throw new Error(`Entity '${id}' is not an intermediary for '${targetDomain}'.`)
			}
		}

		intermediaries = intermediaries.filter(id => !toRemove.includes(id))
	}

	const newMapping = canonicalDomainMapping(operator, intermediaries)

	if (domainMappingEquals(existingMapping, newMapping)) {
		log(`ℹ️ Mapping for '${targetDomain}' is unchanged (${domainMappingToString(newMapping)}).`)

		return
	}

	existingDomains[targetDomain] = newMapping
	await writeDomainMappingFile(existingDomains)

	log(
		`✅ Updated '${targetDomain}': ${domainMappingToString(existingMapping)} → ${domainMappingToString(newMapping)}.`,
	)
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

	await capture.save(getSaveOptions(opts))
	log(`✅ Matched ${matched.length} request${matched.length === 1 ? '' : 's'}`)

	for (const req of matched) {
		log(`  - ${req.toString()}`)
	}
}

export async function handleMarkString(opts: MarkStringOptions): Promise<void> {
	const capture = await openCaptureFile(opts)

	if (opts.data === 'BENIGN') {
		capture.addBenignString(opts.string, opts.global !== null && opts.global)
		await capture.save(getSaveOptions(opts))
		log(
			`✅ Marked string "${opts.string}" as benign${opts.global !== null && opts.global ? ' globally' : ''}.`,
		)

		return
	}

	if (opts.global !== null && opts.global) {
		throw new Error('Cannot use --global option for non-BENIGN strings')
	}

	const newInfos = setItems(opts.data)
	const existing = capture.userData.get(opts.string)

	if (existing !== undefined) {
		const toAdd = newInfos.filter(info => !existing.pieces.has(info))

		if (toAdd.length === 0) {
			const tagged =
				existing.pieces.size > 0
					? [...existing.pieces].map(info => userInfoName(info).long).join(', ')
					: 'nothing'

			log(`ℹ️ String "${opts.string}" is already tagged as ${tagged}; nothing to add.`)

			return
		}

		if (
			!toAdd.every(info => info === PersonalInfo.TRACKING_IDENTIFIER) &&
			opts.actor === DataCollectionActor.AGENT
		) {
			log(
				'⚠️ Only humans have the ability to tag strings as anything other than TRACKING_IDENTIFIER. ' +
					`If you believe this string is ${toAdd.map(info => userInfoName(info).long).join(', ')}, stop and ask your human operator what to do.`,
			)

			return
		}
	}

	capture.userData.add(new UserDataString(opts.string, newInfos, 'MANUAL'))

	await capture.save(getSaveOptions(opts))
	log(`✅ Marked string "${opts.string}" as ${setItems(opts.data).join(', ')}.`)
}

export async function handleSearch(opts: SearchOptions): Promise<void> {
	if (opts.string === null && opts.domain === null) {
		throw new Error('Must specify at least one of --string or --domain')
	}

	if (opts.pathRegexp !== null) {
		try {
			new RegExp(opts.pathRegexp)
		} catch {
			throw new Error(`Invalid --path-regexp: '${opts.pathRegexp}'`)
		}
	}

	const capture = await openCaptureFile(opts)
	const chalk = getChalk(opts)

	// Collect all requests across all flows
	const allRequests: WalletRequest[] = []

	for (const f of recordedFlow.items) {
		const flow = capture.getFlow(f)

		if (flow === null || flow === 'NOT_SUPPORTED') {
			continue
		}

		for (const req of flow.requests) {
			allRequests.push(req)
		}
	}

	// Sort by session time for consistent ordering
	allRequests.sort((a, b) => a.sessionTime.toNumber() - b.sessionTime.toNumber())

	// Filter
	const pathRegExp = opts.pathRegexp !== null ? new RegExp(opts.pathRegexp) : null

	const matchesFlags = await Promise.all(
		allRequests.map(async request => {
			// Domain filter
			if (opts.domain !== null && !domainMatches(opts.domain, request.domain)) {
				return false
			}

			// Path filter
			if (opts.path !== null && request.path !== opts.path) {
				return false
			}

			// Path regexp filter
			if (pathRegExp !== null && !pathRegExp.test(request.path)) {
				return false
			}

			// String filter
			if (opts.string !== null && !(await request.containsString(opts.string))) {
				return false
			}

			// Reviewed filter
			if (opts.reviewed !== 'any') {
				const isReviewed = request.review.isManuallyReviewed()
				const wantReviewed = opts.reviewed === 'true'

				if (isReviewed !== wantReviewed) {
					return false
				}
			}

			return true
		}),
	)

	const matches = allRequests.filter((_, i) => matchesFlags[i])

	const totalCount = matches.length
	const paged = matches.slice(opts.offset, opts.offset + opts.limit)

	// Gather strings only when --string is specified (expensive)
	let captureStrings: WalletDataStrings | null = null

	if (opts.string !== null) {
		captureStrings = await capture.gatherStrings()
	}

	// Build highlight function
	let agentHighlighted = false
	const needle = opts.string ?? opts.domain
	const highlight: ((s: string) => string) | null = (() => {
		if (needle === null) {
			return null
		}

		if (opts.actor === DataCollectionActor.AGENT) {
			return (s: string): string => {
				if (!s.includes(needle)) {
					return s
				}

				const returned = s.split(needle).join('𜱭𜱭𜱭' + needle + '𜱫𜱫𜱫')

				agentHighlighted = agentHighlighted || returned !== s

				return returned
			}
		}

		return (s: string): string => {
			if (!s.includes(needle)) {
				return s
			}

			return s.split(needle).join(chalk.bgRed.whiteBright.bold(needle))
		}
	})()

	// Print header
	log('')

	if (opts.actor === DataCollectionActor.AGENT) {
		if (totalCount > opts.offset + opts.limit) {
			log(chalk.bold('Found additional matching requests beyond the current `--offset`.'))
		}
	} else {
		log(chalk.bold(`Found ${totalCount} matching request(s)`))
	}

	if (totalCount > 0) {
		log(chalk.gray(`(showing ${paged.length} at offset ${opts.offset})`))
	}

	log('')

	for (const request of paged) {
		displayRequestInfo(request, {
			captureStrings,
			isBenignString: (s: string) => capture.isBenignString(s),
			highlight,
			headerPrefix: null,
			chalk,
		})

		log('')
	}

	if (needle !== null && agentHighlighted) {
		log(`Instances of '${needle}' were highlighted as '𜱭𜱭𜱭${needle}𜱫𜱫𜱫' above.`)
	}

	// Print footer if there are more results
	if (opts.offset + opts.limit < totalCount) {
		log(
			chalk.gray(
				`Use --offset=${opts.offset + opts.limit} to see more results (${totalCount - opts.offset - opts.limit} remaining).`,
			),
		)
		log('')
	}
}

function displayRequestInfo(
	request: WalletRequest,
	options: {
		captureStrings: WalletDataStrings | null
		isBenignString: ((str: string) => boolean) | null
		highlight: ((s: string) => string) | null
		headerPrefix: string | null
		chalk: ChalkLike
	},
): void {
	const chalk = options.chalk

	function formatStr(str: string): string {
		if (looksBinary(str)) {
			const bytesToHexEscaped = (bytes: Uint8Array): string => {
				let out = ''

				for (const byte of bytes) {
					out += `\\x${byte.toString(16).padStart(2, '0')}`
				}

				return out
			}

			const formatByteCount = (byteCount: number): string => {
				const units = ['B', 'KiB', 'MiB', 'GiB'] as const
				let value = byteCount
				let unitIndex = 0

				while (value >= 1024 && unitIndex < units.length - 1) {
					value /= 1024
					unitIndex++
				}

				return `${Number.isInteger(value) ? String(value) : value.toFixed(2)} ${units[unitIndex]}`
			}

			const formatBinaryChunk = (text: string): string => {
				const bytes = new TextEncoder().encode(text)
				const escaped = bytesToHexEscaped(bytes)

				if (bytes.length <= 72) {
					return `【${escaped}】`
				}

				const hidden = bytes.length - 32

				return `【${bytesToHexEscaped(bytes.slice(0, 16))}… +${formatByteCount(hidden)} …${bytesToHexEscaped(bytes.slice(-16))}】`
			}

			return chunkBinaryAwareString(str)
				.map(chunk =>
					chunk.kind === 'printable' ? formatStr(chunk.text) : formatBinaryChunk(chunk.text),
				)
				.join('')
		}

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
	const resolved = entitiesForDomain(request.domain)

	if (resolved === null) {
		throw new Error(`no entity associated with ${request.domain}`)
	}

	function resolvedDomainNames(r: ResolvedDomain): string {
		return (
			chalk.cyan(r.operator.name) +
			(r.intermediaries.length === 0
				? ''
				: fadedOut(' via ') + r.intermediaries.map(i => chalk.cyan(i.name)).join(fadedOut(', ')))
		)
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
		`${header('Domain')}${chalk.blue(request.domain)} ${fadedOut('(')}${resolvedDomainNames(resolved)}${fadedOut(')')}`,
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
		const refResolved = entitiesForDomain(request.refererDomain)

		if (refResolved === null) {
			throw new Error(`no entity associated with referer domain ${request.refererDomain}`)
		}

		log(
			`${header('Referer')}${chalk.blue(request.refererDomain)} ${fadedOut('(')}${resolvedDomainNames(refResolved)}${fadedOut(')')}`,
		)
	}

	if (Object.keys(request.oddHeaders).length > 0) {
		log(`${header('Headers')}${formatUserDataDict(request.oddHeaders)}`)
	}

	if (Object.keys(request.oddTrailers).length > 0) {
		log(`${header('Trailers')}${formatUserDataDict(request.oddTrailers)}`)
	}
}

export async function handleReviewStrings(opts: ReviewStringsOptions): Promise<void> {
	if (opts.actor === DataCollectionActor.AGENT) {
		await handleReviewStringsAgent(opts)

		return
	}

	await handleReviewStringsInteractive({
		id: opts.id,
		variant: opts.variant,
		type: opts.type,
		actor: opts.actor,
	})
}

async function prioritizedReviewableStrings(
	capture: WalletCaptureFile,
	allStringsFn: (walletDataStrings: WalletDataStrings) => ReadonlyArray<WalletDataString>,
): Promise<{
	walletDataStrings: WalletDataStrings
	prioritizedStrings: ReadonlyArray<WalletDataString>
}> {
	const walletDataStrings = await capture.gatherStrings()
	const allStrings = allStringsFn(walletDataStrings)
	const worthReviewingStrings = allStrings.filter(s => s.isWorthReviewingWithin(walletDataStrings))
	const smallestSet = walletDataStrings
		.smallestSetUnblockingOneRequestReview()
		.filter(s => worthReviewingStrings.some(s2 => s2.str.str === s.str.str))
	let prioritizedStrings = worthReviewingStrings

	if (smallestSet.length > 0) {
		prioritizedStrings = smallestSet.concat(
			prioritizedStrings.filter(s1 =>
				smallestSet.every((s2: WalletDataString) => s1.str.str !== s2.str.str),
			),
		)
	}

	return { walletDataStrings, prioritizedStrings }
}

async function handleReviewStringsInteractive(opts: GlobalOptions): Promise<void> {
	let capture = await openCaptureFile(opts)

	let { walletDataStrings, prioritizedStrings } = await prioritizedReviewableStrings(
		capture,
		walletDataStrings => walletDataStrings.strings(),
	)
	let userStopped = false
	const chalk = getChalk(opts)

	const highlightStr = chalk.bgRed.whiteBright.bold

	while (prioritizedStrings.length > 0 && !userStopped) {
		const strEntry = prioritizedStrings[0]
		const strValue = strEntry.str

		log('\n' + chalk.bgBlue.gray('='.repeat(80)))
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
			chalk: chalk,
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
					await capture.save(getSaveOptions(opts))
					log('\n✅ Progress saved. Stopping string review.')
					userStopped = true
					confirmed = true
					continue
				}

				if (specialOption === '__GLOBAL_BENIGN__') {
					capture.addBenignString(strValue.str, true)
					await capture.save(getSaveOptions(opts))
					log(`✅ Marked string "${strValue.str}" as globally benign.`)
					confirmed = true
					continue
				}

				if (specialOption === '__BENIGN__') {
					capture.addBenignString(strValue.str, false)
					await capture.save(getSaveOptions(opts))
					log(`✅ Marked string "${strValue.str}" as benign.`)
					confirmed = true
					continue
				}

				if (specialOption === '__NOT_WALLET_RELATED__') {
					await capture.save(getSaveOptions(opts))
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
			await capture.save(getSaveOptions(opts))
			log(
				`✅ Marked string "${strValue.str}" as ${Array.from(merged.pieces).toSorted().join(', ')}.`,
			)
			confirmed = true
		}

		// Refresh strings:
		capture = await openCaptureFile(opts)
		const reprioritized = await prioritizedReviewableStrings(capture, walletDataStrings =>
			walletDataStrings.strings(),
		)

		walletDataStrings = reprioritized.walletDataStrings
		prioritizedStrings = reprioritized.prioritizedStrings
	}

	if (!userStopped) {
		log('\n' + '='.repeat(80))
		log('✅ All strings have been reviewed!')
		log(`Run \`${getCommandPrefix(opts)} check\` to verify your work.`)
		log('='.repeat(80))
	}
}

// ============================================================================
// review-strings agent mode
// ============================================================================

async function handleReviewStringsAgent(opts: ReviewStringsOptions): Promise<void> {
	const capture = await openCaptureFile(opts)
	const { walletDataStrings, prioritizedStrings } = await prioritizedReviewableStrings(
		capture,
		walletDataStrings => walletDataStrings.highestFrequencyFirstStrings(),
	)

	if (prioritizedStrings.length === 0) {
		log('')
		log('All strings have been classified. Run `check` to verify.')
		log('')

		return
	}

	const limit = Math.min(32, Math.min(opts.limit, prioritizedStrings.length))

	if (limit < opts.limit && limit < prioritizedStrings.length) {
		log(
			`(Truncated to ${limit} strings. As an agent, you need to tackle strings in small chunks, so trying to increase the limit further is non-productive.)`,
		)
	}

	const toShow = prioritizedStrings.slice(0, limit)
	const remaining = prioritizedStrings.length - limit
	const cmdPrefix = getCommandPrefix(opts)

	log('')
	log('='.repeat(68))

	if (prioritizedStrings.length > limit) {
		log(`Showing top ${limit} strings needing classification`)
	} else {
		log(`Strings needing classification: ${prioritizedStrings.length}`)
	}

	log('='.repeat(68))

	for (const strEntry of toShow) {
		const strValue = strEntry.str
		const suggestions = classifyStringHeuristically(strEntry)

		log('')
		log('-'.repeat(68))
		log(`  String   : ${strValue.str}`)
		log(`  Entropy  : ${strEntry.score.toFixed(2)}`)
		log(
			`  Tagged   : ${
				strValue.pieces.size === 0 ? '(none)' : Array.from(strValue.pieces).join(', ')
			}`,
		)
		const numOccurrences = strEntry.getTotalOccurrences()

		if (numOccurrences === 1) {
			log('  Shows up in a single request:')
		} else {
			log(`  Shows up in ${numOccurrences} requests:`)

			for (const [roughKey, count] of Array.from(strEntry.getRoughOccurrences()).toSorted(
				(a, b) => b[1] - a[1],
			)) {
				const seenText = count === 1 ? '' : ` (seen ${count} times)`

				log(`    - ${roughKey}${seenText}`)
			}

			log(`  Sample Request (string highlighted as \`𜱭𜱭𜱭${strValue.str}𜱫𜱫𜱫\`):`)
		}

		displayRequestInfo(strEntry.firstOrigin.request, {
			captureStrings: walletDataStrings,
			highlight: (s: string): string => {
				if (!s.includes(strValue.str)) {
					return s
				}

				return s.split(strValue.str).join('𜱭𜱭𜱭' + strValue.str + '𜱫𜱫𜱫')
			},
			isBenignString: (s: string) => capture.isBenignString(s),
			headerPrefix: ' '.repeat(4),
			chalk: getChalk(opts),
		})

		log('')

		if (looksBinary(strValue.str)) {
			log(
				'  This string looks like binary, so it is not recommended to categorize it with `mark-string`. Ask your human for what to do about it.',
			)
			continue
		}

		log('  Suggested commands to deal with this string:')

		const escaped = strValue.str.replace(/'/g, "'\"'\"'")

		if (numOccurrences > 1) {
			log('    # Search for more requests carrying this same string to get more context:')
			log(`    $ ${cmdPrefix} search --string='${escaped}'`)
			log('')
		}

		let hasBenignSuggestion = false

		for (const [info, reason] of suggestions) {
			if (info === 'BENIGN') {
				hasBenignSuggestion = true
				log(`    # Mark as not carrying any user-identifying information nor tracking (${reason}):`)
				log(`    $ ${cmdPrefix} mark-string --string='${escaped}' --data='BENIGN'`)
				log('')
				log(`    # Mark as not carrying any user-identifying information nor tracking (${reason});`)
				log(
					'    # use `--global=true` if this string is likely benign regardless of where it shows up,',
				)
				log(
					'    # such as common English words or typical JSON dictionary key names or URL parameter names:',
				)
				log(`    $ ${cmdPrefix} mark-string --string='${escaped}' --data='BENIGN' --global=true`)
				log('')
			} else {
				log(`    # Mark as carrying ${info} (${reason}):`)
				log(`    $ ${cmdPrefix} mark-string --string='${escaped}' --data='${info}'`)
			}

			log('')
		}

		if (!hasBenignSuggestion) {
			log('    # Mark as not carrying any user-identifying information nor tracking:')
			log(`    $ ${cmdPrefix} mark-string --string='${escaped}' --data='BENIGN'`)
			log('')
			log('    # Mark as not carrying any user-identifying information nor tracking:')
			log(
				'    # use `--global=true` if this string is likely benign regardless of where it shows up,',
			)
			log(
				'    # such as common English words or typical JSON dictionary key names or URL parameter names:',
			)
			log(`    $ ${cmdPrefix} mark-string --string='${escaped}' --data='BENIGN' --global=true`)
			log('')
		}

		log(
			'  All valid --data values (you can specify multiple ones by concatenating them with commas, other than BENIGN which is mutually exclusive with everything else):',
		)
		log(`    ${userInfoEnums.items.join(', ')}, BENIGN`)
	}

	log('')
	log('='.repeat(68))

	if (remaining > 0) {
		log(
			'More strings remain unclassified, and will be shown only after some of the above strings are classified.',
		)
		log(
			`After marking one or more strings, re-run the \`${cmdPrefix} review-strings\` command to see the next batch, or run \`${cmdPrefix} check\` to verify progress.`,
		)
	} else {
		log(`All strings shown. After classification, run \`${cmdPrefix} check\` to verify.`)
	}

	log('='.repeat(68))
	log('')
}

export async function handleReviewRequests(opts: GlobalOptions): Promise<void> {
	if (opts.actor !== DataCollectionActor.HUMAN) {
		throw new Error('This command can only be executed by humans')
	}

	const chalk = getChalk(opts)
	const capture = await openCaptureFile(opts)
	const allStrings = await capture.gatherStrings()

	// Collect all unreviewed requests across all flows
	const unreviewedRequests: Array<{ flow: RecordedFlow; review: WalletRequestReview }> = []

	for (const f of recordedFlow.items) {
		const flow = capture.getFlow(f)

		if (flow === null || flow === 'NOT_SUPPORTED') {
			continue
		}

		for (const req of flow.requests) {
			for (const domain of req.domains()) {
				if (entitiesForDomain(domain) === null) {
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
				chalk: chalk,
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
					await capture.save(getSaveOptions(opts))
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
							await capture.save(getSaveOptions(opts))
							log('✅ Matcher deleted. Restarting this request review...')
						}

						continue
					}
				}

				purposesConfirmed = true
			}

			// Collect detected user info from request. CollectionPolicy is irrelevant here since we
			// only look at the keys (`UserInfo`s).
			const detectedUserInfo = new Set((await request.userInfo(null, false)).keys())

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
				chalk: chalk,
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
				await capture.save(getSaveOptions(opts))
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

export async function handleListWallets(opts: GlobalOptions): Promise<void> {
	const chalk = getChalk(opts)
	const repoRoot = repoDir()

	// Collect capture status per wallet per variant
	const captureStatus = new Map<
		WalletName,
		Map<Variant, { exists: boolean; complete: boolean | null }>
	>()

	for (const [walletId, wallet] of Object.entries(allWallets)) {
		const name = walletId
		const variants = new Map<Variant, { exists: boolean; complete: boolean | null }>()

		for (const variant of variantEnum.items) {
			if (!wallet.variants[variant]) {
				continue
			}

			const walletType = variantToWalletType(variant)
			const typeDir = walletType.toLowerCase() + '-wallets'
			const captureFilePath = path.join(
				repoRoot,
				'data',
				typeDir,
				'collection',
				walletId.toLowerCase(),
				`${walletId.toLowerCase()}.${variant.toLowerCase()}.capture.json`,
			)

			const exists = fs.existsSync(captureFilePath)
			let complete: boolean | null = null

			if (exists) {
				// Check if capture is complete by loading and checking
				const annotationsPath = path.join(
					repoRoot,
					'data',
					typeDir,
					'collection',
					walletId.toLowerCase(),
					`${walletId.toLowerCase()}.annotations.json`,
				)
				const globalAnnotations = globalAnnotationsPath()

				try {
					const annotations = WalletCaptureAnnotations.fromFile(
						path.isAbsolute(annotationsPath)
							? annotationsPath
							: path.join(repoRoot, annotationsPath),
						path.isAbsolute(globalAnnotations)
							? globalAnnotations
							: path.join(repoRoot, globalAnnotations),
					)
					const captureFile = await WalletCaptureFile.fromFile(
						{
							walletId: name,
							walletType,
							walletVariant: variant,
						},
						captureFilePath,
						annotations,
					)
					const issues = await captureFile.check({
						reviewType: 'MUST_REVIEW',
						isAgent: false,
						walletVariants: getSaveOptions(opts).walletVariants,
					})

					complete = issues.length === 0
				} catch {
					// If we can't load the file, just mark it as existing
					complete = null
				}
			}

			variants.set(variant, { exists, complete })
		}

		if (variants.size > 0) {
			captureStatus.set(name, variants)
		}
	}

	function statusSymbol({
		exists,
		complete,
	}: {
		exists: boolean
		complete: boolean | null
	}): string {
		if (!exists) {
			return chalk.gray('no capture')
		}

		if (complete === true) {
			return chalk.green('complete')
		}

		if (complete === false) {
			return chalk.yellow('in progress')
		}

		return chalk.gray('uncertain')
	}

	function stripAnsi(s: string): string {
		// eslint-disable-next-line no-control-regex -- Match ANSI escape codes
		return s.replace(/\x1b\[[0-9;]*m/g, '')
	}

	// Compute column widths (strip ANSI for accurate width calculation)
	const walletIdWidth = Math.max(
		'WALLET'.length,
		...Array.from(captureStatus.keys()).map(w => w.length),
	)
	const variantStatusEntries = Array.from(captureStatus.entries()).map(([, variants]) =>
		Array.from(variants.entries())
			.toSorted((a, b) => variantEnum.items.indexOf(a[0]) - variantEnum.items.indexOf(b[0]))
			.map(([variant, status]) => `${variant}: ${statusSymbol(status)}`)
			.join(', '),
	)
	const variantStatusWidth = Math.max(
		'VARIANTS'.length,
		...variantStatusEntries.map(v => stripAnsi(v).length),
	)

	function padRight(s: string, width: number): string {
		const visibleLen = stripAnsi(s).length

		return s + ' '.repeat(width - visibleLen)
	}

	log('')
	log(
		chalk.bold(padRight('WALLET', walletIdWidth)) +
			' | ' +
			chalk.bold(padRight('VARIANTS', variantStatusWidth)),
	)
	log(chalk.gray('-'.repeat(walletIdWidth + variantStatusWidth + 3)))

	for (const [walletId, variants] of Array.from(captureStatus.entries()).toSorted()) {
		const variantStatus = Array.from(variants.entries())
			.toSorted((a, b) => variantEnum.items.indexOf(a[0]) - variantEnum.items.indexOf(b[0]))
			.map(([variant, status]) => `${variant}: ${statusSymbol(status)}`)
			.join(', ')

		log(padRight(walletId, walletIdWidth) + ' | ' + padRight(variantStatus, variantStatusWidth))
	}

	log('')
}

/**
 * List all known wallet IDs and the set of variants they are defined for.
 * Output is a non-colorized table with a header and one row per wallet.
 */
export function handleListWalletIds(): void {
	const rows = Object.entries(allWallets)
		.map(([walletId, wallet]) => {
			const variants = setItems(wallet.variants)
				.toSorted((a, b) => variantEnum.items.indexOf(a) - variantEnum.items.indexOf(b))
				.join(', ')

			return { walletId, variants }
		})
		.toSorted((a, b) => a.walletId.localeCompare(b.walletId))

	const idWidth = Math.max('WALLET ID'.length, ...rows.map(r => r.walletId.length))
	const variantsWidth = Math.max('VARIANTS'.length, ...rows.map(r => r.variants.length))

	const padRight = (s: string, width: number): string => s + ' '.repeat(width - s.length)

	log(padRight('WALLET ID', idWidth) + ' | ' + padRight('VARIANTS', variantsWidth))
	log('-'.repeat(idWidth + variantsWidth + 3))

	for (const row of rows) {
		log(padRight(row.walletId, idWidth) + ' | ' + padRight(row.variants, variantsWidth))
	}
}

// ============================================================================
// capture-info subcommand
// ============================================================================

/** USDC (native) token contract address on Ethereum. */
const USDC_ETHEREUM_ADDRESS: Erc55Address = ethereumErc55Address(
	'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
)

/** Thrown when the user aborts an interactive capture-info prompt. */
class CaptureInfoCancelled extends Error {}

const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/

const MONTHS: Record<string, number> = {
	jan: 0,
	feb: 1,
	mar: 2,
	apr: 3,
	may: 4,
	jun: 5,
	jul: 6,
	aug: 7,
	sep: 8,
	oct: 9,
	nov: 10,
	dec: 11,
}

/**
 * Parse the timezone offset (in minutes, positive east of UTC) from an
 * Etherscan-style suffix such as `+UTC`, `UTC`, `UTC-08`, `UTC+05:30`, or a
 * bare `+08:00` / `-08`. Returns `null` if unrecognized.
 */
function parseTimezoneOffsetMinutes(tz: string): number | null {
	if (tz === '' || tz === 'UTC' || tz === '+UTC') {
		return 0
	}

	const utcOffset = /^UTC([+-])(\d{1,2})(?::(\d{2}))?$/.exec(tz)

	if (utcOffset !== null) {
		const sign = utcOffset[1] === '-' ? -1 : 1
		const hours = parseInt(utcOffset[2], 10)
		const minutes = utcOffset[3] === undefined ? 0 : parseInt(utcOffset[3], 10)

		return sign * (hours * 60 + minutes)
	}

	const bareOffset = /^([+-])(\d{1,2})(?::(\d{2}))?$/.exec(tz)

	if (bareOffset !== null) {
		const sign = bareOffset[1] === '-' ? -1 : 1
		const hours = parseInt(bareOffset[2], 10)
		const minutes = bareOffset[3] === undefined ? 0 : parseInt(bareOffset[3], 10)

		return sign * (hours * 60 + minutes)
	}

	return null
}

/**
 * Parse a timestamp in any of the formats Etherscan shows, returning the unix
 * timestamp (seconds, UTC), or `null` if the input is not recognized:
 *
 * - `1671864611` (unix seconds)
 * - `Dec-24-2022 06:50:11 AM +UTC`
 * - `Dec-23-2022 10:50:11 PM UTC-08` (any UTC offset)
 */
function parseEtherscanTimestamp(input: string): number | null {
	const s = input.trim()

	// Unix seconds (optionally with a fractional part).
	if (/^\d+(\.\d+)?$/.test(s)) {
		const n = parseFloat(s)

		if (!Number.isFinite(n)) {
			return null
		}

		return Math.round(n)
	}

	const m =
		/^([A-Za-z]{3})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?(?:\s*(.+))?$/.exec(s)

	if (m === null) {
		return null
	}

	const month = MONTHS[m[1].toLowerCase()]

	if (month === undefined) {
		return null
	}

	const day = parseInt(m[2], 10)
	const year = parseInt(m[3], 10)
	let hour = parseInt(m[4], 10)
	const minute = parseInt(m[5], 10)
	const second = parseInt(m[6], 10)
	const meridiem = m[7]

	if (meridiem !== undefined) {
		const upper = meridiem.toUpperCase()

		if (upper === 'AM') {
			if (hour === 12) {
				hour = 0
			}
		} else if (upper === 'PM') {
			if (hour !== 12) {
				hour += 12
			}
		} else {
			return null
		}
	}

	if (hour > 23 || minute > 59 || second > 60 || day < 1 || day > 31) {
		return null
	}

	const tz = m[8] === undefined ? '' : m[8].trim()
	const offsetMinutes = parseTimezoneOffsetMinutes(tz)

	if (offsetMinutes === null) {
		return null
	}

	// The clock shown is in timezone `UTC+offset`, so UTC = local − offset.
	const utcMs = Date.UTC(year, month, day, hour, minute, second) - offsetMinutes * 60_000

	if (Number.isNaN(utcMs)) {
		return null
	}

	return Math.round(utcMs / 1000)
}

function splitList(input: string): string[] {
	return input
		.split(/[\s,]+/)
		.map(v => v.trim())
		.filter(v => v !== '')
}

/**
 * Recover the wallet addresses that were previously passed to `capture`
 * subcommands, which were tagged with the `ACCOUNT_ADDRESS` piece in the
 * capture file's user data store. Used as the default for the wallet-address
 * question.
 */
function defaultWalletAddresses(capture: WalletCaptureFile): Erc55Address[] {
	const addresses = new Set<Erc55Address>()

	for (const encoded of capture.userData.toJSON()) {
		const pieces = encoded.piece !== undefined ? [encoded.piece] : (encoded.pieces ?? [])

		if (pieces.includes(WalletInfo.ACCOUNT_ADDRESS)) {
			if (typeof encoded.str !== 'string') {
				throw new Error(`non-string Ethereum address: ${JSON.stringify(encoded)}`)
			}

			try {
				addresses.add(ethereumErc55Address(encoded.str))
			} catch (e) {
				throw new Error(`invalid Ethereum address: ${encoded.str}: ${getErrorMessage(e)}`, {
					cause: e,
				})
			}
		}
	}

	return Array.from(addresses)
}

/** Whether the string is a syntactically valid domain name (≥2 labels). */
function isValidDomainName(domain: string): boolean {
	if (domain.length === 0 || domain.length > 253) {
		return false
	}

	if (domain.includes('://') || domain.includes('/') || domain.includes('?')) {
		return false
	}

	const labels = domain.toLowerCase().split('.')

	if (labels.length < 2) {
		return false
	}

	return labels.every(
		label =>
			label.length >= 1 && label.length <= 63 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label),
	)
}

/** Whether the capture contains at least one request to the given domain. */
function captureHasDomain(capture: WalletCaptureFile, domain: string): boolean {
	for (const f of recordedFlow.items) {
		const flow = capture.getFlow(f)

		if (flow === null || flow === 'NOT_SUPPORTED') {
			continue
		}

		for (const req of flow.requests) {
			if (domainMatches(domain, req.domain)) {
				return true
			}

			if (req.refererDomain !== null && domainMatches(domain, req.refererDomain)) {
				return true
			}
		}
	}

	return false
}

async function promptWalletAddresses(
	capture: WalletCaptureFile,
	defaults: CaptureInfo | null,
): Promise<NonEmptyArray<Erc55Address>> {
	const initial = (
		defaults !== null ? defaults.walletAddresses : defaultWalletAddresses(capture)
	).join(', ')

	while (true) {
		const response = await prompts({
			type: 'text',
			name: 'value',
			message: 'Which wallet addresses did you use during this capture run? (comma-separated)',
			initial,
		})

		if (response.value === undefined) {
			throw new CaptureInfoCancelled()
		}

		const split = splitList(String(response.value))

		if (split.length === 0) {
			log('⚠️  Please provide at least one wallet address.')
			continue
		}

		try {
			const addresses = nonEmptyMap(assertNonEmptyArray(split), a => ethereumErc55Address(a))

			if (addresses.some(a => a === USDC_ETHEREUM_ADDRESS)) {
				log(
					'⚠️  The USDC token contract address is not a wallet address. Please provide the wallet addresses you used.',
				)
				continue
			}

			return nonEmptyDedup(addresses)
		} catch (e) {
			log(`⚠️  ${getErrorMessage(e)} Try again.`)
		}
	}
}

async function promptConnectedApps(
	capture: WalletCaptureFile,
	defaults: CaptureInfo | null,
): Promise<NonEmptyArray<string>> {
	const initial = defaults !== null ? defaults.connectedApps.join(', ') : ''

	while (true) {
		const response = await prompts({
			type: 'text',
			name: 'value',
			message:
				'Which websites/apps did you connect your wallet to? (comma-separated domain names, e.g. app.uniswap.org)',
			initial,
		})

		if (response.value === undefined) {
			throw new CaptureInfoCancelled()
		}

		const split = splitList(String(response.value))

		if (split.length === 0) {
			log('⚠️  Please provide at least one domain name.')
			continue
		}

		const domains = assertNonEmptyArray(split)
		const invalid = domains.filter(domain => !isValidDomainName(domain))

		if (invalid.length > 0) {
			log(`⚠️  Not valid domain names: ${invalid.join(', ')} Try again.`)
			continue
		}

		const missing = domains.filter(domain => !captureHasDomain(capture, domain))

		if (missing.length > 0) {
			log(
				`⚠️  No requests to these domains were found in the capture (check for typos): ${missing.join(', ')}`,
			)
			continue
		}

		return nonEmptyDedup(domains, (a, b) => a.toLowerCase() === b.toLowerCase())
	}
}

async function promptSwapTokenAddresses(
	defaults: CaptureInfo | null,
): Promise<NonEmptyArray<Erc55Address>> {
	const initial = (
		defaults !== null && defaults.swapTokenAddresses.length > 0
			? defaults.swapTokenAddresses
			: [USDC_ETHEREUM_ADDRESS]
	).join(', ')

	while (true) {
		const response = await prompts({
			type: 'text',
			name: 'value',
			message:
				'Which token addresses did you use to swap? (comma-separated; defaults to USDC on Ethereum)',
			initial,
		})

		if (response.value === undefined) {
			throw new CaptureInfoCancelled()
		}

		const split = splitList(String(response.value))

		if (split.length === 0) {
			log('⚠️  Please provide at least one token address.')
			continue
		}

		try {
			return nonEmptyDedup(nonEmptyMap(assertNonEmptyArray(split), a => ethereumErc55Address(a)))
		} catch (e) {
			log(`⚠️  ${getErrorMessage(e)} Try again.`)
		}
	}
}

async function promptTransactionHashes(
	defaults: CaptureInfo | null,
): Promise<NonEmptyArray<string>> {
	const initial =
		defaults !== null && defaults.transactions.length > 0
			? defaults.transactions.map(tx => tx.txHash).join(', ')
			: ''

	while (true) {
		const response = await prompts({
			type: 'text',
			name: 'value',
			message:
				'Which transaction IDs (0x...) did you submit as part of this? (comma- or newline-separated)',
			initial,
		})

		if (response.value === undefined) {
			throw new CaptureInfoCancelled()
		}

		const split = splitList(String(response.value))

		if (split.length === 0) {
			log('⚠️  Please provide at least one transaction ID.')
			continue
		}

		const hashes = assertNonEmptyArray(split)
		const invalid = hashes.filter(hash => !TX_HASH_PATTERN.test(hash))

		if (invalid.length > 0) {
			log(`⚠️  Invalid transaction IDs (must be 0x + 64 hex chars): ${invalid.join(', ')}`)
			continue
		}

		return nonEmptyDedup(hashes)
	}
}

async function promptTransactionTimestamp(txHash: string): Promise<number> {
	const link = `https://etherscan.io/tx/${txHash}`

	while (true) {
		log(`\nOpen this link to find the timestamp of this transaction:\n  ${link}`)

		const response = await prompts({
			type: 'text',
			name: 'value',
			message:
				'When did this transaction land on-chain? (e.g. "Dec-24-2022 06:50:11 AM +UTC", "Dec-23-2022 10:50:11 PM UTC-08", or unix seconds)',
			initial: '',
		})

		if (response.value === undefined) {
			throw new CaptureInfoCancelled()
		}

		const timestamp = parseEtherscanTimestamp(String(response.value))

		if (timestamp === null) {
			log(
				'⚠️  Could not parse that timestamp. Accepts formats like "Dec-24-2022 06:50:11 AM +UTC", "Dec-23-2022 10:50:11 PM UTC-08", or unix seconds. Try again.',
			)
			continue
		}

		if (timestamp > Date.now() / 1000) {
			log('⚠️  That timestamp is in the future. Try again.')
			continue
		}

		return timestamp
	}
}

async function collectCaptureInfo(
	capture: WalletCaptureFile,
	defaults: CaptureInfo | null,
): Promise<CaptureInfo> {
	const walletAddresses = await promptWalletAddresses(capture, defaults)
	const connectedApps = await promptConnectedApps(capture, defaults)
	const swapTokenAddresses = await promptSwapTokenAddresses(defaults)
	const txHashes = await promptTransactionHashes(defaults)
	const transactions: CaptureInfoTransaction[] = []

	for (const txHash of txHashes) {
		const timestamp = await promptTransactionTimestamp(txHash)

		transactions.push(new CaptureInfoTransaction(txHash, timestamp))
	}

	return new CaptureInfo(walletAddresses, connectedApps, swapTokenAddresses, transactions)
}

/**
 * Interactively collect high-level capture metadata (capture info) after all
 * network captures have been performed, and store it in the capture file.
 * Running again with existing entries lets the user edit a past response or
 * append a new one.
 */
export async function handleCaptureInfo(opts: GlobalOptions): Promise<void> {
	if (opts.actor !== DataCollectionActor.HUMAN) {
		throw new Error('This command can only be executed by humans')
	}

	const capture = await openCaptureFile(opts)
	const existing = capture.getCaptureInfo()

	try {
		if (existing.length === 0) {
			const info = await collectCaptureInfo(capture, null)

			capture.setCaptureInfo([info])
			await capture.save(getSaveOptions(opts))
			log('✅ Capture info recorded.')

			return
		}

		const choices: prompts.PromptObject<'value'>['choices'] = existing.map((info, i) => ({
			title: `Edit entry #${i + 1}: ${info.connectedApps.join(', ')} (${info.transactions.length} transaction${info.transactions.length === 1 ? '' : 's'})`,
			value: i,
		}))

		choices.push({ title: 'Append a new capture-info entry', value: 'NEW' })

		const response = await prompts({
			type: 'select',
			name: 'value',
			message: 'You already have capture info recorded. What would you like to do?',
			choices,
		})

		if (response.value === undefined) {
			log('\nCapture info cancelled.')

			return
		}

		if (response.value === 'NEW') {
			const info = await collectCaptureInfo(capture, null)

			capture.setCaptureInfo([...existing, info])
		} else {
			if (typeof response.value !== 'number') {
				throw new CaptureInfoCancelled()
			}

			const info = await collectCaptureInfo(capture, existing[response.value])
			const newList = [...existing]

			newList[response.value] = info
			capture.setCaptureInfo(newList)
		}

		await capture.save(getSaveOptions(opts))
		log('✅ Capture info saved.')
	} catch (e) {
		if (e instanceof CaptureInfoCancelled) {
			log('\nCapture info cancelled. No changes saved.')

			return
		}

		throw e
	}
}
