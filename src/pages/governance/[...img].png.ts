import { staticMarkdownMedia } from '@/utils/markdown-page-utils'

export const { prerender, getStaticPaths, GET } = staticMarkdownMedia({
	imageDir: '/governance',
	extension: 'png',
})
