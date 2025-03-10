import { type NonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'
import type { ListItemButton } from '@mui/material'
import type { Box } from '@mui/system'
import React, { memo } from 'react'
import { ThemeSwitcher } from './ThemeSwitcher'

/**
 * Size of the navigation menu, in pixels.
 */
const drawerWidth = 280

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
	icon?: React.ReactNode

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
	function NavigationItem({ item, active, depth }: NavigationItemProps): React.JSX.Element {
		const linkStyles = "whitespace-nowrap flex flex-row items-center gap-2 py-1 hover:bg-backgroundSecondary rounded-md px-4";

		const ButtonComponent = ({
			children,
		}: {
			children: React.ComponentProps<typeof ListItemButton>['children']
		}): React.JSX.Element => {
			if (isNavigationContentItem(item)) {
				return (
					<a
						// component="a"
						href={`#${item.contentId}`}
						className={linkStyles}
					// disableRipple={true}
					// selected={active}
					// sx={{ borderRadius: `${navigationListItemRadius}px` }}
					>
						{children}
					</a>
				)
			}
			if (isNavigationLinkItem(item)) {
				return (
					<a
						// component="a"
						href={item.href}
						target={item.href.startsWith('https://') ? '_blank' : undefined} rel="noreferrer"
						// disableRipple={true}
						className={linkStyles}
					// selected={active}
					// sx={{ borderRadius: `${navigationListItemRadius}px` }}
					>
						{children}
					</a>
				)
			}
			throw new Error('Invalid navigation item')
		}
		return (
			<li
				key={`listItem-${item.id}`}
				id={`listItem-${item.id}`}
			// disablePadding={true}
			// sx={{
			// 	...sx,
			// 	width: 'auto',
			// 	marginLeft: depth === 'secondary' ? `${navigationListIconSize * 0.75}px` : undefined,
			// }}
			>
				<ButtonComponent key="buttonComponent">
					{item.icon && <SingleListItemIcon key="icon">{item.icon}</SingleListItemIcon>}
					<span
					// sx={{
					// 	fontSize:
					// 		depth === 'primary'
					// 			? navigationListFontSizePrimary
					// 			: navigationListFontSizeSecondary,
					// }}
					>
						{item.title}
					</span>
				</ButtonComponent>
			</li>
		)
	},
	(prevProps: Readonly<NavigationItemProps>, nextProps: Readonly<NavigationItemProps>): boolean =>
		prevProps.item.id === nextProps.item.id &&
		prevProps.depth === nextProps.depth &&
		prevProps.active === nextProps.active,
)

const navigationBoxStyle = {
	width: drawerWidth,
	minWidth: drawerWidth,
	position: 'sticky',
	top: '0px',
	height: '100vh',
	bottom: '0px',
}

interface NavigationGroupProps {
	group: NavigationGroup
	groupIndex: number
	activeItemId?: string
	onContentItemClick?: (item: NavigationContentItem) => void
}

export const NavigationGroup = memo(
	function NavigationGroup({
		group,
		groupIndex,
		activeItemId,
		onContentItemClick,
	}: NavigationGroupProps): React.JSX.Element {
		return (
			<>
				<ul
				 className="flex flex-col gap-0.5"
				// key={`navigationGroupBox-${group.id}`}
				// id={`navigationGroup-${group.id}`}
				// sx={group.overflow ? { overflowY: 'auto', flex: '1' } : { flex: '0' }}
				>
					{nonEmptyMap(group.items, item => (
						<React.Fragment key={`fragment-${item.id}`}>
							<NavigationItem
								key={`item-${item.id}`}
								item={item}
								active={activeItemId === item.id}
								depth="primary"
								onContentItemClick={onContentItemClick}
							/>
							{(item.children?.length ?? 0) > 0 ? (
								<ul key={`subitems-${item.id}`} className="pl-1 border-l ml-6 flex flex-col gap-0.5">
									{item.children?.map(subitem => (
										<NavigationItem
											key={`subitem-${subitem.id}`}
											item={subitem}
											depth="secondary"
											active={activeItemId === subitem.id}
											onContentItemClick={onContentItemClick}
										/>
									))}
								</ul>
							) : null}
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
	flex,
	onContentItemClick = undefined,
}: {
	groups: NonEmptyArray<NavigationGroup>
	activeItemId?: string
	flex?: React.ComponentProps<typeof Box>['flex']
	onContentItemClick?: (item: NavigationContentItem) => void
}): React.JSX.Element {
	return (
		<div
			key="navigationBox"
			className="flex flex-col gap-0 max-w-lg flex-0 py-8"
		>
			<div className="flex justify-between items-center w-full gap-4 px-8 mb-4">
				<a href="/" className="text-2xl text-accent font-bold italic whitespace-nowrap">
					~ WalletBeat
				</a>
				<ThemeSwitcher />
			</div>
			<div className="flex flex-col gap-0.5 px-4">
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
		</div>
	)
}
