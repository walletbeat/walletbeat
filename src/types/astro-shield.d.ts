declare module '@kindspells/astro-shield/core' {
	interface SRIOptions {
		enableMiddleware?: boolean
		enableStatic?: boolean
		hashesModule?: string
		allowInlineScripts?: 'all' | 'static' | false
		allowInlineStyles?: 'all' | 'static' | false
		scriptsAllowListUrls?: string[]
		stylesAllowListUrls?: string[]
	}

	export function getMiddlewareHandler(
		logger: Console,
		globalHashes: {
			scripts: Map<string, string>
			styles: Map<string, string>
		},
		sri: SRIOptions,
	): (context: unknown, next: () => Promise<Response>) => Promise<Response>
}

declare module '@kindspells/astro-shield/state' {
	export function getGlobalHashes(): {
		scripts: Map<string, string>
		styles: Map<string, string>
	}
}

declare module '*/generated/sriHashes.mjs' {
	export const perResourceSriHashes: {
		scripts: Record<string, string>
		styles: Record<string, string>
	}
}
