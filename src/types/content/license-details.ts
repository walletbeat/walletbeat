import type { EvaluationData } from '@/schema/attributes'
import { component, type Renderable } from '../content'
import type { OpenSourceValue } from '@/schema/attributes/transparency/open-source'
import type { References } from '@/schema/reference'

export interface LicenseDetailsProps extends EvaluationData<OpenSourceValue> {
	licenseRefs: References | null | undefined
}

export interface LicenseDetailsContent {
	component: 'LicenseDetails'
	componentProps: LicenseDetailsProps
}

export function licenseDetailsContent(
	bakedProps: Omit<LicenseDetailsProps, keyof EvaluationData<OpenSourceValue>>,
): Renderable<EvaluationData<OpenSourceValue>> {
	return component<LicenseDetailsContent, keyof typeof bakedProps>('LicenseDetails', bakedProps)
}
