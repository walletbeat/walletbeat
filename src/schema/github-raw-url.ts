import type { DomainUrl } from './url'

/**
 * A raw GitHub file URL (raw.githubusercontent.com).
 *
 * Format: https://raw.githubusercontent.com/[owner]/[repo]/[ref]/[path]
 *
 * Example: https://raw.githubusercontent.com/MetaMask/metamask-mobile/main/android/app/src/main/AndroidManifest.xml
 */
export type GithubRawUrl = DomainUrl<'raw.githubusercontent.com'> &
	`https://raw.githubusercontent.com/${string}`
