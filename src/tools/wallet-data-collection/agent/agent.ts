/**
 * Pi-based harness for the wallet-data-collection agent.
 */
import path from 'node:path'

import {
	createAgentSession,
	createBashToolDefinition,
	createLocalBashOperations,
	createReadToolDefinition,
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
import {
	createLocalReadOperations,
	createReadCheckOperations,
	resolveReadDisplayPath,
} from './read-hooks'

const agentDir = path.join(getRepositoryRoot(), 'src/tools/wallet-data-collection/agent')
const agentDirGlobal = getAgentDir()

const repoRoot = getRepositoryRoot()
const backupTreeDir = path.join(agentDir, 'backup-tree.bak')

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

// Wrap the `read` tool with path-validation hooks: refuse out-of-repo reads and reads
// inside backup-tree.bak (except pi-*.log files and directories), and render the
// repo-root-relative path in the call header.
const readOperations = createReadCheckOperations(
	createLocalReadOperations(),
	repoRoot,
	backupTreeDir,
)
const readTool = defineTool(createReadToolDefinition(agentDir, { operations: readOperations }))

const { session } = await createAgentSession({
	cwd: agentDir,
	agentDir: agentDirGlobal,
	tools: ['bash', 'read', 'ask_user'],
	customTools: [bashTool, readTool],
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

// Narrow the (any-typed) tool args to a shape with a `path`, for the read tool.
function isReadToolArgs(value: unknown): value is { path: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'path' in value &&
		typeof (value as { path?: unknown }).path === 'string'
	)
}

// Track the kind of the most recently streamed assistant block so we can insert a
// blank line when the model switches between thinking and non-thinking output.
// Both this and the per-call output tracking are held on the session output state so
// the harness has a single mutable object rather than loose module-level variables.
class SessionOutput {
	private lastStreamKind: 'thinking' | 'text' | null = null

	/** How many characters of a tool's output have already been written, per tool call id. */
	private readonly toolOutputWritten = new Map<string, number>()

	/**
	 * Narrow a content part to a `{ type: "text", text: string }` shape, or return null.
	 * Used to safely extract text from a tool result's content array.
	 */
	private static asTextPart(value: unknown): { text: string } | null {
		if (typeof value !== 'object' || value === null) {
			return null
		}

		if (!('type' in value) || !('text' in value)) {
			return null
		}

		const { type, text } = value

		if (type !== 'text' || typeof text !== 'string') {
			return null
		}

		return { text }
	}

	/**
	 * Extract the concatenated text of a tool result/partial result's content array.
	 * Returns an empty string for anything that is not a `{ content: [...] }` shape with
	 * text parts, so non-bash tools and unexpected shapes degrade to no output.
	 */
	private static extractToolText(result: unknown): string {
		if (typeof result !== 'object' || result === null) {
			return ''
		}

		const content = (result as { content?: unknown }).content

		if (!Array.isArray(content)) {
			return ''
		}

		let text = ''

		for (const part of content) {
			const textPart = SessionOutput.asTextPart(part)

			if (textPart !== null) {
				text += textPart.text
			}
		}

		return text
	}

	/** Handle a streaming assistant message update (thinking or output text). */
	/** Handle a streaming assistant message delta (thinking or output text). */
	handleMessageDelta(kind: 'text_delta' | 'thinking_delta', delta: string): void {
		if (kind === 'text_delta') {
			if (this.lastStreamKind === 'thinking') {
				process.stdout.write('\n')
			}

			this.lastStreamKind = 'text'
			process.stdout.write(outputStyles.output(delta))
		} else {
			if (this.lastStreamKind === 'text') {
				process.stdout.write('\n')
			}

			this.lastStreamKind = 'thinking'
			process.stdout.write(outputStyles.thinking(delta))
		}
	}

	/** Handle a tool starting to execute: reset per-call tracking and print the header. */
	handleToolStart(toolName: string, toolCallId: string, detail: string | undefined): void {
		this.lastStreamKind = null
		this.toolOutputWritten.delete(toolCallId)
		process.stdout.write(
			`\n${outputStyles.toolInput(`[${outputStyles.toolName(toolName)}]${detail ? ` $ ${detail}` : ''}`)}\n`,
		)
	}

	/**
	 * Write the portion of `text` not already printed for `toolCallId`. The bash tool
	 * streams cumulative snapshots via `tool_execution_update`, so each update contains
	 * the full output so far; we only write the tail that is new.
	 */
	private writeToolOutput(toolCallId: string, text: string): void {
		const written = this.toolOutputWritten.get(toolCallId) ?? 0

		if (text.length > written) {
			process.stdout.write(outputStyles.toolOutput(text.slice(written)))
			this.toolOutputWritten.set(toolCallId, text.length)
		}
	}

	/** Handle a streaming tool output snapshot (cumulative). */
	handleToolUpdate(toolCallId: string, partialResult: unknown): void {
		this.writeToolOutput(toolCallId, SessionOutput.extractToolText(partialResult))
	}

	/** Handle a tool finishing: flush the final output and emit a trailing newline. */
	handleToolEnd(toolCallId: string, result: unknown): void {
		this.writeToolOutput(toolCallId, SessionOutput.extractToolText(result))
		process.stdout.write('\n')
	}
}

// One session-scoped output state for the whole harness run.
const sessionOutput = new SessionOutput()

// Tools whose output is intentionally not echoed to stdout. The `read` tool's file
// contents are visible in the transcript context but would clutter the terminal, so we
// print its call header but suppress its output.
const quietTools = new Set(['read'])

session.subscribe(event => {
	switch (event.type) {
		case 'message_update': {
			const { type } = event.assistantMessageEvent

			if (type === 'text_delta' || type === 'thinking_delta') {
				sessionOutput.handleMessageDelta(type, event.assistantMessageEvent.delta)
			}

			break
		}
		case 'tool_execution_start': {
			const command = isToolArgs(event.args) ? event.args.command : undefined
			const readPath = isReadToolArgs(event.args)
				? resolveReadDisplayPath(event.args.path, repoRoot, agentDir)
				: undefined

			sessionOutput.handleToolStart(event.toolName, event.toolCallId, command ?? readPath)
			break
		}
		case 'tool_execution_update':
			if (!quietTools.has(event.toolName)) {
				sessionOutput.handleToolUpdate(event.toolCallId, event.partialResult)
			}

			break
		case 'tool_execution_end':
			if (!quietTools.has(event.toolName)) {
				sessionOutput.handleToolEnd(event.toolCallId, event.result)
			}

			break
		default:
			break
	}
})

// A minimal theme for the prompts-based UI context. The `ask_user` fallback path never
// reads `theme`, but `ExtensionUIContext` requires one, so we provide a stub whose color
// helpers all resolve to the terminal reset sequence.
function createStubTheme(): Theme {
	const fg = {
		accent: '',
		border: '',
		borderAccent: '',
		borderMuted: '',
		success: '',
		error: '',
		warning: '',
		muted: '',
		dim: '',
		text: '',
		thinkingText: '',
		userMessageText: '',
		customMessageText: '',
		customMessageLabel: '',
		toolTitle: '',
		toolOutput: '',
		mdHeading: '',
		mdLink: '',
		mdLinkUrl: '',
		mdCode: '',
		mdCodeBlock: '',
		mdCodeBlockBorder: '',
		mdQuote: '',
		mdQuoteBorder: '',
		mdHr: '',
		mdListBullet: '',
		toolDiffAdded: '',
		toolDiffRemoved: '',
		toolDiffContext: '',
		syntaxComment: '',
		syntaxKeyword: '',
		syntaxFunction: '',
		syntaxVariable: '',
		syntaxString: '',
		syntaxNumber: '',
		syntaxType: '',
		syntaxOperator: '',
		syntaxPunctuation: '',
		thinkingOff: '',
		thinkingMinimal: '',
		thinkingLow: '',
		thinkingMedium: '',
		thinkingHigh: '',
		thinkingXhigh: '',
		bashMode: '',
	}
	const bg = {
		selectedBg: 0,
		userMessageBg: 0,
		customMessageBg: 0,
		toolPendingBg: 0,
		toolSuccessBg: 0,
		toolErrorBg: 0,
	}

	return new Theme(fg, bg, 'truecolor')
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
