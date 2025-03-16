import type { Entity } from '@/schema/entity'
import { isUrl } from '@/schema/url'
import { Tooltip } from '@mui/material'
import type React from 'react'
import { ExternalLink } from './ExternalLink'

export function EntityLink({ entity }: { entity: Entity }): React.JSX.Element {
	let entityName: React.ReactNode | null = null
	if (entity.legalName === 'NOT_A_LEGAL_ENTITY') {
		entityName = <strong>{entity.name}</strong>
	} else if (entity.legalName.soundsDifferent) {
		entityName = (
			<Tooltip title={entity.legalName.name} arrow={true}>
				<strong>{entity.name}</strong>
			</Tooltip>
		)
	} else {
		entityName = <strong>{entity.legalName.name}</strong>
	}
	if (isUrl(entity.url)) {
		entityName = <ExternalLink url={entity.url}>{entityName}</ExternalLink>
	}
	return entityName
}
