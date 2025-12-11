import {
	type AtLeastOneTrueVariant,
	type ResolvedFeature,
	resolveFeature,
	type Variant,
	type VariantFeature,
} from '@/schema/variants'
import { Enum, mergeEnums } from '@/utils/enum'

import type { MustRef, References, refNotNecessary } from '../../reference'
import type { LabeledUrl } from '../../url'

/**
 * A Free and Open Source license.
 *
 * Licenses are mapped to their SPDX ID.
 * https://spdx.org/licenses/
 */
export enum FOSSLicense {
	APACHE_2_0 = 'Apache-2.0',
	GPL_3_0 = 'GPL-3.0',
	BSD_3_CLAUSE = 'BSD-3-Clause',
	MIT = 'MIT',
	MIT_WITH_CLAUSE = 'MIT-C',
}

/**
 * A license that guarantees the code will later be Free and Open Source.
 */
export enum FutureFOSSLicense {
	BUSL_1_1 = 'BUSL-1.1',
}

/**
 * A license that represents source-available code, but not FOSS.
 */
export enum SourceAvailableNonFOSSLicense {
	PROPRIETARY_SOURCE_AVAILABLE = '_PROPRIETARY_SOURCE_AVAILABLE',
	UNLICENSED_VISIBLE = '_UNLICENSED_VISIBLE',
}

/**
 * Source licenses that are not source-available.
 */
export enum SourceNotAvailableLicense {
	PROPRIETARY = '_PROPRIETARY',
}

/**
 * A Free and Open Source license.
 */
export const fossLicense = new Enum<FOSSLicense>({
	[FOSSLicense.APACHE_2_0]: true,
	[FOSSLicense.GPL_3_0]: true,
	[FOSSLicense.BSD_3_CLAUSE]: true,
	[FOSSLicense.MIT]: true,
	[FOSSLicense.MIT_WITH_CLAUSE]: true,
})

/**
 * A license that guarantees the code will later be Free and Open Source.
 */
export const futureFOSSLicense = new Enum<FutureFOSSLicense>({
	[FutureFOSSLicense.BUSL_1_1]: true,
})

/**
 * A license that represents source-available code, but not FOSS.
 */
export const sourceAvailableNonFOSSLicense = new Enum<SourceAvailableNonFOSSLicense>({
	[SourceAvailableNonFOSSLicense.PROPRIETARY_SOURCE_AVAILABLE]: true,
	[SourceAvailableNonFOSSLicense.UNLICENSED_VISIBLE]: true,
})

/**
 * Source licenses that are not source-available.
 */
export const sourceNotAvailableLicense = new Enum<SourceNotAvailableLicense>({
	[SourceNotAvailableLicense.PROPRIETARY]: true,
})

/** A source-available code license. */
export type SourceAvailableLicense = FOSSLicense | FutureFOSSLicense | SourceAvailableNonFOSSLicense

/** A source-available code license. */
export const sourceAvailableLicense = mergeEnums(
	mergeEnums(fossLicense, futureFOSSLicense),
	sourceAvailableNonFOSSLicense,
)

/** A source code license. */
export type License = SourceAvailableLicense | SourceNotAvailableLicense

/** A license and a reference. */
export type LicenseWithRef = { license: License } &
	// If a source-available license, a reference must be provided.
	(| MustRef<{
				license: SourceAvailableLicense
		  }>
		// The reference is not necessary for source-unavailable licenses.
		| {
				ref: References | typeof refNotNecessary
				license: SourceNotAvailableLicense
		  }
	)

/**
 * Type of licensing by the wallet.
 */
export enum LicensingType {
	/**
	 * There is a single repository that is entirely covered by a single license.
	 * This repository is all that is needed to build the wallet locally.
	 */
	SINGLE_WALLET_REPO_AND_LICENSE = 'SINGLE_WALLET_REPO_AND_LICENSE',

	/**
	 * The wallet's code is split between "core code" covered under a specific
	 * license, and wallet/app code that is covered under a different license.
	 */
	SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE = 'SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE',
}

/**
 * There is a single repository that is entirely covered by a single license.
 * This repository is all that is needed to build the wallet locally.
 */
type SingleWalletRepoAndLicense<L> = {
	type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE

	/** The license covering the wallet repository. */
	walletAppLicense: L
}

/**
 * The wallet's code is split between "core code" covered under a specific
 * license, and wallet/app code that is covered under a different license.
 */
type SeparateCoreCodeVsWalletCodeLicense<L> = {
	type: LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE

	/** The license covering the "core" repository. */
	coreLicense: L

	/**
	 * The license covering the non-core repository.
	 * May be variant-specific.
	 */
	walletAppLicense: L
}

/**
 * License feature data for a wallet.
 */
export type WalletLicensing =
	| SingleWalletRepoAndLicense<VariantFeature<LicenseWithRef>>
	| SeparateCoreCodeVsWalletCodeLicense<VariantFeature<LicenseWithRef>>
	| null

/**
 * License feature data for a wallet, resolved for a single variant.
 */
export type ResolvedWalletLicensing =
	| SingleWalletRepoAndLicense<ResolvedFeature<LicenseWithRef>>
	| SeparateCoreCodeVsWalletCodeLicense<ResolvedFeature<LicenseWithRef>>
	| null

export function resolveWalletLicense(
	walletLicense: WalletLicensing,
	expectedVariants: AtLeastOneTrueVariant,
	variant: Variant,
): ResolvedWalletLicensing {
	if (walletLicense === null) {
		return null
	}

	switch (walletLicense.type) {
		case LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE:
			return {
				type: LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE,
				coreLicense: resolveFeature(walletLicense.coreLicense, expectedVariants, variant),
				walletAppLicense: resolveFeature(walletLicense.walletAppLicense, expectedVariants, variant),
			}
		case LicensingType.SINGLE_WALLET_REPO_AND_LICENSE:
			return {
				type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
				walletAppLicense: resolveFeature(walletLicense.walletAppLicense, expectedVariants, variant),
			}
	}
}

/**
 * An enum representing whether a given license is FOSS
 * (Free and Open Source Software).
 */
export enum FOSS {
	FOSS = 'FOSS',
	FUTURE_FOSS = 'FUTURE_FOSS',
	NOT_FOSS = 'NOT_FOSS',
}

/**
 * @param license The license to get the name of.
 * @returns Human-friendly name of the license.
 */
export function licenseName(license: License): string {
	switch (license) {
		case FOSSLicense.APACHE_2_0:
			return 'Apache 2.0'
		case FutureFOSSLicense.BUSL_1_1:
			return 'BUSL 1.1'
		case FOSSLicense.GPL_3_0:
			return 'GPL 3.0'
		case FOSSLicense.BSD_3_CLAUSE:
			return 'BSD 3-Clause'
		case FOSSLicense.MIT:
			return 'MIT'
		case FOSSLicense.MIT_WITH_CLAUSE:
			return 'MIT with Clause'
		case SourceNotAvailableLicense.PROPRIETARY:
			return 'Proprietary'
		case SourceAvailableNonFOSSLicense.PROPRIETARY_SOURCE_AVAILABLE:
			return 'Proprietary source-available'
		case SourceAvailableNonFOSSLicense.UNLICENSED_VISIBLE:
			return 'Unlicensed'
	}
}

/**
 * @param license The license to get the FOSS status of.
 * @returns FOSS status of the license.
 */
export function licenseIsFOSS(license: License): FOSS {
	if (fossLicense.is(license)) {
		return FOSS.FOSS
	}

	if (futureFOSSLicense.is(license)) {
		return FOSS.FUTURE_FOSS
	}

	return FOSS.NOT_FOSS
}

/**
 * @param license The license to get the source visibility of.
 * @returns Whether the license guarantees that the source code is visible.
 */
export function licenseSourceIsVisible(license: License): license is SourceAvailableLicense {
	return sourceAvailableLicense.is(license)
}

/**
 * @param license The FOSS license to get the URL of.
 * @returns The SPDX URL of the license.
 */
export function licenseUrl(license: FOSSLicense): LabeledUrl {
	return {
		url: `https://spdx.org/licenses/${license}.html`,
		label: licenseName(license),
	}
}
