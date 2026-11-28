import fs from 'node:fs'
import * as path from 'node:path'

import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

import { getRepositoryRoot } from '@/utils/codebase'

const REPO_ROOT = getRepositoryRoot()

/**
 * Lifecycle scripts that pnpm treats as dependency build scripts.
 *
 * pnpm runs these for a dependency only when the package is approved via
 * `allowBuilds` (or `onlyBuiltDependencies`).
 *
 * `prepare` is intentionally excluded, as `pnpm` runs `prepare` for the
 * root project and workspace packages, never for regular dependencies.
 */
const BUILD_SCRIPTS = ['preinstall', 'install', 'postinstall'] as const

const WORKSPACE_FILE = path.join(REPO_ROOT, 'pnpm-workspace.yaml')
const LOCKFILE_FILE = path.join(REPO_ROOT, 'pnpm-lock.yaml')

/** The dependency sections of an importer in `pnpm-lock.yaml`. */
const DEPENDENCY_SECTIONS = [
	'dependencies',
	'devDependencies',
	'optionalDependencies',
	'peerDependencies',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readPackageJson(file: string): Record<string, unknown> | null {
	const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf-8'))

	if (isRecord(parsed)) {
		return parsed
	}

	return null
}

function parseLockfile(): Record<string, unknown> {
	const parsed: unknown = parse(fs.readFileSync(LOCKFILE_FILE, 'utf-8'))

	if (isRecord(parsed)) {
		return parsed
	}

	throw new Error('pnpm-lock.yaml does not contain a YAML mapping at its root')
}

/**
 * Collect the names of every installed dependency that declares at least one
 * build script. Scans the pnpm virtual store so the set reflects what pnpm
 * actually gates behind allowBuilds.
 */
function findDependenciesWithBuildScripts(): string[] {
	const pnpmDir = path.join(REPO_ROOT, 'node_modules', '.pnpm')

	if (!fs.existsSync(pnpmDir)) {
		throw new Error('node_modules/.pnpm was not found; run `pnpm install` before running this test')
	}

	const names = new Set<string>()

	for (const entry of fs.readdirSync(pnpmDir)) {
		const nodeModulesDir = path.join(pnpmDir, entry, 'node_modules')

		if (!fs.existsSync(nodeModulesDir)) {
			continue
		}

		for (const top of fs.readdirSync(nodeModulesDir)) {
			const packageJsonPaths: string[] = []

			// Scoped packages live under node_modules/@scope/name.
			if (top.startsWith('@')) {
				const scopeDir = path.join(nodeModulesDir, top)

				if (!fs.existsSync(scopeDir)) {
					continue
				}

				for (const sub of fs.readdirSync(scopeDir)) {
					packageJsonPaths.push(path.join(scopeDir, sub, 'package.json'))
				}
			} else {
				packageJsonPaths.push(path.join(nodeModulesDir, top, 'package.json'))
			}

			for (const packageJsonPath of packageJsonPaths) {
				const pkg = readPackageJson(packageJsonPath)

				if (pkg === null) {
					continue
				}

				const scripts = pkg.scripts

				if (!isRecord(scripts)) {
					continue
				}

				const hasBuildScript = BUILD_SCRIPTS.some(script => typeof scripts[script] === 'string')

				if (hasBuildScript && typeof pkg.name === 'string') {
					names.add(pkg.name)
				}
			}
		}
	}

	return [...names].sort()
}

/**
 * Collect the names of every package that is part of the project's dependency
 * graph, transitively. Goes through `importers` section of pnpm-lock.yaml (the
 * direct dependencies of each workspace package) plus every `packages` and
 * `snapshots` entry (the transitive dependency lists pnpm resolves). This
 * includes platform-optional deps that may not be installed on the current
 * platform, so the set is platform-independent.
 */
function findDependencyNamesFromLockfile(): Set<string> {
	const lockfile = parseLockfile()
	const names = new Set<string>()

	const addDepsFrom = (container: unknown): void => {
		if (!isRecord(container)) {
			return
		}

		for (const section of DEPENDENCY_SECTIONS) {
			const deps = container[section]

			if (!isRecord(deps)) {
				continue
			}

			for (const name of Object.keys(deps)) {
				names.add(name)
			}
		}
	}

	const importers = lockfile.importers

	if (isRecord(importers)) {
		for (const importer of Object.values(importers)) {
			addDepsFrom(importer)
		}
	}

	for (const section of ['packages', 'snapshots']) {
		const entries = lockfile[section]

		if (!isRecord(entries)) {
			continue
		}

		for (const entry of Object.values(entries)) {
			addDepsFrom(entry)
		}
	}

	return names
}

/**
 * Patterns that identify a dependency resolved from a git source rather than a
 * registry. pnpm runs `prepare` scripts for git dependencies (it never runs
 * them for registry dependencies), so these must **not** exist.
 */
const GIT_SOURCE_PATTERNS = [
	/github\.com\//,
	/gitlab\.com\//,
	/bitbucket\.org\//,
	/git\+/,
	/git:\/\//,
	/git@[a-zA-Z0-9.-]+[:/]/,
	/github:/,
	/gitlab:/,
	/bitbucket:/,
	/commit:/,
] as const

function matchesGitSource(value: string): boolean {
	return GIT_SOURCE_PATTERNS.some(pattern => pattern.test(value))
}

/**
 * Collect every dependency in the lockfile that is resolved from a git source.
 * Inspects only structural fields (package keys, resolutions, importer
 * dependency specifiers), so human-readable strings that merely link to a git
 * host (e.g. deprecation messages) are not misreported.
 */
function findGitDependencies(): string[] {
	const lockfile = parseLockfile()
	const gitDeps: string[] = []

	for (const section of ['packages', 'snapshots']) {
		const entries = lockfile[section]

		if (!isRecord(entries)) {
			continue
		}

		for (const [key, entry] of Object.entries(entries)) {
			if (matchesGitSource(key)) {
				gitDeps.push(key)
			}

			// A resolution is either a string or a mapping (e.g. `{integrity}`,
			// `{tarball}`, `{commit}`). Inspect every string value it contains.
			if (isRecord(entry)) {
				const resolution = entry.resolution

				if (typeof resolution === 'string') {
					if (matchesGitSource(resolution)) {
						gitDeps.push(`${key} -> ${resolution}`)
					}
				} else if (isRecord(resolution)) {
					for (const value of Object.values(resolution)) {
						if (typeof value === 'string' && matchesGitSource(value)) {
							gitDeps.push(`${key} -> ${value}`)
						}
					}
				}
			}
		}
	}

	const importers = lockfile.importers

	if (isRecord(importers)) {
		for (const importer of Object.values(importers)) {
			if (!isRecord(importer)) {
				continue
			}

			for (const section of DEPENDENCY_SECTIONS) {
				const deps = importer[section]

				if (!isRecord(deps)) {
					continue
				}

				for (const [name, dep] of Object.entries(deps)) {
					// A dependency specifier/version is a string, and may be a
					// git source (e.g. `github:user/repo`).
					if (isRecord(dep)) {
						for (const field of ['specifier', 'version']) {
							const value = dep[field]

							if (typeof value === 'string' && matchesGitSource(value)) {
								gitDeps.push(`${name}: ${value}`)
							}
						}
					}
				}
			}
		}
	}

	return gitDeps
}

/** Parse the `allowBuilds` map out of `pnpm-workspace.yaml`. */
function parseAllowBuilds(): Record<string, boolean> {
	const parsed: unknown = parse(fs.readFileSync(WORKSPACE_FILE, 'utf-8'))

	if (!isRecord(parsed)) {
		throw new Error('pnpm-workspace.yaml does not contain a YAML mapping at its root')
	}

	const allowBuilds = parsed.allowBuilds

	if (!isRecord(allowBuilds)) {
		return {}
	}

	return Object.fromEntries(
		Object.entries(allowBuilds).map(([name, value]) => [name, value === true]),
	)
}

describe('pnpm allowBuilds', () => {
	const allowBuilds = parseAllowBuilds()
	const dependenciesWithBuildScripts = findDependenciesWithBuildScripts()
	const dependencyNames = findDependencyNamesFromLockfile()

	it('allowBuilds covers every installed dependency with a build script', () => {
		// Forward direction: every dependency with a build script needs an entry.
		const missing = dependenciesWithBuildScripts.filter(name => !Object.hasOwn(allowBuilds, name))

		expect(
			missing,
			`These dependencies declare build scripts but are missing from \`allowBuilds\`: ${missing.join(', ')}`,
		).toEqual([])
	})

	it('every `allowBuilds` entry corresponds to a dependency of the project', () => {
		const stale = Object.keys(allowBuilds).filter(name => !dependencyNames.has(name))

		expect(
			stale,
			`These \`allowBuilds\` entries are not dependencies of the project (considering the dependency graph recursively): ${stale.join(', ')}`,
		).toEqual([])
	})

	it('there are no git dependencies', () => {
		// pnpm runs `prepare` scripts for git dependencies, so a git dependency
		// would execute a `prepare` script that is not the repository's own.
		const gitDeps = findGitDependencies()

		expect(
			gitDeps,
			'Git dependencies would run their own `prepare` scripts. Use registry dependencies instead.',
		).toEqual([])
	})

	it('every allowBuilds entry is set to false', () => {
		const allowed = Object.entries(allowBuilds).filter(([, value]) => value)

		expect(
			allowed.map(([name]) => name),
			"`allowBuilds` must disable (set to `false`) every dependency's build scripts. If a dependency requires any build script on any platform, it is not acceptable for use in this repository.",
		).toEqual([])
	})
})
