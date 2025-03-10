/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{js,ts,jsx,tsx,astro,css}'],
	theme: {
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background-primary))',
				backgroundSecondary: 'hsl(var(--background-secondary))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
				},
				card: {
					DEFAULT: 'hsl(var(--background-secondary))',
				},
			},
			animation: {
				hop: 'hop 0.6s ease-in-out infinite',
			},
			keyframes: {
				hop: {
					'0%, 100%': {
						transform: 'translateY(0) rotate3d(0, 1, 0, 0deg)',
					},
					'50%': {
						transform: 'translateY(-2px) rotate3d(0, 1, 0, 180deg)',
					},
				},
			},
			borderColor: {
				DEFAULT: 'hsl(var(--border))',
			},
		},
	},
	// plugins: [require('tailwindcss-animate')],
};
