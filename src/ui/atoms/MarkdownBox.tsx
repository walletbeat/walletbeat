import { Box, type BoxProps, type TypographyProps } from '@mui/material'
import type React from 'react'

import {
	MarkdownBase,
	type MarkdownOwnProps,
	deriveMarkdownPropsFromTypography,
} from './MarkdownBase'

interface MarkdownBoxProps extends BoxProps, MarkdownOwnProps {
	children: string
	pTypography?: TypographyProps
}

/**
 * Styled Markdown Box.
 */
export function MarkdownBox(props: MarkdownBoxProps): React.JSX.Element {
	const { pTypography, ...boxProps } = props
	const derivedMarkdownProps = deriveMarkdownPropsFromTypography(pTypography, props)

	return (
		<Box {...boxProps}>
			<MarkdownBase markdown={props.children} {...derivedMarkdownProps} />
		</Box>
	)
}
