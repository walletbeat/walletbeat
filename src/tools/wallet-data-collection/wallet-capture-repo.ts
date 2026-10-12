/**
 * Helpers to enumerate every wallet capture file in the repository and its
 * requests.
 */
import fs from 'node:fs'
import path from 'node:path'

import { updateDomainMapping } from '@/data/entities/domains/entity-domains'
import { assertValidDomainToEntityIdMapping } from '@/schema/entity-domains'
import { getErrorMessage } from '@/types/errors'
import { getRepositoryRoot } from '@/utils/codebase'

import { WalletCaptureAnnotations } from './wallet-capture-annotations'
import { requestIdToString } from './wallet-capture-classification-audit-log'
import {
	WalletCaptureFile,
	type WalletRequest,
	type WalletRequestClassification,
} from './wallet-capture-file'
import { recordedFlow } from './wallet-capture-file'

/** A capture file plus its loaded {@link WalletCaptureFile} instance. */
export interface EnumeratedCaptureFile {
	/** Absolute path to the capture file. */
	path: string
	/** The loaded capture file. */
	captureFile: WalletCaptureFile
}

/** Recursively collect every `*.capture.json` under `dir`. */
function walkCaptureFiles(dir: string): string[] {
	if (!fs.existsSync(dir)) {
		return []
	}

	const files: string[] = []

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const abs = path.join(dir, entry.name)

		if (entry.isDirectory()) {
			files.push(...walkCaptureFiles(abs))
		} else if (entry.isFile() && entry.name.endsWith('.capture.json')) {
			files.push(abs)
		}
	}

	return files
}

/**
 * The {@link WalletCaptureAnnotations} for a capture file: the sibling
 * `<walletId>.annotations.json` supplies wallet-specific annotations and the
 * repo-global `data/collection/global.annotations.json` supplies the rest.
 */
export function loadAnnotationsForCapture(capturePath: string): WalletCaptureAnnotations {
	const dir = path.dirname(capturePath)
	const walletId = path.basename(dir)
	const annotationsPath = path.join(dir, `${walletId}.annotations.json`)
	const globalAnnotationsPath = path.join(
		getRepositoryRoot(),
		'data',
		'collection',
		'global.annotations.json',
	)

	return WalletCaptureAnnotations.fromFile(annotationsPath, globalAnnotationsPath)
}

/**
 * Reload the in-memory domain-to-entity mapping from
 * `data/entities/domains/entity-domains.json`. The harness is a long-lived
 * process that imported the mapping once; a CLI child (e.g. `mark-domain`)
 * rewrites the JSON in its own process, so the harness must re-read it before
 * computing classifications to see the change.
 */
export function reloadDomainMapping(repoRoot: string): void {
	const jsonPath = path.join(repoRoot, 'data', 'entities', 'domains', 'entity-domains.json')

	if (!fs.existsSync(jsonPath)) {
		return
	}

	try {
		const raw: unknown = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as unknown

		updateDomainMapping(assertValidDomainToEntityIdMapping(raw))
	} catch (e) {
		throw new Error(`Failed to reload domain mapping: ${getErrorMessage(e)} (invalid mutation?)`, {
			cause: e,
		})
	}
}

/**
 * Enumerate every capture file in the repository, loading each via
 * {@link WalletCaptureFile}.
 */
export async function enumerateCaptureFiles(repoRoot: string): Promise<EnumeratedCaptureFile[]> {
	const collectionDirs: string[] = []

	for (const typeDir of fs.readdirSync(path.join(repoRoot, 'data'))) {
		if (!typeDir.endsWith('-wallets')) {
			continue
		}

		const collectionDir = path.join(repoRoot, 'data', typeDir, 'collection')

		if (fs.existsSync(collectionDir)) {
			collectionDirs.push(collectionDir)
		}
	}

	const results: EnumeratedCaptureFile[] = []

	for (const collectionDir of collectionDirs) {
		for (const capturePath of walkCaptureFiles(collectionDir)) {
			try {
				const annotations = loadAnnotationsForCapture(capturePath)
				const captureFile = await WalletCaptureFile.fromFile(null, capturePath, annotations)

				results.push({ path: capturePath, captureFile })
			} catch (e) {
				throw new Error(`Cannot load capture file ${capturePath}: ${getErrorMessage(e)}`, {
					cause: e,
				})
			}
		}
	}

	return results
}

/** Every request across all capture files in the repository. */
export async function allRequests(repoRoot: string): Promise<WalletRequest[]> {
	const requests: WalletRequest[] = []

	for (const { captureFile } of await enumerateCaptureFiles(repoRoot)) {
		for (const flow of recordedFlow.items) {
			const resolved = captureFile.getFlow(flow)

			if (resolved === null || resolved === 'NOT_SUPPORTED') {
				continue
			}

			for (const request of resolved.requests) {
				requests.push(request)
			}
		}
	}

	return requests
}

/**
 * The set of `walletId:walletVariant:sessionTime` strings across all capture
 * files in the repository.
 */
export async function allRequestIds(repoRoot: string): Promise<Set<string>> {
	const ids = new Set<string>()

	for (const { captureFile } of await enumerateCaptureFiles(repoRoot)) {
		for (const request of captureFile.getRequests()) {
			ids.add(
				requestIdToString({
					walletId: captureFile.identity.walletId,
					walletVariant: captureFile.identity.walletVariant,
					sessionTime: request.sessionTime.toNumber(),
				}),
			)
		}
	}

	return ids
}

/**
 * The classification fingerprint of every request across all capture files in
 * the repository, keyed by `walletId:walletVariant:sessionTime`.
 */
export async function allRequestClassifications(
	repoRoot: string,
): Promise<Map<string, WalletRequestClassification>> {
	// Reload the on-disk domain mapping so a CLI child's `mark-domain` change is
	// reflected in the classification diff.
	reloadDomainMapping(repoRoot)

	const classifications = new Map<string, WalletRequestClassification>()

	for (const { captureFile } of await enumerateCaptureFiles(repoRoot)) {
		for (const request of captureFile.getRequests()) {
			const requestId = requestIdToString({
				walletId: captureFile.identity.walletId,
				walletVariant: captureFile.identity.walletVariant,
				sessionTime: request.sessionTime.toNumber(),
			})

			classifications.set(requestId, await captureFile.resolveRequestClassification(request))
		}
	}

	return classifications
}
