export const childHeadingLevel = {
	1: 2,
	2: 3,
	3: 4,
	4: 5,
	5: 6,
} as const

export type ParentHeadingLevel = keyof typeof childHeadingLevel
export type GrandparentHeadingLevel = {
	[Level in ParentHeadingLevel]: (typeof childHeadingLevel)[Level] extends ParentHeadingLevel
		? Level
		: never
}[ParentHeadingLevel]
