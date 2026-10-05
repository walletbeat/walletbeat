/**
 * Pi-based harness for the wallet-data-collection agent.
 */
import path from 'node:path'

import {
	createAgentSession,
	createBashToolDefinition,
	createLocalBashOperations,
	DefaultResourceLoader,
	defineTool,
	type ExtensionUIContext,
	getAgentDir,
	SessionManager,
	SettingsManager,
	Theme,
} from '@earendil-works/pi-coding-agent'
import chalk from 'chalk'
import askUserExtension from 'pi-ask-user/index.ts'
import prompts from 'prompts'

import { getRepositoryRoot } from '../../../utils/codebase'
import { createCommandCheckBashOperations } from './command-check-hooks'

const agentDir = path.join(getRepositoryRoot(), 'src/tools/wallet-data-collection/agent')
const agentDirGlobal = getAgentDir()

const outputStyles = {
	/** Model reasoning/thinking text (assistant `thinking_delta`). */
	thinking: chalk.gray,
	/** Non-thinking assistant output text (assistant `text_delta`). */
	output: chalk.white,
	/** Tool call input header (`[toolName] $ command`). */
	toolInput: chalk.blue,
	/** Tool name within the call header (`[bash]`). */
	toolName: chalk.magentaBright.bold,
	/** Streamed tool (bash) output. */
	toolOutput: chalk.cyan,
} as const

/**
 * Substitute `{{name}}` / `{{name|fallback}}` placeholders in the system prompt with the
 * wallet context values from the `WALLETBEAT_WALLET_DATA_COLLECTION_{ID,VARIANT,TYPE}`
 * env vars. When a value is unset or empty, the placeholder's `|fallback` (or an empty
 * string) is used.
 */
function substituteWalletPlaceholders(content: string): string {
	const values: Record<string, string> = {
		walletId: process.env.WALLETBEAT_WALLET_DATA_COLLECTION_ID ?? '',
		walletVariant: process.env.WALLETBEAT_WALLET_DATA_COLLECTION_VARIANT ?? '',
		walletType: process.env.WALLETBEAT_WALLET_DATA_COLLECTION_TYPE ?? '',
	}

	return content.replace(
		/\{\{(\w+)(?:\|([^}]*))?\}\}/g,
		(_match, name: string, fallback?: string) => {
			const value = values[name]

			if (value !== undefined && value !== '') {
				return value
			}

			return fallback ?? ''
		},
	)
}

// Project `.pi/settings.json` (in agentDir) is merged with, and takes precedence
// over, the user-level agent-dir settings.
const settingsManager = SettingsManager.create(agentDir, agentDirGlobal)

const resourceLoader = new DefaultResourceLoader({
	cwd: agentDir,
	agentDir: agentDirGlobal,
	settingsManager,
	noExtensions: true,
	noSkills: true,
	noPromptTemplates: true,
	noThemes: true,
	noContextFiles: true,
	additionalSkillPaths: [],
	extensionFactories: [askUserExtension],
	appendSystemPromptOverride: baseAppend => baseAppend.map(substituteWalletPlaceholders),
})

await resourceLoader.reload()

// Wrap the `bash` tool with the command-check hooks.
const bashOperations = createCommandCheckBashOperations(createLocalBashOperations())
const bashTool = defineTool(createBashToolDefinition(agentDir, { operations: bashOperations }))

const { session } = await createAgentSession({
	cwd: agentDir,
	agentDir: agentDirGlobal,
	tools: ['bash', 'ask_user'],
	customTools: [bashTool],
	resourceLoader,
	settingsManager,
	sessionManager: SessionManager.inMemory(agentDir),
})

// The `ask_user` extension renders its rich UI through the runner's `ctx.ui`, which is
// unavailable in this plain (non-TUI) harness. It degrades to the `select()`/`input()`
// dialog fallback when `ctx.ui.custom()` is unavailable, so we provide a `prompts`-based
// context that answers interactively through `prompts`. This makes `ask_user` usable in
// the harness without a pi-tui overlay.
session.extensionRunner.setUIContext(createPromptsUIContext(), 'print')

let stdinClosed = false
const stdinCloseWaiters: Array<() => void> = []

function notifyStdinClosed(): void {
	if (stdinClosed) {
		return
	}

	stdinClosed = true

	for (const resolve of stdinCloseWaiters.splice(0)) {
		resolve()
	}
}

process.stdin.on('end', notifyStdinClosed)
process.stdin.on('close', notifyStdinClosed)

function waitForStdinClose(): {
	promise: Promise<null>
	release: () => void
} {
	if (stdinClosed) {
		return { promise: Promise.resolve(null), release: () => {} }
	}

	let resolveFn: () => void = () => {}
	const promise = new Promise<null>(resolve => {
		resolveFn = () => resolve(null)
	})

	stdinCloseWaiters.push(resolveFn)

	return {
		promise,
		release: () => {
			const index = stdinCloseWaiters.indexOf(resolveFn)

			if (index >= 0) {
				stdinCloseWaiters.splice(index, 1)
			}
		},
	}
}

async function promptOrClose<T>(run: () => Promise<T>): Promise<T | null> {
	const { promise, release } = waitForStdinClose()

	try {
		return await Promise.race([run(), promise])
	} finally {
		release()
	}
}

// Narrow the (any-typed) tool args to a shape with an optional `command`, without an
// unsafe type assertion.
function isToolArgs(value: unknown): value is { command?: string } {
	return typeof value === 'object' && value !== null && 'command' in value
}

// Track the kind of the most recently streamed assistant block so we can insert a
// blank line when the model switches between thinking and non-thinking output.
let lastStreamKind: 'thinking' | 'text' | null = null

session.subscribe(event => {
	switch (event.type) {
		case 'message_update': {
			const kind = event.assistantMessageEvent.type

			if (kind === 'text_delta') {
				if (lastStreamKind === 'thinking') {
					process.stdout.write('\n')
				}

				lastStreamKind = 'text'
				process.stdout.write(outputStyles.output(event.assistantMessageEvent.delta))
			} else if (kind === 'thinking_delta') {
				if (lastStreamKind === 'text') {
					process.stdout.write('\n')
				}

				lastStreamKind = 'thinking'
				process.stdout.write(outputStyles.thinking(event.assistantMessageEvent.delta))
			}

			break
		}
		case 'tool_execution_start': {
			const command = isToolArgs(event.args) ? event.args.command : undefined

			lastStreamKind = null
			process.stdout.write(
				`\n${outputStyles.toolInput(`[${outputStyles.toolName(event.toolName)}]${command ? ` $ ${command}` : ''}`)}\n`,
			)
			break
		}
		case 'bash_execution_update':
			process.stdout.write(outputStyles.toolOutput(event.delta))
			break
		case 'tool_execution_end':
			process.stdout.write('\n')
			break
		default:
			break
	}
})

// A minimal theme for the prompts-based UI context. The `ask_user` fallback path never
// reads `theme`, but `ExtensionUIContext` requires one, so we provide a stub whose color
// helpers all resolve to the terminal reset sequence.
function createStubTheme(): Theme {
	const fgColors = [
		'accent',
		'border',
		'borderAccent',
		'borderMuted',
		'success',
		'error',
		'warning',
		'muted',
		'dim',
		'text',
		'thinkingText',
		'userMessageText',
		'customMessageText',
		'customMessageLabel',
		'toolTitle',
		'toolOutput',
		'mdHeading',
		'mdLink',
		'mdLinkUrl',
		'mdCode',
		'mdCodeBlock',
		'mdCodeBlockBorder',
		'mdQuote',
		'mdQuoteBorder',
		'mdHr',
		'mdListBullet',
		'toolDiffAdded',
		'toolDiffRemoved',
		'toolDiffContext',
		'syntaxComment',
		'syntaxKeyword',
		'syntaxFunction',
		'syntaxVariable',
		'syntaxString',
		'syntaxNumber',
		'syntaxType',
		'syntaxOperator',
		'syntaxPunctuation',
		'thinkingOff',
		'thinkingMinimal',
		'thinkingLow',
		'thinkingMedium',
		'thinkingHigh',
		'thinkingXhigh',
		'bashMode',
	] as const
	const bgColors = [
		'selectedBg',
		'userMessageBg',
		'customMessageBg',
		'toolPendingBg',
		'toolSuccessBg',
		'toolErrorBg',
	] as const
	const fg = Object.fromEntries(fgColors.map(color => [color, '']))
	const bg = Object.fromEntries(bgColors.map(color => [color, 0]))

	return new Theme(fg, bg, 'dark')
}

/**
 * Build an `ExtensionUIContext` whose `select`/`input` dialogs use the `prompts` package,
 * so the `ask_user` extension's interactive fallback works in this plain harness. The
 * `custom` method returns `undefined`, which makes the extension fall back to the
 * `select()`/`input()` dialogs instead of the unavailable pi-tui overlay.
 */
function createPromptsUIContext(): ExtensionUIContext {
	const noOp = () => {}
	const noOpInput = (): Promise<undefined> => Promise.resolve(undefined)

	const runPrompt = async <T>(run: () => Promise<T>): Promise<T | undefined> => {
		try {
			return await run()
		} catch {
			// `prompts` rejects on cancellation (Ctrl+C); treat it as "no answer".
			return undefined
		}
	}

	return {
		async select(title, options, opts) {
			if (opts?.signal?.aborted) {
				return undefined
			}

			return runPrompt(async () => {
				const response = await promptOrClose(() =>
					prompts({
						type: 'select',
						name: 'answer',
						message: title,
						choices: options.map(option => ({ title: option, value: option })),
					}),
				)

				return typeof response?.answer === 'string' ? response.answer : undefined
			})
		},
		async input(title, placeholder, opts) {
			if (opts?.signal?.aborted) {
				return undefined
			}

			return runPrompt(async () => {
				const response = await promptOrClose(() =>
					prompts({
						type: 'text',
						name: 'answer',
						message: title,
						initial: placeholder,
					}),
				)

				return typeof response?.answer === 'string' ? response.answer : undefined
			})
		},
		confirm: () => Promise.resolve(false),
		notify: noOp,
		onTerminalInput: () => noOp,
		setStatus: noOp,
		setWorkingMessage: noOp,
		setWorkingVisible: noOp,
		setWorkingIndicator: noOp,
		setHiddenThinkingLabel: noOp,
		setWidget: noOp,
		setFooter: noOp,
		setHeader: noOp,
		setTitle: noOp,
		// Returning `undefined` makes the ask_user extension fall back to `select`/`input`.
		// The pi-ask-user extension requires `custom<T>` to return `Promise<T>`, and a no-op
		// returning `undefined` can only be typed as an arbitrary `T` via an assertion; the
		// rich pi-tui overlay this method would render is unavailable in this plain harness.
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
		custom: <T>() => Promise.resolve(undefined as T),
		pasteToEditor: noOp,
		setEditorText: noOp,
		getEditorText: () => '',
		editor: noOpInput,
		addAutocompleteProvider: noOp,
		setEditorComponent: noOp,
		getEditorComponent: () => undefined,
		get theme() {
			return createStubTheme()
		},
		getAllThemes: () => [],
		getTheme: () => undefined,
		setTheme: () => ({ success: false, error: 'UI not available' }),
		getToolsExpanded: () => false,
		setToolsExpanded: noOp,
	}
}

async function runPrompt(prompt: string): Promise<void> {
	process.stdout.write('\n')
	await withAgentInterrupt(() => session.prompt(prompt))
	process.stdout.write('\n')
}

/**
 * Watch stdin during a model turn for `Esc` or Ctrl+C.
 */
async function withAgentInterrupt<T>(run: () => Promise<T>): Promise<T> {
	const stdin = process.stdin

	if (typeof stdin.setRawMode !== 'function' || !stdin.isTTY) {
		return run()
	}

	const onData = (chunk: Buffer) => {
		// Ctrl+C (0x03) or `Esc` (0x1b). Requiring a single byte avoids matching the
		// first byte of multi-byte escape sequences such as arrow keys.
		if (chunk.length === 1 && (chunk[0] === 0x03 || chunk[0] === 0x1b)) {
			void session.abort()
		}
	}

	stdin.on('data', onData)
	stdin.setRawMode(true)
	stdin.resume()

	try {
		return await run()
	} finally {
		stdin.setRawMode(false)
		stdin.off('data', onData)
	}
}

/**
 * Read one line of user input interactively via `prompts`. Returns `null` when the user
 * cancels (Ctrl+C) or stdin closes, which the caller treats as quitting. `prompts` is the
 * single consumer of stdin in this harness, so it never conflicts with the `ask_user`
 * dialogs (which also use `prompts`) during a model turn.
 */
async function readUserInput(): Promise<string | null> {
	try {
		process.stdout.write('Type `/quit` to quit.\n')
		const response = await promptOrClose(() =>
			prompts({
				type: 'text',
				name: 'input',
				message: '',
			}),
		)

		return typeof response?.input === 'string' ? response.input : null
	} catch {
		return null
	}
}

try {
	const initialPrompt = process.argv.slice(2).join(' ')

	if (initialPrompt) {
		await runPrompt(initialPrompt)
	}

	// Interactive loop: read a prompt, run it, repeat until the user quits.
	while (true) {
		const line = await readUserInput()

		if (line === null) {
			break
		}

		const trimmed = line.trim()

		if (trimmed === 'quit' || trimmed === 'exit' || trimmed === '/quit' || trimmed === '/exit') {
			break
		}

		if (!trimmed) {
			continue
		}

		await runPrompt(trimmed)
	}
} finally {
	session.dispose()
}
