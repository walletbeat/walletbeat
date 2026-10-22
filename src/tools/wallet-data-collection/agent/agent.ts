/**
 * Pi-based harness for the wallet-data-collection agent.
 */
import path from 'node:path'

import {
	createAgentSession,
	createAgentSessionRuntime,
	type CreateAgentSessionRuntimeFactory,
	createBashToolDefinition,
	createLocalBashOperations,
	createReadToolDefinition,
	CustomEditor,
	DefaultResourceLoader,
	defineTool,
	type ExtensionFactory,
	getAgentDir,
	InteractiveMode,
	SessionManager,
	SettingsManager,
} from '@earendil-works/pi-coding-agent'
import askUserExtension from 'pi-ask-user/index.ts'

import { getRepositoryRoot } from '../../../utils/codebase'
import { createCommandCheckBashOperations } from './command-check-hooks'
import { detectModelConfigurationIssue } from './model-config'
import { createLocalReadOperations, createReadCheckOperations } from './read-hooks'

const repoRoot = getRepositoryRoot()
const agentDir = path.join(repoRoot, 'src/tools/wallet-data-collection/agent')
const agentDirGlobal = getAgentDir()
const backupTreeDir = path.join(agentDir, 'backup-tree.bak')
const allowedTools = ['bash', 'read', 'ask_user']
const blockedCommands = new Set(['/export', '/import', '/share', '/resume', '/debug'])
const restrictedActionMessage =
	'This action is disabled in the wallet-data-collection agent. Sessions stay in memory; use the agent tools for checked commands and reads.'

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

// Built-in TUI commands run before extension input events. Guard submission in Pi's
// editor so file exports, imports, and shell execution cannot bypass the tool hooks.
const restrictedInteractionExtension: ExtensionFactory = pi => {
	pi.on('user_bash', () => ({
		result: {
			output: restrictedActionMessage,
			exitCode: 1,
			cancelled: false,
			truncated: false,
		},
	}))

	pi.on('session_before_switch', (event, ctx) => {
		if (event.reason === 'resume') {
			ctx.ui.notify(restrictedActionMessage, 'warning')

			return { cancel: true }
		}

		return undefined
	})

	pi.on('session_start', (_event, ctx) => {
		pi.setActiveTools(allowedTools)
		ctx.ui.setEditorComponent((tui, theme, keybindings) => {
			const deny = () => ctx.ui.notify(restrictedActionMessage, 'warning')

			// The global debug shortcut writes a transcript outside the tool hooks.
			tui.onDebug = deny

			return new (class extends CustomEditor {
				override handleInput(data: string): void {
					if (
						keybindings.matches(data, 'app.editor.external') ||
						keybindings.matches(data, 'app.session.resume')
					) {
						deny()

						return
					}

					const submit = this.onSubmit

					this.onSubmit = text => {
						const command = text.trim().split(/\s+/, 1)[0] ?? ''

						if (blockedCommands.has(command)) {
							deny()
						} else {
							submit?.(text)
						}
					}

					try {
						super.handleInput(data)
					} finally {
						this.onSubmit = submit
					}
				}
			})(tui, theme, keybindings, { embedWorkingStatus: true })
		})
	})
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
	extensionFactories: [askUserExtension, restrictedInteractionExtension],
	appendSystemPromptOverride: baseAppend => baseAppend.map(substituteWalletPlaceholders),
})

// Keep the operations shared across session replacements and reloads: the command
// hooks own the audit state and rollback snapshots for the entire process.
const bashOperations = createCommandCheckBashOperations(createLocalBashOperations())
const bashTool = defineTool(createBashToolDefinition(repoRoot, { operations: bashOperations }))
const readOperations = createReadCheckOperations(
	createLocalReadOperations(),
	repoRoot,
	backupTreeDir,
)
const readTool = defineTool(createReadToolDefinition(repoRoot, { operations: readOperations }))

const createRuntime: CreateAgentSessionRuntimeFactory = async ({
	sessionManager,
	sessionStartEvent,
}) => {
	await resourceLoader.reload()

	const result = await createAgentSession({
		cwd: repoRoot,
		agentDir: agentDirGlobal,
		tools: allowedTools,
		customTools: [bashTool, readTool],
		resourceLoader,
		settingsManager,
		sessionManager,
		sessionStartEvent,
	})

	return {
		...result,
		services: {
			cwd: repoRoot,
			agentDir: agentDirGlobal,
			modelRuntime: result.session.modelRuntime,
			resourceLoader,
			settingsManager,
			diagnostics: [],
		},
		diagnostics: [],
	}
}

const runtime = await createAgentSessionRuntime(createRuntime, {
	cwd: repoRoot,
	agentDir: agentDirGlobal,
	sessionManager: SessionManager.inMemory(repoRoot),
})

try {
	const modelIssue = detectModelConfigurationIssue(runtime.session, agentDirGlobal, agentDir)

	if (modelIssue !== null) {
		process.stderr.write(modelIssue)
		process.exitCode = 1
	} else {
		const mode = new InteractiveMode(runtime, {
			initialMessage: process.argv.slice(2).join(' '),
		})

		await mode.run()
	}
} finally {
	await runtime.dispose()
}
