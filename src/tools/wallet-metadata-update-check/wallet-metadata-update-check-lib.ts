import { spawnSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

import { type CalendarDate, daysBetween } from '@/types/date'

import { getRepositoryRoot } from '@/tests/utils/codebase'

/**
 * Result of running the metadata-update check.
 */
export interface CheckResult {
	ok: boolean
	/** Human-readable problems, one per failing wallet file. */
	problems: string[]
	/** Wallet files that were inspected (changed in the diff). */
	inspected: string[]
	/** Wallet files that were ignored as feature-irrelevant (e.g. comments only). */
	ignored: string[]
	/** Whether the run was bypassed by the bypass token in the commit message. */
	bypassed: boolean
}

export interface CheckOptions {
	/** Base ref to diff against. Defaults to origin/beta, then beta, then main. */
	baseRef?: string
	/** Glob-like prefixes within the repo that contain wallet entries. */
	walletDirs?: string[]
	/** Tolerance (days) when comparing lastUpdated against the head-commit timestamp. */
	commitDateToleranceDays?: number
	/** Bypass token. If found in the head commit message, the check passes. */
	bypassToken?: string
}

const DEFAULT_OPTIONS: Required<Omit<CheckOptions, 'baseRef'>> = {
	walletDirs: ['data/software-wallets/', 'data/hardware-wallets/'],
	commitDateToleranceDays: 3,
	bypassToken: 'WALLET_FEATURE_DATA_NOT_UPDATED',
}

/**
 * Match a YYYY-MM-DD literal. The captured group is asserted to be a
 * `CalendarDate` (see `@/types/date`) after a successful match — the regex
 * shape is a strict subset of the `CalendarDate` template-literal type.
 */
const LAST_UPDATED_RE = /lastUpdated\s*:\s*['"](\d{4}-\d{2}-\d{2})['"]/

/** Diff hunk lines that should NEVER count as "feature data changed". */
const IGNORED_LINE_PATTERNS: RegExp[] = [
	// Whitespace-only line (will already be filtered by the unified-diff parser
	// before we get to it, but kept as a safety belt).
	/^\s*$/,
	// Single-line comments. Block comments are handled below.
	/^\s*\/\/.*/,
	// Lines that are JUST a `lastUpdated:` change — needed: the diff is allowed
	// to consist of only the lastUpdated bump itself. We DO NOT treat this as
	// "data changed", so a PR that *only* bumps the timestamp passes trivially.
	/^\s*lastUpdated\s*:\s*['"]\d{4}-\d{2}-\d{2}['"],?\s*$/,
]

const BLOCK_COMMENT_RE = /\/\*[\s\S]*?\*\//g

/** Strict CalendarDate guard (YYYY-MM-DD with valid calendar ranges). */
function isCalendarDate(s: string): s is CalendarDate {
	return /^(20|21)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s)
}

/** Run a git command (args passed without shell) and return stdout. */
function git(args: string[], cwd: string): string {
	const r = spawnSync('git', args, { cwd, encoding: 'utf8' })

	if (r.status !== 0) {
		throw new Error(
			`git ${args.join(' ')} failed: ${r.stderr?.trim() || r.error?.message || `exit ${r.status}`}`,
		)
	}

	return (r.stdout ?? '').trimEnd()
}

function gitOk(args: string[], cwd: string): boolean {
	const r = spawnSync('git', args, { cwd, stdio: 'ignore' })

	return r.status === 0
}

/** Resolve a usable base ref for `git diff`. Prefers explicit option, then the
 * env-provided GitHub PR base, then origin/beta, then beta, then main. */
function resolveBaseRef(cwd: string, baseRef?: string): string {
	const candidates = [
		baseRef,
		process.env.GITHUB_BASE_REF !== undefined && process.env.GITHUB_BASE_REF !== ''
			? `origin/${process.env.GITHUB_BASE_REF}`
			: undefined,
		'origin/beta',
		'beta',
		'origin/main',
		'main',
	].filter((r): r is string => Boolean(r))

	for (const ref of candidates) {
		if (gitOk(['rev-parse', '--verify', `${ref}^{commit}`], cwd)) {
			return ref
		}
	}

	throw new Error(
		`Could not resolve a base ref to diff against. Tried: ${candidates.join(', ')}.`,
	)
}

/** List wallet files modified between baseRef and HEAD. */
function listChangedWalletFiles(cwd: string, baseRef: string, dirs: string[]): string[] {
	const out = git(
		['diff', '--name-only', '--diff-filter=ACMRT', `${baseRef}...HEAD`, '--'].concat(dirs),
		cwd,
	)

	if (out === '') {
		return []
	}

	return out
		.split('\n')
		.map(l => l.trim())
		.filter(l => l.length > 0 && (l.endsWith('.ts') || l.endsWith('.tsx')))
		.filter(l => !path.basename(l).endsWith('.tmpl.ts'))
}

/** Get the diff hunks for a single file (added/removed lines only). */
function fileDiffLines(
	cwd: string,
	baseRef: string,
	file: string,
): { added: string[]; removed: string[] } {
	const raw = git(['diff', '--unified=0', `${baseRef}...HEAD`, '--', file], cwd)
	const added: string[] = []
	const removed: string[] = []

	for (const line of raw.split('\n')) {
		if (
			line.startsWith('diff ') ||
			line.startsWith('index ') ||
			line.startsWith('--- ') ||
			line.startsWith('+++ ') ||
			line.startsWith('@@')
		) {
			continue
		}

		if (line.startsWith('+')) {
			added.push(line.slice(1))
		} else if (line.startsWith('-')) {
			removed.push(line.slice(1))
		}
	}

	return { added, removed }
}

/** Decide whether a diff line counts as a "feature data change" worth gating on. */
function isFeatureChange(line: string): boolean {
	const stripped = line.replace(BLOCK_COMMENT_RE, '').trim()

	if (stripped === '') {
		return false
	}

	for (const pattern of IGNORED_LINE_PATTERNS) {
		if (pattern.test(line)) {
			return false
		}
	}

	return true
}

/** Read the current lastUpdated value from a wallet file. */
function readLastUpdated(absPath: string): string | undefined {
	const text = fs.readFileSync(absPath, 'utf8')
	const m = LAST_UPDATED_RE.exec(text)

	return m !== null ? m[1] : undefined
}

/** Read the lastUpdated value from a file at baseRef. */
function readLastUpdatedAtBase(cwd: string, baseRef: string, file: string): string | undefined {
	try {
		const text = git(['show', `${baseRef}:${file}`], cwd)
		const m = LAST_UPDATED_RE.exec(text)

		return m !== null ? m[1] : undefined
	} catch {
		// File did not exist at base — counts as "added new", which the caller
		// treats the same way as a missing-but-different `lastUpdated` value.
		return undefined
	}
}

/** CalendarDate of the HEAD commit, in UTC. */
function headCommitDate(cwd: string): CalendarDate {
	const ts = git(['log', '-1', '--format=%cI', 'HEAD'], cwd)
	const iso = new Date(ts).toISOString().slice(0, 10)

	if (!isCalendarDate(iso)) {
		throw new Error(`HEAD commit date "${iso}" is not a valid YYYY-MM-DD.`)
	}

	return iso
}

function headCommitMessage(cwd: string): string {
	return git(['log', '-1', '--format=%B', 'HEAD'], cwd)
}

export function runCheck(opts: CheckOptions = {}): CheckResult {
	const cwd = getRepositoryRoot()
	const merged = { ...DEFAULT_OPTIONS, ...opts }

	const baseRef = resolveBaseRef(cwd, opts.baseRef)
	const commitMsg = headCommitMessage(cwd)
	const bypassed = commitMsg.includes(merged.bypassToken)

	if (bypassed) {
		return { ok: true, problems: [], inspected: [], ignored: [], bypassed: true }
	}

	const changed = listChangedWalletFiles(cwd, baseRef, merged.walletDirs)
	const inspected: string[] = []
	const ignored: string[] = []
	const problems: string[] = []
	const headDate = headCommitDate(cwd)

	for (const file of changed) {
		const { added, removed } = fileDiffLines(cwd, baseRef, file)
		const featureChanges = [...added, ...removed].filter(isFeatureChange)

		if (featureChanges.length === 0) {
			ignored.push(file)
			continue
		}

		inspected.push(file)

		const absPath = path.join(cwd, file)
		const headValue = readLastUpdated(absPath)

		if (headValue === undefined) {
			problems.push(
				`${file}: feature data changed but no \`lastUpdated\` field found in the file.`,
			)
			continue
		}

		if (!isCalendarDate(headValue)) {
			problems.push(`${file}: \`lastUpdated\` is "${headValue}" — must be YYYY-MM-DD.`)
			continue
		}

		const baseValue = readLastUpdatedAtBase(cwd, baseRef, file)

		if (baseValue !== undefined && baseValue === headValue) {
			problems.push(
				`${file}: feature data changed but \`lastUpdated\` (${headValue}) was not bumped vs. ${baseRef}. Please bump \`lastUpdated\` to the commit date (${headDate}).`,
			)
			continue
		}

		const drift = Math.abs(daysBetween(headValue, headDate))

		if (drift > merged.commitDateToleranceDays) {
			problems.push(
				`${file}: \`lastUpdated\` is ${headValue} but the head commit is dated ${headDate} (drift ${drift} days, max ${merged.commitDateToleranceDays}). Please bump \`lastUpdated\` to the commit date (${headDate}).`,
			)
		}
	}

	return { ok: problems.length === 0, problems, inspected, ignored, bypassed: false }
}

/**
 * Format a CheckResult for stderr. Includes the bypass-token escape hatch in
 * the failure message so contributors know how to skip the check when their
 * change really is feature-irrelevant.
 */
export function formatResult(
	result: CheckResult,
	opts: { bypassToken?: string } = {},
): string {
	const bypass = opts.bypassToken ?? DEFAULT_OPTIONS.bypassToken
	const lines: string[] = []

	if (result.bypassed) {
		lines.push(
			`Bypassed via "${bypass}" in the commit message. No metadata-update checks were run.`,
		)
		return lines.join('\n')
	}

	lines.push(
		`Inspected ${result.inspected.length} wallet file(s); ignored ${result.ignored.length} as feature-irrelevant.`,
	)

	if (result.ok) {
		lines.push('All inspected wallets have a fresh `lastUpdated`. ✓')
		return lines.join('\n')
	}

	lines.push('')
	lines.push(`Found ${result.problems.length} problem(s):`)

	for (const p of result.problems) {
		lines.push(`  - ${p}`)
	}

	lines.push('')
	lines.push(
		"Each modified wallet must bump `metadata.lastUpdated` to today's date (YYYY-MM-DD).",
	)
	lines.push(
		'If the change is genuinely feature-irrelevant (e.g. comment-only) and the heuristic is wrong,',
	)
	lines.push(
		`include the literal string "${bypass}" anywhere in the head commit message to skip this check.`,
	)

	return lines.join('\n')
}
