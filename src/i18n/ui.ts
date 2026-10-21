/** Languages the site's UI strings are available in, keyed by BCP 47 language tag. */
export const languages = {
	en: 'English',
} as const

export type Language = keyof typeof languages

export const defaultLanguage: Language = 'en'

const en = {
	'footer.madeBy': 'Made with 🌸 & 💗 by the',
	'footer.contributors': 'Walletbeat contributors',
	'footer.linksLabel': 'Walletbeat links',
	'footer.githubLabel': 'Walletbeat on GitHub',
	'footer.xLabel': 'Walletbeat on X',
	'footer.farcasterLabel': 'Walletbeat on Farcaster',
	'footer.disclaimer':
		'Wallets listed on Walletbeat do not represent endorsements and are for informational purposes only.',
} as const

export type UiStringKey = keyof typeof en

/** UI strings for each language. Every language defines every key. */
export const ui: Record<Language, Record<UiStringKey, string>> = {
	en,
}
