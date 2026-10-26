/**
 * @typedef {{frames: number[], longTasks: {startTime:number,duration:number,name:string,attribution:{name:string,containerType:string,containerName:string}[]}[],scrolls:{time:number,top:number}[],stopped:boolean,instrumentation:string,profileStart?:number}} PerformanceCapture
 * @typedef {{name?:string,cat?:string,ts?:number,dur?:number,args?:unknown,pid?:number,ph?:string,id?:unknown,id2?:unknown,scope?:unknown}} TraceEvent
 */
export function installPerformanceObservation() {
	/** @type {PerformanceCapture} */
	const capture = {
		frames: [],
		longTasks: [],
		scrolls: [],
		stopped: false,
		instrumentation:
			'Test-only rAF sampler, passive scroll listener and PerformanceObserver; overhead is included in observations.',
	}
	/** @param {number} timestamp */
	const sample = timestamp => {
		if (capture.stopped) {
			return
		}

		if (capture.frames.length < 30000) {
			capture.frames.push(timestamp)
		}

		requestAnimationFrame(sample)
	}

	requestAnimationFrame(sample)
	const observer =
		typeof PerformanceObserver === 'function' &&
		PerformanceObserver.supportedEntryTypes.includes('longtask')
			? new PerformanceObserver(list => {
					for (const entry of list.getEntries()) {
						capture.longTasks.push({
							startTime: entry.startTime,
							duration: entry.duration,
							name: entry.name,
							attribution:
								'attribution' in entry && entry.attribution != null
									? (() => {
											if (!Array.isArray(entry.attribution)) {
												throw new Error('Long-task attribution must be an array')
											}

											return entry.attribution.map((/** @type {unknown} */ item) => {
												if (
													!item ||
													typeof item !== 'object' ||
													!('name' in item) ||
													typeof item.name !== 'string' ||
													!('containerType' in item) ||
													typeof item.containerType !== 'string' ||
													!('containerName' in item) ||
													typeof item.containerName !== 'string'
												) {
													throw new Error('Long-task attribution requires named string fields')
												}

												return {
													name: item.name,
													containerType: item.containerType,
													containerName: item.containerName,
												}
											})
										})()
									: [],
						})
					}
				})
			: null

	observer?.observe({ type: 'longtask', buffered: true })
	document.addEventListener(
		'scroll',
		event => {
			if (event.target instanceof Element && event.target.id === 'layout') {
				capture.scrolls.push({ time: performance.now(), top: event.target.scrollTop })
			}
		},
		{ capture: true, passive: true },
	)
	const host =
		/** @type {typeof globalThis & {__walletPerformanceCapture?: PerformanceCapture}} */ (
			globalThis
		)

	host.__walletPerformanceCapture = capture
}

export function markPerformanceProfile() {
	const host =
		/** @type {typeof globalThis & {__walletPerformanceCapture?: PerformanceCapture}} */ (
			globalThis
		)
	const capture = host.__walletPerformanceCapture

	if (!capture) {
		throw new Error('Performance observation must be installed before profiling')
	}

	capture.profileStart = performance.now()
	performance.mark('wallet-page-performance-profile')
}

export function finishPerformanceObservation() {
	const host =
		/** @type {typeof globalThis & {__walletPerformanceCapture?: PerformanceCapture}} */ (
			globalThis
		)
	const capture = host.__walletPerformanceCapture

	if (!capture) {
		throw new Error('Performance observation must be installed before profiling')
	}

	capture.stopped = true
	const measuredFrames = capture.frames.filter(
		timestamp => timestamp >= (capture.profileStart ?? Infinity),
	)
	const intervals = measuredFrames
		.slice(1)
		.map((timestamp, index) => timestamp - measuredFrames[index])
	const ordered = [...intervals].sort((a, b) => a - b)

	return {
		...capture,
		measuredFrames,
		intervals,
		p95: ordered.length ? ordered[Math.ceil(ordered.length * 0.95) - 1] : null,
		framesOver33ms: intervals.filter(interval => interval > 33).length,
		timeOrigin: performance.timeOrigin,
	}
}

/** @param {unknown} trace */
export function summarizeChromeTrace(trace) {
	if (!trace || typeof trace !== 'object') {
		throw new Error('Chrome trace must be an object')
	}

	const entries = 'traceEvents' in trace ? trace.traceEvents : []

	if (!Array.isArray(entries)) {
		throw new Error('Chrome trace events must be an array')
	}

	const events = entries.map((/** @type {unknown} */ value) => {
		if (!value || typeof value !== 'object') {
			throw new Error('Chrome trace event must be an object')
		}

		const { name, cat, ts, dur, args, pid, ph, id, id2, scope } =
			/** @type {Record<string, unknown>} */ (value)

		if (
			(name !== undefined && typeof name !== 'string') ||
			(cat !== undefined && typeof cat !== 'string') ||
			(ts !== undefined && typeof ts !== 'number') ||
			(dur !== undefined && typeof dur !== 'number') ||
			(pid !== undefined && typeof pid !== 'number') ||
			(ph !== undefined && typeof ph !== 'string')
		) {
			throw new Error('Invalid Chrome trace event fields')
		}

		return { name, cat, ts, dur, args, pid, ph, id, id2, scope }
	})
	/** @type {Record<string, number>} */
	const counts = {}
	/** @type {Record<string, number>} */
	const durationMicros = {}
	const reasons = []
	/** @param {unknown} value @param {string} path @param {TraceEvent} event */
	const inspect = (value, path, event) => {
		if (!value || typeof value !== 'object') {
			return
		}

		for (const [key, entry] of Object.entries(value)) {
			/** @type {unknown} */
			const item = entry
			const itemPath = path ? path + '.' + key : key

			if (/reason|fail|unsupported|(?:not|non).?composite?/i.test(key)) {
				reasons.push({
					event: event.name,
					category: event.cat,
					timestampMicros: event.ts,
					argument: itemPath,
					value: item,
				})
			}

			if (item && typeof item === 'object') {
				inspect(item, itemPath, event)
			}
		}
	}

	for (const event of events) {
		if (
			typeof event.name === 'string' &&
			/Layout|Paint|Composite|Animation|Raster|Frame|Commit|Draw|Scroll/i.test(event.name ?? '')
		) {
			counts[event.name] = (counts[event.name] ?? 0) + 1

			if (typeof event.dur === 'number' && Number.isFinite(event.dur)) {
				durationMicros[event.name] = (durationMicros[event.name] ?? 0) + event.dur
			}
		}

		inspect(event.args, '', event)
	}

	/** @typedef {{identity:string, starts:{timestampMicros:number,data:unknown}[], reports:{timestampMicros:number,flags:unknown}[], endTimestampMicros:number|null}} AnimationLifetime */
	/** @type {AnimationLifetime[]} */
	const actors = []
	/** @type {Map<string, AnimationLifetime>} */
	const active = new Map()
	let unattributedAnimationEvents = 0

	// Trace batches can arrive out of timestamp order; stable ties retain capture order.
	for (const event of events
		.filter(event => event.name === 'Animation')
		.sort((a, b) => (a.ts ?? Infinity) - (b.ts ?? Infinity))) {
		const scoped = event.id2 && typeof event.id2 === 'object' ? event.id2 : null
		const local = scoped && 'local' in scoped ? scoped.local : event.id
		const global = scoped && 'global' in scoped ? scoped.global : undefined
		/** @param {unknown} value */
		const validId = value =>
			typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))
		const scope = event.scope === undefined ? '' : event.scope

		if (typeof scope !== 'string') {
			unattributedAnimationEvents++
			continue
		}

		const identity = validId(global)
			? JSON.stringify(['global', global, scope])
			: validId(local) && typeof event.pid === 'number' && Number.isFinite(event.pid)
				? JSON.stringify(['local', event.pid, local, scope])
				: null

		if (identity === null || typeof event.ts !== 'number' || !Number.isFinite(event.ts)) {
			unattributedAnimationEvents++
			continue
		}

		let actor = active.get(identity)

		if (event.ph === 'b' || !actor) {
			if (actor) {
				actor.endTimestampMicros = event.ts
			}

			actor = { identity, starts: [], reports: [], endTimestampMicros: null }
			actors.push(actor)
			active.set(identity, actor)
		}

		const args = event.args && typeof event.args === 'object' ? event.args : null
		const data = args && 'data' in args ? args.data : undefined

		if (event.ph === 'b') {
			actor.starts.push({ timestampMicros: event.ts, data })
		}

		if (data && typeof data === 'object' && 'compositeFailed' in data) {
			actor.reports.push({ timestampMicros: event.ts, flags: data.compositeFailed })
		}

		if (event.ph === 'e') {
			actor.endTimestampMicros = event.ts
			active.delete(identity)
		}
	}

	return {
		totalEvents: events.length,
		counts,
		durationMicros,
		reasons,
		animationCompositing: { actors, unattributedAnimationEvents },
		interpretation:
			'Native Chrome event names and reason fields are retained verbatim. Zero flags are neutral reports; each actor entry is one timestamp-ordered tracking lifetime, retaining native begin data; entries without starts have unresolved ownership. Missing reason events do not certify compositor-only execution; event availability depends on the actual browser build and trace categories.',
	}
}
