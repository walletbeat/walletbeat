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
		return []
	}

	const val = getProp(obj, key)

	if (!Array.isArray(val)) {
		return []
	}

	return val.filter((v): v is string => typeof v === 'string')
}

function getObjectArray(raw: unknown, key: string): object[] {
	const obj = asObj(raw)

	if (obj === undefined) {
		return []
	}

	const val = getProp(obj, key)

	if (!Array.isArray(val)) {
		return []
	}

	return val.filter((v): v is object => typeof v === 'object' && v !== null && !Array.isArray(v))
}

function getMaybeObj(raw: unknown, key: string): object | undefined {
	const obj = asObj(raw)

	if (obj === undefined) {
		return undefined
	}

	return asObj(getProp(obj, key))
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
		pattern === '*://*/*' ||
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

	// Unrecognized pattern — assume HTTPS only to avoid under-reporting
	return HostPermissionScope.HTTPS_ONLY
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
	const known = new Set<string>(Object.values(BrowserExtensionPermission))

	return all
		.filter(p => !p.includes('://')) // MV2 host patterns — handled by parseHostPermissions
		.map(p => {
			if (!known.has(p)) {
				throw new Error(`Unknown browser extension permission: ${JSON.stringify(p)}`)
			}

			return p as BrowserExtensionPermission
		})
}

function parseWebAccessibleResources(raw: unknown): WebAccessibleResourcesScope {
	const obj = asObj(raw)

	if (obj === undefined) {
		return WebAccessibleResourcesScope.NONE
	}

	const war = getProp(obj, 'web_accessible_resources')

	if (!Array.isArray(war) || war.length === 0) {
		return WebAccessibleResourcesScope.NONE
	}

	// MV2: string[] — no origin restriction, any page can load resources.
	if (typeof war[0] === 'string') {
		return WebAccessibleResourcesScope.HTTP_AND_HTTPS
	}

	// MV3: Array<{ resources, matches }> — check matches across all entries.
	const entries = war.filter((e): e is object => typeof e === 'object' && e !== null)
	const allMatches = entries.flatMap(e => getStringArray(e, 'matches'))

	if (allMatches.length === 0) {
		return WebAccessibleResourcesScope.NONE
	}

	const scope = worstScopeOfPatterns(allMatches)

	switch (scope) {
		case HostPermissionScope.NONE:
			return WebAccessibleResourcesScope.NONE
		case HostPermissionScope.HTTPS_ONLY:
			// Check if all origins are named (specific) vs wildcard HTTPS.
			if (allMatches.every(m => !m.includes('*'))) {
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
