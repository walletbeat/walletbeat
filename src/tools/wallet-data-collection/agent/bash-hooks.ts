/**
 * Pre-run / post-run hooks around the `bash` tool.
 */
import type { BashOperations } from '@earendil-works/pi-coding-agent'

/**
 * The `options` the pre-hook may rewrite before execution. `onData` is managed by
 * the hook wrapper, so it is omitted here.
 */
export type BashOperationsOptions = Omit<Parameters<BashOperations['exec']>[2], 'onData'>

/** Result of the bash pre-run hook. */
export interface BashPreHookResult<T extends object> {
	/** The command line to actually execute. */
	command: string
	/** The rewritten options to actually execute. */
	options?: BashOperationsOptions
	/** Arbitrary data carried through to the post-run hook. */
	data: T
}

/** Runs before the bash tool executes a command; may rewrite the command line. May be
 * async (e.g. to snapshot files via an async crawler). */
export type BashPreHook<T extends object> = (
	command: string,
	options?: BashOperationsOptions,
) => BashPreHookResult<T> | Promise<BashPreHookResult<T>>

/** Context passed to the bash post-run hook. */
interface BashPostHookContext<T extends object> {
	/** Data produced by the pre-run hook. */
	preData: T
	/** The command output produced by the (possibly rewritten) command. */
	output: string
	/** Exit code of the command, or null if it was killed. */
	exitCode: number | null
}

/** Optional result of the bash post-run hook. */
export interface BashPostHookResult {
	/** Replacement output. When omitted, the original output is kept. */
	output?: string
}

/**
 * Runs after the bash tool executes a command. Receives the pre-hook data and the
 * command output. May throw to fail the tool call, or return `{ output }` to replace
 * the output the model sees. May be async (e.g. to perform file I/O or validation).
 */
export type BashPostHook<T extends object> = (
	context: BashPostHookContext<T>,
) => BashPostHookResult | void | Promise<BashPostHookResult | void>

/** Wrap a base {@link BashOperations} with a pre/post hook pair. */
export function createHookBashOperations<T extends object>(
	base: BashOperations,
	pre: BashPreHook<T>,
	post: BashPostHook<T>,
): BashOperations {
	return {
		exec: async (command, cwd, options) => {
			const preResult = await pre(command, options)
			const modifiedCommand = preResult.command
			const preData = preResult.data

			// Buffer the command output so the post-hook can inspect (and rewrite) it in
			// full before the model sees it.
			let rawOutput = ''

			const result = await base.exec(modifiedCommand, cwd, {
				...preResult.options,
				onData: data => {
					rawOutput += data.toString()
				},
			})

			const postResult = await post({ preData, output: rawOutput, exitCode: result.exitCode })
			const finalOutput = postResult?.output ?? rawOutput

			options.onData(Buffer.from(finalOutput))

			return result
		},
	}
}
