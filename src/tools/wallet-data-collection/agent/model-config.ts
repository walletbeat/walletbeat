/**
 * Model-configuration detection for the wallet-data-collection agent harness.
 *
 * Before running any prompt, the harness checks that a model is configured and
 * authenticated. When a first-time user has not set up `~/.pi/agent/models.json` and
 * `~/.pi/agent/auth.json`, `session.prompt()` would otherwise throw a raw "No API key
 * found" stack trace. This module detects that condition and builds a clear setup
 * message instead.
 */
import path from 'node:path'

import type { AgentSession } from '@earendil-works/pi-coding-agent'

/**
 * Check whether the session has a usable model configured and authenticated.
 *
 * Returns a human-readable setup message when no model is available (first-time use)
 * or the selected model's provider has no credentials, and `null` when the harness can
 * proceed normally.
 *
 * @param session The created agent session to inspect.
 * @param userAgentDir The user-wide pi config directory (e.g. `~/.pi/agent`).
 * @param repoAgentDir The repo-local agent directory (e.g. `src/tools/.../agent`).
 */
export function detectModelConfigurationIssue(
	session: AgentSession,
	userAgentDir: string,
	repoAgentDir: string,
): string | null {
	const model = session.model

	// With no configured model, the session exposes a placeholder model whose provider is
	// `"unknown"` and that is not present in the model registry.
	const isPlaceholder = model === undefined || model.provider === 'unknown'

	if (isPlaceholder) {
		return buildModelSetupMessage(userAgentDir, repoAgentDir, 'no model is configured')
	}

	const authStatus = session.modelRuntime.getProviderAuthStatus(model.provider)

	if (!authStatus.configured) {
		return buildModelSetupMessage(
			userAgentDir,
			repoAgentDir,
			`the selected model (${model.provider}/${model.id}) has no API key or credentials configured`,
		)
	}

	return null
}

/**
 * Build the first-time setup message explaining how to configure a model. It points at
 * the user-wide config path (the standard location) and notes the repo-local
 * alternative, which is git-ignored.
 */
function buildModelSetupMessage(
	userAgentDir: string,
	repoAgentDir: string,
	reason: string,
): string {
	const userModelsPath = path.join(userAgentDir, 'models.json')
	const userAuthPath = path.join(userAgentDir, 'auth.json')
	const repoModelsPath = path.join(repoAgentDir, 'models.json')
	const repoAuthPath = path.join(repoAgentDir, 'auth.json')

	return [
		'',
		'[wallet-data-collection-agent] No usable model is configured.',
		`Reason: ${reason}.`,
		'',
		'The agent harness needs a model provider to be set up before it can run. Configure it',
		'by editing your pi model and auth configuration, for example:',
		`  - '${userModelsPath}'`,
		`  - '${userAuthPath}'`,
		'',
		`Alternatively, you may place them in the repo-local agent directory ('${repoModelsPath}'`,
		`and '${repoAuthPath}') if you wish to use a project-local configuration.`,
		'',
		'See the pi providers and models documentation for how to add a provider and its API key,',
		'then re-run this command. Alternatively, run the standard pi CLI (`pi`) and use `/login`',
		'or `/model` to set up a model interactively.',
		'',
	].join('\n')
}
