import { expect, it } from 'vitest'

import { summarizeChromeTrace } from './browser/performance-observation.mjs'

it('retains native animation ownership across process-local IDs and missing capture boundaries', () => {
	const traceEvents = [
		{
			name: 'Animation',
			pid: 10,
			id2: { local: '0x1' },
			ph: 'n',
			ts: 3,
			args: { data: { compositeFailed: 80 } },
		},
		{
			name: 'Animation',
			pid: 20,
			id2: { local: '0x1' },
			ph: 'b',
			ts: 1,
			args: { data: { displayName: 'other', nodeId: 22 } },
		},
		{
			name: 'Animation',
			pid: 10,
			id2: { local: '0x1' },
			ph: 'b',
			ts: 2,
			args: { data: { displayName: 'marker', nodeId: 11 } },
		},
		{
			name: 'Animation',
			pid: 10,
			id2: { local: 'late' },
			ph: 'n',
			ts: 4,
			args: { data: { compositeFailed: 16 } },
		},
		{ name: 'Animation', pid: 10, ph: 'n', ts: 5, args: { data: { compositeFailed: 64 } } },
		{
			name: 'Animation',
			pid: 10,
			id: 'legacy',
			ph: 'b',
			ts: 6,
			args: { data: { displayName: 'legacy' } },
		},
		{
			name: 'Animation',
			pid: 10,
			id2: { global: 'shared' },
			ph: 'b',
			ts: 7,
			args: { data: { displayName: 'global' } },
		},
		{
			name: 'Animation',
			pid: 20,
			id2: { global: 'shared' },
			ph: 'n',
			ts: 8,
			args: { data: { compositeFailed: 8 } },
		},
		{
			name: 'Animation',
			pid: 20,
			id2: { local: '0x1' },
			ph: 'n',
			ts: 9,
			args: { data: { compositeFailed: 0 } },
		},
		{
			name: 'Animation',
			pid: 10,
			id2: { local: '0x1' },
			ph: 'b',
			ts: 10,
			args: { data: { displayName: 'restarted', nodeId: 33 } },
		},
	]
	const summary = summarizeChromeTrace({ traceEvents })
	const actors = summary.animationCompositing.actors

	expect(actors.find(actor => actor.identity === '10:0x1')).toEqual({
		identity: '10:0x1',
		starts: [
			{ timestampMicros: 2, data: { displayName: 'marker', nodeId: 11 } },
			{ timestampMicros: 10, data: { displayName: 'restarted', nodeId: 33 } },
		],
		reports: [{ timestampMicros: 3, flags: 80 }],
	})
	expect(actors.find(actor => actor.identity === '20:0x1')?.reports).toEqual([
		{ timestampMicros: 9, flags: 0 },
	])
	expect(actors.find(actor => actor.identity === '10:late')?.starts).toEqual([])
	expect(actors.find(actor => actor.identity === '10:legacy')?.starts).toHaveLength(1)
	expect(actors.find(actor => actor.identity === 'global:shared')?.reports).toEqual([
		{ timestampMicros: 8, flags: 8 },
	])
	expect(summary.animationCompositing.unattributedAnimationEvents).toBe(1)
	expect(summary.reasons).toHaveLength(5)
	expect(summary.interpretation).toContain('Missing reason events do not certify')
})
