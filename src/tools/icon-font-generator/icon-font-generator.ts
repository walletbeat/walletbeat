import { cac } from 'cac'

import { getErrorMessage } from '@/types/errors'

import { SVGFont } from './icon-font-generator-lib'

try {
	const cli = cac('icon-font-generator')

	cli
		.option('--font-name', 'Name of the font to generate')
		.option('--svg-icons-dir', 'Directory containing SVG icons, repo-root-relative')
		.option('--font-output-dir', 'Directory to output font files, repo-root-relative')
		.option('--css-output-dir', 'Directory to output CSS files, repo-root-relative')

	cli.parse(process.argv)

	const opts = cli.options as {
		fontName?: string
		svgIconsDir?: string
		fontOutputDir?: string
		cssOutputDir?: string
	}

	if (opts.fontName === undefined || opts.fontName === '') {
		throw new Error('Error: --font-name is required\n')
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
		svgIconsDir: opts.svgIconsDir,
		fontOutputDir: opts.fontOutputDir,
		cssOutputDir: opts.cssOutputDir,
	})

	if (font.isUpToDate()) {
		process.exit(0)
	}

	await font.write()
	process.stdout.write(`Icon font ${opts.fontName} generated successfully.\n`)
} catch (error) {
	process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
	process.exit(1)
}
