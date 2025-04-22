import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import type React from 'react'

import EmotionCacheProvider from './EmotionCacheProvider'
import theme from './theme'

export default function ThemeRegistry({
	children,
}: {
	children: React.ReactNode
}): React.ReactNode {
	return (
		<EmotionCacheProvider options={{ key: 'mui' }}>
			<ThemeProvider theme={theme}>
				{/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
				<CssBaseline />
				{children}
			</ThemeProvider>
		</EmotionCacheProvider>
	)
}
