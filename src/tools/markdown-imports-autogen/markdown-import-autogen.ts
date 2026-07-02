import * as path from 'node:path'

import { cac } from 'cac'

import { getRepositoryRoot } from '@/tests/utils/codebase'
import { getErrorMessage } from '@/types/errors'

import {
	type MarkdownImportsConfig,
	MarkdownImportsGenerator,
	SERVED_DIRS,
} from './markdown-import-autogen-lib'

// ── CLI ──

try {
	const cli = cac('markdown-imports-autogen')

	cli.option('--mode <mode>', '"check" or "write"').help().version('0.0.1')

	cli.parse(process.argv)

	const rawMode: unknown = cli.options.mode
	const mode = typeof rawMode === 'string' ? rawMode : undefined

	if (!mode || !(mode === 'check' || mode === 'write')) {
		throw new Error('Error: --mode is required and must be "check" or "write"')
	}

	const repoRoot = getRepositoryRoot()

	// Build generator instances from the SERVED_DIRS mapping
	const generators: MarkdownImportsGenerator[] = SERVED_DIRS.map(served => {
		const absGenPath = path.join(repoRoot, served.genFile.slice(1))
		const absSourceDir = path.join(repoRoot, served.sourceDir.slice(1))

		const config: MarkdownImportsConfig = {
			genFilePath: absGenPath,
			sourceDirs: [absSourceDir],
		}

		return new MarkdownImportsGenerator(config)
	})

	// ── Validation pass ──
	const allErrors: string[] = []

	for (let i = 0; i < generators.length; i++) {
		const gen = generators[i]
		const served = SERVED_DIRS[i]

		const errors = gen.validate()

		allErrors.push(...errors.map(e => `${served.genFile}: ${e}`))
	}

	if (allErrors.length > 0) {
		process.stderr.write(allErrors.join('\n') + '\n')
		process.exit(1)
	}

	// ── Check mode ──
	if (mode === 'check') {
		const checks = await Promise.all(
			generators.map(async g => ({ gen: g, upToDate: await g.isUpToDate() })),
		)
		const outdated = checks.filter(r => !r.upToDate).map(r => r.gen)

		if (outdated.length > 0) {
			const cmd = outdated[0].writeCommand()

			process.stderr.write(
				'The following file(s) are out of date:\n' +
					outdated.map(g => '  ' + g.genFileRelativePath()).join('\n') +
					'\n\nRun this command to regenerate:\n  ' +
					cmd +
					'\n',
			)

			process.exit(1)
		}

		process.stderr.write('All markdown import files are up to date.\n')
		process.exit(0)
	}

	// ── Write mode ──
	{
		for (const gen of generators) {
			await gen.write()

			process.stderr.write('Wrote: ' + gen.genFileRelativePath() + '\n')
		}

		process.exit(0)
	}
} catch (error) {
	process.stderr.write('Error: ' + getErrorMessage(error) + '\n')
	process.exit(1)
}
