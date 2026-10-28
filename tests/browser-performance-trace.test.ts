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

	expect(actors.find(actor => actor.identity === JSON.stringify(['local', 10, '0x1', '']))).toEqual(
		{
			identity: JSON.stringify(['local', 10, '0x1', '']),
			starts: [{ timestampMicros: 2, data: { displayName: 'marker', nodeId: 11 } }],
			reports: [{ timestampMicros: 3, flags: 80 }],
			endTimestampMicros: 10,
		},
	)
	expect(
		actors.find(actor => actor.identity === JSON.stringify(['local', 20, '0x1', '']))?.reports,
	).toEqual([{ timestampMicros: 9, flags: 0 }])
	expect(
		actors.find(actor => actor.identity === JSON.stringify(['local', 10, 'late', '']))?.starts,
	).toEqual([])
	expect(
		actors.find(actor => actor.identity === JSON.stringify(['local', 10, 'legacy', '']))?.starts,
	).toHaveLength(1)
	expect(
		actors.find(actor => actor.identity === JSON.stringify(['global', 'shared', '']))?.reports,
	).toEqual([{ timestampMicros: 8, flags: 8 }])
	expect(summary.animationCompositing.unattributedAnimationEvents).toBe(1)
	expect(summary.reasons).toHaveLength(5)
	expect(summary.interpretation).toContain('Missing reason events do not certify')
})

it('separates reused tracking lifetimes, gaps and explicit scopes in timestamp order', () => {
	const event = (ts: number, ph: string, data?: Record<string, unknown>, scope?: string) => ({
		name: 'Animation',
		pid: 10,
		id2: { local: 'reused' },
		ts,
		ph,
		args: { data },
		scope,
	})
	const traceEvents = [
		event(1, 'n', { compositeFailed: 1 }),
		event(2, 'b', { id: 'native-a', nodeId: 100 }),
		event(3, 'n', { compositeFailed: 2 }),
		event(4, 'e'),
		event(5, 'n', { compositeFailed: 4 }),
		event(6, 'b', { id: 'native-b', nodeId: 200 }),
		event(7, 'n', { compositeFailed: 8 }),
		event(8, 'b', { id: 'native-c', nodeId: 300 }),
		event(9, 'n', { compositeFailed: 16 }),
		event(2, 'b', { id: 'scoped', nodeId: 400 }, 'independent'),
		event(9, 'n', { compositeFailed: 32 }, 'independent'),
	]
	const summary = summarizeChromeTrace({ traceEvents: [...traceEvents].reverse() })
	const actors = summary.animationCompositing.actors

	expect(
		actors
			.filter(actor => actor.identity === JSON.stringify(['local', 10, 'reused', '']))
			.map(actor => ({
				starts: actor.starts.map(start => start.data),
				flags: actor.reports.map(report => report.flags),
				end: actor.endTimestampMicros,
			})),
	).toEqual([
		{ starts: [], flags: [1], end: 2 },
		{ starts: [{ id: 'native-a', nodeId: 100 }], flags: [2], end: 4 },
		{ starts: [], flags: [4], end: 6 },
		{ starts: [{ id: 'native-b', nodeId: 200 }], flags: [8], end: 8 },
		{ starts: [{ id: 'native-c', nodeId: 300 }], flags: [16], end: null },
	])
	expect(
		actors.find(actor => actor.identity === JSON.stringify(['local', 10, 'reused', 'independent']))
			?.reports,
	).toEqual([{ timestampMicros: 9, flags: 32 }])
	const orderedActors = summarizeChromeTrace({ traceEvents }).animationCompositing.actors

	expect(
		orderedActors.filter(actor => actor.identity === JSON.stringify(['local', 10, 'reused', ''])),
	).toEqual(actors.filter(actor => actor.identity === JSON.stringify(['local', 10, 'reused', ''])))
})

it('keeps reports without timestamps out of owned lifetimes', () => {
	const summary = summarizeChromeTrace({
		traceEvents: [
			{
				name: 'Animation',
				pid: 1,
				id: 'a',
				ph: 'b',
				ts: 1,
				args: { data: { id: 'native', nodeId: 4 } },
			},
			{ name: 'Animation', pid: 1, id: 'a', ph: 'n', args: { data: { compositeFailed: 8 } } },
		],
	})

	expect(summary.animationCompositing.actors[0].reports).toEqual([])
	expect(summary.animationCompositing.unattributedAnimationEvents).toBe(1)
	expect(summary.reasons).toHaveLength(1)
})

it('preserves delimiter, native ID type and scope identity without merging invalid scopes', () => {
	const event = (ts: number, ph: string, id: string | number, scope?: unknown) => ({
		name: 'Animation',
		pid: 10,
		id2: { local: id },
		scope,
		ts,
		ph,
		args: { data: ph === 'b' ? { id: ts, nodeId: ts } : { compositeFailed: ts } },
	})
	const summary = summarizeChromeTrace({
		traceEvents: [
			event(1, 'b', 'a:b'),
			event(2, 'b', 'a', 'b'),
			event(3, 'n', 'a:b'),
			event(4, 'n', 'a', 'b'),
			event(5, 'b', 1),
			event(6, 'b', '1'),
			event(7, 'n', 1),
			event(8, 'n', '1'),
			event(9, 'n', 'a:b', {}),
		],
	})

	expect(
		summary.animationCompositing.actors.map(actor => ({
			identity: actor.identity,
			flags: actor.reports.map(report => report.flags),
			end: actor.endTimestampMicros,
		})),
	).toEqual([
		{ identity: JSON.stringify(['local', 10, 'a:b', '']), flags: [3], end: null },
		{ identity: JSON.stringify(['local', 10, 'a', 'b']), flags: [4], end: null },
		{ identity: JSON.stringify(['local', 10, 1, '']), flags: [7], end: null },
		{ identity: JSON.stringify(['local', 10, '1', '']), flags: [8], end: null },
	])
	expect(summary.animationCompositing.unattributedAnimationEvents).toBe(1)
})

it('keeps aggregate rendering work separate from the longest completed pass', () => {
	const summary = summarizeChromeTrace({
		traceEvents: [
			{ name: 'Layout', ph: 'X', ts: 1, dur: 3000 },
			{ name: 'Layout', ph: 'X', ts: 4, dur: 5000 },
			{ name: 'Layout', ph: 'b', ts: 9, dur: 100000 },
			{ name: 'Paint', ph: 'X', ts: 10, dur: 2000 },
		],
	})

	expect(summary.durationMicros).toEqual({ Layout: 8000, Paint: 2000 })
	expect(summary.maxDurationMicros).toEqual({ Layout: 5000, Paint: 2000 })
})
