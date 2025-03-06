import { type FullyQualifiedReference, mergeRefs } from '@/schema/reference'
import React from 'react'
import { JoinedList } from './JoinedList'
import { nonEmptyMap } from '@/types/utils/non-empty'
import { Link, Tooltip } from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'

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
						{ref.explanation ?? 'Reference:'}{' '}
						<JoinedList
							data={nonEmptyMap(ref.urls, url => ({
								key: url.url,
								value: (
									<Tooltip title={url.label} arrow={true}>
										<Link href={url.url} target="_blank" rel="noopener noreferrer nofollow">
											<InfoIcon color="inherit" fontSize="inherit" />
										</Link>
									</Tooltip>
								),
							}))}
							separator=" "
							lastSeparator=" "
						/>
					</li>
				))}
			</ul>
		</React.Fragment>
	)
}
