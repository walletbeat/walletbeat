import { IconButton as OriginalIconButton, type IconButtonProps } from '@mui/material'
import type React from 'react'

/**
 * Wrapper for IconButton that reduces the very large margins around it.
 */
export function IconButton(props: IconButtonProps): React.JSX.Element {
	return (
		<OriginalIconButton
			{...props}
			sx={{
				...props.sx,
				marginTop: '-4px',
				marginBottom: '-4px',
				marginLeft: '-4px',
				marginRight: '-4px',
			}}
		>
			{props.children}
		</OriginalIconButton>
	)
}
