import {
	type AtLeastOneTrueVariant,
	type ResolvedFeature,
	resolveFeature,
	type Variant,
	type VariantFeature,
} from '@/schema/variants'
import { Enum, mergeEnums } from '@/utils/enum'

import { type MustRef, type References, refNotNecessary } from '../../reference'
import type { LabeledUrl } from '../../url'

/**
 * A Free and Open Source license.
 *
 * Licenses are mapped to their SPDX ID.
 * https://spdx.org/licenses/
 *
 * To identify: look for a LICENSE or LICENSE.md file in the wallet's source
 * repository and match it to one of the values below. Most GitHub repositories
 * also display the detected license on the repo's main page under the "License"
 * label in the sidebar.
 */
export enum FOSSLicense {
	/** Apache License 2.0 — permissive; requires attribution and preservation of copyright/license notices. */
	APACHE_2_0 = 'Apache-2.0',

	/** GNU General Public License v3.0 — strong copyleft; derivative works must also be licensed under GPL-3.0. */
	GPL_3_0 = 'GPL-3.0',

	/** BSD 3-Clause License — permissive; requires attribution and prohibits use of the project name in endorsements. */
	BSD_3_CLAUSE = 'BSD-3-Clause',

	/** MIT License — very permissive; requires only that the copyright notice and license text are included. */
	MIT = 'MIT',

	/**
	 * MIT License with an additional restrictive clause that prevents it from
	 * qualifying as fully FOSS under the OSI definition.
	 * (e.g. MIT + Commons Clause, which prohibits selling the software commercially.
	 * The LICENSE file typically starts with the standard MIT text and appends a
	 * "Commons Clause" addendum at the end.)
	 * To identify: look for a LICENSE file whose text is MIT-based but includes
	 * additional restrictions. Do NOT use this for standard MIT — only when an
	 * extra clause is explicitly added.
	 */
	MIT_WITH_CLAUSE = 'MIT-C',
}

/**
 * A license that guarantees the code will later be Free and Open Source.
 */
export enum FutureFOSSLicense {
	/**
	 * Business Source License 1.1.
	 * The source code is publicly available, but commercial use is restricted
	 * until the "Change Date" specified in the license, after which it
	 * automatically converts to a specified FOSS license.
	 * (e.g. A wallet licensed under BUSL-1.1 with a Change Date of 2027-01-01
	 * and a Change License of GPL-3.0 means the code becomes GPL-3.0 on that date.)
	 * To identify: look for a LICENSE file that contains "Business Source License"
	 * or "BUSL-1.1". The Change Date and eventual open-source license are both
	 * specified in the license file itself.
	 */
	BUSL_1_1 = 'BUSL-1.1',
}

/**
 * A license that represents source-available code, but not FOSS.
 */
export enum SourceAvailableNonFOSSLicense {
	/**
	 * The source code is publicly available (e.g. on GitHub) but is covered by
	 * a proprietary license that does not meet the OSI definition of open source.
	 * (e.g. A wallet whose repository is public but whose LICENSE file says
	 * "All rights reserved", or uses a custom restrictive license that prohibits
	 * forking or redistribution.)
	 * To identify: the repository is publicly accessible, a LICENSE file is present,
	 * but the license is not OSI-approved and does not appear in the FOSSLicense or
	 * FutureFOSSLicense enums above.
	 */
	PROPRIETARY_SOURCE_AVAILABLE = '_PROPRIETARY_SOURCE_AVAILABLE',

	/**
	 * The source code is publicly visible (e.g. the repository is public on GitHub)
	 * but no license file is present.
	 * Under copyright law, the absence of a license means all rights are reserved
	 * by default — the code cannot be legally used, modified, or redistributed.
	 * (e.g. A wallet with a public GitHub repo that has no LICENSE or COPYING file,
	 * and no license field in its package.json.)
	 * To identify: the repository is publicly accessible but has no LICENSE or
	 * COPYING file, and no license is declared in package.json or similar manifests.
	 */
	UNLICENSED_VISIBLE = '_UNLICENSED_VISIBLE',
}

/**
 * Source licenses that are not source-available.
 */
export enum SourceNotAvailableLicense {
	/**
	 * The wallet's source code is not publicly available.
	 * The wallet is distributed as a binary only, with no public source repository.
	 * (e.g. A closed-source wallet distributed only through an app store, with no
	 * public GitHub repository or published source code of any kind.)
	 * To identify: there is no public source code repository, or the repository
	 * contains only documentation, marketing pages, or build artifacts — not the
	 * actual wallet source code.
	 */
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
	 * (e.g. A wallet with one GitHub repo, one LICENSE file covering all its code,
	 * and no separate proprietary core dependency required to build it.)
	 *
	 * To identify: the wallet has one main source repository with one LICENSE file,
	 * and all wallet functionality can be built from that repository alone.
	 */
	SINGLE_WALLET_REPO_AND_LICENSE = 'SINGLE_WALLET_REPO_AND_LICENSE',

	/**
	 * The wallet's code is split between "core code" covered under a specific
	 * license, and wallet/app code that is covered under a different license.
	 *
	 * To identify: the wallet has separate repositories — or a monorepo with separate
	 * LICENSE files per package — where the signing/crypto library and the UI app
	 * carry different licenses.
	 */
	SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE = 'SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE',
}

export const fullyClosedSource: WalletLicensing = {
	type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE,
	walletAppLicense: {
		ref: refNotNecessary,
		license: SourceNotAvailableLicense.PROPRIETARY,
	},
}

/**
 * There is a single repository that is entirely covered by a single license.
 * This repository is all that is needed to build the wallet locally.
 */
type SingleWalletRepoAndLicense<L> = {
	type: LicensingType.SINGLE_WALLET_REPO_AND_LICENSE

	/**
	 * The license covering the wallet repository.
	 * The ref must link directly to the LICENSE file in the wallet's source repository.
	 * (e.g. `https://github.com/wallet/repo/blob/main/LICENSE`)
	 */
	walletAppLicense: L
}

/**
 * The wallet's code is split between "core code" covered under a specific
 * license, and wallet/app code that is covered under a different license.
 */
type SeparateCoreCodeVsWalletCodeLicense<L> = {
	type: LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE

	/**
	 * The license covering the "core" repository.
	 * This is the cryptographic library, signing SDK, or shared infrastructure
	 * that the wallet app depends on.
	 * (e.g. MetaMask's `core` packages repo, imToken's `token-core` SDK.)
	 * The ref must link to the LICENSE file in that core repository.
	 */
	coreLicense: L

	/**
	 * The license covering the non-core repository (the wallet UI / app itself).
	 * May be variant-specific (e.g. browser extension and mobile app may differ).
	 * The ref must link to the LICENSE file in the wallet app repository.
	 */
	walletAppLicense: L
}

/**
 * License feature data for a wallet.
 * Set to null if licensing information has not yet been researched.
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
 * Returns source visibility based on resolved licensing.
 * - `true`: source is publicly visible.
 * - `false`: source is known not to be publicly visible.
 * - `null`: licensing data is missing, so visibility cannot be determined.
 */
export function isSourcePubliclyVisible(licensing: ResolvedWalletLicensing): boolean | null {
	if (licensing === null) {
		return null
	}

	switch (licensing.type) {
		case LicensingType.SINGLE_WALLET_REPO_AND_LICENSE:
			if (licensing.walletAppLicense === null) {
				return null
			}

			return licenseSourceIsVisible(licensing.walletAppLicense.license)
		case LicensingType.SEPARATE_CORE_CODE_LICENSE_VS_WALLET_CODE_LICENSE:
			if (licensing.coreLicense === null || licensing.walletAppLicense === null) {
				return null
			}

			return (
				licenseSourceIsVisible(licensing.coreLicense.license) &&
				licenseSourceIsVisible(licensing.walletAppLicense.license)
			)
	}
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
