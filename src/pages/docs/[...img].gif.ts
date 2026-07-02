import { staticMarkdownMedia } from '@/utils/markdown-page-utils'

export const { prerender, getStaticPaths, GET } = staticMarkdownMedia({
	imageDir: '/resources/docs',
	extension: 'gif',
})
