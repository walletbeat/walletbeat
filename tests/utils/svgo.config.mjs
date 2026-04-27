/**
 * @type {import('svgo').Config}
 */
export default {
	multipass: true,
	plugins: [
		{
			name: 'preset-default',
		},
	],
	js2svg: {
		indent: 0,
		pretty: false,
		eol: 'lf',
		finalNewline: false,
		useShortTags: true,
	},
}
