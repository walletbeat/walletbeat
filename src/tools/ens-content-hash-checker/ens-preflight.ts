import { parseArgs } from 'node:util'

import { Address, RpcTransport } from 'ox'

import { getErrorMessage } from '@/types/errors'

import { checkEnsReadiness } from './ens-preflight-lib'

try {
	const { values, positionals } = parseArgs({
		options: { 'rpc-url': { type: 'string' }, updater: { type: 'string' } },
		allowPositionals: true,
	})
	const domain = positionals[1]

	if (
		positionals[0] !== 'check' ||
		positionals.length !== 2 ||
		domain === undefined ||
		values['rpc-url'] === undefined ||
		values.updater === undefined
	) {
		throw new Error(
			'Usage: ens-preflight check <domain> --rpc-url <url> --updater <public-address>',
		)
	}

	const result = await checkEnsReadiness(
		RpcTransport.fromHttp(values['rpc-url'], { timeout: 15_000 }),
		domain,
		Address.from(values.updater),
	)

	process.stdout.write(
		`${domain}: authorized setter=${result.call.data.slice(0, 10)} gas=${result.gas}; simulation only.\n`,
	)
} catch (error) {
	process.stderr.write(`ENS readiness failed: ${getErrorMessage(error)}\n`)
	process.exitCode = 1
}
