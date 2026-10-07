/** Classification library for bash command lines for the wallet-data-collection harness. */

/** The one command the agent may run through bash without being marked arbitrary. */
export const AGENT_INVOCATION_COMMAND = 'pnpm wallet-data-collection:agent'

/**
 * Shell metacharacters that must never appear in a segment. Rejecting them anywhere
 * (including inside quotes) forbids subshells, command substitution, file redirection,
 * backgrounding, and escapes. The `>` redirection operator is handled separately: a
 * stdout/stderr dup (`2>&1`, `>&2`, ...) is permitted, but a file redirection is not. A
 * conservative choice for a security guard.
 */
const SHELL_METACHARACTERS = /[;&|`$()<>\r\n\\]/

/**
 * A stdout/stderr dup redirection operator, e.g. `2>&1`, `>&2`, `1>&2`, with optional
 * whitespace around the tokens (`2 >& 1`). Only file descriptors 0, 1, and 2 are allowed,
 * so the redirection stays between stdin/stdout/stderr and never touches a file.
 */
const STDOUT_STDERR_REDIRECTION = /^[012]?[ \t]*>[ \t]*&[ \t]*[012]/

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

		// A `>` may begin a stdout/stderr dup redirection (`2>&1`, `>&2`, ...). Consume the
		// whole token so its `&` is not mistaken for a separator or backgrounding.
		if (ch === '>') {
			const match = STDOUT_STDERR_REDIRECTION.exec(command.slice(i))

			if (match !== null) {
				current += match[0]
				i += match[0].length - 1

				continue
			}

			current += ch

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
 * Validate the stdout/stderr dup redirection whose `>` is at `gtIndex` in `segment`.
 * Returns the number of characters consumed from `>` through the target file descriptor,
 * or `-1` if this is not a permitted dup redirection. Only file descriptors 0, 1, and 2 are
 * allowed on both sides, so the redirection stays between stdin/stdout/stderr and never
 * touches a file. Multi-digit descriptors (`12>&1`) and file redirection (`> file`, `< in`)
 * are rejected.
 */
function stdoutStderrRedirectionLength(segment: string, gtIndex: number): number {
	// Forward: `>` [spaces] `&` [spaces] single fd 0/1/2 (not multi-digit).
	let p = gtIndex + 1

	while (p < segment.length && (segment[p] === ' ' || segment[p] === '\t')) {
		p++
	}

	if (segment[p] !== '&') {
		return -1
	}

	p++

	while (p < segment.length && (segment[p] === ' ' || segment[p] === '\t')) {
		p++
	}

	if (p >= segment.length || !/[012]/.test(segment[p])) {
		return -1
	}

	if (p + 1 < segment.length && /[0-9]/.test(segment[p + 1])) {
		return -1
	}

	// Backward: optional source fd, single digit 0/1/2 (not multi-digit), if present.
	let q = gtIndex - 1

	while (q >= 0 && (segment[q] === ' ' || segment[q] === '\t')) {
		q--
	}

	if (q >= 0 && /[0-9]/.test(segment[q])) {
		if (!/[012]/.test(segment[q])) {
			return -1
		}

		if (q > 0 && /[0-9]/.test(segment[q - 1])) {
			return -1
		}
	}

	return p - gtIndex + 1
}

/**
 * True when `segment` contains no forbidden shell metacharacter, other than a
 * stdout/stderr dup redirection (`2>&1`, `>&2`, `1>&2`, ...). Inside single or double
 * quotes, shell separators (`;`, `|`, `&`, `<`, `>`) are literal and harmless, so they are
 * allowed; but command substitution (`$`, backtick) and escapes (`\`) are still forbidden
 * inside double quotes. File redirection, input redirection, subshells, backgrounding,
 * escapes, and newlines are all rejected.
 */
function isSafeSegment(segment: string): boolean {
	let quote: '"' | "'" | null = null

	for (let i = 0; i < segment.length; i++) {
		const ch = segment[i]

		if (quote !== null) {
			if (ch === quote) {
				quote = null
			} else if (quote === '"' && (ch === '$' || ch === '`' || ch === '\\')) {
				// Inside double quotes, command substitution and escapes are still special.
				return false
			}

			continue
		}

		if (ch === '"' || ch === "'") {
			quote = ch

			continue
		}

		if (ch === '>') {
			const length = stdoutStderrRedirectionLength(segment, i)

			if (length === -1) {
				return false
			}

			i += length - 1

			continue
		}

		if (SHELL_METACHARACTERS.test(ch)) {
			return false
		}
	}

	return quote === null
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

		// Reject any forbidden shell metacharacter, other than a stdout/stderr dup redirection.
		if (!isSafeSegment(segment)) {
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
