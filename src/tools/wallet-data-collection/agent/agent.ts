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
import {
	COMMAND_CHECK_HOOK_MARKER,
	createCommandCheckBashOperations,
	getFatalError,
	WalletDataCollectionFatalError,
} from './command-check-hooks'
import { detectModelConfigurationIssue } from './model-config'
import { createLocalReadOperations, createReadCheckOperations } from './read-hooks'

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
	/** Command-check hook error message (appended to tool output). */
	hookError: chalk.redBright.bold,
	/** Additional info surfaced by an assistant message (e.g. `errorMessage` / diagnostics). */
	messageError: chalk.redBright.bold,
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
const bashTool = defineTool(createBashToolDefinition(repoRoot, { operations: bashOperations }))

// Wrap the `read` tool with path-validation hooks: refuse out-of-repo reads and reads
// inside backup-tree.bak (except pi-*.log files and directories), and render the
// repo-root-relative path in the call header.
const readOperations = createReadCheckOperations(
	createLocalReadOperations(),
	repoRoot,
	backupTreeDir,
)
const readTool = defineTool(createReadToolDefinition(repoRoot, { operations: readOperations }))

const { session } = await createAgentSession({
	cwd: repoRoot,
	agentDir: agentDirGlobal,
	tools: ['bash', 'read', 'ask_user'],
	customTools: [bashTool, readTool],
	resourceLoader,
	settingsManager,
	sessionManager: SessionManager.inMemory(agentDir),
})

// Detect whether a model is configured and authenticated before running any prompt.
const modelIssue = detectModelConfigurationIssue(session, agentDirGlobal, agentDir)

if (modelIssue !== null) {
	process.stderr.write(modelIssue)
	session.dispose()
	process.exit(1)
}

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

	/**
	 * Extract additional info an assistant message may carry at `message_end`, such as
	 * an `errorMessage` or diagnostic errors, or `null` when no error.
	 */
	private static extractAssistantError(message: unknown): string | null {
		if (typeof message !== 'object' || message === null) {
			return null
		}

		const role = (message as { role?: unknown }).role

		if (role !== 'assistant') {
			return null
		}

		const parts: string[] = []
		const errorMessage = (message as { errorMessage?: unknown }).errorMessage

		if (typeof errorMessage === 'string' && errorMessage.trim() !== '') {
			parts.push(errorMessage)
		}

		const diagnostics = (message as { diagnostics?: unknown[] }).diagnostics

		if (Array.isArray(diagnostics)) {
			for (const diagnostic of diagnostics) {
				const message = SessionOutput.diagnosticErrorMessage(diagnostic)

				if (message !== null) {
					parts.push(message)
				}
			}
		}

		return parts.length > 0 ? parts.join('\n') : null
	}

	/** Extract the error message from an assistant diagnostic, or null when absent. */
	private static diagnosticErrorMessage(diagnostic: unknown): string | null {
		if (typeof diagnostic !== 'object' || diagnostic === null || !('error' in diagnostic)) {
			return null
		}

		const error = diagnostic.error

		if (typeof error !== 'object' || error === null || !('message' in error)) {
			return null
		}

		const message = error.message

		return typeof message === 'string' && message.trim() !== '' ? message : null
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

	/** Handle the end of a message. */
	handleMessageEnd(message: unknown): void {
		const error = SessionOutput.extractAssistantError(message)

		if (error !== null) {
			process.stdout.write(`\n${outputStyles.messageError(error)}\n`)
		}
	}

	/** Handle the start of a model turn. */
	handleTurnStart(): void {
		this.lastStreamKind = null
		process.stdout.write('\n')
	}

	/** Handle the end of a model turn. */
	handleTurnEnd(): void {
		process.stdout.write('\n')
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

		if (text.length <= written) {
			return
		}

		const newText = text.slice(written)

		// Command-check hook messages are appended to the end of tool output. Detect the
		// marker so the message (and the offending-file list that follows) renders in a
		// distinct error style instead of the generic tool-output color.
		const markerIndex = newText.indexOf(COMMAND_CHECK_HOOK_MARKER)

		if (markerIndex === -1) {
			process.stdout.write(outputStyles.toolOutput(newText))
		} else {
			process.stdout.write(outputStyles.toolOutput(newText.slice(0, markerIndex)))
			process.stdout.write(outputStyles.hookError(newText.slice(markerIndex)))
		}

		this.toolOutputWritten.set(toolCallId, text.length)
	}

	/** Handle a streaming tool output snapshot (cumulative). */
	handleToolUpdate(toolCallId: string, partialResult: unknown): void {
		this.writeToolOutput(toolCallId, SessionOutput.extractToolText(partialResult))
	}

	/** Handle a tool finishing: flush the final output. The trailing newline is emitted by `turn_end`. */
	handleToolEnd(toolCallId: string, result: unknown): void {
		this.writeToolOutput(toolCallId, SessionOutput.extractToolText(result))
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
		case 'turn_start':
			sessionOutput.handleTurnStart()
			break
		case 'turn_end':
			sessionOutput.handleTurnEnd()
			break
		case 'message_end':
			sessionOutput.handleMessageEnd(event.message)
			break
		case 'message_update': {
			const { type } = event.assistantMessageEvent

			if (type === 'text_delta' || type === 'thinking_delta') {
				sessionOutput.handleMessageDelta(type, event.assistantMessageEvent.delta)
			}

			break
		}
		case 'tool_execution_start': {
			const command = isToolArgs(event.args) ? event.args.command : undefined
			const readPath = isReadToolArgs(event.args) ? event.args.path : undefined

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
		// Session lifecycle, message, and tool events that this harness intentionally
		// does not surface to stdout. Each is listed explicitly so that adding a new
		// event type to the `AgentSessionEvent` union forces an explicit case here
		// instead of silently falling through the `default` branch below.
		case 'agent_start':
		case 'agent_end':
		case 'agent_settled':
		case 'message_start':
		case 'queue_update':
		case 'compaction_start':
		case 'compaction_end':
		case 'entry_appended':
		case 'session_info_changed':
		case 'thinking_level_changed':
		case 'auto_retry_start':
		case 'auto_retry_end':
		case 'summarization_retry_scheduled':
		case 'summarization_retry_attempt_start':
		case 'summarization_retry_finished':
		case 'bash_execution_update':
			break
		default: {
			const exhaustive: never = event

			throw new Error(`Unsupported session event type: ${(exhaustive as { type: string }).type}`)
		}
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
	const fatal = getFatalError()

	if (fatal !== null) {
		throw fatal
	}
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
} catch (error) {
	if (error instanceof WalletDataCollectionFatalError) {
		process.stderr.write(`\n${outputStyles.messageError(error.message)}\n`)
		process.exitCode = 1
	} else {
		throw error
	}
} finally {
	session.dispose()
}
