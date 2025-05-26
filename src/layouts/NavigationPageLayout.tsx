import { ThemeProvider } from '@mui/material'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import theme from '@/components/ThemeRegistry/theme'
import type { NonEmptyArray } from '@/types/utils/non-empty'
import {
	isNavigationContentItem,
	Navigation,
	type NavigationGroup,
	type NavigationItem,
} from '@/ui/organisms/Navigation'

const scrollNavigationMargin = 8

// Debounce function to limit how often a function is called
function debounce<T extends (...args: Parameters<T>) => void>(
	fn: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let timer: ReturnType<typeof setTimeout> | null = null

	return (...args: Parameters<T>) => {
		if (timer !== null) {
			clearTimeout(timer)
		}
		timer = setTimeout(() => {
			fn(...args)
		}, delay)
	}
}

export function NavigationPageLayout({
	groups,
	children,
	contentDependencies = [],
	stickyHeaderId = undefined,
	stickyHeaderMargin = undefined,
	prefix,
	selectedItemId = undefined,
	selectedGroupId = undefined,
}: {
	/**
	 * Set of navigation item groups.
	 */
	groups: NonEmptyArray<NavigationGroup>

	/**
	 * Content of the page.
	 */
	children: React.ReactNode

	/**
	 * If the content has a sticky header, the DOM ID of that header.
	 */
	stickyHeaderId?: string

	/**
	 * If the content has a sticky header, the number of pixels below that
	 * header which should be considered clear for the purpose of computing
	 * content scroll offset.
	 */
	stickyHeaderMargin?: number

	/**
	 * Set of dependencies that can change the content of the page, at least
	 * in terms of the existence or disappearance of content items.
	 * `groups` is already implicitly included in this.
	 */
	contentDependencies?: React.DependencyList

	/**
	 * Prefix to display in the navigation bar.
	 */
	prefix?: React.ReactNode

	selectedItemId?: string
	selectedGroupId?: string
}): React.JSX.Element {
	const [activeItemId, setActiveItemId] = useState<string>('')

	const scrollNavigationTo = useCallback(
		(itemId: string): void => {
			const listItem = document.getElementById(`listItem-${itemId}`)
			if (listItem === null) {
				return
			}
			const itemGroup: NavigationGroup | undefined = groups.find(
				(group: NavigationGroup): boolean =>
					group.items.some((navItem: NavigationItem): boolean => navItem.id === itemId),
			)
			if (itemGroup === undefined) {
				return
			}
			const navigation = document.getElementById(`navigationGroup-${itemGroup.id}`)
			if (navigation === null) {
				return
			}
			const navigationRect = navigation.getBoundingClientRect()
			const listItemRect = listItem.getBoundingClientRect()
			if (listItemRect.top < navigationRect.top) {
				navigation.scrollBy({
					top: listItemRect.top - navigationRect.top - scrollNavigationMargin,
					behavior: 'smooth',
				})
			} else if (listItemRect.bottom > navigationRect.bottom) {
				navigation.scrollBy({
					top: listItemRect.bottom - navigationRect.bottom + scrollNavigationMargin,
					behavior: 'smooth',
				})
			}
		},
		[groups],
	)

	useEffect(() => {
		if (activeItemId !== '') {
			scrollNavigationTo(activeItemId)
		}
	}, [activeItemId, scrollNavigationTo])

	const isPageSmoothScrolling = useRef(false)

	const onHashChange = useCallback((e: HashChangeEvent) => {
		const newUrl = new URL(e.newURL)
		if (newUrl.hash !== '') {
			setActiveItemId(newUrl.hash.slice(1))
		}

		isPageSmoothScrolling.current = true

		document.addEventListener(
			'scrollend',
			(_: Event) => {
				isPageSmoothScrolling.current = false
			},
			{ once: true },
		)

		// Set a timeout to reset the flag in case scrollend doesn't fire
		setTimeout(() => {
			isPageSmoothScrolling.current = false
		}, 1000)
	}, [])

	useEffect(() => {
		window.addEventListener('hashchange', onHashChange, { passive: true })
		return () => {
			window.removeEventListener('hashchange', onHashChange)
		}
	}, [onHashChange])

	const onScroll = useCallback(
		(_: Event) => {
			if (isPageSmoothScrolling.current) {
				return
			}

			const stickyHeaderElement =
				stickyHeaderId !== undefined ? document.getElementById(stickyHeaderId) : undefined

			const topBound =
				(stickyHeaderElement?.getBoundingClientRect().bottom ?? 0) + (stickyHeaderMargin ?? 0)

			const items = groups
				.flatMap(group =>
					group.items.flatMap(topLevelItem => [topLevelItem, ...(topLevelItem.children ?? [])]),
				)
				.filter(isNavigationContentItem)

			const activeItem = items.find((item, i, { length }) => {
				if (i === length - 1) {
					return true
				}

				const headingElement = document.getElementById(item.contentId)
				return headingElement !== null && headingElement.getBoundingClientRect().bottom > topBound
			})

			setActiveItemId(activeItem === undefined ? '' : activeItem.id)
		},
		[groups, stickyHeaderId, stickyHeaderMargin],
	)

	// Debounce the scroll handler to improve performance
	const debouncedScrollHandler = useCallback(debounce(onScroll, 100), [onScroll])

	useEffect(() => {
		window.addEventListener('scroll', debouncedScrollHandler, { passive: true })
		return () => {
			window.removeEventListener('scroll', debouncedScrollHandler)
		}
	}, [debouncedScrollHandler, ...contentDependencies])

	return (
		<ThemeProvider theme={theme}>
			<div className="flex flex-col lg:flex-row w-full min-h-screen max-w-screen">
				<Navigation
					key="navigation"
					groups={groups}
					activeItemId={activeItemId}
					prefix={prefix}
					selectedItemId={selectedItemId}
					selectedGroupId={selectedGroupId}
				/>

				<div key="contentContainer" className="flex-grow overflow-y-auto min-h-screen w-full pb-24">
					<div className="mx-auto w-full">{children}</div>
				</div>
			</div>
		</ThemeProvider>
	)
}
