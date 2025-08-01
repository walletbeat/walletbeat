import { styled, Typography, type TypographyProps } from '@mui/material'
import { Box } from '@mui/system'
import type React from 'react'
import Markdown, { type Components } from 'react-markdown'

import { lookupEip } from '@/data/eips'
import { trimWhitespacePrefix } from '@/types/utils/text'

import { EipLink } from './EipLink'
import { ExternalLink } from './ExternalLink'

export interface MarkdownOwnProps {
	markdownTransform?: (markdown: string) => string
	pVariant?: React.ComponentProps<typeof Typography>['variant']
	pFontWeight?: React.ComponentProps<typeof Typography>['fontWeight']
	textColor?: React.ComponentProps<typeof Typography>['color']
	pSpacing?: React.ComponentProps<typeof Typography>['marginTop'] & string
	liSpacing?: React.ComponentProps<typeof Typography>['marginTop'] & string
}

export function deriveMarkdownPropsFromTypography(
	typographyProps?: TypographyProps,
	markdownProps?: MarkdownOwnProps,
): MarkdownOwnProps {
	let marginTop: string | undefined = undefined

	if (typographyProps?.marginTop !== undefined) {
		if (typeof typographyProps.marginTop === 'number') {
			marginTop = `${typographyProps.marginTop}px`
		} else if (typeof typographyProps.marginTop === 'string') {
			marginTop = typographyProps.marginTop
		}
	}

	return {
		markdownTransform: markdownProps?.markdownTransform,
		textColor: markdownProps?.textColor ?? typographyProps?.color,
		pFontWeight: markdownProps?.pFontWeight ?? typographyProps?.fontWeight,
		pVariant: markdownProps?.pVariant ?? typographyProps?.variant,
		pSpacing: markdownProps?.pSpacing ?? marginTop,
		liSpacing: markdownProps?.liSpacing ?? markdownProps?.pSpacing ?? marginTop,
	}
}

const StyledMarkdown = styled(Box, {
	shouldForwardProp: prop => prop !== 'pSpacing' && prop !== 'liSpacing',
})(
	({ pSpacing, liSpacing }: MarkdownOwnProps) => `
		ul {
			list-style: disc;
			padding-left: 1rem;
		}
		p, li {
			margin-top: 0px;
		}

		${
			pSpacing !== undefined
				? `
					p + p, ul + p {
						margin-top: ${pSpacing};
					}
				`
				: ''
		}

		${
			liSpacing !== undefined
				? `
					li + li:not(li li), li li:not(li li + li), p + ul > li {
						margin-top: ${pSpacing};
					}
					li li + li {
						margin-top: calc(${pSpacing} / 2);
					}
				`
				: ''
		}
	`,
)

/**
 * Markdown rendering.
 *
 * Should not be used directly; use MarkdownBox or MarkdownTypography.
 */
export function MarkdownBase({
	markdown,
	markdownTransform = undefined,
	pVariant = undefined,
	pFontWeight = undefined,
	pSpacing = '1rem',
	liSpacing = '0.25rem',
	textColor = 'inherit',
}: {
	markdown: string
} & MarkdownOwnProps): React.JSX.Element {
	const componentsMap: Components = {
		a: ({ href, children }) => {
			const hrefStr = href ?? '#'
			const eipRegexp =
				/^https:\/\/eips\.ethereum\.org\/EIPS\/eip-(\d+)#wb-format=(short|long)$/i.exec(hrefStr)

			if (eipRegexp !== null) {
				const eip = lookupEip(+eipRegexp[1])

				if (eip !== undefined) {
					return <EipLink eip={eip} format={eipRegexp[2] === 'short' ? 'SHORT' : 'LONG'} />
				}
			}

			if (/^[-_\w+:]/.exec(hrefStr) !== null) {
				// External link.
				return <ExternalLink url={hrefStr}>{children}</ExternalLink>
			}

			return <a href={hrefStr}>{children}</a>
		},
		p: ({ children }) => (
			<Typography variant={pVariant} color={textColor} fontWeight={pFontWeight}>
				{children}
			</Typography>
		),
		li: ({ children }) => (
			<li>
				<Typography component='span' variant={pVariant} color={textColor} fontWeight={pFontWeight}>
					{children}
				</Typography>
			</li>
		),
	}

	markdown = trimWhitespacePrefix(markdown)

	if (markdownTransform !== undefined) {
		markdown = markdownTransform(markdown)
	}

	return (
		<StyledMarkdown pSpacing={pSpacing} liSpacing={liSpacing}>
			<Markdown components={componentsMap}>{markdown}</Markdown>
		</StyledMarkdown>
	)
}
