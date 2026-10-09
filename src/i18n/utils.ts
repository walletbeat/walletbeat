import { type Language, ui, type UiStringKey } from './ui'

/** Returns a function that looks up UI strings in the given language. */
export function useTranslations(language: Language): (key: UiStringKey) => string {
	return key => ui[language][key]
}
