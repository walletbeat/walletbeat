/**
 * Canonical GitHub repository URL for walletbeat.
 */
export const GITHUB_REPO_URL = 'https://github.com/walletbeat/walletbeat'

/**
 * Default branch of the walletbeat repository, used when building links to
 * files on GitHub (e.g. for in-repo files that the site does not serve).
 */
export const GITHUB_DEFAULT_BRANCH = 'beta'

/**
 * Build a GitHub blob URL for a repo-root-relative path (leading `/`).
 * E.g. `/governance/foo/bar.sh` → `https://github.com/walletbeat/walletbeat/blob/beta/governance/foo/bar.sh`.
 */
export function githubBlobUrl(repoRelativePath: string): string {
	const pathWithoutQueryHash = repoRelativePath.split(/[?#]/)[0]

	return `${GITHUB_REPO_URL}/blob/${GITHUB_DEFAULT_BRANCH}${pathWithoutQueryHash}`
}
