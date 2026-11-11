import { execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
	cwd: fileURLToPath(new URL('../../', import.meta.url)),
	encoding: 'utf8',
}).trim()

/** @param {string[]} [paths] @returns {Promise<string>} */
function diffHash(paths = ['.']) {
	return new Promise((resolve, reject) => {
		const digest = createHash('sha256')
		const child = spawn(
			'git',
			['diff', 'HEAD', '--full-index', '--no-ext-diff', '--no-textconv', '--', ...paths],
			{ cwd: root },
		)
		let error = ''

		child.stdout.on('data', /** @param {Buffer} chunk */ chunk => digest.update(chunk))
		child.stderr.on(
			'data',
			/** @param {Buffer} chunk */ chunk => {
				error += chunk.toString()
			},
		)
		child.on('error', reject)
		child.on('close', code =>
			code === 0
				? resolve(digest.digest('hex'))
				: reject(new Error(error || `git diff exited ${code}`)),
		)
	})
}

/** @param {import('node:crypto').BinaryLike} value */
const hash = value => createHash('sha256').update(value).digest('hex')
/** @param {string} file */
const buildInput = file =>
	(!file.startsWith('tests/') &&
		!file.split('/').some(part => part.endsWith('.tests')) &&
		file !== 'playwright.config.ts') ||
	file.startsWith('tests/browser/fixtures/') ||
	file === 'tests/browser/astro.config.mjs'

/** @param {boolean} build */
async function snapshot(build) {
	const files = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
		cwd: root,
		encoding: 'utf8',
	})
		.split('\0')
		.filter(file => file && (!build || buildInput(file)))
		.sort()

	return {
		revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
		diffHash: build
			? hash(
					JSON.stringify(
						await Promise.all([
							diffHash([
								'.',
								':(exclude)tests/**',
								':(glob,exclude)src/**/*.tests/**',
								':(exclude)playwright.config.ts',
							]),
							diffHash(['tests/browser/fixtures', 'tests/browser/astro.config.mjs']),
						]),
					),
				)
			: await diffHash(),
		untrackedHash: hash(
			JSON.stringify(
				await Promise.all(
					files.map(async file => [file, hash(await readFile(resolve(root, file)))]),
				),
			),
		),
	}
}

export const buildSnapshot = () => snapshot(true)

export async function sourceSnapshot() {
	const [source, build] = await Promise.all([snapshot(false), buildSnapshot()])

	return { ...source, build }
}

/** @param {string | URL} url @param {Awaited<ReturnType<typeof sourceSnapshot>>} source */
export async function verifyServerSource(url, source) {
	const response = await fetch(new URL('/__wallet-page/source.json', url))

	if (!response.ok || JSON.stringify(await response.json()) !== JSON.stringify(source.build)) {
		throw new Error(
			'The served build does not match these application and fixture inputs; use the fixture configuration and the intended checkout.',
		)
	}
}
