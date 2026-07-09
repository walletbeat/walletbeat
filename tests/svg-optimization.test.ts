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
	'public/fonts/sp-monorium-dingbat.svg':
		'4b3a4362793a01d57328605e153b9bf5e37b97a564d63c9e3a2cd98c4563d250',
	'public/fonts/sp-monorium-regular.svg':
		'b5da24c835319d1934d15f8c334e09343d6839c61c0f6862f15b41060d747b9c',
	'public/images/entities/alphabet.svg':
		'db17f99703a3a7c236d54f0cc26ad0884407675edaf1ed75f6fed83e5464525d',
	'public/images/entities/apple.svg':
		'51cc6812c2951fc32886589ee1a3fae11979ff7a487b4b473b0ed21bb997b248',
	'public/images/entities/binance.svg':
		'a82214267d69444c96cffeea047194784accc9bf01369370ea122b69c5fa19ab',
	'public/images/entities/coinbase.svg':
		'9cf63067389e60630f96d6c245a6a93da8d8e7d7fd5942b58e9405a3dc6677ae',
	'public/images/entities/consensys.svg':
		'4cdd9f55c31c2d01bc4949f8181ffdb9204925109d6e632d2255f524ba90cf1c',
	'public/images/entities/cyfrin.svg':
		'63f1941e51ff174b89c52c84911f3b63df5e2db1e60cf5186af24c0d037c3df7',
	'public/images/entities/daimo.svg':
		'cc2e1c4fa04c21957823ae0beee30d65fca6ec0fe9c4c14c6851344f6ecc776a',
	'public/images/entities/debank.svg':
		'1998f292361c339dda5c14f231e1212d69d6805bb9fe6776c04f13f1b6374b81',
	'public/images/entities/github.svg':
		'88fdbc5d3894affcd6b5d48d945579a748618dab28599982cc103b8c1768707d',
	'public/images/entities/honeycomb.svg':
		'85e9039af6808d6ee55d93ee2c30a0fdd7bf90b8d475bb405ad46b4e3f4441b1',
	'public/images/entities/keycard.svg':
		'c6343ee01fbea1f2644b843ce29af66dd489834cd9421c4da74e0546bc5f4868',
	'public/images/entities/keylabs.svg':
		'455aacb92608050aa44dabe82211820caa515a2217da8caa0ecf7be30441be0a',
	'public/images/entities/ledger.svg':
		'fea6a0525e93805dfb2b52cbbacee8422ff7b5ba0534bfb8fd226af01bf30b8a',
	'public/images/entities/lifi.svg':
		'b9020f540942e26108e1226dae0878ba40013388b7fc6c27d72fa17252a542e3',
	'public/images/entities/mtpelerin.svg':
		'e2ed9ec7f78b8cbd16c27071253c6354952280c941f2b47304ca8b5bc887e2b0',
	'public/images/entities/uniswapLabs.svg':
		'cd02c36fcc597604fbc553a8c2e26497352c7575a3e2611011fdea6a886adf16',
	'public/images/entities/veridise.svg':
		'a4ddafddcf20876b72b8771bb328b4813bfd69aec12a76774bbd958502430808',
	'public/images/ethereum-logo.svg':
		'828632d7d47bda7b0330f4f78b872421affb32a1d16abf90d47acd4212c8a81d',
	'public/images/wallets/ambire.svg':
		'b4f3f5aeea84123c54fd1e4bb92344f6016f6d72cc1a04bbec4834a183ab9a2d',
	'public/images/wallets/base-app.svg':
		'ec95eb6414626e6827f4419209a1925d28918ac39a5e6b5cf92910b3d0d8690a',
	'public/images/wallets/bitbox.svg':
		'bcf07f051b9ee66a8ea3c6857929585b2fbdb356511442723aec5a9383d45c79',
	'public/images/wallets/bitget.svg':
		'1dba6b20429d10a37693df6919ed533318a7843a1119a1099ead592c808cd938',
	'public/images/wallets/cypherock.svg':
		'ad1362c378669dafe9f76c8252bc0ba4b7950af21b81ea7b8c333e85ee1731ce',
	'public/images/wallets/daimo.svg':
		'cc2e1c4fa04c21957823ae0beee30d65fca6ec0fe9c4c14c6851344f6ecc776a',
	'public/images/wallets/default.svg':
		'ec4aa2c7dc2a4a180a5e1bc4e3c544f55ecb6e8592006bfccdde7ae51472c813',
	'public/images/wallets/elytro.svg':
		'40dfead763f549923ad911ff35ca03335c3e278c4be51260e95edac6127aa859',
	'public/images/wallets/frame.svg':
		'30482b2cfaaee018cd7e21075c975f61a94dd5bc76eb943db545ddfc82b106e4',
	'public/images/wallets/gemwallet.svg':
		'9c1082fd31b8030dfd14169bdb4c4acdae620118f391d0478b01cf496f3e0821',
	'public/images/wallets/gridplus.svg':
		'a92f26c2593265f1748a0ae5834c49669e153355b199740da23ac33070e1117d',
	'public/images/wallets/imkey.svg':
		'c064bd536b746612fdcbe7640f55dcec2571dfc22657cbdc39ef061c8120c9f3',
	'public/images/wallets/imtoken.svg':
		'bea753fb92f55f66fd6faccc3d76859ddaec8999c590e9304674b23f03eb93cf',
	'public/images/wallets/keycard-shell.svg':
		'c6343ee01fbea1f2644b843ce29af66dd489834cd9421c4da74e0546bc5f4868',
	'public/images/wallets/keystone.svg':
		'3baf35a85c8ee8c6f1d95e49feef40469341ea1ded99ea53eed7c353c849ce8d',
	'public/images/wallets/ledger.svg':
		'fea6a0525e93805dfb2b52cbbacee8422ff7b5ba0534bfb8fd226af01bf30b8a',
	'public/images/wallets/metamask.svg':
		'3a2f209f512556215cd7050d37be54d0cf6f79880064b8d242a683ded7465ab1',
	'public/images/wallets/mtpelerin.svg':
		'd735241b9540a7f293c482da53ec8ee35542a67455d122d3e758a87b97d08ccd',
	'public/images/wallets/ngrave.svg':
		'17e61fa51fc10b58056e789b042befc9a70f7a06c16c49bcc90732837b2e7a30',
	'public/images/wallets/nufi.svg':
		'1912e348ef48f04f79957904fb1cf950bd76679d293cb906ebde44d73dfe136e',
	'public/images/wallets/onekey.svg':
		'cb8e209654d8cd04dfd34fb22d9c64b21545ab69cf45e6a011aab4a71274edc6',
	'public/images/wallets/phantom.svg':
		'4356c8d5fa4633337d6822db82097031458e890cd6d4ad0d9a7e21660554ad94',
	'public/images/wallets/pillarx.svg':
		'7ded721a91544db67c1c5d7d2c6b2a8fb444f04d5e92611a2b284fce108a6235',
	'public/images/wallets/rabby.svg':
		'862d123a5e676080cc5c4e3c75909f5524c5001efe785575bc826c563af2ecf4',
	'public/images/wallets/rainbow.svg':
		'25f03665f68dd9ddf7a4af4cd7f7e31c710cf471f56fa7cabb846e4ccdd42b25',
	'public/images/wallets/safe.svg':
		'7204dd13a983c47bc354bba7398b638fed93286380f44c4783ed0b42a732074c',
	'public/images/wallets/trezor.svg':
		'cd76b5398b2172adc9129745117be2605e53e5283da38425b05831d58d44395c',
	'public/images/wallets/uniswap-wallet.svg':
		'75f2862c1f84a239580469d96de0740729e5522ffb53a41433050f38029fa5b4',
	'public/images/wallets/zerion.svg':
		'446e789e7c40c2a0d2b6ef449c31c2821d141cb2b3c1cf396dd7833639cdeaa1',
	'public/images/wallets/zeus.svg':
		'77f09595591add0c4f1e59dae323a8cac1c0348c41d240b2109095c91287b689',
	'public/logo-dark.svg':
		'f0b0a7ecfd232053e7ddcc0272c0641fad9fcf0af42c66b0dfbf906d20a27aac',
	'public/logo-light.svg':
		'29806e7b501fec7ba1d5976b0d9678718105bdbb1d335e2d86e24343222bf8ea',
	'resources/branding/glow-0.svg':
		'e1271b8b1b7d1ce750f5be925ac31b3957759d62ef87a3ba1690494853caf9c5',
	'resources/branding/glow-1.svg':
		'24462ccda85de96e2f69a824f1a4022ccb9a10e9b79f804b18d573edba59c450',
	'resources/branding/icon_dark.svg':
		'889f23e4533e024e4d413efcf6fa98d319b845ef361eef05c720887100ff9ca2',
	'resources/branding/icon_light.svg':
		'f938e8f8fed2450e97c699c30862278012bab970a62c0f6e8792f4773ab992e6',
	'resources/branding/logo_dark.svg':
		'f0b0a7ecfd232053e7ddcc0272c0641fad9fcf0af42c66b0dfbf906d20a27aac',
	'resources/branding/logo_light.svg':
		'29806e7b501fec7ba1d5976b0d9678718105bdbb1d335e2d86e24343222bf8ea',
	'resources/contracts/images/Walletbeat.svg':
		'8fb03ae00cfd0cedcea4a2bc893e3a24e0c2c51441bc3c00bd641fbbe2e0ca40',
	'resources/files/wbicons/about.svg':
		'a2dcf5a9d53f08b2df7e205810d9343d0a5c7594e2c8c7d5acbf7651a4e0ebd7',
	'resources/files/wbicons/account_abstraction.svg':
		'2ee992c8c5166ffe92fc5989b0cd3d4d56ae8c9b4cf5de50773d38656406a916',
	'resources/files/wbicons/account_portability.svg':
		'68642ea6066c5c67b3079e55a4d2798ba6b7f44fcff05e800870bad05f543010',
	'resources/files/wbicons/account_recovery.svg':
		'17f35dbfdecab5e1515052b371b14a7345dd29e70742b577aeb1d6f8b2356f78',
	'resources/files/wbicons/account_type.svg':
		'1ce46ef49a304bbdc2e53515af5421eafa65c7177ca4a7953784759805edee95',
	'resources/files/wbicons/account_unruggability.svg':
		'4c380c10f479956684033f5a7afb05359232cf95947e1b9376c571d2fd789620',
	'resources/files/wbicons/address_resolution.svg':
		'0d5cdf2458a70a65aa26b43f772e334a43fd3fc4598dbfd94663457dee1477e2',
	'resources/files/wbicons/app_isolation.svg':
		'd1c29e8349c8e526a86b7411715f255db2c521d579dfa31abe4349830515f1c4',
	'resources/files/wbicons/browser_integration.svg':
		'e86334eec35848df425725fb0bd26ba4fe3cf61cfb01ca3d1aef47a7b11589a6',
	'resources/files/wbicons/chain_abstraction.svg':
		'516950f59e43d845fda3668eeef18a48123cdefb126f1746bc2fa71eafe02ed2',
	'resources/files/wbicons/chain_verification.svg':
		'a73400c40933e4f4111de6fa8b08ad466722b4add178857b501a3d721f455141',
	'resources/files/wbicons/discuss.svg':
		'64a90f52b67ab16d031e5a82fc03a98e090abfdea283467473572115ac97189c',
	'resources/files/wbicons/duress_resistance.svg':
		'afe91fad2f34a4418c578fdb86d147c5531e77688ba6b3708ec4b095fe1cc09b',
	'resources/files/wbicons/ecosystem.svg':
		'19f9aade6d7dca737d9e589befd1e3b57e43c4411f8285c246178d37f025f345',
	'resources/files/wbicons/faq.svg':
		'00f04ed96ea8d9df2d4775a3cd99d565ce5ee6ab6b0604af4e714a87c41cdf5f',
	'resources/files/wbicons/fee_transparency.svg':
		'94478f7bdacb29403ac4efef76c8dd2ac395089b4cb7c6fbc3350a0a8db83169',
	'resources/files/wbicons/free_and_open_source_license.svg':
		'4912268c3bb2f8c7fbb07d86ff09e1b55be7fd5a11ae353be7b25a667b6d5462',
	'resources/files/wbicons/funding_transparency.svg':
		'da6d003c647fe2533550287a93ac4f3043e9032b4a3cabc83c74a02a2c72e962',
	'resources/files/wbicons/hardware_wallet_interoperability.svg':
		'66615982b2571d440c77d4e23c8d533ae9502761962f4974d32be72e068d9432',
	'resources/files/wbicons/hardware_wallet_support.svg':
		'cdb6b861760a03bc2e1b61cfb898bc803a679d4bab7df775e1f4bd6edc64a6ec',
	'resources/files/wbicons/l1_provider_independence.svg':
		'829c56562a0f0d2046b3b40f75d68681bfdee31c98391e77a13f325a289d84ce',
	'resources/files/wbicons/multi_address_privacy.svg':
		'6e918b9b231232f97c9f2b53a8205464ac7e6bbb8d9896559e611724ce51295f',
	'resources/files/wbicons/newsletter.svg':
		'0f7aad48f875c196c314b9e1382577fd9f659d5304efc3d1244fd5a74aa6cba5',
	'resources/files/wbicons/orderflow_transparency.svg':
		'ebad5de9fbb10c92756502b6395b2c4b28f7f0221b97f814e9d4cb7c2d63f0a2',
	'resources/files/wbicons/passkey_verification.svg':
		'6bda437c9c800f8deec053708390d8ab91caa52c3c903a6e84bd6486728f3a80',
	'resources/files/wbicons/permissions_management.svg':
		'93c2694d1c95528094e78e1bfffc4e383a2988085cfeb9fc156689c22f35cf59',
	'resources/files/wbicons/privacy.svg':
		'b917b115f043c97b5cbb0f3927952d1a83686859331711b31a991b21c348eab3',
	'resources/files/wbicons/privacy_hygiene.svg':
		'6b7999c2e7d9df90b708f5090078fc48eb7a850ccb671389a53e2f22ef18cf53',
	'resources/files/wbicons/private_token_transfers.svg':
		'45b8d8565808e41be7d1d0386427f7c862b8f7c5c97c58f4bdc53225607daabf',
	'resources/files/wbicons/question_mark.svg':
		'4eb010c8812b530d7218cb771c1b78b713e93a001b60545888e18b54978f3f5b',
	'resources/files/wbicons/release_process_transparency.svg':
		'0e30adcdc2ff9a635aa860de9568a4f518867afc31d693bfde1ce4ce0f9089c1',
	'resources/files/wbicons/repository.svg':
		'4f4327cf7f86fca5b234c8118c18235b2101d013e1b10866c0cb5957df055265',
	'resources/files/wbicons/scam_prevention.svg':
		'a13510b01630b33d23a3f5a1cdc82fb9754d4e6d37a397a381f5c4cb94c4d08c',
	'resources/files/wbicons/security.svg':
		'5dd8e9f9754a3f46358326dc7b6349b172e64b02c418d5c27192bc70eb6ef783',
	'resources/files/wbicons/security_audits.svg':
		'fca037410302f95cacf29cf8cf08384ce5e962cb3c57fcdae5371d76ef815165',
	'resources/files/wbicons/security_best_practices.svg':
		'e351752dfb5f635f02b6fac153f8adbc9b292c7edde70b614d310496f0280428',
	'resources/files/wbicons/self_sovereignty.svg':
		'e2236a82ae8b231218dc84deef70e8ae58133f879e57987931c2d85ca9a4964a',
	'resources/files/wbicons/source_visibility.svg':
		'07f785dcbb8eda81a48e8480c7326939897b8f0e85dce7975133583fe1095d31',
	'resources/files/wbicons/transaction_batching.svg':
		'6a0e957bd7ea8e89c1aad266abbe6db54a7b930c074a47f459ee62f56d5a53d8',
	'resources/files/wbicons/transaction_inclusion.svg':
		'c83cc5d0f722c7b8f98e020f3454d4647381c438a1935d3adbd540a595c1737f',
	'resources/files/wbicons/transaction_legibility.svg':
		'8b59d5d7f3ba228edcf683d1781dbc2cd80729b1eb43283bef9eeb0c95234b8b',
	'resources/files/wbicons/transparency.svg':
		'78574ce70233dba228c9098831e1ab06f1c1b224fc99887f15c4314f58a5dd3b',
	'resources/files/wbicons/user_privacy.svg':
		'565c19f2edfb5426aa6a43744260ea36aff608035262febee187e7f54c9b5fa1',
	'resources/files/wbicons/wallet_address_privacy.svg':
		'ceb463bb11e17a665e9a37adae3c9df6bab485a1507cd9e9c830fd95398dbc2d',
	'resources/files/wbicons/wallet_browser.svg':
		'5c8a54471d3ad7991437f6dd59ea922cf82d1e3686dc06b80f1f18e3aa11f8c7',
	'resources/files/wbicons/wallet_desktop.svg':
		'1dd4085eb52ef8843150565be052aceecbfed225c1677fc2e00f5820d852ac23',
	'resources/files/wbicons/wallet_embedded.svg':
		'161609e72969d6a40f5ee7ca7f41834bd29f10c16e502c6711ba32d69c2e2eb4',
	'resources/files/wbicons/wallet_hardware.svg':
		'9629f4e58078a5badf9175d39cd3a3e1e1a86bc2ea9c3032a9ae123ef7b7158a',
	'resources/files/wbicons/wallet_mobile.svg':
		'e3edf951b1dcdafa25611078c2d22cec23e00884ab2d43c0e9b09e2cd0b52170',
	'resources/files/wbicons/wallet_software.svg':
		'6e7e5da47259a97463b0f9373217846320294675bb7dba30018d4ac4f4ccbb91',
	'resources/files/wbicons/wallet_test.svg':
		'cd3951d27fd220b5b1d6f3c116ce4465635bda5c0fb30d19bf7e9b61f0cc03dc',
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
		ignore: commonExclusions.concat([
			// Generated font output is covered by the icon font generator hash.
			filePath => filePath.startsWith('src/assets/fonts/'),
		]),
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

/**
 * Threshold: if the raw text of embedded data: URIs (as they appear in the
 * file) compose more than this fraction of the SVG file size, the file is
 * flagged as a disguised raster image (PNG/JPEG/WebP inside an SVG wrapper).
 */
const EMBEDDED_IMAGE_RATIO_THRESHOLD = 0.95

describe('SVG files should not be disguised raster images', async () => {
	const disguised: {
		filePath: string
		fileSize: number
		embeddedSize: number
		ratio: number
		mimeType: string
	}[] = []

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

			const contents = entry.contents
			const fileSize = entry.raw.byteLength

			// Match data: URIs in attributes like xlink:href, href, src.
			// Captures: data:<mime>;<params>,<raw-content>
			const dataUriRegex = /data:\s*([\w/.+-]+);[^,]*,([^"'>\s]+)/g
			let match
			let embeddedSize = 0
			let mimeType = ''

			while ((match = dataUriRegex.exec(contents)) !== null) {
				mimeType = match[1]

				// Count the full data URI text as it appears in the file
				// (the raw base64 or plain text, not the decoded bytes).
				// This correctly reflects how much of the SVG is consumed
				// by the embedded image wrapper.
				embeddedSize += match[0].length
			}

			if (embeddedSize > 0) {
				const ratio = embeddedSize / fileSize

				if (ratio > EMBEDDED_IMAGE_RATIO_THRESHOLD) {
					disguised.push({
						filePath: entry.path,
						fileSize,
						embeddedSize,
						ratio,
						mimeType,
					})
				}
			}
		},
	})

	it('no SVGs should be disguised raster images', () => {
		if (disguised.length > 0) {
			disguised.sort((a, b) => b.ratio - a.ratio)

			const message =
				'The following SVG files are disguised raster images — they consist almost entirely of an embedded data: URI rather than real SVG vector data.\n' +
				'Replace these with actual SVG vector files or use the raster image directly.\n\n' +
				disguised
					.map(
						d =>
							`  ${d.filePath}\n` +
							`    File size:    ${d.fileSize.toLocaleString()} bytes\n` +
							`    Embedded:     ${d.embeddedSize.toLocaleString()} bytes (${(d.ratio * 100).toFixed(1)}% of file)\n` +
							`    MIME type:    ${d.mimeType}`,
					)
					.join('\n\n') +
				'\n'

			console.error(message)
			expect(
				disguised.length,
				`${disguised.length} SVG file(s) contain embedded raster data exceeding ${EMBEDDED_IMAGE_RATIO_THRESHOLD * 100}% of the file size.`,
			).toBe(0)
		}
	})
})
