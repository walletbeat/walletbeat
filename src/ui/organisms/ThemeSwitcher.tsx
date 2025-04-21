import { type FC, useEffect, useState } from 'react'
import { LuSun, LuMoon } from 'react-icons/lu'

export const ThemeSwitcher: FC = () => {
	const [isDarkMode, setIsDarkMode] = useState<boolean | null>(null)

	// Initialize theme from localStorage or system preference
	useEffect(() => {
		// Check localStorage first
		const storedTheme = localStorage.getItem('theme')

		if (storedTheme !== null) {
			// Use stored preference
			const isDark = storedTheme === 'dark'
			setIsDarkMode(isDark)
			document.body.parentElement?.classList.toggle('dark', isDark)
		} else {
			// Check system preference
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
			setIsDarkMode(prefersDark)
			document.body.parentElement?.classList.toggle('dark', prefersDark)
		}
	}, [])

	const toggleTheme = (): void => {
		const newDarkMode = isDarkMode !== true
		setIsDarkMode(newDarkMode)

		// Update DOM
		document.body.parentElement?.classList.toggle('dark', newDarkMode)

		// Save to localStorage
		localStorage.setItem('theme', newDarkMode ? 'dark' : 'light')
	}

	// Don't render until we've determined the theme
	if (isDarkMode === null) {
		return <div className="size-[38px]"></div>
	}

	return (
		<div className="flex flex-row items-center gap-2 h-[34px]">
			<button onClick={toggleTheme} className="btn">
				{isDarkMode ? <LuMoon /> : <LuSun />}
			</button>
		</div>
	)
}
