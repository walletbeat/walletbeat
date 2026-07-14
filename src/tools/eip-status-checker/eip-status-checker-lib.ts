import { type Eip, type EipNumber, EipPrefix, EipStatus } from '@/schema/eips'
import { getErrorMessage } from '@/types/errors'
import { parseMarkdownWithFrontmatter } from '@/utils/markdown-utils'

/** Outcome of comparing one EIP's Walletbeat status against its upstream spec. */
export enum EipStatusCheckKind {
	/** Walletbeat's status matches the upstream spec's frontmatter. */
	MATCH = 'MATCH',
	/**
	 * Upstream and Walletbeat disagree — actionable drift. Covers both a mapped
	 * status mismatch and an upstream status Walletbeat does not model (e.g.
	 * Stagnant, Withdrawn, Moved), which still means our recorded status is wrong.
	 */
	DRIFT = 'DRIFT',
	/**
	 * The upstream status could not be determined: network error, a 404 in both
	 * the EIPs and ERCs repositories (e.g. an as-yet-unmerged spec), or a spec
	 * with no `status:` frontmatter at all. Surfaced as a warning, never fatal.
	 */
	UNVERIFIABLE = 'UNVERIFIABLE',
}

/** Fields common to every check result, regardless of outcome. */
export interface EipCheckResultBase {
	number: EipNumber
	prefix: EipPrefix
	friendlyName: string
	/** Status recorded in Walletbeat. */
	ours: EipStatus
}

/** Walletbeat's status agrees with the upstream spec. */
export interface EipCheckResultMatch extends EipCheckResultBase {
	kind: EipStatusCheckKind.MATCH
	/** Mapped upstream status (equal to `ours`). */
	upstream: EipStatus
	/** Raw upstream `status:` frontmatter value. */
	upstreamRaw: string
	/** URL the status was read from. */
	url: string
}

/** Walletbeat's status disagrees with the upstream spec. */
export interface EipCheckResultDrift extends EipCheckResultBase {
	kind: EipStatusCheckKind.DRIFT
	/** Mapped upstream status, or null when upstream reports a status Walletbeat does not model. */
	upstream: EipStatus | null
	/** Raw upstream `status:` frontmatter value — the source of truth for display. */
	upstreamRaw: string
	/** URL the status was read from. */
	url: string
}

/** The upstream status could not be determined. */
export interface EipCheckResultUnverifiable extends EipCheckResultBase {
	kind: EipStatusCheckKind.UNVERIFIABLE
	/** URL a spec was found at, or null when no spec was located. */
	url: string | null
	/** Human-readable reason the check could not be completed. */
	note: string
}

/** Result of checking a single EIP's status. */
export type EipStatusCheckResult =
	| EipCheckResultMatch
	| EipCheckResultDrift
	| EipCheckResultUnverifiable

/** Aggregate report over every checked EIP. */
export interface EipStatusReport {
	matches: EipCheckResultMatch[]
	drift: EipCheckResultDrift[]
	unverifiable: EipCheckResultUnverifiable[]
}

/** Options controlling the network behavior of the checker. */
export interface EipStatusCheckOptions {
	/** Per-request timeout in milliseconds. */
	timeoutMs: number
}

export const defaultOptions: EipStatusCheckOptions = { timeoutMs: 15_000 }

const EIPS_REPO_BASE = 'https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS'
const ERCS_REPO_BASE = 'https://raw.githubusercontent.com/ethereum/ERCs/master/ERCS'

function eipsRepoUrl(number: EipNumber): string {
	return `${EIPS_REPO_BASE}/eip-${number}.md`
}

function ercsRepoUrl(number: EipNumber): string {
	return `${ERCS_REPO_BASE}/erc-${number}.md`
}

/**
 * Candidate upstream URLs for an EIP, most-likely repository first. EIPs and
 * ERCs occasionally move between the two repositories, so both are tried
 * regardless of the recorded prefix.
 */
export function upstreamUrls(eip: Eip): string[] {
	return eip.prefix === EipPrefix.ERC
		? [ercsRepoUrl(eip.number), eipsRepoUrl(eip.number)]
		: [eipsRepoUrl(eip.number), ercsRepoUrl(eip.number)]
}

/**
 * Extracts the raw `status:` value from a spec's YAML frontmatter, or null when
 * the document has no frontmatter or no `status:` field.
 */
export function parseUpstreamStatus(markdown: string): string | null {
	try {
		return parseMarkdownWithFrontmatter<{ status: string }>(markdown, { status: true }).frontmatter
			.status
	} catch {
		return null
	}
}

const UPSTREAM_STATUS_MAP = new Map<string, EipStatus>([
	['draft', EipStatus.DRAFT],
	['review', EipStatus.REVIEW],
	['last call', EipStatus.LAST_CALL],
	['final', EipStatus.FINAL],
	['living', EipStatus.LIVING],
])

/**
 * Maps an upstream frontmatter status string to a Walletbeat `EipStatus`.
 * Returns null for statuses Walletbeat does not model (e.g. Stagnant,
 * Withdrawn, Moved).
 */
export function mapUpstreamStatus(raw: string): EipStatus | null {
	return UPSTREAM_STATUS_MAP.get(raw.trim().toLowerCase()) ?? null
}

/** Fetches a URL's text, returning null on any non-2xx response (e.g. 404). */
async function fetchSpec(url: string, timeoutMs: number): Promise<string | null> {
	const controller = new AbortController()
	const timeout = setTimeout(() => {
		controller.abort()
	}, timeoutMs)

	try {
		const res = await fetch(url, {
			signal: controller.signal,
			headers: { 'user-agent': 'walletbeat-eip-status-checker' },
		})

		return res.ok ? await res.text() : null
	} finally {
		clearTimeout(timeout)
	}
}

function unverifiable(eip: Eip, url: string | null, note: string): EipCheckResultUnverifiable {
	return {
		number: eip.number,
		prefix: eip.prefix,
		friendlyName: eip.friendlyName,
		ours: eip.status,
		kind: EipStatusCheckKind.UNVERIFIABLE,
		url,
		note,
	}
}

/** Checks a single EIP's Walletbeat status against its upstream spec. */
export async function checkEip(
	eip: Eip,
	options: EipStatusCheckOptions = defaultOptions,
): Promise<EipStatusCheckResult> {
	let networkError: string | null = null

	for (const url of upstreamUrls(eip)) {
		let markdown: string | null

		try {
			markdown = await fetchSpec(url, options.timeoutMs)
		} catch (error) {
			networkError = getErrorMessage(error)
			continue
		}

		if (markdown === null) {
			continue // Not found in this repository; try the next candidate.
		}

		const raw = parseUpstreamStatus(markdown)

		if (raw === null) {
			return unverifiable(eip, url, 'no `status:` field found in upstream frontmatter')
		}

		// A status we cannot map (Stagnant, Withdrawn, Moved, …) is still a
		// verified upstream value that disagrees with ours: report it as drift.
		const upstream = mapUpstreamStatus(raw)

		const base: EipCheckResultBase = {
			number: eip.number,
			prefix: eip.prefix,
			friendlyName: eip.friendlyName,
			ours: eip.status,
		}

		if (upstream === eip.status) {
			return { ...base, kind: EipStatusCheckKind.MATCH, upstream, upstreamRaw: raw, url }
		}

		return { ...base, kind: EipStatusCheckKind.DRIFT, upstream, upstreamRaw: raw, url }
	}

	return unverifiable(
		eip,
		null,
		networkError ?? 'not found in ethereum/EIPs or ethereum/ERCs (unmerged or renumbered?)',
	)
}

/** Checks every given EIP's status against upstream, concurrently. */
export async function checkEipStatuses(
	eipList: Eip[],
	options: EipStatusCheckOptions = defaultOptions,
): Promise<EipStatusReport> {
	const results = await Promise.all(eipList.map(eip => checkEip(eip, options)))

	results.sort((a, b) => Number(a.number) - Number(b.number))

	return {
		matches: results.filter(
			(result): result is EipCheckResultMatch => result.kind === EipStatusCheckKind.MATCH,
		),
		drift: results.filter(
			(result): result is EipCheckResultDrift => result.kind === EipStatusCheckKind.DRIFT,
		),
		unverifiable: results.filter(
			(result): result is EipCheckResultUnverifiable =>
				result.kind === EipStatusCheckKind.UNVERIFIABLE,
		),
	}
}

function label(result: EipCheckResultBase): string {
	return `${result.prefix}-${result.number}`
}

/** Formats a human-readable report for terminal output. */
export function formatReport(report: EipStatusReport, options: { quiet: boolean }): string {
	const lines: string[] = []

	for (const result of report.drift) {
		lines.push(
			`DRIFT  ${label(result)}: Walletbeat=${result.ours} upstream=${result.upstream ?? result.upstreamRaw} (${result.url})`,
		)
	}

	for (const result of report.unverifiable) {
		lines.push(`WARN   ${label(result)}: unverifiable — ${result.note}`)
	}

	if (!options.quiet) {
		for (const result of report.matches) {
			lines.push(`OK     ${label(result)}: ${result.ours}`)
		}
	}

	const total = report.matches.length + report.drift.length + report.unverifiable.length

	lines.push('')
	lines.push(
		`${total.toString()} EIPs checked — ` +
			`${report.matches.length.toString()} ok, ` +
			`${report.drift.length.toString()} drifted, ` +
			`${report.unverifiable.length.toString()} unverifiable.`,
	)

	return `${lines.join('\n')}\n`
}

/** Serializes a report to JSON (consumed by automation, e.g. a CI workflow). */
export function reportToJson(report: EipStatusReport): string {
	const total = report.matches.length + report.drift.length + report.unverifiable.length

	return JSON.stringify(
		{
			checkedAt: new Date().toISOString(),
			summary: {
				total,
				matches: report.matches.length,
				drift: report.drift.length,
				unverifiable: report.unverifiable.length,
			},
			drift: report.drift.map(result => ({
				eip: label(result),
				ours: result.ours,
				upstream: result.upstream,
				upstreamRaw: result.upstreamRaw,
				url: result.url,
			})),
			unverifiable: report.unverifiable.map(result => ({
				eip: label(result),
				note: result.note,
			})),
		},
		null,
		2,
	)
}
