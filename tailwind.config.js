/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './src/index.css'],
	theme: {
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				backgroundSecondary: 'hsl(var(--background-secondary))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
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
