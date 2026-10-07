/** Classification library for bash command lines for the wallet-data-collection harness. */

/** The one command the agent may run through bash without being marked arbitrary. */
export const AGENT_INVOCATION_COMMAND = 'pnpm wallet-data-collection:agent'

/**
 * Shell metacharacters that must never appear in a segment. Rejecting them anywhere
 * (including inside quotes) forbids subshells, command substitution, redirection,
 * backgrounding, and escapes. A conservative choice for a security guard.
 */
const SHELL_METACHARACTERS = /[;&|`$()<>\r\n\\]/

/**
 * The read-only inspection commands the agent may run alongside a single
 * `pnpm wallet-data-collection:agent` invocation. Bash control-flow keywords (`for`,
 * `done`, `if`, `switch`, `while`, `case`, ...) are deliberately absent, so a segment whose
 * command word is a keyword is rejected as arbitrary.
 */
const ALLOWED_SIDE_COMMANDS = new Set(['echo', 'cd', 'pwd', 'cat', 'grep', 'head', 'tail'])

/**
 * Split a command line into top-level segments on `&&`, `||`, `;`, and `|`, respecting single
 * and double quotes so a separator inside quotes does not split. Returns `null` when the
 * command is not a plain chain: an unbalanced quote, a trailing escape, or a single `&`
 * (background).
 */
function splitCommandSegments(command: string): string[] | null {
	const segments: string[] = []
	let current = ''
	let quote: '"' | "'" | null = null
	let escaped = false

	for (let i = 0; i < command.length; i++) {
		const ch = command[i]

		if (escaped) {
			current += ch
			escaped = false

			continue
		}

		if (ch === '\\') {
			escaped = true
			current += ch

			continue
		}

		if (quote !== null) {
			current += ch

			if (ch === quote) {
				quote = null
			}

			continue
		}

		if (ch === '"' || ch === "'") {
			quote = ch
			current += ch

			continue
		}

		// `&&` and `||` are two-character chain separators; `;` and a single `|` are one.
		if (ch === ';' || ch === '|' || ch === '&') {
			if ((ch === '&' || ch === '|') && command[i + 1] === ch) {
				segments.push(current.trim())
				current = ''
				i++ // consume the second character of `&&` / `||`

				continue
			}

			// A single `&` is backgrounding, not a chain separator.
			if (ch === '&') {
				return null
			}

			segments.push(current.trim())
			current = ''

			continue
		}

		current += ch
	}

	if (escaped || quote !== null) {
		return null
	}

	segments.push(current.trim())

	return segments
}

/** True when `segment` is a `pnpm wallet-data-collection:agent` invocation. */
function isAgentCommand(segment: string): boolean {
	if (segment === AGENT_INVOCATION_COMMAND) {
		return true
	}

	return segment.startsWith(`${AGENT_INVOCATION_COMMAND} `)
}

/** True when `segment` is a command whose first word is an allowed inspection command. */
function isAllowedSideCommand(segment: string): boolean {
	const firstSpace = segment.search(/\s/)
	const commandWord = firstSpace === -1 ? segment : segment.slice(0, firstSpace)

	return ALLOWED_SIDE_COMMANDS.has(commandWord)
}

/**
 * True when `command` is a plain, non-arbitrary agent invocation: either a single
 * `pnpm wallet-data-collection:agent` invocation, or a chain of `&&`/`;`/`|`-separated
 * commands containing exactly one `pnpm wallet-data-collection:agent` invocation and
 * otherwise only the allowed inspection commands (`echo`, `cd`, `pwd`, `cat`, `grep`,
 * `head`, `tail`).
 *
 * Subshells, command substitution, redirection, backgrounding, escapes, bash keywords, and
 * any command outside the allowlist all make the command arbitrary.
 */
export function isPlainAgentInvocation(command: string): boolean {
	// Newlines are never valid anywhere in a command, even at the boundaries that `trim()`
	// would otherwise strip.
	if (/[\r\n]/.test(command)) {
		return false
	}

	const trimmed = command.trim()

	if (trimmed === '') {
		return false
	}

	const segments = splitCommandSegments(trimmed)

	if (segments === null) {
		return false
	}

	let agentCount = 0

	for (const rawSegment of segments) {
		const segment = rawSegment.trim()

		if (segment === '') {
			return false
		}

		// Reject any shell metacharacter anywhere in the segment.
		if (SHELL_METACHARACTERS.test(segment)) {
			return false
		}

		if (isAgentCommand(segment)) {
			agentCount++
		} else if (!isAllowedSideCommand(segment)) {
			return false
		}
	}

	return agentCount === 1
}
