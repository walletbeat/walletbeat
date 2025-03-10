import React, { type FC, useState } from 'react';
import { LuSun, LuMoon } from "react-icons/lu";

export const ThemeSwitcher: FC = () => {
	const [isDarkMode, setIsDarkMode] = useState(false);

	const toggleTheme = () => {
		setIsDarkMode(!isDarkMode);
		document.body.parentElement?.classList.toggle('dark', isDarkMode);
	};

	return (
		<div className="flex flex-row items-center gap-2">
			<button onClick={toggleTheme} className="btn">
				{isDarkMode ? <LuMoon /> : <LuSun />}
			</button>
		</div>
	);
};
