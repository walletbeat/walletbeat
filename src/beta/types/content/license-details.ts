import type { EvaluationData } from '@/beta/schema/attributes';
import { component, type Renderable } from '../content';
import type { OpenSourceValue } from '@/beta/schema/attributes/transparency/open-source';

export interface LicenseDetailsProps extends EvaluationData<OpenSourceValue> {}

export interface LicenseDetailsContent {
  component: 'LicenseDetails';
  componentProps: LicenseDetailsProps;
}

export function licenseDetailsContent(): Renderable<EvaluationData<OpenSourceValue>> {
  return component<LicenseDetailsContent, never>('LicenseDetails', {});
}
