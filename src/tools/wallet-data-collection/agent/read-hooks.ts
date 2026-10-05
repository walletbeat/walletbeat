/**
 * Hooks around the `read` tool.
 */
import * as fs from 'node:fs'
import { constants } from 'node:fs'
import { access as fsAccess, readFile as fsReadFile } from 'node:fs/promises'
import path from 'node:path'

import {
	detectSupportedImageMimeTypeFromFile,
	type ReadOperations,
} from '@earendil-works/pi-coding-agent'

import { normalizePath } from '../../../utils/codebase'

/** The default local filesystem read operations, mirroring the harness's defaults. */
export function createLocalReadOperations(): ReadOperations {
	return {
		readFile: path => fsReadFile(path),
		access: path => fsAccess(path, constants.R_OK),
		detectImageMimeType: detectSupportedImageMimeTypeFromFile,
	}
}

/** True if `child` is `parent` or lives under `parent`. */
function isPathWithin(child: string, parent: string): boolean {
	const normalizedChild = normalizePath(child)
	const normalizedParent = normalizePath(parent)

	return normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}/`)
}

/** True if the target's basename matches the harness's temp-log pattern. */
function isPiLog(absolutePath: string): boolean {
	return /^pi-.*\.log$/.test(path.basename(absolutePath))
}

/** True if the target resolves to a directory (rather than a file). */
function isDirectory(absolutePath: string): boolean {
	try {
		return fs.statSync(absolutePath).isDirectory()
	} catch {
		return false
	}
}

/**
 * Validate a read-target absolute path against the repo-root and backup-tree
 * restrictions, throwing a descriptive error when it is disallowed.
 */
export function assertReadPathAllowed(
	absolutePath: string,
	repoRoot: string,
	backupTreeDir: string,
): void {
	const outOfRepo = !isPathWithin(absolutePath, repoRoot)
	const inBackupTree = isPathWithin(absolutePath, backupTreeDir)

	if (!(outOfRepo || inBackupTree)) {
		return
	}

	if (isPiLog(absolutePath) || isDirectory(absolutePath)) {
		return
	}

	const where = inBackupTree ? 'inside backup-tree.bak' : 'outside the repository root'

	throw new Error(
		`[read-check] Refusing to read ${absolutePath}: it is ${where} and is not a pi-*.log file or a directory.`,
	)
}

/**
 * Wrap a base {@link ReadOperations} so every operation validates its target path
 * through {@link assertReadPathAllowed} before delegating. Non-bash tool targets and
 * unexpected shapes degrade to the base behavior; disallowed paths throw.
 */
export function createReadCheckOperations(
	base: ReadOperations,
	repoRoot: string,
	backupTreeDir: string,
): ReadOperations {
	const validate = (absolutePath: string) =>
		assertReadPathAllowed(absolutePath, repoRoot, backupTreeDir)

	return {
		access: async absolutePath => {
			validate(absolutePath)

			return base.access(absolutePath)
		},
		readFile: async absolutePath => {
			validate(absolutePath)

			return base.readFile(absolutePath)
		},
		detectImageMimeType: async absolutePath => {
			validate(absolutePath)

			return base.detectImageMimeType?.(absolutePath)
		},
	}
}
