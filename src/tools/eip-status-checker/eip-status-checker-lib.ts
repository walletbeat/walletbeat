import { type Eip, type EipNumber, EipPrefix, EipStatus } from '@/schema/eips'
import { getErrorMessage } from '@/types/errors'
import { isNonEmptyArray, type NonEmptyArray } from '@/types/utils/non-empty'
import { parseMarkdownWithFrontmatter } from '@/utils/markdown-utils'

/** Outcome of comparing one EIP's Walletbeat record against its upstream spec. */
export enum EipStatusCheckKind {
	/** Every field Walletbeat records agrees with the upstream spec. */
	MATCH = 'MATCH',
	/** At least one recorded field disagrees with upstream — actionable drift. */
	DRIFT = 'DRIFT',
	/**
	 * The upstream spec could not be read: network error, a 404 in both the EIPs
	 * and ERCs repositories (e.g. an as-yet-unmerged spec), or a spec with no
	 * `status:` frontmatter at all. Surfaced as a warning, never fatal.
	 */
	UNVERIFIABLE = 'UNVERIFIABLE',
}

/** A field Walletbeat records about an EIP and checks against upstream. */
export enum EipMismatchField {
	STATUS = 'status',
	PREFIX = 'prefix',
}

/** Walletbeat's recorded status disagrees with the upstream spec's. */
export interface EipStatusMismatch {
	field: EipMismatchField.STATUS
	/** Status recorded in Walletbeat. */
	ours: EipStatus
	/** Mapped upstream status, or null for a status Walletbeat does not model. */
	upstream: EipStatus | null
	/** Raw upstream `status:` frontmatter value. */
	upstreamRaw: string
}

/**
 * Walletbeat's recorded prefix disagrees with the upstream spec's `category:`.
 * Happens when a spec moves between the EIPs and ERCs repositories, or its
 * upstream `category:` changes.
 */
export interface EipPrefixMismatch {
	field: EipMismatchField.PREFIX
	/** Prefix recorded in Walletbeat. */
	ours: EipPrefix
	/** Prefix implied by the upstream spec's `category:` frontmatter. */
	upstream: EipPrefix
	/**
	 * Raw upstream `category:` frontmatter value, or null when the spec carries no
	 * category — which is itself what makes it an EIP rather than an ERC.
	 */
	upstreamRaw: string | null
}

/** One way in which Walletbeat's record disagrees with the upstream spec. */
export type EipMismatch = EipStatusMismatch | EipPrefixMismatch

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

/** At least one field Walletbeat records disagrees with the upstream spec. */
export interface EipCheckResultDrift extends EipCheckResultBase {
	kind: EipStatusCheckKind.DRIFT
	/** Every field found to disagree. Non-empty: a drift result always names what drifted. */
	mismatches: NonEmptyArray<EipMismatch>
	/** URL the spec was read from. */
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
 * Candidate upstream URLs for an EIP, most-likely repository first. Both are
 * tried regardless of the recorded prefix, because a spec that has moved
 * between the EIPs and ERCs repositories will only answer on one of them.
 *
 * Falling back to the second repository is not on its own treated as drift: the
 * repository a spec answers from is a weaker signal than its `category:`
 * frontmatter, which is what {@link upstreamPrefix} compares the recorded
 * prefix against.
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

/**
 * Extracts the raw `category:` value from a spec's YAML frontmatter, or null
 * when the document has no frontmatter or no `category:` field. Meta and
 * Informational EIPs carry no category.
 */
export function parseUpstreamCategory(markdown: string): string | null {
	try {
		return parseMarkdownWithFrontmatter<{ category: string }>(markdown, { category: true })
			.frontmatter.category
	} catch {
		return null
	}
}

/**
 * The prefix a spec's upstream `category:` implies, per EIP-1: "When referring
 * to an EIP with a `category` of `ERC`, it must be written in the hyphenated
 * form `ERC-X` [...]. When referring to EIPs with any other `category`, it must
 * be written in the hyphenated form `EIP-X`."
 *
 * `category` is optional upstream — only Standards Track specs carry one — so a
 * missing category is not an unknown. It means the spec is Meta or
 * Informational, and therefore an EIP. Callers must only pass a category read
 * from a spec whose `status:` already parsed, which establishes that the
 * frontmatter is well-formed and so that a null here means "no category field"
 * rather than "could not be read".
 *
 * This is authoritative over which repository the spec happens to answer from.
 */
export function upstreamPrefix(rawCategory: string | null): EipPrefix {
	return rawCategory?.trim().toLowerCase() === 'erc' ? EipPrefix.ERC : EipPrefix.EIP
}

/**
 * Whether an upstream `status:` marks a tombstone left behind by a spec that
 * moved to the other repository. The tombstone carries no real status, so the
 * checker skips it and reads the destination spec instead.
 */
function isMovedTombstone(rawStatus: string): boolean {
	return rawStatus.trim().toLowerCase() === 'moved'
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

/** Checks a single EIP's Walletbeat record against its upstream spec. */
export async function checkEip(
	eip: Eip,
	options: EipStatusCheckOptions = defaultOptions,
): Promise<EipStatusCheckResult> {
	let networkError: string | null = null
	let tombstoneUrl: string | null = null

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

		const rawStatus = parseUpstreamStatus(markdown)

		if (rawStatus === null) {
			return unverifiable(eip, url, 'no `status:` field found in upstream frontmatter')
		}

		if (isMovedTombstone(rawStatus)) {
			tombstoneUrl = url
			continue // Stale pointer; the real spec lives in the other repository.
		}

		const base: EipCheckResultBase = {
			number: eip.number,
			prefix: eip.prefix,
			friendlyName: eip.friendlyName,
			ours: eip.status,
		}

		const mismatches: EipMismatch[] = []

		// A status we cannot map (Stagnant, Withdrawn, …) is still a verified
		// upstream value that disagrees with ours: report it as drift.
		const upstreamStatus = mapUpstreamStatus(rawStatus)

		if (upstreamStatus !== eip.status) {
			mismatches.push({
				field: EipMismatchField.STATUS,
				ours: eip.status,
				upstream: upstreamStatus,
				upstreamRaw: rawStatus,
			})
		}

		// A spec that has moved between the EIPs and ERCs repositories, or whose
		// upstream `category:` changed, leaves our recorded prefix stale. That is
		// drift in a field we publish.
		const rawCategory = parseUpstreamCategory(markdown)
		const prefix = upstreamPrefix(rawCategory)

		if (prefix !== eip.prefix) {
			mismatches.push({
				field: EipMismatchField.PREFIX,
				ours: eip.prefix,
				upstream: prefix,
				upstreamRaw: rawCategory,
			})
		}

		if (!isNonEmptyArray(mismatches)) {
			return {
				...base,
				kind: EipStatusCheckKind.MATCH,
				upstream: eip.status,
				upstreamRaw: rawStatus,
				url,
			}
		}

		return { ...base, kind: EipStatusCheckKind.DRIFT, mismatches, url }
	}

	if (tombstoneUrl !== null) {
		return unverifiable(
			eip,
			tombstoneUrl,
			'upstream spec is marked `Moved`, but the spec it moved to was not found',
		)
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

/** Formats one mismatch as `<field> Walletbeat=<ours> upstream=<theirs>`. */
function formatMismatch(mismatch: EipMismatch): string {
	const upstream =
		mismatch.field === EipMismatchField.STATUS
			? (mismatch.upstream ?? mismatch.upstreamRaw)
			: mismatch.upstream

	return `${mismatch.field} Walletbeat=${mismatch.ours} upstream=${upstream}`
}

/** Formats a human-readable report for terminal output. */
export function formatReport(report: EipStatusReport, options: { quiet: boolean }): string {
	const lines: string[] = []

	for (const result of report.drift) {
		lines.push(
			`DRIFT  ${label(result)}: ${result.mismatches.map(formatMismatch).join('; ')} (${result.url})`,
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

/**
 * A drifted EIP as serialized for automation. `mismatches` is declared
 * non-empty so that a serializer which filters it down to nothing fails to
 * compile, rather than emitting an entry that claims drift but names none.
 */
interface EipDriftJson {
	eip: string
	mismatches: NonEmptyArray<EipMismatch>
	url: string
}

/** An unverifiable EIP as serialized for automation. */
interface EipUnverifiableJson {
	eip: string
	note: string
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
			drift: report.drift.map(
				(result): EipDriftJson => ({
					eip: label(result),
					mismatches: result.mismatches,
					url: result.url,
				}),
			),
			unverifiable: report.unverifiable.map(
				(result): EipUnverifiableJson => ({
					eip: label(result),
					note: result.note,
				}),
			),
		},
		null,
		2,
	)
}
