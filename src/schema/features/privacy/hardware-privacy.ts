import type { WithRef } from '@/schema/reference';

export enum HardwarePrivacyType {
	PASS = 'PASS',
	PARTIAL = 'PARTIAL',
	FAIL = 'FAIL',
}

export interface HardwarePrivacySupport {
	type: HardwarePrivacyType;
	url?: string;
	details?: string;
	phoningHome: HardwarePrivacyType;
	inspectableRemoteCalls: HardwarePrivacyType;
	wirelessPrivacy: HardwarePrivacyType;
}

export type HardwarePrivacyImplementation = WithRef<HardwarePrivacySupport>;
