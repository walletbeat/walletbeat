import type { ListItemButton } from '@mui/material'
import type { Box } from '@mui/system'
import React, { memo, useState } from 'react'
import { LuMenu, LuX } from 'react-icons/lu'

import { type NonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'

import { ThemeSwitcher } from './ThemeSwitcher'

/**
 * A navigation item in the navigation menu.
 */
interface NavigationItemBase {
	/**
	 * Unique string identifying the item.
	 */
	id: string

	/**
	 * Item icon shown next to the item name in the navigation menu.
	 */
	icon?: string | { raw: string } | React.FC

	/**
	 * Item name in the navigation menu.
	 */
	title: string

	/**
	 * Set of children navigation items.
	 * Only one level of nesting is supported.
	 */
	children?: NavigationItem[]
}

/**
 * A navigation item in the navigation menu that also corresponds to a
 * content section in the main body of the page.
 */
export interface NavigationContentItem extends NavigationItemBase {
	/**
	 * The DOM `id` of the content block that the navigation item represents.
	 * Also used as URL anchor for that content section.
	 */
	contentId: string
}

export interface NavigationLinkItem extends NavigationItemBase {
	/**
	 * URL to navigate to when clicked.
	 */
	href: string
}

export type NavigationItem = NavigationContentItem | NavigationLinkItem

/**
 * Type predicate for `NavigationContentItem`.
 */
export function isNavigationContentItem(item: NavigationItem): item is NavigationContentItem {
	return Object.hasOwn(item, 'contentId')
}

/**
 * Type predicate for `NavigationLinkItem`.
 */
export function isNavigationLinkItem(item: NavigationItem): item is NavigationLinkItem {
	return Object.hasOwn(item, 'href')
}

/**
 * Set of logically-grouped navigation items.
 */
export interface NavigationGroup {
	/**
	 * Unique name for the group of items.
	 */
	id: string

	/**
	 * Set of navigation items in the group.
	 * This contains top-level navigation items only.
	 * Each item within may contain sub-items (with only one
	 * level of nesting).
	 */
	items: NonEmptyArray<NavigationItem>

	/**
	 * If true, allow this navigation group to scroll on the Y axis if it
	 * overflows, and expand this group to take as much height as possible.
	 * This should be true on at most one group in a set of navigation groups.
	 */
	overflow: boolean
}

/**
 * Icon shown next to navigation list items.
 */
function SingleListItemIcon({ children }: { children: React.ReactNode }): React.JSX.Element {
	return (
		<span
			key="listItemIcon"
			className="inline-block min-w-[20px] w-[20px] h-[20px] text-center mr-1"
			// sx={{
			// 	minWidth: `${navigationListIconSize}px`,
			// 	width: `${navigationListIconSize}px`,
			// 	height: `${navigationListIconSize}px`,
			// 	display: 'inline-block',
			// textAlign: 'center',
			// marginRight: '4px',
			// }}
		>
			{children}
		</span>
	)
}

interface NavigationItemProps {
	item: NavigationItem
	active: boolean
	depth: 'primary' | 'secondary'
	// sx?: React.ComponentProps<typeof ListItem>['sx']
	onContentItemClick?: (item: NavigationContentItem) => void
}

/**
 * A single navigation list item.
 */
const NavigationItem = memo(
	function NavigationItem({ item, active }: NavigationItemProps): React.JSX.Element {
		const [isOpen, setIsOpen] = useState(false)
		const linkStyles =
			'whitespace-nowrap flex flex-row items-center gap-2 py-1.5 px-2 hover:bg-backgroundSecondary rounded-md'
		const hasChildren = (item.children?.length ?? 0) > 0

		const toggleDropdown = (e: React.MouseEvent): void => {
			if (hasChildren) {
				e.preventDefault()
				setIsOpen(!isOpen)
			}
		}

		const ButtonComponent = ({
			children,
		}: {
			children: React.ComponentProps<typeof ListItemButton>['children']
		}): React.JSX.Element => {
			if (isNavigationContentItem(item)) {
				return (
					<a
						href={hasChildren ? '#' : `#${item.contentId}`}
						className={linkStyles}
						onClick={toggleDropdown}
					>
						{children}
						{hasChildren && (
							<span className="ml-auto">
								<svg
									stroke="currentColor"
									fill="none"
									strokeWidth="2"
									viewBox="0 0 24 24"
									strokeLinecap="round"
									strokeLinejoin="round"
									height="1em"
									width="1em"
									xmlns="http://www.w3.org/2000/svg"
									className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
								>
									<polyline points="6 9 12 15 18 9"></polyline>
								</svg>
							</span>
						)}
					</a>
				)
			}
			if (isNavigationLinkItem(item)) {
				return (
					<a
						href={hasChildren ? '#' : item.href}
						target={!hasChildren && item.href.startsWith('https://') ? '_blank' : undefined}
						rel="noreferrer"
						className={linkStyles}
						onClick={toggleDropdown}
					>
						{children}
						{hasChildren && (
							<span className="ml-auto">
								<svg
									stroke="currentColor"
									fill="none"
									strokeWidth="2"
									viewBox="0 0 24 24"
									strokeLinecap="round"
									strokeLinejoin="round"
									height="1em"
									width="1em"
									xmlns="http://www.w3.org/2000/svg"
									className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
								>
									<polyline points="6 9 12 15 18 9"></polyline>
								</svg>
							</span>
						)}
					</a>
				)
			}
			throw new Error('Invalid navigation item')
		}
		return (
			<li key={`listItem-${item.id}`} id={`listItem-${item.id}`}>
				<ButtonComponent key="buttonComponent">
					{item.icon ? (
						<SingleListItemIcon key="icon">
							{typeof item.icon === 'string' ? (
								item.icon.length <= 2 ? (
									item.icon
								) : (
									<img src={item.icon} />
								)
							) : 'raw' in item.icon ? (
								<span dangerouslySetInnerHTML={{ __html: item.icon.raw }} />
							) : (
								<item.icon />
							)}
						</SingleListItemIcon>
					) : null}
					<span>{item.title}</span>
				</ButtonComponent>

				{hasChildren && (
					<ul
						key={`subitems-${item.id}`}
						className={`pl-2 border-l ml-3 flex flex-col gap-0.5 overflow-hidden transition-all ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
					>
						{item.children?.map(subitem => (
							<NavigationItem
								key={`subitem-${subitem.id}`}
								item={subitem}
								depth="secondary"
								active={active}
								onContentItemClick={undefined}
							/>
						))}
					</ul>
				)}
			</li>
		)
	},
	(prevProps: Readonly<NavigationItemProps>, nextProps: Readonly<NavigationItemProps>): boolean =>
		prevProps.item.id === nextProps.item.id &&
		prevProps.depth === nextProps.depth &&
		prevProps.active === nextProps.active,
)

interface NavigationGroupProps {
	group: NavigationGroup
	groupIndex: number
	activeItemId?: string
	onContentItemClick?: (item: NavigationContentItem) => void
}

export const NavigationGroup = memo(
	function NavigationGroup({
		group,
		activeItemId,
		onContentItemClick,
	}: NavigationGroupProps): React.JSX.Element {
		return (
			<>
				<ul className="flex flex-col gap-0 p-0 m-0">
					{nonEmptyMap(group.items, item => (
						<React.Fragment key={`fragment-${item.id}`}>
							<NavigationItem
								key={`item-${item.id}`}
								item={item}
								active={activeItemId === item.id}
								depth="secondary"
								onContentItemClick={onContentItemClick}
							/>
						</React.Fragment>
					))}
				</ul>
			</>
		)
	},
	(
		prevProps: Readonly<NavigationGroupProps>,
		nextProps: Readonly<NavigationGroupProps>,
	): boolean => {
		if (prevProps.group !== nextProps.group) {
			return false
		}
		if (prevProps.groupIndex !== nextProps.groupIndex) {
			return false
		}
		if (prevProps.onContentItemClick !== nextProps.onContentItemClick) {
			return false
		}
		if (prevProps.activeItemId === nextProps.activeItemId) {
			return true
		}
		// Check if active item ID is one of the sub-items of this group.
		for (const props of [prevProps, nextProps]) {
			for (const item of props.group.items) {
				if (item.id === props.activeItemId) {
					return false
				}
				for (const subItem of item.children ?? []) {
					if (subItem.id === props.activeItemId) {
						return false
					}
				}
			}
		}
		return true
	},
)

/**
 * The navigation bar on a page.
 */
export function Navigation({
	groups,
	activeItemId,
	onContentItemClick = undefined,
	prefix,
}: {
	groups: NonEmptyArray<NavigationGroup>
	activeItemId?: string
	flex?: React.ComponentProps<typeof Box>['flex']
	onContentItemClick?: (item: NavigationContentItem) => void
	prefix?: React.ReactNode
}): React.JSX.Element {
	const [isOpen, setIsOpen] = useState(false)

	// Toggle menu
	const toggleMenu = (): void => {
		setIsOpen(!isOpen)
		// Toggle body scroll lock when the mobile menu is toggled
		if (!isOpen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = ''
		}
	}

	return (
		<>
			{/* Fixed top bar for mobile */}
			<div className="lg:hidden fixed top-0 left-0 right-0 flex justify-between items-center px-4 bg-background z-50 border-b border-borderColor h-16">
				<a href="/" className="flex items-center">
					<img
						src="/logo-light.svg"
						alt="WalletBeat Logo"
						className="h-8 w-auto block dark:hidden transition-all"
					/>
					<img
						src="/logo-dark.svg"
						alt="WalletBeat Logo"
						className="h-8 w-auto hidden dark:block transition-all"
					/>
				</a>
				<div className="flex items-center gap-2 h-[34px]">
					<ThemeSwitcher />
					<button
						onClick={toggleMenu}
						className="btn"
						aria-label={isOpen ? 'Close menu' : 'Open menu'}
					>
						{isOpen ? <LuX size={16} /> : <LuMenu size={16} />}
					</button>
				</div>
			</div>

			{/* Placeholder div to push content down on mobile */}
			<div className="lg:hidden h-16"></div>

			{/* Navigation sidebar - desktop behavior differs from mobile */}
			<div
				key="navigationBox"
				className={`
				    /* Base styles */
				    fixed lg:relative h-full z-40
				    flex flex-col gap-0 overflow-y-auto

				    /* Full width on mobile, constrained on desktop */
				    w-full lg:w-auto lg:max-w-xs

				    /* Positioning */
				    inset-0 lg:inset-auto

				    /* Desktop styles - always visible and positioned */
				    lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-0

				    /* Mobile styles - controlled by state */
				    lg:translate-x-0
				    transition-transform duration-300
				    ${isOpen ? 'translate-x-0' : '-translate-x-full'}

				    /* Background color */
				    bg-[var(--navigation-bg)]
				`}
			>
				{/* Logo area */}
				<div className="flex justify-between items-center w-full gap-4 pl-6 pr-4 mb-5 lg:mt-8 pt-16 lg:pt-0 h-[34px]">
					<a href="/" className="hidden lg:flex items-center">
						<img
							src="/logo-light.svg"
							alt="WalletBeat Logo"
							className="h-8 w-auto block dark:hidden transition-all"
						/>
						<img
							src="/logo-dark.svg"
							alt="WalletBeat Logo"
							className="h-8 w-auto hidden dark:block transition-all"
						/>
					</a>
					<div className="hidden lg:block">
						<ThemeSwitcher />
					</div>
				</div>

				{/* Search/prefix component */}
				{typeof prefix !== 'undefined' && prefix !== null ? (
					<div className="px-4 mb-2 w-full">{prefix}</div>
				) : null}

				<div className="flex flex-col gap-2 px-3">
					{nonEmptyMap(groups, (group, groupIndex) => (
						<NavigationGroup
							key={`navigationGroup-${group.id}`}
							group={group}
							groupIndex={groupIndex}
							onContentItemClick={onContentItemClick}
							activeItemId={activeItemId}
						/>
					))}
				</div>
				<div className="mt-auto mx-4 mb-4 px-4 py-3 text-secondary bg-[var(--accent-very-light)] text-sm text-left rounded-lg">
					Wallets listed on this page are not official endorsements, and are provided for
					informational purposes only.
				</div>
			</div>

			{/* Overlay for mobile menu - only visible when menu is open on mobile */}
			{isOpen && (
				<div
					className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
					onClick={toggleMenu}
					aria-hidden="true"
				/>
			)}
		</>
	)
}
