import * as crypto from 'node:crypto'
import path from 'node:path'

import { loadConfig, optimize } from 'svgo'
import { describe, expect, it } from 'vitest'

import {
	CodebaseEntryType,
	commonExclusions,
	crawlCodebase,
	getRepositoryRoot,
} from './utils/codebase'

/**
 * SHA-256 hashes of SVG files that are already verified as fully optimized.
 *
 * To add a new hash: run the test, copy the printed hash for an already-optimized
 * SVG, and add it to this map with the relative file path as the key.
 *
 * Format: "relative/path/to/file.svg": "<sha256-hex>"
 */
const optimizedSvgHashes: Record<string, string> = {
	'public/images/entities/alphabet.svg':
		'a24bde56c35e9eab29554400ebb75fb3a4cabe4c16f926e39e7529b11bb4f2da',
	'public/images/entities/apple.svg':
		'ff9e42403d737de8e433f44702d8ad23182698b587d70c2a08b91412061a840c',
	'public/images/entities/binance.svg':
		'73ea8ef4aa001815e87193e766e07711c53e7eee77da8c4d3a33253219a74e02',
	'public/images/entities/coinbase.svg':
		'3dc6fabdf014bd2c84c898f25061c1338b035a654a5085a33bc9320c763e5a2b',
	'public/images/entities/consensys.svg':
		'44959feb6557c1b5368ec530fbce0b396b951abac9e6699deef47f9eb8a13ac5',
	'public/images/entities/cyfrin.svg':
		'21fe59967163fadba08fc43d749bf1c5d47b9682dad09b6b4a3eeed173ff988b',
	'public/images/entities/daimo.svg':
		'f7c2f6ed5810c2a0490eba4edc6b174adab5a16de5289d04d79af7d85ba90925',
	'public/images/entities/debank.svg':
		'a1eadd7dfef1a2df7f06c5f6d1161b366676a990d1a9b61f4553d879a21adf85',
	'public/images/entities/firefly.svg':
		'e4f29ef5710fbe55f3e6c75fd5d66fa84ac293109a761a075bff3476d9041d0e',
	'public/images/entities/github.svg':
		'ff7a5aa89d15f318b080c0cea5294a46168a43f876df3757eebc8f88a6b99c99',
	'public/images/entities/honeycomb.svg':
		'977c823032cc2a231364aee2b2c99807070ab33e37dd6539d43b2c858d36c999',
	'public/images/entities/keycard.svg':
		'1cd090c71ddb4262dd0fbe5b49ba885b4bb8f64f8af87f80f989f0d25a1781fe',
	'public/images/entities/ledger.svg':
		'eea7485034dc71632817739927f923021c89b7f5d3c3295c9ac9be7ec73b1ee0',
	'public/images/entities/mtpelerin.svg':
		'cd22b6b4c491d2a140384dec2cdd752fd58eec6b93add208a5921073d245e727',
	'public/images/entities/uniswapLabs.svg':
		'a18c2925a3dd845d25008b6b21184e41c4974e37d9723b8331ed9e08676ab359',
	'public/images/entities/veridise.svg':
		'dc42d85f7cd9b301b9a651c1a58fa0122568d37b98037a34b0c04c6a544635f2',
	'public/images/ethereum-logo.svg':
		'f711cabcb0a956f368aaae02ccb2e9eb94e5923399e9ccd131dd1e23d697ca3b',
	'public/images/wallets/ambire.svg':
		'6f948cf0ae3177732723a00143d9870fe81108dc54a2e0bfa34ff25f9b83e738',
	'public/images/wallets/bitbox.svg':
		'6acb6bcd76238fb193ca4583b0707f68b1690751e3e46bbb7850922347510bca',
	'public/images/wallets/bitget.svg':
		'e152a09dcb2edec856e49e7ba548779a1243341d2d856f2fb34fee9d8c05b3f9',
	'public/images/wallets/cypherock.svg':
		'7e24a84745af52fa9f58562622044e087b954ae978a712d533c8e6c57ea6ed9b',
	'public/images/wallets/daimo.svg':
		'2db6b9a699150448d412a4328282ef6ebcb07afb5178f36b7cfb18414e0cba12',
	'public/images/wallets/default.svg':
		'42695ab5cb6fb3727fd39a0c0f9b29f4653fac76377f4c080476cef7af1fffba',
	'public/images/wallets/elytro.svg':
		'1a4f7a9a38e9093e68a60b4cca6e6c17e9b6b8d1813b4ea295e4c4c9a422c8b3',
	'public/images/wallets/family.svg':
		'0d3752028fcf496704c2b3e9e81b4e8ed651abcd9f19fe5f742c60ac258023b3',
	'public/images/wallets/firefly.svg':
		'e4f29ef5710fbe55f3e6c75fd5d66fa84ac293109a761a075bff3476d9041d0e',
	'public/images/wallets/frame.svg':
		'97c4b6b687e4d1854aa6b7e5367ed7b408cad385757da793f7229f549d956e15',
	'public/images/wallets/gemwallet.svg':
		'12b03ba1cf594a65093373f8d56205cab64777963428f10b925b361cb117339b',
	'public/images/wallets/gridplus.svg':
		'25e07fbb2b5580908064319cdaf057765d7731845e61496698e2f0d3f77dc156',
	'public/images/wallets/imkey.svg':
		'76ee1b87ceff067136f7aa81f9540a80bffd72f65aa80c88f6cfb0c244b9928a',
	'public/images/wallets/imtoken.svg':
		'ff157e238f8cb304d163c0318662ff5fd5b1e2c04d3a1bc274e2af11b6345c35',
	'public/images/wallets/keycard-shell.svg':
		'1cd090c71ddb4262dd0fbe5b49ba885b4bb8f64f8af87f80f989f0d25a1781fe',
	'public/images/wallets/keystone.svg':
		'f1145df94b7f8c92d3ae6a270c62896aa2c14d4cd88c446163787d1cb1fdf14b',
	'public/images/wallets/ledger.svg':
		'eea7485034dc71632817739927f923021c89b7f5d3c3295c9ac9be7ec73b1ee0',
	'public/images/wallets/metamask.svg':
		'15d3e1ebc57320688fab839d040fc7a7e4557aea9f2ce388cb4736e8ff3bc353',
	'public/images/wallets/mtpelerin.svg':
		'2ef9baac2e6b46f7144d62afae8777abf433fffa3f8cfc6d41b64e4b1a2fa52e',
	'public/images/wallets/ngrave.svg':
		'ac3d5291593158a0152f9c0b546ff31453a2ba23b308e6f8845950ad917d0351',
	'public/images/wallets/nufi.svg':
		'84b00f3f0b3286455b585970d20a25ed9e85307e8654db0cf8fa1d72cde6c5c7',
	'public/images/wallets/onekey.svg':
		'eaa530c5a51bce045785a4c81d96e7ea636956e03cfcd75890ed5a64c9c83780',
	'public/images/wallets/phantom.svg':
		'c75bed76f89f3b6fe114207b3a125593f9d3c385ef8651897ea211e1d7ac46c7',
	'public/images/wallets/pillarx.svg':
		'e2dc12e35b6c865c1b85f7c975d6b6b14901b4993c44ca0526bbf8eaa6849812',
	'public/images/wallets/rabby.svg':
		'c66cf6e2c0777c2805089c0e42645d04d4870d20545ce7f13d0c67f14c3cc93b',
	'public/images/wallets/rainbow.svg':
		'a4dff6569f4207605c3d6fe1b772d92610fdf5c6892a525f5c7b1185ea92c149',
	'public/images/wallets/safe.svg':
		'2c0111b3d8953b0a00f32a86fec4514aa0abf9d0b48d0eec730d2eadb869fba2',
	'public/images/wallets/trezor.svg':
		'54b9216a1f46c9bcb91b1bf76c14ef25b39f0a11acd20680a4c8017fab97caef',
	'public/images/wallets/uniswap-wallet.svg':
		'a18c2925a3dd845d25008b6b21184e41c4974e37d9723b8331ed9e08676ab359',
	'public/images/wallets/zerion.svg':
		'5410793b34c576acf880bb16a42e537e98e3185bb76840888ceec26f517f0fdc',
	'public/images/wallets/zeus.svg':
		'81d3248eb033216dad88005dbaca90e637709c66351ad1f5e3a6a0a65b6b051b',
	'public/logo-dark.svg': '6c03ad9b5ce0f67df71ec63bd8bd8cab727ae228245ff42be4916b32681d7583',
	'public/logo-light.svg': '71041426882663d14be10fe6cecf718a68797b9858509b0e512ab8912284314a',
	'resources/branding/icon_dark.svg':
		'e88bce5e2c9a34c9bbc169bab233ad07103f4f1409ffa93ce1e54134ff2fbbc0',
	'resources/branding/icon_light.svg':
		'27c38a5cfcd479eef565adf119c49b4251ade40d49a5a73804db8f3c36db96b0',
	'resources/branding/logo_dark.svg':
		'1724b327def6bdb066c6b47629986b0d4a83625df6399177da2e7386de4cc6b2',
	'resources/branding/logo_light.svg':
		'80cb26c313cc96082a0254e95110536f8326b5c7086e1eead8b6efd1884b28bf',
	'resources/contracts/images/Walletbeat.svg':
		'0c93bc98c4fd6e0770d5658e0860061c879457c79262ac014e49db5c6a033de6',
	'resources/files/wbicons/about.svg':
		'fc17b1d749a0607beb73edf9693139a627f09f249de091f40cd64d8a96732ee4',
	'resources/files/wbicons/account_type.svg':
		'8adcd97a6e80ce646f9fc77a619278f0be51efa19790d48d948855f6b0e552d2',
	'resources/files/wbicons/discuss.svg':
		'd368d2e22efa4711b35aa085075c628f021610482a86f9e3d7a86ec40ddb84f0',
	'resources/files/wbicons/faq.svg':
		'4dfba1047e935c829e31a91d97f5e152cdc7805576f997f0fd1a0d4ed3cca7cb',
	'resources/files/wbicons/newsletter.svg':
		'ba5765279f96c51580a982275e3a06f6e91fa6f18ad24caddcf8b4d200e05268',
	'resources/files/wbicons/repository.svg':
		'9ffcd42bb0096528573d8224b8b70466ce6581ab5a88f005904869a432548641',
	'resources/files/wbicons/wallet_browser.svg':
		'1d8755c1f94721cfdd3a3a7135d672f7bd8df7eb4768bc7449ef88c4494cd31a',
	'resources/files/wbicons/wallet_desktop.svg':
		'39f16823ea0353c7cbacd15a05d2301b9f0a05675d6ac1fd740b6f8f042b250c',
	'resources/files/wbicons/wallet_embedded.svg':
		'0fce01466e971a15acc17d4436c6d5c78638122df84680a362cd91657e168e36',
	'resources/files/wbicons/wallet_hardware.svg':
		'431845d496a7423cd634df79f7e46a1fecf8328b2420dded5f097a0fae20f62f',
	'resources/files/wbicons/wallet_mobile.svg':
		'dba5ad8b24a91d229e696dd8a5f6073731a52a057168c7d86b2154350a888544',
	'resources/files/wbicons/wallet_software.svg':
		'a6bf2a2c35af75b4b4302689160de01245e5900fceef33b98d4261975fdf7dfd',
	'resources/files/wbicons/wallet_test.svg':
		'da072830acbce4bd7b89039e3ae261f95f79e620a468eada968dcc5220c34806',
	'public/fonts/sp-monorium-dingbat.svg':
		'4e075d1a474e3c9cac32668b882f38dea406bfd0f254767a4bfad9ff9fe47e3e',
	'public/fonts/sp-monorium-regular.svg':
		'eee6e8214eed53844156f73e7e053cce6124224642fe5366a5e9f22744d2d214',
	'resources/branding/glow-0.svg':
		'5f40f64a49babed6573f5c16e39ec450eb83ef660efea7bcd30093fe19ac9a45',
	'resources/branding/glow-1.svg':
		'71e6c1520f6f9b40d189811b38f222a5381b1b01e9a281c1e55ef4941fafbed7',
	'public/wbicons/wbicons.svg': '24d1e70fade7103f00e74ccb5df9fe8a9db459cd5802b97b687de1732eb202ac',
	'resources/files/wbicons/account_abstraction.svg':
		'b6dcb0b8cc200d4e283d2d13466babf09d119dc6dac9364610d3e79018080b62',
	'resources/files/wbicons/account_portability.svg':
		'a03ec4f5172f68c2b9f50a83faef0ede7d6cced2e1e89e398a09debf9965667c',
	'resources/files/wbicons/account_recovery.svg':
		'f267b8e2944bcb4ebde7adccbc4ac575395ed4556e20f4d1d2fedc6c5ae166a0',
	'resources/files/wbicons/account_unruggability.svg':
		'1b5a44b7c0426562db05482af5c0e02dbd8a9e29bbfcd2eee31d02b9bbc1c801',
	'resources/files/wbicons/address_resolution.svg':
		'7f82eb27b6633e84e2327d38fd7d4ece1b524c37f15d373d285f40766fa45d3f',
	'resources/files/wbicons/app_isolation.svg':
		'b71c111821f6e5d07f14f3a0c32a4072ff4b6f4560041b60467c2a1cefc274ec',
	'resources/files/wbicons/browser_integration.svg':
		'06c29a2ae05e8e34cc1b32e995c465e3ede82f412660f644a64fa2d152d7affa',
	'resources/files/wbicons/chain_abstraction.svg':
		'7a2e5637c62e1a2c1fe81cc191a6a143735d90058016c840baac449efcbb089e',
	'resources/files/wbicons/chain_verification.svg':
		'bc28ceb71b51c81770ddc86264943d3fc9f4e8d6c5e69d56d3c117fa5cca2c37',
	'resources/files/wbicons/duress_resistance.svg':
		'714b6b7eb601a1d27b54dfeffe5a7efc82b444cfad936360cd0c2614354f6a91',
	'resources/files/wbicons/ecosystem.svg':
		'7580e34a8529801064757f095e24ead2be2beba9db0dc5c6699f5a7772c83284',
	'resources/files/wbicons/fee_transparency.svg':
		'e4aaa9aeca207194f7ba901ae714f0eea5cfcdc9add7e3443856052b6b7b6404',
	'resources/files/wbicons/funding_transparency.svg':
		'7e782cca7336dd1331f05d7cbdf6f960951433841516057deb7797fde29d1d19',
	'resources/files/wbicons/hardware_wallet_interoperability.svg':
		'd8bd85ecafae216de88358dd9e83d096152e4923e0d568d37006667f519b1329',
	'resources/files/wbicons/hardware_wallet_support.svg':
		'6eb3c5a03f04f3dfb7fd3c39902eafc0c1648664dc27361c40fa7a97045db5a9',
	'resources/files/wbicons/l1_provider_independence.svg':
		'a29e1c16e04d2c5592bb499086556447fdfc9df5398ba0467ac4e37f7c180fea',
	'resources/files/wbicons/multi_address_privacy.svg':
		'af3b7b87b3224b12db972c8e9d78ad667c8066fff3068c7d911e5734a99a06af',
	'resources/files/wbicons/orderflow_transparency.svg':
		'98ac991eb3e05cac4358d0f1eef1b58ef607af167290f228dceb728b8fbd0ca8',
	'resources/files/wbicons/passkey_verification.svg':
		'355d400675f850045a0a9547454c019f13568d1777b6aaf414e2096846f6ca97',
	'resources/files/wbicons/permissions_management.svg':
		'a071dc571cfcb6f009840ccdda67d35f09bf58be3c8dffc82ea0ce975339dff5',
	'resources/files/wbicons/privacy_hygiene.svg':
		'b48e2f372b01027d2b775ee4f915c2ddb8cf4403d718ab5424844a9da8781801',
	'resources/files/wbicons/privacy.svg':
		'fce9b9bfc99eae07e938f86998f9b211f4042625a840b6e60b1261244e860e5d',
	'resources/files/wbicons/private_token_transfers.svg':
		'5778e953e8e95f844ee6decad7ecd273706e67d226d9523ff43078bd2a5f1013',
	'resources/files/wbicons/question_mark.svg':
		'4e5813c58ea19dbb9ae2408af60381d1e01763fc22ac5be80e0e64d8201b1cd0',
	'resources/files/wbicons/release_process_transparency.svg':
		'dbcf7f0b7af96d7ec4c30a53e9272dc4756ea08c1ff29b363bb4d5ef6a32fe2f',
	'resources/files/wbicons/scam_prevention.svg':
		'4ce7403d410258225ecfda384b6d420e543be8fdb6b4831747f6635eff8ab5c6',
	'resources/files/wbicons/security_audits.svg':
		'c9c8321b1ad31678dace7054a74acc6b86164ef6331586e4c6eb249f1e8f58a9',
	'resources/files/wbicons/security_best_practices.svg':
		'3cfd3389315acc904c3b02a7a0c572d8db8f1a5a1bf89227ecdde8d02cfa9a70',
	'resources/files/wbicons/security.svg':
		'38bf365b832b28604f8490200e2aeafef2b23a5025e1a11014601b9f0fa14925',
	'resources/files/wbicons/self_sovereignty.svg':
		'67be234afaf1a92148d268fc7dde69eabcddd25be932f6fe09e162b119892ce1',
	'resources/files/wbicons/source_code_license.svg':
		'adf1e55fa6b50d77c72ac340d5b01f3ef5ad9aa39f9de7206eae23715a0d6427',
	'resources/files/wbicons/open_source.svg':
		'29a4ca719470edda4b0e811e5f26d122c7cc06b1c1394ddace70fbc66013a6e5',
	'resources/files/wbicons/transaction_batching.svg':
		'b520345224989151bd7db1fe21bf650a74499dd158c03b1d92c28f111b7f41af',
	'resources/files/wbicons/transaction_inclusion.svg':
		'bcbabbdb73267c6f90b1dca97a1d47f56660cca3894fc8c90d5ed00f558e35a8',
	'resources/files/wbicons/transaction_legibility.svg':
		'1f646f8810ff3dfc0ff2c0285593aa606e368beae692fcbe782eb28943476838',
	'resources/files/wbicons/transparency.svg':
		'040b8354ec132a3cea67d32ddda8dc2786ee6bee61a52ec8c1a82367ab702f00',
	'resources/files/wbicons/user_privacy.svg':
		'424ff4db5750bc5fe9759397e12c94d0bce96efc5741d09537d1338af939cc7b',
	'resources/files/wbicons/wallet_address_privacy.svg':
		'ff9e170056e31b805874caf213837de5e33e0e0f83cbdcefe9af5fabf681ae61',
}

interface SvgResult {
	filePath: string
	status: 'needs_optimization' | 'already_optimized' | 'skipped'
	currentHash: string
	originalSize: number
	optimizedSize: number
}

describe('SVG optimization', async () => {
	const configPath = path.join(getRepositoryRoot(), 'tests/utils/svgo.config.mjs')
	const svgoConfig = await loadConfig(configPath)
	const configHash = crypto.createHash('sha256').update(JSON.stringify(svgoConfig)).digest('hex')
	const results: SvgResult[] = []

	await crawlCodebase({
		ignore: commonExclusions,
		complexTraversalFn: async (entryBase, getFullEntry) => {
			if (entryBase.type !== CodebaseEntryType.FILE) {
				return
			}

			if (!entryBase.path.endsWith('.svg')) {
				return
			}

			const entry = await getFullEntry()

			if (entry.type !== CodebaseEntryType.FILE) {
				throw new Error('inconsistent type')
			}

			const filePath = entry.path

			// The hash depends on both the config and the file contents,
			// so concatenate them to force re-run on SVGO config changes:
			const currentHash = crypto
				.createHash('sha256')
				.update(configHash)
				.update('||||')
				.update(entry.contents)
				.digest('hex')

			// Skip if hash matches a known-optimized SVG.
			if (optimizedSvgHashes[filePath] === currentHash) {
				results.push({
					filePath,
					status: 'skipped',
					currentHash,
					originalSize: entry.contents.length,
					optimizedSize: -1,
				})

				return
			}

			// Run SVGO optimize on the SVG content.
			const result = optimize(entry.contents, {
				path: filePath,
				...svgoConfig,
			})

			const originalSize = entry.contents.length
			const optimizedSize = result.data.length

			if (optimizedSize < originalSize) {
				results.push({
					filePath,
					status: 'needs_optimization',
					currentHash,
					originalSize,
					optimizedSize,
				})
			} else {
				results.push({
					filePath,
					status: 'already_optimized',
					currentHash,
					originalSize,
					optimizedSize,
				})
			}
		},
	})

	results.sort((a, b) => a.filePath.localeCompare(b.filePath))

	it('found SVG files to process', () => {
		expect(results.length, 'No SVG files were found by the crawler').toBeGreaterThan(0)
	})

	it('all SVGs should be optimized (no byte-size reduction possible)', () => {
		const needsOptimization = results.filter(r => r.status === 'needs_optimization')

		if (needsOptimization.length > 0) {
			const message =
				'The following SVG files can be further optimized:\n\n' +
				needsOptimization
					.map(r => {
						const savings = r.originalSize - r.optimizedSize

						return (
							`  ${r.filePath} (${r.originalSize} → ${r.optimizedSize} bytes, ${savings} bytes can be saved)\n` +
							`    npx svgo --config ${configPath} ${r.filePath}`
						)
					})
					.join('\n\n') +
				(needsOptimization.length === 1
					? ''
					: '\n\n==== Single command: ====\n\n    ' +
						needsOptimization
							.map(r => `npx svgo --config ${configPath} ${r.filePath}`)
							.join(' && ') +
						'\n\n')

			console.error(message)
			expect(
				needsOptimization.length,
				`${needsOptimization.length} SVG file(s) can be further optimized. See error output for details.`,
			).toBe(0)
		}
	})

	it('contains all hashes for already-optimized SVGs', () => {
		const alreadyOptimized = results.filter(r => r.status === 'already_optimized')

		if (alreadyOptimized.length > 0) {
			const message =
				'\nThe following SVG files are already optimized but not yet in the known-optimized list.\n' +
				'Add these hashes to `optimizedSvgHashes` in tests/svg-optimization.test.ts:\n\n' +
				alreadyOptimized.map(r => `    '${r.filePath}': '${r.currentHash}',`).join('\n') +
				'\n\n'

			process.stderr.write(message)

			expect(
				alreadyOptimized.length,
				`${alreadyOptimized.length} SVG file(s) are already optimized but missing from optimizedSvgHashes. See error output for hashes to add.`,
			).toBe(0)
		}
	})

	it('all optimizedSvgHashes entries should correspond to actual SVG files', () => {
		const existingPaths = new Set(results.map(r => r.filePath))
		const staleKeys = Object.keys(optimizedSvgHashes).filter(path => !existingPaths.has(path))

		if (staleKeys.length > 0) {
			const message =
				'The following optimizedSvgHashes entries do not correspond to actual SVG files in the repo.\n' +
				'Remove these keys from `optimizedSvgHashes` in tests/svg-optimization.test.ts:\n\n' +
				staleKeys.map(k => `    ${k}`).join('\n') +
				'\n'

			process.stderr.write(message)
			expect(
				staleKeys.length,
				`${staleKeys.length} optimizedSvgHashes entry/entries reference non-existent SVG file(s). See error output for keys to remove.`,
			).toBe(0)
		}
	})
})
