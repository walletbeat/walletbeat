import { cac } from 'cac'

import { getErrorMessage } from '@/types/errors'

import { ensPointsToCid, readEnsContentHashCid } from './ens-content-hash-checker-lib'

/**
 * CLI for checking whether an ENS domain already points at a given IPFS CID.
 */
const cli = cac('ens-content-hash-check')

cli
	.command('check <domain> <cid>', 'Check whether an ENS domain points at a CID')
	.option('--rpc-url <url>', 'Ethereum RPC endpoint to query (defaults to a public RPC)')
	.option('--timeout <seconds>', 'Timeout for RPC requests in seconds (defaults to 60)')
	.action(async (domain: string, cid: string, options: { rpcUrl?: string; timeout?: string }) => {
		try {
			const rpcUrl = options.rpcUrl ?? 'https://ethereum-rpc.publicnode.com'
			const timeoutMs = Number(options.timeout ?? '60') * 1000

			if (await ensPointsToCid(rpcUrl, domain, cid, timeoutMs)) {
				process.stdout.write(`match\t${cid}\n`)

				return
			}

			const currentCid = await readEnsContentHashCid(rpcUrl, domain, timeoutMs)

			process.stdout.write(`no-match\t${currentCid ?? ''}\t${cid}\n`)
		} catch (error) {
			process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
			process.exit(1)
		}
	})

cli.help()

try {
	cli.parse()
} catch (error) {
	process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
	process.exit(1)
}
