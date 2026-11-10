/** Classification library for bash command lines for the wallet-data-collection harness. */
import path from 'node:path'

import { getRepositoryRoot } from '../../../utils/codebase'
import { ARBITRARY_COMMAND_ENV, OPEN_MUTATION_ENV } from '../read-only'

/** The one command the agent may run through bash without being marked arbitrary. */
export const AGENT_INVOCATION_COMMAND = 'pnpm wallet-data-collection:agent'

/**
 * The environment variables the harness itself controls and the agent must never
 * inspect or set. Referencing any of them in a command is a gaming attempt that
 * terminates the session.
 */
export const RESTRICTED_ENV_VARS = [
	ARBITRARY_COMMAND_ENV,
	OPEN_MUTATION_ENV,
	'WALLETBEAT_ENV',
] as const

/** True when a command references a harness-controlled environment variable. */
export function referencesRestrictedEnvVar(command: string): boolean {
	return RESTRICTED_ENV_VARS.some(variable => command.includes(variable))
}

/**
 * The repo-relative (leading `/`) path of the global domain-to-entity mapping file that
 * the `mark-domain` / `mark-domain-update` subcommands write. A domain classification
 * change is recognized as such only when this file is the sole file it updates.
 */
export const DOMAIN_MAPPING_FILE_REL = '/data/entities/domains/entity-domains.json'

/** Global flags of the agent tool that take a value (`--flag value` or `--flag=value`). */
const VALUE_GLOBAL_FLAGS: readonly string[] = ['--id', '--variant', '--type', '--actor']

/** Global flags of the agent tool that take no value. */
const NO_VALUE_GLOBAL_FLAGS: readonly string[] = ['--help', '-h', '--version', '-v']

/**
 * Classify a token as a recognized global flag of the agent tool:
 * - `'none'` for a no-value flag (`--help`, `-h`, `--version`, `-v`);
 * - `'space'` for a value-taking flag in `--flag` form, whose value is the next token;
 * - `'inline'` for a value-taking flag with a non-empty inline value (`--flag=value`);
 * - `null` when the token is not a recognized global flag.
 */
function globalFlagKind(token: string): 'none' | 'space' | 'inline' | null {
	if (NO_VALUE_GLOBAL_FLAGS.includes(token)) {
		return 'none'
	}

	for (const flag of VALUE_GLOBAL_FLAGS) {
		if (token === flag) {
			return 'space'
		}

		if (token.startsWith(`${flag}=`) && token.length > flag.length + 1) {
			return 'inline'
		}
	}

	return null
}

/**
 * Extract the agent tool's subcommand token from `command`, or `null` when the command
 * does not invoke the agent tool or invokes it without a subcommand. The agent tool is
 * invoked as `pnpm wallet-data-collection:agent [global-flags] <subcommand> [options]`, so
 * the subcommand is the first token that is neither a global flag nor the value of one, and
 * it may appear before or after global flags (e.g. `--id metamask check` and
 * `check --variant BROWSER` both yield `check`). The command is segmented on chain
 * separators, so a `mark-domain` mention inside an argument to a different command is not
 * mistaken for the subcommand.
 */
function agentSubcommand(command: string): string | null {
	const segments = splitCommandSegments(command.trim())

	if (segments === null) {
		return null
	}

	for (const rawSegment of segments) {
		const segment = rawSegment.trim()

		if (!isAgentCommand(segment)) {
			continue
		}

		const tokens = segment.slice(AGENT_INVOCATION_COMMAND.length).trim().split(/\s+/)

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i]

			if (token === '') {
				continue
			}

			const kind = globalFlagKind(token)

			// A `--flag value` global flag consumes the following value token.
			if (kind === 'space') {
				i++
				continue
			}

			if (kind === 'inline' || kind === 'none' || token.startsWith('-')) {
				continue
			}

			// The first non-flag token is the subcommand.
			return token
		}

		return null
	}

	return null
}

/**
 * True when `segment` is a recognized invocation of the agent tool with no subcommand.
 */
function isNoSubcommandAgentInvocation(segment: string): boolean {
	const tokens = segment.slice(AGENT_INVOCATION_COMMAND.length).trim().split(/\s+/)

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i]

		if (token === '') {
			continue
		}

		const kind = globalFlagKind(token)

		if (kind === 'space') {
			// A `--flag value` global flag must have a following value token.
			if (i + 1 >= tokens.length) {
				return false
			}

			i++
			continue
		}

		if (kind === 'inline' || kind === 'none') {
			continue
		}

		// Not a recognized global flag → not a recognized no-subcommand invocation.
		return false
	}

	return true
}

/**
 * True when a command is a domain classification: the agent subcommand is `mark-domain`
 * or `mark-domain-update` AND the command updated only the global domain-entity mapping
 * file (and no other file) between the pre-hook snapshot and the current one.
 */
export function isDomainClassificationCommand(
	command: string,
	changedFiles: readonly string[],
): boolean {
	const subcommand = agentSubcommand(command)

	if (subcommand !== 'mark-domain' && subcommand !== 'mark-domain-update') {
		return false
	}

	return changedFiles.length === 1 && changedFiles[0] === DOMAIN_MAPPING_FILE_REL
}

/**
 * Build the environment injected into every bash command run by the harness.
 * Always sets `WALLETBEAT_ENV=AGENT`; sets the open-mutation env var while an open
 * mutation is outstanding, and the arbitrary-command env var for arbitrary commands.
 */
export function buildAgentEnv(
	baseEnv: NodeJS.ProcessEnv,
	opts: { isArbitrary: boolean; openMutationActive: boolean },
): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = { ...baseEnv, WALLETBEAT_ENV: 'AGENT' }

	if (opts.openMutationActive) {
		env[OPEN_MUTATION_ENV] = 'true'
	}

	if (opts.isArbitrary) {
		env[ARBITRARY_COMMAND_ENV] = 'true'
	}

	return env
}

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

	// `cd` is only allowed when it is exactly `cd <single-path>` and that path resolves
	// to the repository root; anything else is arbitrary.
	if (commandWord === 'cd') {
		return isAllowedCdCommand(segment)
	}

	return ALLOWED_SIDE_COMMANDS.has(commandWord)
}

/**
 * True when `segment` is a valid `cd`: exactly one path argument (quoted or unquoted, no
 * flags, no extra tokens) that resolves to the repository root. A `cd` that is more
 * complex or points elsewhere is rejected as arbitrary.
 */
function isAllowedCdCommand(segment: string): boolean {
	const rest = segment.slice(2).trim()

	if (rest === '') {
		return false
	}

	let arg: string
	const first = rest[0]

	if (first === "'" || first === '"') {
		// The whole rest must be a single quoted string.
		const closing = rest.indexOf(first, 1)

		if (closing === -1 || rest.slice(closing + 1).trim() !== '') {
			return false
		}

		arg = rest.slice(1, closing)
	} else {
		// A single unquoted token: no whitespace and not a flag.
		if (/\s/.test(rest) || rest.startsWith('-')) {
			return false
		}

		arg = rest
	}

	// The path must resolve to the same directory as the repository root.
	const repoRoot = getRepositoryRoot()

	return path.resolve(repoRoot, arg) === path.resolve(repoRoot)
}

/**
 * Redact the repository-root path passed to a `cd` in a command, replacing it with the
 * placeholder `/walletbeat` (e.g. `cd /media/.../walletbeat` → `cd /walletbeat`). Only a
 * `cd` whose single argument resolves to the repository root is redacted; the surrounding
 * quote style is preserved.
 */
export function redactCdPath(command: string): string {
	const repoRoot = getRepositoryRoot()
	const escaped = repoRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const re = new RegExp(`(\\bcd[ \\t]+)(['"]?)${escaped}\\/?\\2`, 'g')

	return command.replace(
		re,
		(_match, prefix: string, quote: string) => `${prefix}${quote}/walletbeat${quote}`,
	)
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
	let agentSegment: string | null = null

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
			agentSegment = segment
		} else if (!isAllowedSideCommand(segment)) {
			return false
		}
	}

	if (agentCount !== 1 || agentSegment === null) {
		return false
	}

	return agentSubcommand(command) !== null || isNoSubcommandAgentInvocation(agentSegment)
}
