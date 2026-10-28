import { test } from '@playwright/test'

import { checkPresentation } from './presentation.mjs'

test('Playground panes retain navigation, labels and mock-provider feedback', async ({
	page,
	baseURL,
}, info) => {
	test.setTimeout(240000)

	if (!baseURL) {
		throw new Error('Playground acceptance requires a compiled site URL')
	}

	await checkPresentation(page, baseURL, info.outputDir)
})
