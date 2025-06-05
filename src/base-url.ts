/**
 * Get the URL root of the site, containing the scheme and host
 * but not containing the trailing slash.
 */
export function getBaseUrl(): string {
	if (typeof window !== 'undefined') {
		return `${window.location.protocol}//${window.location.host}`
	}

	if (
		import.meta.env.WALLETBEAT_URL_ROOT !== undefined &&
		import.meta.env.WALLETBEAT_URL_ROOT !== ''
	) {
		return `$${import.meta.env.WALLETBEAT_URL_ROOT}`
	}

	if (
		import.meta.env.NEXT_PUBLIC_SITE_URL !== undefined &&
		import.meta.env.NEXT_PUBLIC_SITE_URL !== ''
	) {
		return `${import.meta.env.NEXT_PUBLIC_SITE_URL}`
	}

	if (import.meta.env.VERCEL_BRANCH_URL !== undefined && import.meta.env.VERCEL_BRANCH_URL !== '') {
		return `https://${import.meta.env.VERCEL_BRANCH_URL}`
	}

	if (
		import.meta.env.VERCEL_PROJECT_PRODUCTION_URL !== undefined &&
		import.meta.env.VERCEL_PROJECT_PRODUCTION_URL !== ''
	) {
		return `https://${import.meta.env.VERCEL_PROJECT_PRODUCTION_URL}`
	}

	if (import.meta.env.VERCEL_URL !== undefined && import.meta.env.VERCEL_URL !== '') {
		return `https://${import.meta.env.VERCEL_URL}`
	}

	if (import.meta.env.MODE === 'development') {
		return `http://${import.meta.env.HOSTNAME ?? 'localhost'}:${import.meta.env.PORT ?? 3000}`
	}

	throw new Error(
		'Could not determine site URL root; please set WALLETBEAT_URL_ROOT environment variable',
	)
}
