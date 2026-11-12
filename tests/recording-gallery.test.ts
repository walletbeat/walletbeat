import { expect, it } from 'vitest'

import { projectName, validateMetadata } from './browser/recording-gallery.mjs'
import matrix from './browser/recording-matrix.json' with { type: 'json' }

// These fixtures exercise rejection only; native files, decoding and acceptance
// remain the recording-gallery CLI's independent runtime obligations.
function rejectionFixture() {
	const source = { revision: 'fixture', diffHash: 'fixture', untrackedHash: 'fixture', build: {} }
	const records = new Map(
		matrix.map(cell => [
			projectName(cell),
			{
				source,
				video: 'not-a-native-video',
				frame: Buffer.alloc(0),
				provenance: {
					...cell,
					source,
					engineVersion: '1.2.3',
					nativeInput: true,
					nativeCursorCaptured: false,
					cursorOverlay: 'computed CSS cursor: pointer, text, default',
					media: {
						dark: cell.theme === 'dark',
						reducedTransparency: cell.transparency === 'reduce',
					},
					transparencyEmulationAvailable: cell.engine !== 'webkit',
					actions:
						cell.scenario === 'linear'
							? [{ type: 'wheel', value: 400 }]
							: ['toc', 'heading', 'pie', 'toc', 'heading', 'pie'].map(type => ({
									type,
									value: '#fixture',
								})),
				},
			},
		]),
	)
	const tests = matrix.map(cell => ({
		projectName: projectName(cell),
		expectedStatus: 'passed',
		status: 'expected',
		results: [{ status: 'passed', errors: [], retry: 0 }],
	}))

	return {
		source,
		records,
		report: { errors: [], suites: [{ specs: [{ title: 'recording native journey', tests }] }] },
		tests,
	}
}

it('rejects missing, duplicate, failed and retried matrix cells', () => {
	for (const mutate of [
		(fixture: ReturnType<typeof rejectionFixture>) => fixture.tests.pop(),
		(fixture: ReturnType<typeof rejectionFixture>) => {
			fixture.tests[0].projectName = fixture.tests[1].projectName
		},
		(fixture: ReturnType<typeof rejectionFixture>) => {
			fixture.tests[0].results[0].status = 'failed'
		},
		(fixture: ReturnType<typeof rejectionFixture>) => {
			fixture.tests[0].results[0].retry = 1
		},
	]) {
		const fixture = rejectionFixture()

		mutate(fixture)
		expect(() =>
			validateMetadata(fixture.report, matrix, fixture.source, fixture.records),
		).toThrow()
	}
})

it('rejects stale source, wrong matrix metadata, missing versions and dishonest capture declarations', () => {
	for (const mutate of [
		(
			record: ReturnType<typeof rejectionFixture>['records'] extends Map<unknown, infer Record>
				? Record
				: never,
		) => {
			record.source = { ...record.source, revision: 'stale' }
		},
		(
			record: ReturnType<typeof rejectionFixture>['records'] extends Map<unknown, infer Record>
				? Record
				: never,
		) => {
			record.provenance.width = -1
		},
		(
			record: ReturnType<typeof rejectionFixture>['records'] extends Map<unknown, infer Record>
				? Record
				: never,
		) => {
			record.provenance.engineVersion = ''
		},
		(
			record: ReturnType<typeof rejectionFixture>['records'] extends Map<unknown, infer Record>
				? Record
				: never,
		) => {
			record.provenance.nativeInput = false
		},
		(
			record: ReturnType<typeof rejectionFixture>['records'] extends Map<unknown, infer Record>
				? Record
				: never,
		) => {
			record.provenance.nativeCursorCaptured = true
		},
		(
			record: ReturnType<typeof rejectionFixture>['records'] extends Map<unknown, infer Record>
				? Record
				: never,
		) => {
			record.provenance.media.dark = !record.provenance.media.dark
		},
	]) {
		const fixture = rejectionFixture()

		const record = fixture.records.values().next().value

		if (record === undefined) {
			throw new Error('Rejection fixture must contain a recording')
		}

		mutate(record)
		expect(() =>
			validateMetadata(fixture.report, matrix, fixture.source, fixture.records),
		).toThrow()
	}
})
