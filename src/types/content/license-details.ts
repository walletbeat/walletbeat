import type { EvaluationData } from '@/schema/attributes';
import type { OpenSourceValue } from '@/schema/attributes/transparency/open-source';

import { type Content, component } from '../content';

export interface LicenseDetailsProps extends EvaluationData<OpenSourceValue> {}

export interface LicenseDetailsContent {
  component: 'LicenseDetails';
  componentProps: LicenseDetailsProps;
}

export function licenseDetailsContent(): Content<{ WALLET_NAME: string }> {
  return component<LicenseDetailsContent, never>('LicenseDetails', {});
}
