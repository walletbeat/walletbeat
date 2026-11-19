import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { expect, it } from 'vitest'

function isSource(value: unknown): value is {
	revision: string
	diffHash: string
	untrackedHash: string
	build: { revision: string; diffHash: string; untrackedHash: string }
} {
	const hashes = (
		value: unknown,
	): value is { revision: string; diffHash: string; untrackedHash: string } =>
		typeof value === 'object' &&
		value !== null &&
		'revision' in value &&
		typeof value.revision === 'string' &&
		'diffHash' in value &&
		typeof value.diffHash === 'string' &&
		'untrackedHash' in value &&
		typeof value.untrackedHash === 'string'

	return hashes(value) && 'build' in value && hashes(value.build)
}

it('binds relocated build metadata to tracked and untracked inputs throughout its checkout', async () => {
	const root = await mkdtemp(join(tmpdir(), 'walletbeat-source-'))
	const git = (...args: string[]) =>
		execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()

	try {
		git('init', '--quiet')
		await writeFile(join(root, 'tracked.txt'), 'original')
		await writeFile(join(root, 'binary.bin'), Buffer.from([0, 1, 2, 3]))
		git('add', 'tracked.txt', 'binary.bin')
		git(
			'-c',
			'core.hooksPath=/dev/null',
			'-c',
			'commit.gpgsign=false',
			'-c',
			'user.name=Fixture',
			'-c',
			'user.email=fixture@example.invalid',
			'commit',
			'--quiet',
			'-m',
			'Fixture',
		)
		const bundle = join(root, '.astro', '.prerender', 'chunks', 'source.mjs')

		await mkdir(join(root, '.astro', '.prerender', 'chunks'), { recursive: true })
		await copyFile(new URL('./browser/fixtures/source-snapshot.mjs', import.meta.url), bundle)
		const snapshot = () => {
			const value: unknown = JSON.parse(
				execFileSync(
					process.execPath,
					[
						'--input-type=module',
						'-e',
						`const {sourceSnapshot} = await import(${JSON.stringify(pathToFileURL(bundle).href)}); process.stdout.write(JSON.stringify(await sourceSnapshot()))`,
					],
					{ cwd: tmpdir(), encoding: 'utf8' },
				),
			)

			if (!isSource(value)) {
				throw new Error('Source snapshot must contain complete source and build hashes')
			}

			return value
		}
		const initial = snapshot()

		expect(initial.revision).toBe(git('rev-parse', 'HEAD'))
		await writeFile(join(root, 'untracked.txt'), 'first')
		const added = snapshot()

		expect(added.untrackedHash).not.toBe(initial.untrackedHash)
		await writeFile(join(root, 'untracked.txt'), 'changed')
		const changed = snapshot()

		expect(changed.untrackedHash).not.toBe(added.untrackedHash)
		expect(changed.diffHash).toBe(initial.diffHash)
		await writeFile(join(root, 'tracked.txt'), 'modified')
		expect(snapshot().diffHash).not.toBe(initial.diffHash)
		const beforeBinary = snapshot()

		await writeFile(join(root, 'binary.bin'), Buffer.from([0, 4, 5, 6]))
		expect(snapshot().build.diffHash).not.toBe(beforeBinary.build.diffHash)
		await mkdir(join(root, 'tests', 'browser', 'fixtures'), { recursive: true })
		const beforeValidator = snapshot()

		await writeFile(join(root, 'tests', 'browser', 'journey.spec.ts'), 'validator')
		await writeFile(join(root, 'playwright.config.ts'), 'validator configuration')
		const afterValidator = snapshot()

		expect(afterValidator.untrackedHash).not.toBe(beforeValidator.untrackedHash)
		expect(afterValidator.build).toEqual(beforeValidator.build)
		await writeFile(join(root, 'tests', 'browser', 'fixtures', 'input.ts'), 'fixture')
		const afterFixture = snapshot()

		expect(afterFixture.build.untrackedHash).not.toBe(afterValidator.build.untrackedHash)
		await writeFile(join(root, 'tests', 'browser', 'fixtures', 'input.ts'), 'changed fixture')
		expect(snapshot().build.untrackedHash).not.toBe(afterFixture.build.untrackedHash)
	} finally {
		await rm(root, { recursive: true, force: true })
	}
})
