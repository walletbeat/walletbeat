import type { WithRef } from '@/schema/reference';

export enum KeysHandlingType {
	PASS = 'PASS',
	PARTIAL = 'PARTIAL',
	FAIL = 'FAIL',
}

export interface KeysHandlingSupport {
	type: KeysHandlingType;
	url?: string;
	details?: string;
	masterSecretGeneration: KeysHandlingType;
	proprietaryKeyMechanisms: KeysHandlingType;
	keyTransmission: KeysHandlingType;
	physicalAttackResistance: KeysHandlingType;
}

export type KeysHandlingImplementation = WithRef<KeysHandlingSupport>;
