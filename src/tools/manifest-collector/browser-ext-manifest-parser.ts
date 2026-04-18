import {
	type BrowserExtensionManifest,
	BrowserExtensionPermission,
	ExternalExtensionIdScope,
	HostPermissionScope,
	WebAccessibleResourcesScope,
} from '@/schema/features/security/security-best-practices'

function asObj(raw: unknown): object | undefined {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		return undefined
	}

	return raw
}

/** Returns `any` from Reflect.get, widened to `unknown`. Safe to use. */
function getProp(obj: object, key: string): unknown {
	return Reflect.get(obj, key) as unknown
}

function getStringArray(raw: unknown, key: string): string[] {
	const obj = asObj(raw)

	if (obj === undefined) {
		throw new Error(`Expected an object but got ${typeof raw}`)
	}

	const val = getProp(obj, key)

	if (val === undefined || val === null) {
		return []
	}

	if (!Array.isArray(val)) {
		throw new Error(`Expected ${JSON.stringify(key)} to be an array but got ${typeof val}`)
	}

	return val.map((v: unknown, i: number) => {
		if (typeof v !== 'string') {
			throw new Error(`Expected ${JSON.stringify(key)}[${i}] to be a string but got ${typeof v}`)
		}

		return v
	})
}

function getObjectArray(raw: unknown, key: string): object[] {
	const obj = asObj(raw)

	if (obj === undefined) {
		throw new Error(`Expected an object but got ${typeof raw}`)
	}

	const val = getProp(obj, key)

	if (val === undefined || val === null) {
		return []
	}

	if (!Array.isArray(val)) {
		throw new Error(`Expected ${JSON.stringify(key)} to be an array but got ${typeof val}`)
	}

	return val.map((v: unknown, i: number) => {
		if (typeof v !== 'object' || v === null || Array.isArray(v)) {
			throw new Error(`Expected ${JSON.stringify(key)}[${i}] to be an object but got ${typeof v}`)
		}

		return v
	})
}

function getMaybeObj(raw: unknown, key: string): object | undefined {
	const obj = asObj(raw)

	if (obj === undefined) {
		throw new Error(`Expected an object but got ${typeof raw}`)
	}

	const val = getProp(obj, key)

	if (val === undefined || val === null) {
		return undefined
	}

	const result = asObj(val)

	if (result === undefined) {
		throw new Error(`Expected ${JSON.stringify(key)} to be an object but got ${typeof val}`)
	}

	return result
}

/**
 * Extracts the host portion from a URL match pattern (scheme://host/path).
 * Returns the full string if no `://` separator is found.
 */
function extractHost(pattern: string): string {
	const afterScheme = pattern.indexOf('://')

	if (afterScheme === -1) {
		return pattern
	}

	const hostAndPath = pattern.slice(afterScheme + 3)
	const slashIdx = hostAndPath.indexOf('/')

	return slashIdx === -1 ? hostAndPath : hostAndPath.slice(0, slashIdx)
}

/** Ordering of HostPermissionScope from least to most permissive. */
const HOST_SCOPE_ORDER: HostPermissionScope[] = [
	HostPermissionScope.NONE,
	HostPermissionScope.HTTPS_ONLY,
	HostPermissionScope.HTTP_AND_HTTPS,
	HostPermissionScope.UNRESTRICTED,
]

function worstHostScope(a: HostPermissionScope, b: HostPermissionScope): HostPermissionScope {
	return HOST_SCOPE_ORDER.indexOf(a) >= HOST_SCOPE_ORDER.indexOf(b) ? a : b
}

function classifyPattern(pattern: string): HostPermissionScope {
	if (
		pattern === '<all_urls>' ||
		pattern.startsWith('file://') ||
		pattern.startsWith('ws://') ||
		pattern.startsWith('wss://')
	) {
		return HostPermissionScope.UNRESTRICTED
	}

	if (pattern.startsWith('http://')) {
		return HostPermissionScope.HTTP_AND_HTTPS
	}

	// *:// covers both http and https
	if (pattern.startsWith('*://')) {
		return HostPermissionScope.HTTP_AND_HTTPS
	}

	if (pattern.startsWith('https://')) {
		return HostPermissionScope.HTTPS_ONLY
	}

	throw new Error(`Unrecognized host permission pattern: ${JSON.stringify(pattern)}`)
}

function worstScopeOfPatterns(patterns: string[]): HostPermissionScope {
	return patterns.reduce<HostPermissionScope>(
		(acc, p) => worstHostScope(acc, classifyPattern(p)),
		HostPermissionScope.NONE,
	)
}

function parseHostPermissions(raw: unknown): HostPermissionScope {
	// MV3 uses host_permissions; MV2 mixes host patterns into permissions.
	const mv3 = getStringArray(raw, 'host_permissions')
	const mv2 = getStringArray(raw, 'permissions').filter(p => p.includes('://'))

	return worstScopeOfPatterns([...mv3, ...mv2])
}

function parseContentScripts(raw: unknown): HostPermissionScope {
	const scripts = getObjectArray(raw, 'content_scripts')
	const patterns = scripts.flatMap(cs => getStringArray(cs, 'matches'))

	return worstScopeOfPatterns(patterns)
}

function parseExternallyConnectable(
	raw: unknown,
): BrowserExtensionManifest['externallyConnectable'] {
	const ec = getMaybeObj(raw, 'externally_connectable')

	if (ec === undefined) {
		return 'NOT_EXTERNALLY_CONNECTABLE'
	}

	const ids = getStringArray(ec, 'ids')
	let extensionIds: ExternalExtensionIdScope

	if (ids.length === 0) {
		extensionIds = ExternalExtensionIdScope.NONE
	} else if (ids.includes('*')) {
		extensionIds = ExternalExtensionIdScope.ANY
	} else {
		extensionIds = ExternalExtensionIdScope.SPECIFIC
	}

	const pageMatches = worstScopeOfPatterns(getStringArray(ec, 'matches'))

	return { extensionIds, pageMatches }
}

function parsePermissions(raw: unknown): BrowserExtensionPermission[] {
	const all = getStringArray(raw, 'permissions')

	return all
		.filter(p => !p.includes('://')) // MV2 host patterns — handled by parseHostPermissions
		.map(p => {
			const permission = Object.values(BrowserExtensionPermission).find(v => (v as string) === p)

			if (permission === undefined) {
				throw new Error(`Unknown browser extension permission: ${JSON.stringify(p)}`)
			}

			return permission
		})
}

function parseWebAccessibleResources(raw: unknown): WebAccessibleResourcesScope {
	const obj = asObj(raw)

	if (obj === undefined) {
		throw new Error(`Expected an object but got ${typeof raw}`)
	}

	const war = getProp(obj, 'web_accessible_resources')

	if (war === undefined || war === null) {
		return WebAccessibleResourcesScope.NONE
	}

	if (!Array.isArray(war)) {
		throw new Error(`Expected "web_accessible_resources" to be an array but got ${typeof war}`)
	}

	if (war.length === 0) {
		return WebAccessibleResourcesScope.NONE
	}

	// MV2: string[] — no origin restriction at all; any origin including file://
	// and chrome:// can load chrome-extension:// URLs.
	if (typeof war[0] === 'string') {
		return WebAccessibleResourcesScope.UNRESTRICTED
	}

	// MV3: Array<{ resources, matches }> — check matches across all entries.
	const entries = war.map((e: unknown, i: number) => {
		if (typeof e !== 'object' || e === null || Array.isArray(e)) {
			throw new Error(
				`Expected "web_accessible_resources"[${i}] to be an object but got ${typeof e}`,
			)
		}

		return e
	})
	const allMatches = entries.flatMap(e => getStringArray(e, 'matches'))

	if (allMatches.length === 0) {
		return WebAccessibleResourcesScope.NONE
	}

	const scope = worstScopeOfPatterns(allMatches)

	switch (scope) {
		case HostPermissionScope.NONE:
			return WebAccessibleResourcesScope.NONE
		case HostPermissionScope.HTTPS_ONLY:
			// SPECIFIC_ORIGINS only if no match has a wildcard in the host part.
			// Path wildcards (https://example.com/*) are fine — the origin is still named.
			if (allMatches.every(m => !extractHost(m).includes('*'))) {
				return WebAccessibleResourcesScope.SPECIFIC_ORIGINS
			}

			return WebAccessibleResourcesScope.HTTPS_ONLY
		case HostPermissionScope.HTTP_AND_HTTPS:
			return WebAccessibleResourcesScope.HTTP_AND_HTTPS
		case HostPermissionScope.UNRESTRICTED:
			return WebAccessibleResourcesScope.UNRESTRICTED
	}
}

/**
 * Parses a raw manifest.json object into a typed `BrowserExtensionManifest`.
 *
 * Takes the most permissive scope found across all matching patterns.
 */
export function parseBrowserExtensionManifest(raw: unknown): BrowserExtensionManifest {
	return {
		contentScripts: parseContentScripts(raw),
		externallyConnectable: parseExternallyConnectable(raw),
		hostPermissions: parseHostPermissions(raw),
		permissions: parsePermissions(raw),
		webAccessibleResources: parseWebAccessibleResources(raw),
	}
}
