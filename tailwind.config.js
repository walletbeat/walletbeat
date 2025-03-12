/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{js,ts,jsx,tsx,astro,css}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'var(--background-primary)',
				backgroundSecondary: 'var(--background-secondary)',
				primary: {
					DEFAULT: 'var(--primary)',
				},
				card: {
					DEFAULT: 'hsl(var(--background-secondary))',
				},
				accent: 'var(--accent)',
			},
			borderColor: {
				DEFAULT: 'var(--border)',
			},
			backgroundColor: {
				secondary: 'var(--background-secondary)',
			},
			textColor: {
				inverse: 'var(--text-inverse)',
				primary: 'var(--text-primary)',
				secondary: 'var(--text-secondary)',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
};
