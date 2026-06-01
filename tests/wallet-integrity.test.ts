import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { hardwareWallets } from '@/data/hardware-wallets'
import { softwareWallets } from '@/data/software-wallets'
import { allWallets, assertValidWalletName, isValidWalletName } from '@/data/wallets'
import { getExtensionId } from '@/schema/extension-url'
import type { BaseWallet } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'
import { WalletCaptureAnnotations } from '@/tools/wallet-data-collection/wallet-capture-annotations'
import { WalletCaptureFile } from '@/tools/wallet-data-collection/wallet-capture-file'
import { getErrorMessage } from '@/types/errors'
import { toKebabCase } from '@/utils/kebab'

import { getRepositoryRoot } from './utils/codebase'

describe('wallets', () => {
	const walletMaps: {
		walletMap: { [K: string]: BaseWallet }
		walletType: WalletType | null
		walletMapName: string
		dataSubdir: string
	}[] = [
		{
			walletMap: softwareWallets,
			walletType: WalletType.SOFTWARE,
			walletMapName: 'software wallets',
			dataSubdir: 'software-wallets',
		},
		{
			walletMap: hardwareWallets,
			walletType: WalletType.HARDWARE,
			walletMapName: 'hardware wallets',
			dataSubdir: 'hardware-wallets',
		},
		// TODO: Add embedded wallets here once we have some.
	]

	for (const { walletMap, walletMapName } of walletMaps) {
		describe(walletMapName, () => {
			for (const walletKey of Object.keys(walletMap)) {
				it(`is the only wallet map that has key ${walletKey}`, () => {
					for (const {
						walletMap: otherWalletMap,
						walletMapName: otherWalletMapName,
					} of walletMaps) {
						if (walletMapName === otherWalletMapName) {
							continue
						}

						expect(otherWalletMap[walletKey]).toBeUndefined()

						if (typeof walletKey !== 'string' || !isValidWalletName(walletKey)) {
							throw new Error('unexpected wallet key')
						}

						expect(allWallets[walletKey]).toBe(walletMap[walletKey])
					}
				})
			}
		})
	}

	for (const { walletMap, walletMapName } of walletMaps.concat([
		{
			walletMap: allWallets,
			walletType: null, // Unused
			walletMapName: 'all wallets',
			dataSubdir: '', // Unused
		},
	])) {
		describe(walletMapName, () => {
			for (const [walletKey, wallet] of Object.entries(walletMap)) {
				it(`has a metadata.id that is the kebab-case of its registry key for ${wallet.metadata.displayName}`, () => {
					expect(wallet.metadata.id).toBe(toKebabCase(walletKey))
				})
			}
		})
	}

	const walletIdToDataSubdir = new Map<string, string>()

	for (const { walletMap, dataSubdir } of walletMaps) {
		for (const walletKey of Object.keys(walletMap)) {
			walletIdToDataSubdir.set(walletKey.toString(), dataSubdir)
		}
	}

	for (const wallet of Object.values(allWallets)) {
		describe(`wallet ${wallet.metadata.displayName}`, () => {
			it('has a slug-style metadata.id (lowercase, hyphens only)', () => {
				expect(wallet.metadata.id).toMatch(/^[a-z\d]+(?:-[a-z\d]+)*$/)
			})

			it('has valid icon', () => {
				expect(
					fs.existsSync(
						path.resolve(
							getRepositoryRoot(),
							`public/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`,
						),
					),
				).toBe(true)
			})

			const dataSubdir = walletIdToDataSubdir.get(wallet.metadata.id)

			if (dataSubdir !== undefined) {
				const manifestDir = path.resolve(
					getRepositoryRoot(),
					'data',
					dataSubdir,
					'manifests',
					wallet.metadata.id,
				)

				for (const extensionUrl of wallet.metadata.urls?.extensions ?? []) {
					const extId = getExtensionId(extensionUrl)

					it(`has checked-in raw manifest for extension ${extId}`, () => {
						expect(fs.existsSync(path.join(manifestDir, `${extId}.manifest.json`))).toBe(true)
					})
				}

				if (wallet.metadata.urls?.androidManifestXml !== undefined) {
					it('has checked-in raw Android manifest', () => {
						expect(fs.existsSync(path.join(manifestDir, 'android-manifest.xml'))).toBe(true)
					})
				}

				if (wallet.metadata.urls?.iosInfoPlist !== undefined) {
					it('has checked-in raw iOS plist', () => {
						expect(fs.existsSync(path.join(manifestDir, 'ios-info.plist.xml'))).toBe(true)
					})
				}
			}

			if (
				dataSubdir !== undefined &&
				fs.existsSync(
					path.resolve(getRepositoryRoot(), 'data', dataSubdir, 'collection', wallet.metadata.id),
				)
			) {
				it('has valid data collection info', async () => {
					const collectionDir = path.resolve(
						getRepositoryRoot(),
						'data',
						dataSubdir,
						'collection',
						wallet.metadata.id,
					)
					const walletId = assertValidWalletName(wallet.metadata.id)
					const annotationsPath = path.join(collectionDir, `${wallet.metadata.id}.annotations.json`)
					const globalAnnotationsPath = path.join(
						getRepositoryRoot(),
						'data',
						'collection',
						'global.annotations.json',
					)
					const annotations = WalletCaptureAnnotations.fromFile(
						walletId,
						annotationsPath,
						globalAnnotationsPath,
					)
					const files = fs.readdirSync(collectionDir)
					const captureFiles = files.filter(f => f.endsWith('.capture.json'))

					for (const captureFile of captureFiles) {
						const capturePath = path.join(collectionDir, captureFile)
						const captureFileObj = await WalletCaptureFile.fromFile(null, capturePath, annotations)

						// TODO until data collection CLI is more complete.
						/* const issues = */ await captureFileObj.check()

						/*
						TODO until data collection CLI is more complete:
						if (issues.length > 0) {
							throw new Error(
								`Found unaddressed issues in data collection info for wallet ${walletId}; please run the 'check' command to investigate this:\n  $ pnpm wallet-data-collection --id='${captureFileObj.identity.walletId}' --type='${captureFileObj.identity.walletType}' --variant='${captureFileObj.identity.walletVariant}' check`,
							)
						}

						expect(issues).toHaveLength(0)
						*/

						try {
							// Will throw error if files are not in sync:
							await captureFileObj.save({
								verifyExisting: true,
								walletId,
								walletVariants: wallet.variants,
							})
						} catch (e) {
							throw new Error(`${getErrorMessage(e)} (run \`pnpm fix\` to fix this automatically)`)
						}
					}
				})
			}
		})
	}
})
