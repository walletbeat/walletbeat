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

/** A GitHub repository identified by its owner and name. */
export interface GithubRepository {
	owner: string
	repo: string
}

const GITHUB_REPOSITORY_URL =
	/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/

/**
 * Parse a `https://github.com/<owner>/<repo>` URL. Returns null for anything
 * else, including organization-only URLs such as `https://github.com/<owner>`.
 */
export function parseGithubRepository(url: string): GithubRepository | null {
	const match = GITHUB_REPOSITORY_URL.exec(url)

	if (match === null) {
		return null
	}

	return { owner: match[1], repo: match[2] }
}

/** Canonical URL of a GitHub repository. */
export function githubRepositoryUrl({ owner, repo }: GithubRepository): string {
	return `https://github.com/${owner}/${repo}`
}
