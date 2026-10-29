import { test } from '@playwright/test'

import { checkPresentation, checkSwitchContinuations } from './presentation.mjs'

test('Playground panes retain navigation, labels and mock-provider feedback', async ({
	page,
	baseURL,
}, info) => {
	if (!baseURL) {
		throw new Error('Playground acceptance requires a compiled site URL')
	}

	const reports = await checkPresentation(page, baseURL, info.outputDir)
	const continuations = await checkSwitchContinuations(page, baseURL)

	await info.attach('Playground action reports', {
		body: JSON.stringify({ reports, continuations }),
		contentType: 'application/json',
	})
})
