import { type Eip, type EipNumber, EipPrefix, EipStatus } from '@/schema/eips'
import { getErrorMessage } from '@/types/errors'

/** Outcome of comparing one EIP's Walletbeat status against its upstream spec. */
export enum EipStatusCheckKind {
	/** Walletbeat's status matches the upstream spec's front-matter. */
	MATCH = 'MATCH',
	/** Both statuses are known but disagree — actionable drift. */
	DRIFT = 'DRIFT',
	/**
	 * The upstream status could not be determined: network error, a 404 in both
	 * the EIPs and ERCs repositories (e.g. an as-yet-unmerged spec), or a
	 * front-matter status Walletbeat does not model. Surfaced as a warning,
	 * never fatal.
	 */
	UNVERIFIABLE = 'UNVERIFIABLE',
}

/** Result of checking a single EIP's status. */
export interface EipStatusCheckResult {
	number: EipNumber
	prefix: EipPrefix
	friendlyName: string
	/** Status recorded in Walletbeat. */
	ours: EipStatus
	/** Status read from upstream, or null when unverifiable. */
	upstream: EipStatus | null
	/** Raw upstream `status:` front-matter value, when one was found. */
	upstreamRaw: string | null
	/** URL the status was read from, when a spec was found. */
	url: string | null
	kind: EipStatusCheckKind
	/** Human-readable reason; set for UNVERIFIABLE results, otherwise null. */
	note: string | null
}

/** Aggregate report over every checked EIP. */
export interface EipStatusReport {
	results: EipStatusCheckResult[]
	matches: EipStatusCheckResult[]
	drift: EipStatusCheckResult[]
	unverifiable: EipStatusCheckResult[]
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

/** Extracts the raw `status:` value from a spec's YAML front-matter. */
export function parseUpstreamStatus(markdown: string): string | null {
	const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown)

	if (frontMatter === null) {
		return null
	}

	const status = /^status:[ \t]*(.+?)[ \t]*$/m.exec(frontMatter[1])

	return status === null ? null : status[1]
}

const UPSTREAM_STATUS_MAP = new Map<string, EipStatus>([
	['draft', EipStatus.DRAFT],
	['review', EipStatus.REVIEW],
	['last call', EipStatus.LAST_CALL],
	['final', EipStatus.FINAL],
	['living', EipStatus.LIVING],
])

/**
 * Maps an upstream front-matter status string to a Walletbeat `EipStatus`.
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

function unverifiable(
	eip: Eip,
	url: string | null,
	note: string,
	upstreamRaw: string | null = null,
): EipStatusCheckResult {
	return {
		number: eip.number,
		prefix: eip.prefix,
		friendlyName: eip.friendlyName,
		ours: eip.status,
		upstream: null,
		upstreamRaw,
		url,
		kind: EipStatusCheckKind.UNVERIFIABLE,
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
			return unverifiable(eip, url, 'no `status:` field found in upstream front-matter')
		}

		const upstream = mapUpstreamStatus(raw)

		if (upstream === null) {
			return unverifiable(eip, url, `upstream status "${raw}" is not modeled by Walletbeat`, raw)
		}

		return {
			number: eip.number,
			prefix: eip.prefix,
			friendlyName: eip.friendlyName,
			ours: eip.status,
			upstream,
			upstreamRaw: raw,
			url,
			kind: upstream === eip.status ? EipStatusCheckKind.MATCH : EipStatusCheckKind.DRIFT,
			note: null,
		}
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
		results,
		matches: results.filter(result => result.kind === EipStatusCheckKind.MATCH),
		drift: results.filter(result => result.kind === EipStatusCheckKind.DRIFT),
		unverifiable: results.filter(result => result.kind === EipStatusCheckKind.UNVERIFIABLE),
	}
}

function label(result: EipStatusCheckResult): string {
	return `${result.prefix}-${result.number}`
}

/** Formats a human-readable report for terminal output. */
export function formatReport(report: EipStatusReport, options: { quiet: boolean }): string {
	const lines: string[] = []

	for (const result of report.drift) {
		lines.push(
			`DRIFT  ${label(result)}: Walletbeat=${result.ours} upstream=${result.upstream ?? '?'} (${result.url ?? ''})`,
		)
	}

	for (const result of report.unverifiable) {
		lines.push(`WARN   ${label(result)}: unverifiable — ${result.note ?? ''}`)
	}

	if (!options.quiet) {
		for (const result of report.matches) {
			lines.push(`OK     ${label(result)}: ${result.ours}`)
		}
	}

	lines.push('')
	lines.push(
		`${report.results.length.toString()} EIPs checked — ` +
			`${report.matches.length.toString()} ok, ` +
			`${report.drift.length.toString()} drifted, ` +
			`${report.unverifiable.length.toString()} unverifiable.`,
	)

	return `${lines.join('\n')}\n`
}

/** Serializes a report to JSON (consumed by automation, e.g. a CI workflow). */
export function reportToJson(report: EipStatusReport): string {
	return JSON.stringify(
		{
			checkedAt: new Date().toISOString(),
			summary: {
				total: report.results.length,
				matches: report.matches.length,
				drift: report.drift.length,
				unverifiable: report.unverifiable.length,
			},
			drift: report.drift.map(result => ({
				eip: label(result),
				ours: result.ours,
				upstream: result.upstream,
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
