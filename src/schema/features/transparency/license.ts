import type { WithRef } from '../../reference';
import type { LabeledUrl } from '../../url';

/**
 * An enum of licenses mapping to their SPDX ID.
 * https://spdx.org/licenses/
 */
export enum License {
	APACHE_2_0 = 'Apache-2.0',
	BUSL_1_1 = 'BUSL-1.1',
	GPL_3_0 = 'GPL-3.0',
	BSD_3_CLAUSE = 'BSD-3-Clause',
	MIT = 'MIT',
	PROPRIETARY = '_PROPRIETARY',
	UNLICENSED_VISIBLE = '_UNLICENSED_VISIBLE',
}

/**
 * A structure that contains both the license value and optional references
 */
export type LicenseWithRef = WithRef<{
	license: License;
}>;

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
		case License.APACHE_2_0:
			return 'Apache 2.0';
		case License.BUSL_1_1:
			return 'BUSL 1.1';
		case License.GPL_3_0:
			return 'GPL 3.0';
		case License.BSD_3_CLAUSE:
			return 'BSD 3-Clause';
		case License.MIT:
			return 'MIT';
		case License.PROPRIETARY:
			return 'Proprietary';
		case License.UNLICENSED_VISIBLE:
			return 'Unlicensed';
	}
}

/**
 * @param license The license to get the FOSS status of.
 * @returns FOSS status of the license.
 */
export function licenseIsFOSS(license: License): FOSS {
	switch (license) {
		case License.APACHE_2_0:
			return FOSS.FOSS;
		case License.BUSL_1_1:
			return FOSS.FUTURE_FOSS;
		case License.GPL_3_0:
			return FOSS.FOSS;
		case License.BSD_3_CLAUSE:
			return FOSS.FOSS;
		case License.MIT:
			return FOSS.FOSS;
		case License.PROPRIETARY:
			return FOSS.NOT_FOSS;
		case License.UNLICENSED_VISIBLE:
			return FOSS.NOT_FOSS;
	}
}

/**
 * @param license The license to get the source visibility of.
 * @returns Whether the license guarantees that the source code is visible.
 */
export function licenseSourceIsVisible(license: License): boolean {
	switch (license) {
		case License.APACHE_2_0:
			return true;
		case License.BUSL_1_1:
			return true;
		case License.GPL_3_0:
			return true;
		case License.BSD_3_CLAUSE:
			return true;
		case License.MIT:
			return true;
		case License.PROPRIETARY:
			return false;
		case License.UNLICENSED_VISIBLE:
			return true;
	}
}

/**
 * @param license The license to get the URL of.
 * @returns The SPDX URL of the license.
 */
export function licenseUrl(license: License): LabeledUrl | null {
	if (license === License.PROPRIETARY) {
		return null;
	}
	if (license === License.UNLICENSED_VISIBLE) {
		return null;
	}
	return {
		url: `https://spdx.org/licenses/${license}.html`,
		label: licenseName(license),
	};
}
