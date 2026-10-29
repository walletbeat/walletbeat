import postcss from 'prettier/plugins/postcss.mjs'

export default {
	...postcss,
	printers: {
		...postcss.printers,
		postcss: {
			...postcss.printers.postcss,
			print(path, options, print) {
				return postcss.printers.postcss.print(
					path,
					path.node.type === 'selector-attribute' ? { ...options, singleQuote: false } : options,
					print,
				)
			},
		},
	},
}
