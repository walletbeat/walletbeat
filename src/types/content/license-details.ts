import type { EvaluationData } from '@/schema/attributes'
import type { OpenSourceValue } from '@/schema/attributes/transparency/open-source'

import { component, type Content } from '../content'

export interface LicenseDetailsProps extends EvaluationData<OpenSourceValue> {}

export interface LicenseDetailsContent {
	component: 'LicenseDetails'
	componentProps: LicenseDetailsProps
}

export function licenseDetailsContent(): Content<EvaluationData<OpenSourceValue>> {
	return component<LicenseDetailsContent, never>('LicenseDetails', {})
}
