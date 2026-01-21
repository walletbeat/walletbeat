import { spawn } from 'child_process'
import path from 'path'
import process from 'process'
import { fileURLToPath } from 'url'

import { isValidWalletName, type WalletName } from '@/data/wallets'
import {
	DataCollectionPurpose,
	dataCollectionPurpose,
	UserFlow,
	type UserInfo,
	userInfoEnums,
} from '@/schema/features/privacy/data-collection'
import { type Variant, variantEnum } from '@/schema/variants'
import { WalletType, walletTypes } from '@/schema/wallet-types'
import {
	isNonEmptyArray,
	type NonEmptyArray,
	type NonEmptySet,
	nonEmptySetFromArray,
	setContains,
} from '@/types/utils/non-empty'
import { Enum } from '@/utils/enum'

import { WalletCaptureAnnotations, WalletRequestMatcher } from './wallet-capture-annotations'
import {
	flowsNotRequiringWalletAddress,
	type RecordedFlow,
	recordedFlow,
	RecordedOnlyFlow,
	WalletCaptureFile,
	WalletCaptureIssue,
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
			return 'Reinstall the wallet, then import two user accounts into the wallet, one of which must already have some Ether and USDC.'
		case UserFlow.SEND_ETHER:
			return 'Send Ether from one account to the other.'
		case UserFlow.SEND_USDC:
			return 'Send USDC from one account to the other.'
		case UserFlow.NATIVE_SWAP:
			return 'Perform a built-in token swap from Ether to USDC.'
		case UserFlow.APP_CONNECTION:
			return 'Connect to the Walletbeat test page.'
		case UserFlow.TRANSACTION:
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
			return UserFlow.TRANSACTION
		case UserFlow.TRANSACTION:
			return 'DONE'
	}
}

// ============================================================================
// Option Interfaces
// ============================================================================

type Option<O> = (x: unknown) => O

function stringOption(x: unknown): string {
	if (x === undefined) {
		throw new Error('flag not specified')
	}

	if (typeof x !== 'string') {
		throw new Error(`not a string (got ${typeof x})`)
	}

	return x
}

function stringListOption(x: unknown): NonEmptyArray<string> {
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

	return split
}

function numberOption(x: unknown): number {
	if (x === undefined) {
		throw new Error('flag not specified')
	}

	if (typeof x !== 'number') {
		throw new Error('not a number')
	}

	return x
}

function enumOption<E extends string>(e: Enum<E>): Option<E> {
	return (x: unknown): E => {
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

		return x
	}
}

function enumSetOption<E extends string>(e: Enum<E>): Option<NonEmptySet<E>> {
	return (x: unknown): NonEmptySet<E> => {
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

		if (!e.is(x)) {
			throw new Error(
				`invalid: "${x}" (must be a comma-separated list of one or more of: ${e.items.join(', ')})`,
			)
		}

		return nonEmptySetFromArray(items)
	}
}

function optionalOption<O>(nonOptional: Option<O>): Option<O | null> {
	return (x: unknown): O | null => {
		if (x === undefined || x === null) {
			return null
		}

		return nonOptional(x)
	}
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

		for (const wantFieldName of Object.keys(this.fields)) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because it is from the keys of this.fields.
			const fieldName = wantFieldName as keyof T
			const option = this.fields[fieldName]

			if (option === undefined) {
				throw new Error(`unexpected field ${wantFieldName}`)
			}

			try {
				const processed = option((x as Partial<T>)[fieldName])

				result = { [fieldName]: processed, ...result }
			} catch (e) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because this code only ever throws Error.
				throw new Error(`Flag --${wantFieldName}: ${e as Error}`)
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
	id: (x: unknown): WalletName => {
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

		return x
	},
	variant: enumOption(variantEnum),
	type: enumOption(walletTypes),
})

export function getCommandPrefix(opts: GlobalOptions): string {
	return `pnpm wallet-data-collection --id=${opts.id} --variant=${opts.variant}${opts.type === WalletType.SOFTWARE ? '' : ` --type=${opts.type}`}`
}

export interface CaptureOptions extends GlobalOptions {
	flow: RecordedFlow
	walletAddresses: NonEmptyArray<string> | null
	port: number
}

export const captureOptions = new Options<CaptureOptions>(
	{
		flow: enumOption(recordedFlow),
		walletAddresses: optionalOption(stringListOption),
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

export interface MarkStringOptions {
	string: string
	dataType: UserInfo
}

export const markStringOptions = new Options<MarkStringOptions>({
	string: stringOption,
	dataType: enumOption(userInfoEnums),
})

export interface MarkDomainOptions {
	domainPattern: string
	entityId: string
}

export const markDomainOptions = new Options<MarkDomainOptions>({
	domainPattern: stringOption,
	entityId: stringOption,
})

export interface ExplainRequestOptions extends GlobalOptions {
	domain: string
	path: string | null
	method: string | null
	purposes: NonEmptySet<DataCollectionPurpose>
}

export const explainRequestOptions = new Options<ExplainRequestOptions>(
	{
		domain: stringOption,
		path: optionalOption(stringOption),
		method: optionalOption(stringOption),
		purposes: enumSetOption(dataCollectionPurpose),
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

function openCaptureFile(options: GlobalOptions): WalletCaptureFile {
	const annotations = new WalletCaptureAnnotations(annotationsPath(options))
	const captureFile = new WalletCaptureFile(capturePath(options), annotations)

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
	const argv = [
		'mitmdump',
		`--listen-port=${opts.port}`,
		'--mode=regular',
		'--set=upstream_cert=false',
		'--set=http2=false',
		`--set=wallet_id=${opts.id}`,
		`--set=wallet_variant=${opts.variant}`,
		`--set=ux_flow=${opts.flow}`,
	]

	if (opts.walletAddresses === null) {
		if (!setContains(flowsNotRequiringWalletAddress, opts.flow)) {
			throw new Error(`Must specify wallet_address for flow ${opts.flow}.`)
		}

		argv.push('--set=wallet_address=')
	} else {
		argv.push(`--set=wallet_address=${opts.walletAddresses.join(',')}`)
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
			captureOptions.push(`--wallet-addresses=${opts.walletAddresses.join(',')}`)
		} else if (!setContains(flowsNotRequiringWalletAddress, nextFlow)) {
			captureOptions.push('--wallet-addresses=0x123...,0x456...')
			extraInstructions.push(
				'(Make sure these wallet addresses are pre-funded with Ether and USDC!)',
			)
		}

		const nextInstructions = [
			'',
			`✅ Done with flow: ${opts.flow}`,
			'  ➡️ If you forgot to test something, simply re-run the previous command and do it.',
			'  ➡️ If you made a mistake, you may delete the data you just recorded using this command:',
			`    ⚙️ ${getCommandPrefix(opts)} delete-capture --session=TODO`,
			`  ➡️ Otherwise, move on to the next flow: ${nextFlow}.`,
			`    ⚙️ ${getCommandPrefix(opts)} capture --flow=${nextFlow}${captureOptions.length === 0 ? '' : ' ' + captureOptions.join(' ')}`,
		]

		for (const extraInstruction of extraInstructions) {
			nextInstructions.push(extraInstruction)
		}
		nextInstructions.push('')
		logInstructions(nextInstructions)
	}
}

export async function handleDeleteCapture(_: DeleteCaptureOptions): Promise<void> {
	log('delete-capture subcommand not yet implemented')
	await Promise.resolve()
}

export async function handleCheck(opts: GlobalOptions): Promise<void> {
	const capture = openCaptureFile(opts)
	const issues = capture.check()

	if (issues.length == 0) {
		log('No issues found! Wallet capture process complete. Well done.')

		return
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
}

export async function handleMarkFlowUnsupported(opts: MarkFlowUnsupportedOptions): Promise<void> {
	const capture = openCaptureFile(opts)

	capture.markFlowUnsupported(opts.flow)
	await capture.save()
	log(`Flow ${opts.flow} marked as unsupported.`)
	log(`Run ${getCommandPrefix(opts)} to see if there are any more issues to address.`)
}

export async function handleMarkString(_: MarkStringOptions): Promise<void> {
	log('mark-string subcommand not yet implemented')
	await Promise.resolve()
}

export async function handleMarkDomain(_: MarkDomainOptions): Promise<void> {
	log('mark-domain subcommand not yet implemented')
	await Promise.resolve()
}

export async function handleExplainRequest(opts: ExplainRequestOptions): Promise<void> {
	const capture = openCaptureFile(opts)

	capture.addRequestMatcher(
		new WalletRequestMatcher({
			domain: opts.domain,
			path: opts.path,
			method: opts.method,
			purposes: opts.purposes,
		}),
	)
	await capture.save()
}
