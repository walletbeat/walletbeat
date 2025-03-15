import { type FullyQualifiedReference, mergeRefs } from '@/schema/reference'
import React from 'react'
import { ReferenceLinks } from './ReferenceLinks'

export function ReferenceList({
	key,
	ref,
	ifEmpty = undefined,
	ulStyle = undefined,
}: {
	key?: string
	ref: FullyQualifiedReference | FullyQualifiedReference[]
	ifEmpty?: React.JSX.Element
	ulStyle?: React.CSSProperties
}): React.JSX.Element | undefined {
	let refs = ref
	if (!Array.isArray(refs)) {
		refs = [refs]
	}
	if (refs.length === 0) {
		return ifEmpty
	}
	refs = mergeRefs(...refs)
	return (
		<React.Fragment key={key}>
			<ul style={ulStyle}>
				{refs.map(ref => (
					<li key={ref.urls[0].url}>
						{ref.explanation ?? 'Reference:'}
						<ReferenceLinks ref={ref} showExplanation={false} nonEmptyPrefix=" " />
					</li>
				))}
			</ul>
		</React.Fragment>
	)
}
