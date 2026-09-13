import { cac } from 'cac'

import { wbIconEmojiSequences } from '@/styles/wbicons'
import { getErrorMessage } from '@/types/errors'

import { SVGFont } from './icon-font-generator-lib'

try {
	const cli = cac('icon-font-generator')

	cli
		.option('--font-name', 'Name of the font to generate')
		.option('--font-type-name', 'Name of the icon TypeScript type to generate')
		.option(
			'--variants <variants>',
			'Comma-separated list of font variant suffixes (e.g. "complex")',
		)
		.option(
			'--svg-icons-dir',
			'Base directory containing per-variant SVG icon subdirectories, repo-root-relative',
		)
		.option(
			'--font-output-dir',
			'Base directory to output per-variant font files, repo-root-relative',
		)
		.option('--css-output-dir', 'Directory to output CSS files, repo-root-relative')
		.option('--force', 'Force regeneration even if up to date', { default: false })

	cli.parse(process.argv)

	const opts = cli.options as {
		fontName?: string
		fontTypeName?: string
		variants?: string
		svgIconsDir?: string
		fontOutputDir?: string
		cssOutputDir?: string
		force?: boolean
	}

	if (opts.fontName === undefined || opts.fontName === '') {
		throw new Error('Error: --font-name is required\n')
	}

	if (opts.fontTypeName === undefined || opts.fontTypeName === '') {
		throw new Error('Error: --font-type-name is required\n')
	}

	const variants = (opts.variants ?? '')
		.split(',')
		.map(variant => variant.trim())
		.filter(variant => variant !== '')

	if (variants.length === 0) {
		throw new Error('Error: --variants must be a non-empty comma-separated list of variant names\n')
	}

	if (opts.svgIconsDir === undefined || opts.svgIconsDir === '') {
		throw new Error('Error: --svg-icons-dir is required\n')
	}

	if (opts.fontOutputDir === undefined || opts.fontOutputDir === '') {
		throw new Error('Error: --font-output-dir is required\n')
	}

	if (opts.cssOutputDir === undefined || opts.cssOutputDir === '') {
		throw new Error('Error: --css-output-dir is required\n')
	}

	const font = await SVGFont.create({
		fontName: opts.fontName,
		variants,
		fontTypeName: opts.fontTypeName,
		svgIconsDir: opts.svgIconsDir,
		fontOutputDir: opts.fontOutputDir,
		cssOutputDir: opts.cssOutputDir,
		iconUnicodeSequences: opts.fontName === 'wbicons' ? wbIconEmojiSequences : null,
	})

	if ((opts.force === undefined || !opts.force) && font.isUpToDate()) {
		process.exit(0)
	}

	await font.write()
	process.stdout.write(`Icon font ${opts.fontName} generated successfully.\n`)
} catch (error) {
	process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
	process.exit(1)
}
