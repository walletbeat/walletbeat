import { writeFileSync } from 'node:fs'

import { cac } from 'cac'
import { Hex, RpcTransport } from 'ox'

import { getErrorMessage } from '@/types/errors'

import { SubmissionError, updateEnsContentHash } from './ens-update-lib'

const cli = cac('ens-update')

cli
	.command('update <domain> <cid>', 'Update and verify an ENS content-hash')
	.option('--rpc-url <url>', 'Ethereum mainnet RPC endpoint')
	.option('--pending-rpc-url <url>', 'Execution RPC for the pending-nonce guard')
	.action(
		async (domain: string, cid: string, options: { rpcUrl?: string; pendingRpcUrl?: string }) => {
			try {
				const privateKey = process.env.OMNIPIN_PK

				if (!Hex.validate(privateKey) || Hex.size(privateKey) !== 32) {
					throw new Error('A 32-byte OMNIPIN_PK is required.')
				}

				if (options.rpcUrl === undefined) {
					throw new Error('Missing RPC URL.')
				}

				const stateFile = process.env.ENS_TRANSACTION_STATE_FILE

				if (stateFile === undefined) {
					throw new Error('Missing ENS transaction state file.')
				}

				await updateEnsContentHash(
					RpcTransport.fromHttp(options.rpcUrl, { timeout: 15_000 }),
					domain,
					cid,
					privateKey,
					hash => {
						writeFileSync(stateFile, `${hash}\n`, { mode: 0o600 })
					},
					RpcTransport.fromHttp(options.pendingRpcUrl ?? options.rpcUrl, { timeout: 15_000 }),
				)
			} catch (error) {
				process.stderr.write(`${getErrorMessage(error)}\n`)
				process.exitCode = error instanceof SubmissionError ? 2 : 1
			}
		},
	)

cli.help()

try {
	cli.parse()
} catch (error) {
	process.stderr.write(`${getErrorMessage(error)}\n`)
	process.exitCode = 1
}
