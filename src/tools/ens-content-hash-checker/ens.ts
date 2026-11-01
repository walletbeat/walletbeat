import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

import { Address, Hex, RpcTransport } from 'ox'

import { getErrorMessage } from '@/types/errors'

import { checkEnsReadiness } from './ens-preflight-lib'
import { SubmissionError, updateEnsContentHash } from './ens-update-lib'

try {
	const { values, positionals } = parseArgs({
		options: {
			'rpc-url': { type: 'string' },
			'pending-rpc-url': { type: 'string' },
			updater: { type: 'string' },
		},
		allowPositionals: true,
	})
	const [command, domain, cid] = positionals

	if (domain === undefined || values['rpc-url'] === undefined) {
		throw new Error('Domain and RPC URL are required.')
	}

	const transport = RpcTransport.fromHttp(values['rpc-url'], { timeout: 15_000 })

	if (command === 'check' && positionals.length === 2 && values.updater !== undefined) {
		const result = await checkEnsReadiness(transport, domain, Address.from(values.updater))

		process.stdout.write(
			`${domain}: authorized setter=${result.call.data.slice(0, 10)} gas=${result.gas}; simulation only.\n`,
		)
	} else if (command === 'update' && positionals.length === 3 && cid !== undefined) {
		const privateKey = process.env.OMNIPIN_PK
		const stateFile = process.env.ENS_TRANSACTION_STATE_FILE

		if (!Hex.validate(privateKey) || Hex.size(privateKey) !== 32) {
			throw new Error('A 32-byte OMNIPIN_PK is required.')
		}

		if (stateFile === undefined) {
			throw new Error('Missing ENS transaction state file.')
		}

		await updateEnsContentHash(
			transport,
			domain,
			cid,
			privateKey,
			hash => writeFileSync(stateFile, `${hash}\n`, { mode: 0o600 }),
			RpcTransport.fromHttp(values['pending-rpc-url'] ?? values['rpc-url'], { timeout: 15_000 }),
		)
	} else {
		throw new Error(
			'Usage: ens check <domain> --updater <public-address> or ens update <domain> <cid>, with --rpc-url <url>',
		)
	}
} catch (error) {
	process.stderr.write(`${getErrorMessage(error)}\n`)
	process.exitCode = error instanceof SubmissionError ? 2 : 1
}
