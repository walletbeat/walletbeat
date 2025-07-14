import {
	type Cell,
	type CellContext,
	type ColumnDef,
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	type Row,
	useReactTable,
} from '@tanstack/react-table'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { LuChevronDown, LuChevronRight } from 'react-icons/lu'
import { PiDesktop, PiDeviceMobile, PiDeviceMobileSlash, PiGlobe, PiGlobeX } from 'react-icons/pi'

import { eip7702 } from '@/data/eips/eip-7702'
import { erc4337 } from '@/data/eips/erc-4337'
import { ratedHardwareWallets, unratedHardwareWallet } from '@/data/hardware-wallets'
import { ratedSoftwareWallets, unratedSoftwareWallet } from '@/data/software-wallets'
import type { EvaluationTree } from '@/schema/attribute-groups'
import {
	calculateAttributeGroupScore,
	getAttributeGroupInTree,
	mapNonExemptAttributeGroupsInTree,
} from '@/schema/attribute-groups'
import type { AttributeGroup, ValueSet } from '@/schema/attributes'
import type { Eip } from '@/schema/eips'
import { AccountType } from '@/schema/features/account-support'
import { HardwareWalletManufactureType } from '@/schema/features/profile'
import { hasVariant, Variant } from '@/schema/variants'
import { type RatedWallet, walletSupportedAccountTypes } from '@/schema/wallet'
import { type NonEmptySet, setContains } from '@/types/utils/non-empty'
import { cx } from '@/utils/cx'

import { EipPreviewModal } from '../molecules/EipPreviewModal'
import { PizzaSliceChart } from './PizzaSliceChart'

// Define wallet type constants from the previous implementation
const WalletTypeCategory = {
	EOA: 'EOA',
	SMART_WALLET: 'SMART_WALLET',
	HARDWARE_WALLET: 'HARDWARE_WALLET',
} as const

// Define wallet type filter options
const WalletTypeFilter = {
	ALL: 'ALL',
	EOA_ONLY: 'EOA_ONLY',
	SMART_WALLET_ONLY: 'SMART_WALLET_ONLY',
	SMART_WALLET_AND_EOA: 'SMART_WALLET_AND_EOA',
} as const

type WalletTypeFilter = (typeof WalletTypeFilter)[keyof typeof WalletTypeFilter]

// Define device variants for device selector
const DeviceVariant = {
	NONE: 'none',
	WEB: 'browser',
	MOBILE: 'mobile',
	DESKTOP: 'desktop',
	HARDWARE: 'hardware',
} as const

// Define tab types for the wallet table
const WalletTableTab = {
	SOFTWARE: 'software',
	HARDWARE: 'hardware',
} as const

type WalletTableTab = (typeof WalletTableTab)[keyof typeof WalletTableTab]
type DeviceVariant = (typeof DeviceVariant)[keyof typeof DeviceVariant]
type WalletTypeCategory = (typeof WalletTypeCategory)[keyof typeof WalletTypeCategory]

const SmartWalletStandard = {
	ERC_4337: 'ERC_4337',
	ERC_7702: 'ERC_7702',
	OTHER: 'OTHER',
} as const

type SmartWalletStandard = (typeof SmartWalletStandard)[keyof typeof SmartWalletStandard]

const WALLET_TYPE_DISPLAY: Record<WalletTypeCategory, string> = {
	[WalletTypeCategory.EOA]: 'EOA',
	[WalletTypeCategory.SMART_WALLET]: 'Smart Wallet',
	[WalletTypeCategory.HARDWARE_WALLET]: 'HW',
}

const SMART_WALLET_STANDARD_DISPLAY: Record<SmartWalletStandard, string> = {
	[SmartWalletStandard.ERC_4337]: 'ERC-4337',
	[SmartWalletStandard.ERC_7702]: 'ERC-7702',
	[SmartWalletStandard.OTHER]: 'Other',
}

// Hardware wallet manufacture type display strings
const HARDWARE_WALLET_MANUFACTURE_TYPE_DISPLAY: Record<HardwareWalletManufactureType, string> = {
	[HardwareWalletManufactureType.FACTORY_MADE]: 'Factory-Made',
	[HardwareWalletManufactureType.DIY]: 'DIY',
}

// Helper functions for wallet data
interface WalletFilterInfo {
	accountTypes: NonEmptySet<AccountType> | null
	hasEoa: boolean
	hasSmartWallet: boolean
	hasHardware: boolean
	standards: Record<SmartWalletStandard, boolean>
}

// Helper function to get wallet type information
function getWalletTypeInfo(
	wallet: RatedWallet,
	variant: Variant | 'ALL_VARIANTS',
): WalletFilterInfo {
	const accountTypes = walletSupportedAccountTypes(wallet, variant)
	const hasEoa =
		accountTypes !== null &&
		(setContains<AccountType>(accountTypes, AccountType.eip7702) ||
			setContains<AccountType>(accountTypes, AccountType.eoa) ||
			setContains<AccountType>(accountTypes, AccountType.mpc))
	const hasSmartWallet =
		accountTypes !== null &&
		(setContains<AccountType>(accountTypes, AccountType.eip7702) ||
			setContains<AccountType>(accountTypes, AccountType.rawErc4337))
	const hasHardware = hasVariant(wallet.variants, Variant.HARDWARE)

	return {
		accountTypes,
		hasEoa,
		hasSmartWallet,
		hasHardware,
		standards: {
			ERC_4337:
				accountTypes !== null && setContains<AccountType>(accountTypes, AccountType.rawErc4337),
			ERC_7702:
				accountTypes !== null && setContains<AccountType>(accountTypes, AccountType.eip7702),
			OTHER:
				accountTypes !== null &&
				(setContains<AccountType>(accountTypes, AccountType.eoa) ||
					setContains<AccountType>(accountTypes, AccountType.mpc)),
		},
	}
}

// Helper function to get a detailed description of the wallet
function getDetailedWalletDescription(wallet: RatedWallet): string {
	const { hasEoa, hasSmartWallet, hasHardware, standards } = getWalletTypeInfo(
		wallet,
		'ALL_VARIANTS',
	)

	const typeDescriptions: string[] = []

	if (hasEoa) {
		typeDescriptions.push('Externally Owned Account')
	}

	if (hasSmartWallet) {
		typeDescriptions.push(
			`Smart Wallet (${[
				standards.ERC_4337 ? SMART_WALLET_STANDARD_DISPLAY.ERC_4337 : null,
				standards.ERC_7702 ? SMART_WALLET_STANDARD_DISPLAY.ERC_7702 : null,
			]
				.filter((val): val is string => val !== null)
				.join(', ')})`,
		)
	}

	if (hasHardware) {
		typeDescriptions.push('Hardware Wallet')
	}

	return typeDescriptions.join(' + ')
}

// Helper function to get hardware wallet manufacture type display name
function getHardwareWalletManufactureTypeDisplay(wallet: RatedWallet): string {
	const manufactureType = wallet.metadata.hardwareWalletManufactureType

	if (manufactureType !== undefined) {
		return HARDWARE_WALLET_MANUFACTURE_TYPE_DISPLAY[manufactureType]
	}

	return 'Unknown'
}

// Helper function to check if wallet supports a specific device variant
function walletSupportsVariant(wallet: RatedWallet, variant: DeviceVariant): boolean {
	if (variant === DeviceVariant.NONE) {
		return true
	}

	// For hardware variant in hardware wallets tab
	if (variant === DeviceVariant.HARDWARE) {
		return hasVariant(wallet.variants, Variant.HARDWARE)
	}

	return variant in wallet.variants
}

// Helper function to get device-specific evaluation tree
function getEvaluationTree(wallet: RatedWallet, selectedVariant: DeviceVariant): EvaluationTree {
	// For hardware wallet variant, use overall evaluation data as hardware wallets don't have separate device variants
	if (selectedVariant === DeviceVariant.HARDWARE) {
		return wallet.overall
	}

	if (selectedVariant === DeviceVariant.NONE) {
		return wallet.overall
	}

	const variantData = wallet.variants[selectedVariant]

	return variantData !== undefined ? variantData.attributes : wallet.overall
}

// Define hardware wallet models
interface HardwareWalletModel {
	id: string
	name: string
	url: string
	isFlagship?: boolean
}

// Helper function to get models for a wallet brand
function getHardwareWalletModels(wallet: RatedWallet): HardwareWalletModel[] {
	return wallet.metadata.hardwareWalletModels ?? []
}

// Helper function to get flagship model for a wallet brand
function getFlagshipModel(wallet: RatedWallet): HardwareWalletModel | undefined {
	const models = getHardwareWalletModels(wallet)
	// First, try to find a model explicitly marked as flagship
	const flagshipModel = models.find(model => model.isFlagship === true)

	// If no flagship is explicitly marked, return the first model as default
	return flagshipModel ?? models[0]
}

// TableRow interface for better type safety
interface TableRow {
	id: string
	name: string
	wallet: RatedWallet
	typeDescription?: string
	standards?: Record<SmartWalletStandard, boolean>
	websiteUrl?: string
	manufactureType?: string
	sortPriority: number
}

// Create software wallet table data
const softwareWalletData: TableRow[] = Object.values(ratedSoftwareWallets)
	.map(wallet => {
		const detailedType = getDetailedWalletDescription(wallet)
		const { standards, hasEoa, hasSmartWallet } = getWalletTypeInfo(wallet, 'ALL_VARIANTS')

		const websiteUrl =
			typeof wallet.metadata.url === 'string' && wallet.metadata.url !== ''
				? wallet.metadata.url
				: 'Not available'

		// Assign a sort priority based on type:
		// 1. Smart Wallet only
		// 2. Smart Wallet & EOA
		// 3. EOA only
		let sortPriority = 3 // Default to EOA only

		if (hasSmartWallet) {
			sortPriority = hasEoa ? 2 : 1 // 2 for both, 1 for Smart Wallet only
		}

		return {
			id: wallet.metadata.id,
			name: wallet.metadata.displayName,
			wallet,
			typeDescription: detailedType,
			standards,
			websiteUrl,
			sortPriority,
		}
	})
	.sort((a, b) => a.sortPriority - b.sortPriority)

// Create hardware wallet table data
const hardwareWalletData: TableRow[] = Object.values(ratedHardwareWallets)
	.map(wallet => {
		const manufactureType = getHardwareWalletManufactureTypeDisplay(wallet)
		const websiteUrl =
			typeof wallet.metadata.url === 'string' && wallet.metadata.url !== ''
				? wallet.metadata.url
				: 'Not available'

		return {
			id: wallet.metadata.id,
			name: wallet.metadata.displayName,
			wallet,
			manufactureType,
			websiteUrl,
			sortPriority: 0,
		}
	})
	.sort((a, b) => a.name.localeCompare(b.name))

// Create a reusable cell renderer for wallet name columns
export function walletNameCell<T extends { wallet: RatedWallet }>({
	row,
}: {
	row: Row<T>
}): React.ReactNode {
	// Regular row rendering with logo
	const walletId = row.original.wallet.metadata.id
	const logoPath = `/images/wallets/${walletId}.${row.original.wallet.metadata.iconExtension}`
	const defaultLogo = '/images/wallets/default.svg'
	const walletUrl = `/${walletId}`

	return (
		<div className='flex items-center'>
			{/* Wallet Logo */}
			<div className='flex-shrink-0 mr-3'>
				<img
					src={logoPath}
					alt=''
					className='w-6 h-6 object-contain'
					onError={e => {
						// Fallback for missing logos
						e.currentTarget.src = defaultLogo
					}}
				/>
			</div>
			{/* Wallet Name */}
			<a
				href={walletUrl}
				className='text-base font-medium hover:text-blue-600 hover:underline cursor-pointer'
			>
				{row.original.wallet.metadata.displayName}
			</a>
		</div>
	)
}

// Helper function for EIP standards with hover preview (non-link version)
export function EipStandardTag({
	standard,
	usePrefix,
}: {
	standard: Eip
	usePrefix: boolean
}): React.ReactElement {
	const [isTagHovered, setIsTagHovered] = useState<boolean>(false)
	const [isModalHovered, setIsModalHovered] = useState<boolean>(false)
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

	// Show modal if either tag or modal is hovered
	const isHovered = isTagHovered || isModalHovered

	// Timeout ref to avoid closing too quickly
	const closeTimeout = useRef<NodeJS.Timeout | null>(null)

	const handleTagMouseEnter = (e: React.MouseEvent<HTMLElement>): void => {
		if (closeTimeout.current !== null) {
			clearTimeout(closeTimeout.current)
		}

		setIsTagHovered(true)
		setAnchorEl(e.currentTarget)
	}

	const handleTagMouseLeave = (): void => {
		closeTimeout.current = setTimeout(() => {
			setIsTagHovered(false)
			setAnchorEl(null)
		}, 100)
	}

	const handleModalMouseEnter = (): void => {
		if (closeTimeout.current !== null) {
			clearTimeout(closeTimeout.current)
		}

		setIsModalHovered(true)
	}

	const handleModalMouseLeave = (): void => {
		closeTimeout.current = setTimeout(() => {
			setIsModalHovered(false)
			setAnchorEl(null)
		}, 100)
	}

	return (
		<React.Fragment>
			<span
				className='eip-tag inline-block text-xs bg-gray-100 px-2 py-1 rounded dark:bg-[#17191f] dark:text-gray-100 dark:border-[#3f3f3f] relative z-10 cursor-help'
				title={`${standard.prefix}-${standard.number} - Hover for details`}
				onMouseEnter={handleTagMouseEnter}
				onMouseLeave={handleTagMouseLeave}
			>
				{usePrefix ? `${standard.prefix}-` : '#'}
				{standard.number}
			</span>
			{isHovered && anchorEl !== null && (
				<EipPreviewModal
					eip={standard}
					anchorEl={anchorEl}
					onMouseEnter={handleModalMouseEnter}
					onMouseLeave={handleModalMouseLeave}
				/>
			)}
		</React.Fragment>
	)
}

// Define a component for expandable hardware wallet row
function ExpandableHardwareWalletRow({
	row,
	columns,
}: {
	row: Row<TableRow>
	columns: Array<ColumnDef<TableRow, CellValue>>
}): React.ReactElement {
	const [isExpanded, setIsExpanded] = useState(false)
	const [selectedModel, setSelectedModel] = useState<string | null>(null)

	const { wallet } = row.original
	const models: HardwareWalletModel[] = getHardwareWalletModels(wallet)
	const flagshipModel = getFlagshipModel(wallet)

	// Set the flagship model as the default selected model
	useEffect((): void => {
		// Always have a selected model, even if there's only one
		if (selectedModel === null && models.length > 0) {
			// If flagshipModel.id exists, use it. Otherwise, use models[0].id.
			// models[0].id is guaranteed to exist and be a string here because:
			// 1. models.length > 0 (ensured by the if condition)
			// 2. The lint error implies HardwareWalletModel.id is a non-nullable string.
			// Therefore, the fallback `?? ''` was redundant.
			const modelIdToSelect = flagshipModel?.id ?? models[0].id

			setSelectedModel(modelIdToSelect)
		}
	}, [flagshipModel, models, selectedModel])

	// Get the currently selected model name (used in wallet name column only)
	const selectedModelName: string =
		selectedModel !== null
			? (models.find((m: HardwareWalletModel): boolean => m.id === selectedModel)?.name ?? '')
			: (models[0]?.name ?? '')

	// Toggle expansion of the models list
	const toggleExpanded = (): void => {
		setIsExpanded(!isExpanded)
	}

	// Handle click on a model
	const handleModelClick = (modelId: string): void => {
		setSelectedModel(modelId)
	}

	const evalTree = getEvaluationTree(wallet, DeviceVariant.HARDWARE)
	const perAttributeGroupCells: React.JSX.Element[] = mapNonExemptAttributeGroupsInTree(
		evalTree,
		(attrGroup, evalGroup) => (
			<PizzaSliceChart
				attrGroup={attrGroup}
				evalGroup={evalGroup}
				isSupported={true}
				wallet={wallet}
			/>
		),
	)

	// Create updated cells for rating data
	const createUpdatedCell = (
		cell: Cell<TableRow, unknown>,
		columnIndex: number,
	): React.ReactNode => {
		// Skip first columns (Manufacture Type)
		if (columnIndex < 1) {
			return flexRender(cell.column.columnDef.cell, cell.getContext())
		}

		return perAttributeGroupCells[columnIndex - 1]
	}

	// Sort models to place flagship first
	const sortedModels = [...models].sort((a, b) => {
		if (a.isFlagship === true) {
			return -1
		}

		if (b.isFlagship === true) {
			return 1
		}

		return 0
	})

	// Render the table row with expansion capabilities
	return (
		<>
			<tr
				className='dark:bg-[#141414] dark:hover:bg-[#1a1a1a] cursor-pointer'
				onClick={toggleExpanded}
			>
				{/* Rank column */}
				<td className='px-4 py-2 dark:text-gray-200 text-center'>{row.index + 1}</td>
				{/* Wallet cell */}
				<td className='px-4 py-2 dark:text-gray-200'>
					<div className='flex items-center'>
						{models.length > 1 ? (
							<span className='mr-2'>
								{isExpanded ? (
									<LuChevronDown className='w-4 h-4' />
								) : (
									<LuChevronRight className='w-4 h-4' />
								)}
							</span>
						) : null}
						{/* Wallet Logo */}
						<div className='flex-shrink-0 mr-3'>
							<img
								src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
								alt=''
								className='w-6 h-6 object-contain'
								onError={e => {
									// Fallback for missing logos
									e.currentTarget.src = '/images/wallets/default.svg'
								}}
							/>
						</div>
						{/* Wallet Name */}
						<div className='flex flex-col items-start'>
							<a
								href={`/${wallet.metadata.id}`}
								className='text-base font-medium hover:text-blue-600 hover:underline cursor-pointer'
							>
								{row.original.name}
							</a>
							{/* Always show model name, but only show flagship indicator in expanded view */}
							<span className='text-xs flex items-center'>
								<span className='text-purple-500 dark:text-purple-400 font-medium'>
									{selectedModelName}
								</span>
							</span>
						</div>
					</div>
				</td>
				{row
					.getVisibleCells()
					.slice(2)
					.map((cell: Cell<TableRow, unknown>, index: number) => (
						<td key={cell.id} className='px-4 py-2 dark:text-gray-200'>
							{createUpdatedCell(cell, index)}
						</td>
					))}
			</tr>

			{isExpanded && models.length > 1 && (
				<tr className='bg-gray-50 dark:bg-[#1a1a1a]'>
					<td colSpan={columns.length > 0 ? columns.length : 8} className='p-0'>
						<div className='pl-10 pr-4 py-3'>
							<div className='text-sm font-medium mb-2 dark:text-gray-200'>Models:</div>
							<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2'>
								{sortedModels.map(model => (
									<div
										key={model.id}
										className={[
											'p-2 border rounded flex items-center',
											selectedModel === model.id
												? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-700'
												: 'border-gray-200 dark:border-gray-700',
											model.isFlagship === true
												? 'ring-1 ring-purple-300 dark:ring-purple-800'
												: '',
											'cursor-pointer hover:border-purple-300 dark:hover:border-purple-500 transition-colors',
										].join(' ')}
										onClick={e => {
											e.stopPropagation()
											handleModelClick(model.id)
										}}
									>
										<div
											className={cx(
												'w-3 h-3 rounded-full mr-2',
												selectedModel === model.id ? 'bg-purple-500' : 'bg-gray-400',
											)}
										></div>
										<div className='flex-grow dark:text-gray-200 font-medium'>
											{model.name}
											{model.isFlagship === true && (
												<span className='ml-1 text-xs text-purple-600 dark:text-purple-400 font-medium'>
													(Flagship)
												</span>
											)}
										</div>
										<a
											href={model.url}
											target='_blank'
											rel='noopener noreferrer'
											className='text-xs text-blue-600 dark:text-blue-400 hover:underline'
											onClick={e => {
												e.stopPropagation()
											}}
										>
											Website
										</a>
									</div>
								))}
							</div>
						</div>
					</td>
				</tr>
			)}
		</>
	)
}

interface WalletTypeCell {
	typeString: string
	hasSmartWallet: boolean
	standards: Record<SmartWalletStandard, boolean>
}

type CellValue = string | WalletTypeCell

export default function WalletTable(): React.ReactElement {
	// Add state for selected device variant and active tab
	const [selectedVariant, setSelectedVariant] = useState<DeviceVariant>(DeviceVariant.NONE)
	const [activeTab, setActiveTab] = useState<WalletTableTab>(WalletTableTab.SOFTWARE)
	const [walletTypeFilter, setWalletTypeFilter] = useState<WalletTypeFilter>(WalletTypeFilter.ALL)

	// Calculate counts for each filter type
	// IMPORTANT: We calculate these from the original data, not the filtered data
	// to prevent circular dependencies and infinite loops
	const eoaOnlyWalletCount = useMemo(
		() =>
			softwareWalletData.filter(row => {
				const { hasEoa, hasSmartWallet } = getWalletTypeInfo(row.wallet, 'ALL_VARIANTS')

				return hasEoa && !hasSmartWallet
			}).length,
		[],
	)

	const smartWalletOnlyCount = useMemo(
		() =>
			softwareWalletData.filter(row => {
				const { hasEoa, hasSmartWallet } = getWalletTypeInfo(row.wallet, 'ALL_VARIANTS')

				return hasSmartWallet && !hasEoa
			}).length,
		[],
	)

	const smartWalletAndEoaCount = useMemo(
		() =>
			softwareWalletData.filter(row => {
				const { hasEoa, hasSmartWallet } = getWalletTypeInfo(row.wallet, 'ALL_VARIANTS')

				return hasSmartWallet && hasEoa
			}).length,
		[],
	)

	// Filter the software wallet data based on the selected wallet type filter
	const filteredSoftwareWalletData = useMemo(() => {
		if (walletTypeFilter === WalletTypeFilter.ALL) {
			return softwareWalletData
		}

		return softwareWalletData.filter((row): boolean => {
			const { hasEoa, hasSmartWallet } = getWalletTypeInfo(row.wallet, 'ALL_VARIANTS')

			return ((): boolean => {
				switch (walletTypeFilter) {
					case WalletTypeFilter.EOA_ONLY:
						return hasEoa && !hasSmartWallet
					case WalletTypeFilter.SMART_WALLET_ONLY:
						return hasSmartWallet && !hasEoa
					case WalletTypeFilter.SMART_WALLET_AND_EOA:
						return hasSmartWallet && hasEoa
				}
			})()
		})
	}, [walletTypeFilter])

	// Helper to compute overall score by summing each attribute group's score
	function getOverallScore(wallet: RatedWallet): number {
		const groupScores = mapNonExemptAttributeGroupsInTree(
			wallet.overall,
			(attrGroup, evalGroup) =>
				calculateAttributeGroupScore(attrGroup.attributeWeights, evalGroup)?.score ?? 0,
		)

		return groupScores.reduce((sum, score) => sum + score, 0)
	}

	// Use the appropriate data based on active tab and filters and sort by overall score
	const tableData = useMemo(() => {
		const data =
			activeTab === WalletTableTab.SOFTWARE
				? [...filteredSoftwareWalletData]
				: [...hardwareWalletData]

		data.sort((a, b) => getOverallScore(b.wallet) - getOverallScore(a.wallet))

		return data
	}, [activeTab, filteredSoftwareWalletData, hardwareWalletData])

	// Handler for device variant change
	const handleVariantChange = (variant: DeviceVariant): void => {
		setSelectedVariant(variant === selectedVariant ? DeviceVariant.NONE : variant)
	}

	// Handler for tab change
	const handleTabChange = (tab: WalletTableTab): void => {
		setActiveTab(tab)
		// Reset wallet type filter when switching tabs
		setWalletTypeFilter(WalletTypeFilter.ALL)
	}

	// Handler for wallet type filter change
	const handleWalletTypeFilterChange = (filter: WalletTypeFilter): void => {
		setWalletTypeFilter(filter)
	}

	// Define columns for software wallets
	const columnHelper = createColumnHelper<TableRow>()
	const rankColumn = columnHelper.display({
		id: 'rank',
		header: '#',
		cell: ({ row }): React.ReactNode => row.index + 1,
	})
	const walletNameColumn = columnHelper.accessor(
		(row: TableRow): CellValue => row.wallet.metadata.displayName,
		{
			id: 'wallet',
			header: 'Wallet',
			cell: walletNameCell<TableRow>,
		},
	)
	const walletTypeColumn = columnHelper.display({
		id: 'type',
		cell: (info: CellContext<TableRow, unknown>): React.ReactNode => {
			const { hasEoa, hasSmartWallet, hasHardware, standards } = getWalletTypeInfo(
				info.row.original.wallet,
				'ALL_VARIANTS',
			)
			const typeString = [
				hasEoa ? ('EOA' as WalletTypeCategory) : null,
				hasSmartWallet ? ('SMART_WALLET' as WalletTypeCategory) : null,
				hasHardware ? ('HARDWARE_WALLET' as WalletTypeCategory) : null,
			]
				.filter((val): val is WalletTypeCategory => val !== null)
				.map(cat => (WALLET_TYPE_DISPLAY[cat] !== '' ? WALLET_TYPE_DISPLAY[cat] : cat))
				.join(' & ')

			// If no standards, just return the type string
			if (!hasSmartWallet) {
				return typeString
			}

			return (
				<div>
					<span>{typeString}</span>
					<div className='mt-1 flex flex-wrap gap-1'>
						{Object.entries(standards).map(([std, supported]: [string, boolean]) => {
							if (!supported) {
								return null
							}

							// Add Markdown-style links for ERC standards
							if (std === SmartWalletStandard.ERC_4337) {
								return <EipStandardTag key={std} usePrefix={false} standard={erc4337} />
							} else if (std === SmartWalletStandard.ERC_7702) {
								return <EipStandardTag key={std} usePrefix={false} standard={eip7702} />
							} else {
								return null // Return null for other standards like 'OTHER'
							}
						})}
					</div>
				</div>
			)
		},
	})
	const walletVariantColumn = columnHelper.display({
		id: 'risk',
		header: 'By device',
		cell: ({ row }): React.ReactNode => {
			const { wallet } = row.original
			const supportsBrowser = hasVariant(wallet.variants, Variant.BROWSER)
			const supportsMobile = hasVariant(wallet.variants, Variant.MOBILE)
			const supportsDesktop = hasVariant(wallet.variants, Variant.DESKTOP)

			return (
				<div className='flex space-x-0 items-center'>
					<div className='flex flex-col items-center group'>
						<button
							className={cx(
								'text-2xl p-2 rounded-md transition-colors',
								!supportsBrowser
									? 'opacity-40 cursor-not-allowed text-[var(--text-tertiary)]'
									: selectedVariant === DeviceVariant.WEB
										? 'text-[var(--active)]'
										: 'text-[var(--text-secondary)] group-hover:text-[var(--hover)]',
							)}
							onClick={() => {
								if (supportsBrowser) {
									handleVariantChange(DeviceVariant.WEB)
								}
							}}
							title={supportsBrowser ? 'Web/Browser' : 'Web/Browser (Not Supported)'}
							disabled={!supportsBrowser}
						>
							{supportsBrowser ? <PiGlobe /> : <PiGlobeX />}
						</button>
						<div
							className={cx(
								'w-2 h-2 rounded-full mt-1 transition-colors',
								!supportsBrowser
									? 'bg-[var(--background-tertiary)]'
									: selectedVariant === DeviceVariant.WEB
										? 'bg-[var(--active)]'
										: 'bg-[var(--background-tertiary)] group-hover:bg-[var(--hover)]',
							)}
						/>
					</div>
					<div className='flex flex-col items-center group'>
						<button
							className={cx(
								'text-2xl p-2 rounded-md transition-colors',
								!supportsMobile
									? 'opacity-40 cursor-not-allowed text-[var(--text-tertiary)]'
									: selectedVariant === DeviceVariant.MOBILE
										? 'text-[var(--active)]'
										: 'text-[var(--text-secondary)] group-hover:text-[var(--hover)]',
							)}
							onClick={() => {
								if (supportsMobile) {
									handleVariantChange(DeviceVariant.MOBILE)
								}
							}}
							title={supportsMobile ? 'Mobile' : 'Mobile (Not Supported)'}
							disabled={!supportsMobile}
						>
							{supportsMobile ? <PiDeviceMobile /> : <PiDeviceMobileSlash />}
						</button>
						<div
							className={cx(
								'w-2 h-2 rounded-full mt-1 transition-colors',
								!supportsMobile
									? 'bg-[var(--background-tertiary)]'
									: selectedVariant === DeviceVariant.MOBILE
										? 'bg-[var(--active)]'
										: 'bg-[var(--background-tertiary)] group-hover:bg-[var(--hover)]',
							)}
						/>
					</div>
					<div className='flex flex-col items-center group'>
						<button
							className={cx(
								'text-2xl p-2 rounded-md transition-colors',
								!supportsDesktop
									? 'opacity-40 cursor-not-allowed text-[var(--text-tertiary)]'
									: selectedVariant === DeviceVariant.DESKTOP
										? 'text-[var(--active)]'
										: 'text-[var(--text-secondary)] group-hover:text-[var(--hover)]',
							)}
							onClick={() => {
								if (supportsDesktop) {
									handleVariantChange(DeviceVariant.DESKTOP)
								}
							}}
							title={supportsDesktop ? 'Desktop' : 'Desktop (Not Supported)'}
							disabled={!supportsDesktop}
						>
							<PiDesktop />
						</button>
						<div
							className={cx(
								'w-2 h-2 rounded-full mt-1 transition-colors',
								!supportsDesktop
									? 'bg-[var(--background-tertiary)]'
									: selectedVariant === DeviceVariant.DESKTOP
										? 'bg-[var(--active)]'
										: 'bg-[var(--background-tertiary)] group-hover:bg-[var(--hover)]',
							)}
						/>
					</div>
				</div>
			)
		},
	})
	const attributeGroupColumnFromAttrGroup = <Vs extends ValueSet>(
		attrGroup: AttributeGroup<Vs>,
	): ColumnDef<TableRow, CellValue> =>
		columnHelper.display({
			header: attrGroup.displayName,
			cell: ({ row }): React.ReactNode => {
				const { wallet } = row.original
				const isSupported =
					selectedVariant === DeviceVariant.NONE || walletSupportsVariant(wallet, selectedVariant)
				const evalTree = getEvaluationTree(wallet, selectedVariant)
				const evalGroup = getAttributeGroupInTree(evalTree, attrGroup)

				return (
					<PizzaSliceChart
						attrGroup={attrGroup}
						evalGroup={evalGroup}
						isSupported={isSupported}
						wallet={wallet}
					/>
				)
			},
		})
	const softwareColumns: Array<ColumnDef<TableRow, CellValue>> = [
		rankColumn,
		walletNameColumn,
		walletTypeColumn,
		walletVariantColumn,
		...mapNonExemptAttributeGroupsInTree(
			unratedSoftwareWallet.overall,
			attributeGroupColumnFromAttrGroup,
		),
	]

	// Define columns for hardware wallets
	const hardwareWalletNameColumn = columnHelper.accessor(
		(row: TableRow): CellValue => row.wallet.metadata.displayName,
		{
			id: 'wallet',
			header: 'Wallet',
			// For hardware wallets, we just use a simple accessor since ExpandableHardwareWalletRow handles display
			cell: ({ row }: { row: Row<TableRow> }): CellValue =>
				row.original.wallet.metadata.displayName,
		},
	)
	const hardwareWalletManufactureTypeColumn = columnHelper.display({
		id: 'manufacture_type',
		header: 'Manufacture Type',
		cell: ({ row }: { row: Row<TableRow> }): CellValue =>
			getHardwareWalletManufactureTypeDisplay(row.original.wallet),
	})
	const hardwareColumns: Array<ColumnDef<TableRow, CellValue>> = [
		rankColumn,
		hardwareWalletNameColumn,
		hardwareWalletManufactureTypeColumn,
		...mapNonExemptAttributeGroupsInTree(
			unratedHardwareWallet.overall,
			attributeGroupColumnFromAttrGroup,
		),
	]

	// Use the appropriate columns based on active tab
	const columns = useMemo<Array<ColumnDef<TableRow, CellValue>>>(
		() => (activeTab === WalletTableTab.SOFTWARE ? softwareColumns : hardwareColumns),
		[activeTab],
	)

	// Create table
	const table = useReactTable({
		data: tableData,
		columns,
		getCoreRowModel: getCoreRowModel(),
	})

	// Render table body based on active tab
	const renderTableBody = (): React.ReactNode => {
		// For hardware wallets tab, use the expandable row component
		if (activeTab === 'hardware') {
			return table
				.getRowModel()
				.rows.map(row => <ExpandableHardwareWalletRow key={row.id} row={row} columns={columns} />)
		}

		// Otherwise, render standard rows for software wallets
		return table.getRowModel().rows.map(row => {
			const parentWallet = row.original.wallet

			// Support depends on variant; software tab has different logic from hardware tab
			const isSupported =
				selectedVariant === DeviceVariant.NONE ||
				walletSupportsVariant(parentWallet, selectedVariant)

			return (
				<tr
					key={row.id}
					className={
						isSupported
							? 'dark:bg-[#141414] dark:hover:bg-[#1a1a1a]'
							: 'opacity-50 dark:bg-[#141414] dark:hover:bg-[#1a1a1a]'
					}
				>
					{row.getVisibleCells().map(cell => (
						<td
							key={cell.id}
							className={cx(
								'px-4 py-2 dark:text-gray-200',
								cell.column.id === 'rank' ? 'text-center' : '',
							)}
						>
							{flexRender(cell.column.columnDef.cell, cell.getContext())}
						</td>
					))}
				</tr>
			)
		})
	}

	return (
		<div className='overflow-x-auto'>
			{/* Tabs - now fixed */}
			<div className='sticky top-0 z-10'>
				<div className='flex gap-4 xl:items-end xl:flex-row flex-col-reverse items-start'>
					<div className='flex gap-1'>
						<button
							className={cx(
								'px-4 py-3 font-medium text-sm rounded-tr-lg rounded-tl-lg transition-transform whitespace-nowrap',
								activeTab === WalletTableTab.SOFTWARE
									? 'bg-white dark:bg-[#292C34] shadow-sm text-gray-800 dark:text-gray-100'
									: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-[#EAEAEA] dark:bg-[#17191f]',
							)}
							onClick={() => {
								handleTabChange(WalletTableTab.SOFTWARE)
							}}
						>
							Software wallets
							<span
								className={cx(
									'ml-2 px-2 py-0.5 text-xs text-white font-medium rounded-full',
									activeTab === WalletTableTab.SOFTWARE ? 'bg-purple-500' : 'bg-[#3B0E45]',
								)}
							>
								{filteredSoftwareWalletData.length}
							</span>
						</button>
						<button
							className={cx(
								'px-4 py-3 font-medium text-sm rounded-tr-lg rounded-tl-lg transition-transform whitespace-nowrap',
								activeTab === WalletTableTab.HARDWARE
									? 'bg-white dark:bg-[#292C34] shadow-sm text-gray-800 dark:text-gray-100'
									: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-[#EAEAEA] dark:bg-[#17191f]',
							)}
							onClick={() => {
								handleTabChange(WalletTableTab.HARDWARE)
							}}
						>
							Hardware wallets
							<span
								className={cx(
									'ml-2 px-2 py-0.5 text-xs text-white font-medium rounded-full',
									activeTab === WalletTableTab.HARDWARE ? 'bg-purple-500' : 'bg-[#3B0E45]',
								)}
							>
								{hardwareWalletData.length}
							</span>
						</button>
					</div>
					{/* Wallet Type Filter Buttons - only show for Software wallets tab */}
					{activeTab === WalletTableTab.SOFTWARE && (
						<div className='flex flex-wrap gap-2 py-1 px-1 justify-start'>
							<span className='text-sm font-medium text-gray-600 dark:text-gray-300 self-center mr-2'>
								Filter by:
							</span>
							<button
								className={[
									'px-3 py-0.5 text-xs font-medium rounded-full transition-colors',
									walletTypeFilter === WalletTypeFilter.ALL
										? 'bg-purple-500 text-white'
										: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600',
								].join(' ')}
								onClick={() => {
									handleWalletTypeFilterChange(WalletTypeFilter.ALL)
								}}
							>
								All
								<span
									className={cx(
										'inline-block ml-1 px-1.5 py-0.5 text-xs rounded-full',
										walletTypeFilter === WalletTypeFilter.ALL
											? 'bg-white bg-opacity-30 text-white'
											: 'bg-gray-500 bg-opacity-20 text-gray-700 dark:bg-gray-500 dark:bg-opacity-30 dark:text-gray-200',
									)}
								>
									{softwareWalletData.length}
								</span>
							</button>
							<button
								className={cx(
									'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
									walletTypeFilter === WalletTypeFilter.SMART_WALLET_ONLY
										? 'bg-purple-500 text-white'
										: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600',
								)}
								onClick={() => {
									handleWalletTypeFilterChange(WalletTypeFilter.SMART_WALLET_ONLY)
								}}
							>
								Smart Wallet
								<span
									className={cx(
										'inline-block ml-1 px-1.5 py-0.5 text-xs rounded-full',
										walletTypeFilter === WalletTypeFilter.SMART_WALLET_ONLY
											? 'bg-white bg-opacity-30 text-white'
											: 'bg-gray-500 bg-opacity-20 text-gray-700 dark:bg-gray-500 dark:bg-opacity-30 dark:text-gray-200',
									)}
								>
									{smartWalletOnlyCount}
								</span>
							</button>
							<button
								className={cx(
									'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
									walletTypeFilter === WalletTypeFilter.SMART_WALLET_AND_EOA
										? 'bg-purple-500 text-white'
										: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600',
								)}
								onClick={() => {
									handleWalletTypeFilterChange(WalletTypeFilter.SMART_WALLET_AND_EOA)
								}}
							>
								Smart Wallet & EOA
								<span
									className={cx(
										'inline-block ml-1 px-1.5 py-0.5 text-xs rounded-full',
										walletTypeFilter === WalletTypeFilter.SMART_WALLET_AND_EOA
											? 'bg-white bg-opacity-30 text-white'
											: 'bg-gray-500 bg-opacity-20 text-gray-700 dark:bg-gray-500 dark:bg-opacity-30 dark:text-gray-200',
									)}
								>
									{smartWalletAndEoaCount}
								</span>
							</button>
							<button
								className={cx(
									'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
									walletTypeFilter === WalletTypeFilter.EOA_ONLY
										? 'bg-purple-500 text-white'
										: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600',
								)}
								onClick={() => {
									handleWalletTypeFilterChange(WalletTypeFilter.EOA_ONLY)
								}}
							>
								EOA
								<span
									className={cx(
										'inline-block ml-1 px-1.5 py-0.5 text-xs rounded-full',
										walletTypeFilter === WalletTypeFilter.EOA_ONLY
											? 'bg-white bg-opacity-30 text-white'
											: 'bg-gray-500 bg-opacity-20 text-gray-700 dark:bg-gray-500 dark:bg-opacity-30 dark:text-gray-200',
									)}
								>
									{eoaOnlyWalletCount}
								</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Table */}
			<div className='overflow-x-auto'>
				<table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-background'>
					<thead>
						{table.getHeaderGroups().map(headerGroup => (
							<tr className='bg-tertiary' key={headerGroup.id}>
								{headerGroup.headers.map(header => {
									const headerContent = header.column.columnDef.header

									return (
										<th
											key={header.id}
											className={cx(
												'px-4 py-2 text-[14px] text-secondary',
												header.column.id === 'rank' ? 'text-center' : 'text-left',
												headerContent === 'Wallet' ||
													headerContent === 'Type' ||
													headerContent === 'Manufacture Type'
													? 'font-bold'
													: 'font-normal',
											)}
										>
											{headerContent !== undefined &&
												flexRender(headerContent, header.getContext())}
										</th>
									)
								})}
							</tr>
						))}
					</thead>
					<tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
						{renderTableBody()}
					</tbody>
				</table>
			</div>
		</div>
	)
}
