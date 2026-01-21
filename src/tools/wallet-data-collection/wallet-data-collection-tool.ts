/**
 * Wallet data collection CLI utility. See README.md for usage information.
 *
 */
import cac from 'cac'

import { variantEnum } from '@/schema/variants'
import { WalletType, walletTypes } from '@/schema/wallet-types'

import { recordedFlow } from './wallet-capture-file'
import {
	captureOptions,
	deleteCaptureOptions,
	explainRequestOptions,
	globalOptions,
	handleCapture,
	handleCheck,
	handleDeleteCapture,
	handleExplainRequest,
	handleMarkDomain,
	handleMarkFlowUnsupported,
	handleMarkString,
	markDomainOptions,
	markFlowUnsupportedOptions,
	markStringOptions,
} from './wallet-data-collection-lib'

// ============================================================================
// CLI Definition
// ============================================================================

const cli = cac('wallet-data-collection')

// Global options
cli
	.option('--id <wallet_id>', 'ID of the wallet (must already exist in Walletbeat)')
	.option('--variant <variant>', `Variant of the wallet: ${variantEnum.items.join(', ')}`)
	.option('--type <type>', `Type of wallet: ${walletTypes.items.join(', ')}`, {
		default: WalletType.SOFTWARE,
	})

// capture subcommand
cli
	.command('capture', 'Capture network traffic for a specific flow')
	.option('--flow <flow>', `Flow to capture: ${recordedFlow.items.join(', ')}`)
	.option('--wallet-addresses <addresses>', 'Wallet addresses being used (comma-separated)')
	.option('--port <port>', 'mitmproxy port', { default: 8080 })
	.example(
		"  $ pnpm wallet-data-collection --id='metamask' --variant='BROWSER' capture --flow='IDLE_PRE_INSTALL'",
	)
	.example(
		"  $ pnpm wallet-data-collection --id='metamask' --variant='BROWSER' capture --flow='SEND_ETHER' --wallet-addresses='0x123...,0x456...'",
	)
	.action(async options => {
		await handleCapture(captureOptions.process(options))
	})

// delete-capture subcommand
cli
	.command('delete-capture', 'Delete network traffic from a specific session')
	.option('--session <session ID>', 'session ID')
	.example(
		"  $ pnpm wallet-data-collection --id='metamask' --variant='BROWSER' delete-capture --session=42",
	)
	.action(async options => {
		await handleDeleteCapture(deleteCaptureOptions.process(options))
	})

// check subcommand
cli
	.command('check', 'Examine capture file and flag missing information needing triage')
	.example("  $ pnpm wallet-data-collection --id='metamask' --variant='BROWSER' check")
	.action(async options => {
		await handleCheck(globalOptions.process(options))
	})

// mark-flow-unsupported subcommand
cli
	.command('mark-flow-unsupported', 'Mark a flow as not supported by the wallet')
	.option('--flow <flow>', `Flow to mark as unsupported: ${recordedFlow.items.join(', ')}`)
	.example(
		"  $ pnpm wallet-data-collection --id='metamask' --variant='BROWSER' mark-flow-unsupported --flow='NATIVE_SWAP'",
	)
	.action(async options => {
		await handleMarkFlowUnsupported(markFlowUnsupportedOptions.process(options))
	})

// mark-string subcommand
cli
	.command(
		'mark-string <string> <data-type>',
		'Mark a string as conveying a specific data type (or "benign")',
	)
	.example(
		"  $ pnpm wallet-data-collection --id='metamask' --variant='BROWSER' mark-string 'GA1.1.1294582759' 'tracking-identifier'",
	)
	.example(
		"  $ pnpm wallet-data-collection --id='metamask' --variant='BROWSER' mark-string '0x1234...' 'wallet-address'",
	)
	.example(
		"  $ pnpm wallet-data-collection --id='metamask' --variant='BROWSER' mark-string 'Chromium' 'benign'",
	)
	.action(async options => {
		await handleMarkString(markStringOptions.process(options))
	})

// mark-domain subcommand
cli
	.command(
		'mark-domain <domain-pattern> <entity-id>',
		'Mark a domain and its subdomains as belonging to an entity',
	)
	.example(
		"  $ pnpm wallet-data-collection --id='metamask' --variant='BROWSER' mark-domain 'infura.io' 'consensys'",
	)
	.action(async options => {
		await handleMarkDomain(markDomainOptions.process(options))
	})

// explain-request subcommand
cli
	.command(
		'explain-request --domain=example.com [--path=...] [--method=...] <purposes>',
		'Mark requests matching selectors as being done for specific purposes',
	)
	.option('--domain <domain>', 'Domain to match (required). Matches domain and subdomains.')
	.option('--path <path>', 'Path to match. Globs (*) allowed.')
	.option('--method <method>', 'JSON-RPC method to match. Globs (*) allowed.')
	.example(
		"  $ pnpm wallet-data-collection --id='metamask' --variant='BROWSER' explain-request --domain='infura.io' --method='eth_getBalance' 'CHAIN_DATA_LOOKUP'",
	)
	.example(
		"  $ pnpm wallet-data-collection --id='metamask' --variant='BROWSER' explain-request --domain='analytics.example.com' 'ANALYTICS'",
	)
	.example(
		"  $ pnpm wallet-data-collection --id='metamask' --variant='BROWSER' explain-request --domain='api.example.com' --path='/v1/swap/*' 'SWAP_QUOTE,TRANSACTION_SIMULATION'",
	)
	.action(async options => {
		await handleExplainRequest(explainRequestOptions.process(options))
	})

// Help and version
cli.help()
cli.version('0.1.0')

// Parse and handle errors
cli.parse(process.argv, { run: true })

// Show help if no command provided
if (!cli.matchedCommand && !cli.options.help && !cli.options.version) {
	cli.outputHelp()
}
