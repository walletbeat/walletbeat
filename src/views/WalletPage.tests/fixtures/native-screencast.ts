import type { CDPSession } from '@playwright/test'

export type NativeFrame = {
	data: string
	metadata: {
		timestamp?: number
		deviceWidth?: number
		deviceHeight?: number
		pageScaleFactor?: number
		offsetTop?: number
	}
	sessionId: number
}

export function createNativeScreencast(
	cdp: CDPSession,
	viewport: { width: number; height: number },
	frames: NativeFrame[],
	errors: string[],
) {
	const acknowledgements: Promise<unknown>[] = []
	let resolveFirst: () => void = () => {}
	let rejectFirst: (error: unknown) => void = () => {}
	let received = false
	let timer: ReturnType<typeof setTimeout> | undefined
	const firstFrame = new Promise<void>((resolve, reject) => {
		resolveFirst = resolve
		rejectFirst = reject
	})

	// start() can reject before a consumer reaches its firstFrame await.
	void firstFrame.catch(() => {})
	const receive = (frame: NativeFrame) => {
		frames.push(frame)
		received = true
		clearTimeout(timer)
		resolveFirst()
		acknowledgements.push(
			cdp
				.send('Page.screencastFrameAck', { sessionId: frame.sessionId })
				.catch(error => errors.push(String(error))),
		)
	}

	cdp.on('Page.screencastFrame', receive)

	return {
		firstFrame,
		acknowledgements,
		async start() {
			try {
				await cdp.send('Page.startScreencast', {
					format: 'png',
					everyNthFrame: 1,
					maxWidth: viewport.width,
					maxHeight: viewport.height,
				})

				if (!received) {
					timer = setTimeout(() => rejectFirst(Error('No pre-input native frame')), 3000)
				}
			} catch (error) {
				rejectFirst(error)
				throw error
			}
		},
		dispose() {
			clearTimeout(timer)

			if (!received) {
				rejectFirst(Error('Native screencast disposed before its first frame'))
			}

			cdp.off('Page.screencastFrame', receive)
		},
	}
}
