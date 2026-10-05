/**
 * Pi-based harness for the wallet-data-collection agent.
 */
import path from 'node:path'
import { createInterface } from 'node:readline'

import {
	createAgentSession,
	createBashToolDefinition,
	createLocalBashOperations,
	DefaultResourceLoader,
	defineTool,
	getAgentDir,
	SessionManager,
	SettingsManager,
} from '@earendil-works/pi-coding-agent'

import { getRepositoryRoot } from '../../../utils/codebase'
import { createCommandCheckBashOperations } from './command-check-hooks'

const agentDir = path.join(getRepositoryRoot(), 'src/tools/wallet-data-collection/agent')
const agentDirGlobal = getAgentDir()

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
	// Fill the wallet-context placeholders in APPEND_SYSTEM.md from the env vars.
	appendSystemPromptOverride: baseAppend => baseAppend.map(substituteWalletPlaceholders),
})

await resourceLoader.reload()

// Wrap the `bash` tool with the command-check hooks.
const bashOperations = createCommandCheckBashOperations(createLocalBashOperations())
const bashTool = defineTool(createBashToolDefinition(agentDir, { operations: bashOperations }))

const { session } = await createAgentSession({
	cwd: agentDir,
	agentDir: agentDirGlobal,
	tools: ['bash'],
	customTools: [bashTool],
	resourceLoader,
	settingsManager,
	sessionManager: SessionManager.inMemory(agentDir),
})

// Narrow the (any-typed) tool args to a shape with an optional `command`, without an
// unsafe type assertion.
function isToolArgs(value: unknown): value is { command?: string } {
	return typeof value === 'object' && value !== null && 'command' in value
}

session.subscribe(event => {
	switch (event.type) {
		case 'message_update':
			if (event.assistantMessageEvent.type === 'text_delta') {
				process.stdout.write(event.assistantMessageEvent.delta)
			}

			break
		case 'tool_execution_start': {
			const command = isToolArgs(event.args) ? event.args.command : undefined

			process.stdout.write(`\n\n[${event.toolName}]${command ? ` $ ${command}` : ''}\n`)
			break
		}
		case 'bash_execution_update':
			process.stdout.write(event.delta)
			break
		case 'tool_execution_end':
			process.stdout.write('\n')
			break
		default:
			break
	}
})

const readlineInterface = createInterface({ input: process.stdin })

const pendingLines: string[] = []
const lineWaiters: Array<(line: string | null) => void> = []
let stdinClosed = false

readlineInterface.on('line', line => {
	const waiter = lineWaiters.shift()

	if (waiter) {
		waiter(line)
	} else {
		pendingLines.push(line)
	}
})

readlineInterface.on('close', () => {
	stdinClosed = true

	for (const waiter of lineWaiters.splice(0)) {
		waiter(null)
	}
})

function nextLine(): Promise<string | null> {
	if (pendingLines.length > 0) {
		return Promise.resolve(pendingLines.shift()!)
	}

	if (stdinClosed) {
		return Promise.resolve(null)
	}

	return new Promise(resolve => {
		lineWaiters.push(resolve)
	})
}

async function runPrompt(prompt: string): Promise<void> {
	process.stdout.write('\n')
	await session.prompt(prompt)
	process.stdout.write('\n')
}

try {
	const initialPrompt = process.argv.slice(2).join(' ')

	if (initialPrompt) {
		await runPrompt(initialPrompt)
	}

	// Interactive loop: read a prompt, run it, repeat until the user quits.
	process.stdout.write('> ')

	while (true) {
		const line = await nextLine()

		if (line === null) {
			break
		}

		const trimmed = line.trim()

		if (trimmed === 'quit' || trimmed === 'exit' || trimmed === '/quit' || trimmed === '/exit') {
			readlineInterface.close()
			break
		}

		if (!trimmed) {
			process.stdout.write('(Use `/quit` to quit.)\n')
			process.stdout.write('> ')
			continue
		}

		await runPrompt(trimmed)
		process.stdout.write('> ')
	}
} finally {
	readlineInterface.close()
	session.dispose()
}
