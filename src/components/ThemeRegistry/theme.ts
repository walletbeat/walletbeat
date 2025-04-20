import { deepmerge } from '@mui/utils'
import { createTheme, type ThemeOptions as MaterialThemeOptions } from '@mui/material/styles'
import type {} from '@mui/x-data-grid/themeAugmentation'

/* eslint @typescript-eslint/no-magic-numbers: 0 -- A theme file will have numbers and hex codes in it, this is normal. */

/** Color options for rating pie slices. */
export interface RatingThemeOptions {
	fail: string
	partial: string
	pass: string
	unrated: string
	exempt: string
}

/** Expanded ThemeOptions and palette. */
export type ThemeOptions = MaterialThemeOptions & {
	palette?: MaterialThemeOptions['palette'] & {
		rating?: RatingThemeOptions
	}
}

const themeOptions: ThemeOptions = {
	palette: {
		mode: 'dark',
		primary: {
			main: '#CDEAF7',
			contrastText: '#292C34',
			light: '#E0F2FA',
			dark: '#7DCAEE',
		},
		secondary: {
			main: '#105C7E',
			contrastText: '#F1FAFD',
			light: '#198DC2',
			dark: '#082E3F',
		},
		background: {
			default: '#22242b',
			paper: '#292C34',
		},
		text: {
			primary: '#FAFDFF',
			secondary: '#A7ACB9',
			disabled: '#C6C9D2',
		},
		divider: '#3f4350',
		error: {
			main: '#ff666a',
			contrastText: '#FFA3A6',
		},
		success: {
			main: '#80ffa2',
			contrastText: '#292C34',
		},
		rating: {
			fail: '#e74c3c',
			partial: '#f1c40f',
			pass: '#2ecc71',
			unrated: '#bdc3c7',
			exempt: '#bdc3c7',
		},
	},
	typography: {
		fontFamily: 'inherit',
		fontWeightBold: 800,
		fontWeightMedium: 600,
		fontWeightRegular: 500,
		fontWeightLight: 300,
		h1: {
			fontWeight: 700,
			fontSize: '4rem',
		},
		h2: {
			fontWeight: 700,
			fontSize: '2.5rem',
		},
		h3: {
			fontWeight: 600,
			fontSize: '2rem',
		},
		h4: {
			fontWeight: 600,
			fontSize: '1.65rem',
		},
		h5: {
			fontWeight: 400,
			fontSize: '1.4rem',
		},
		h6: {
			fontWeight: 400,
			fontSize: '1.25rem',
		},
		body1: {
			fontWeight: 400,
			fontSize: '1.2rem',
		},
		body2: {
			fontWeight: 300,
			fontSize: '1.1rem',
		},
		caption: {
			fontWeight: 300,
			fontSize: '1rem',
		},
		button: {
			fontWeight: 600,
		},
	},
	shape: {
		borderRadius: 10,
	},
	components: {
		MuiButton: {
			defaultProps: {
				sx: {
					textTransform: 'none',
					'&:hover': {
						backgroundColor: 'primary.light',
					},
					'&:active': {
						backgroundColor: 'primary.light',
					},
					fontWeight: 700,
				},
			},
			styleOverrides: {
				root: {
					'&.MuiButton-containedSuccess:hover': {
						backgroundColor: '#B3FFC7',
					},
				},
			},
		},
		MuiInputBase: {
			styleOverrides: {
				root: {
					fontSize: 'inherit !important',
				},
			},
		},
		MuiDataGrid: {
			styleOverrides: {
				root: {
					'& .MuiDataGrid-cell:focus': {
						outline: 'none',
					},
					'& .MuiDataGrid-cell:focus-within': {
						outline: 'none',
					},
					'& .MuiDataGrid-columnHeader:focus': {
						outline: 'none',
					},
				},
			},
		},
	},
}

const theme = createTheme(themeOptions)

export default theme

const subsectionThemeOptions: ThemeOptions = {
	typography: {
		// Top-level headers don't exist in subsections.
		// They are for page-wide titles.
		h1: undefined,
		// Second-level headers also don't exist in subsection.
		// They only make sense as top-level section headers.
		h2: undefined,
		// h3 is where subsection headers start to make sense.
		h3: {
			fontWeight: 500,
			fontSize: '1.5rem',
		},
		// h4 is used inside accordion headers.
		h4: {
			fontWeight: 400,
			fontSize: '1.1rem',
		},
		// h5 is used inside accordion box sections.
		h5: {
			fontWeight: 400,
			fontSize: '1.05rem',
		},
		// h6 is used inside accordion box subsections.
		h6: {
			fontWeight: 400,
			fontSize: '1.025rem',
		},
		body1: {
			fontWeight: 400,
			fontSize: '1rem',
		},
		body2: {
			fontWeight: 300,
			fontSize: '0.975rem',
		},
		caption: {
			fontWeight: 300,
			fontSize: '1rem',
		},
	},
}

export const subsectionTheme = createTheme(deepmerge(themeOptions, subsectionThemeOptions))

const walletTableThemeOptions: ThemeOptions = {
	typography: {
		// Top-level headers don't exist in the wallet table.
		// They are for page-wide titles.
		h1: undefined,
		// Second-level headers are used for wallet names.
		h2: {
			fontWeight: 500,
			fontSize: '1.4rem',
		},
		// Third-level headers are used for attribute group titles.
		h3: {
			fontWeight: 500,
			fontSize: '0.85rem',
		},
		// Fourth-level headers are used for single attribute titles.
		h4: {
			fontWeight: 500,
			fontSize: '0.85rem',
		},
		body1: {
			fontWeight: 400,
			fontSize: '0.85rem',
			lineHeight: 1.25,
		},
		body2: {
			fontWeight: 300,
			fontSize: '0.85rem',
			lineHeight: 1.25,
		},
		caption: {
			fontWeight: 300,
			fontSize: '0.75rem',
		},
	},
	components: {
		MuiDataGrid: {
			styleOverrides: {
				root: {
					'& .MuiDataGrid-row--borderBottom': {
						backgroundColor: 'var(--background-row-border)',
					},
				},
			},
		},
	},
}

// Create light mode version of the wallet table theme
const lightWalletTableThemeOptions: ThemeOptions = {
	palette: {
		mode: 'light',
		primary: {
			main: '#105C7E',
			contrastText: '#F1FAFD',
			light: '#198DC2',
			dark: '#082E3F',
		},
		background: {
			default: '#ffffff',
			paper: '#f5f5f5',
		},
		text: {
			primary: '#292C34',
			secondary: '#545864',
			disabled: '#888B94',
		},
		divider: '#e0e0e0',
		rating: {
			fail: '#fde8e7', // Light red
			partial: '#fff3dc', // Light yellow
			pass: '#e6f5ed', // Light green
			unrated: '#f0f0f0', // Light gray
			exempt: '#f0f0f0', // Light gray
		},
	},
}

// Create walletTableTheme with theme-specific CSS variables
export const walletTableTheme = createTheme(deepmerge(themeOptions, walletTableThemeOptions))
export const lightWalletTableTheme = createTheme(
	deepmerge(deepmerge(themeOptions, lightWalletTableThemeOptions), walletTableThemeOptions),
)

// Add theme-specific CSS variables
walletTableTheme.components = deepmerge(walletTableTheme.components || {}, {
	MuiCssBaseline: {
		styleOverrides: {
			':root': {
				'--background-row-border': '#6a1b9a',
			},
		},
	},
})

lightWalletTableTheme.components = deepmerge(lightWalletTableTheme.components || {}, {
	MuiCssBaseline: {
		styleOverrites: {
			':root': {
				'--background-row-border': '#e0f2ff',
			},
		},
	},
})

// Add light theme options
export const lightThemeOptions: ThemeOptions = {
	...themeOptions,
	palette: {
		...themeOptions.palette,
		mode: 'light',
		background: {
			default: '#ffffff',
			paper: '#f5f5f5',
		},
		text: {
			primary: '#1a1a1a',
			secondary: '#666666',
			disabled: '#999999',
		},
		rating: {
			fail: '#fde8e7', // Light red
			partial: '#fff3dc', // Light yellow
			pass: '#e6f5ed', // Light green
			unrated: '#f0f0f0', // Light gray
			exempt: '#f0f0f0', // Light gray
		},
	},
}
