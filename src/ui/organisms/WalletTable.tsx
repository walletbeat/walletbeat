/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/strict-boolean-expressions - Disabled for integration with tanstack table */
import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { ratedWallets } from '@/data/wallets'
import { ratedHardwareWallets } from '@/data/hardware-wallets'
import {
	securityAttributeGroup,
	privacyAttributeGroup,
	selfSovereigntyAttributeGroup,
	transparencyAttributeGroup,
	ecosystemAttributeGroup,
	getVisibleAttributesForWallet,
} from '@/schema/attribute-groups'
import { Rating, type AttributeGroup } from '@/schema/attributes'
import type { EvaluationTree } from '@/schema/attribute-groups'
import { RatingDetailModal } from '../molecules/RatingDetailModal'
import { HardwareWalletManufactureType } from '@/schema/features/profile'
import { WebIcon, MobileIcon, DesktopIcon } from '@/icons'
import { HardwareIcon } from '@/icons/devices/HardwareIcon'
import { EipPreviewModal } from '../molecules/EipPreviewModal'
import { EipPrefix } from '@/schema/eips'
import { LuChevronDown, LuChevronRight } from 'react-icons/lu'
import { walletSupportedAccountTypes, type RatedWallet } from '@/schema/wallet'
import { AccountType } from '@/schema/features/account-support'
import { setContains, type NonEmptySet } from '@/types/utils/non-empty'
import { hasVariant, Variant } from '@/schema/variants'
import { getAttributeGroupsForWallet } from '@/schema/attribute-groups'

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
		(setContains(accountTypes, AccountType.eip7702) ||
			setContains(accountTypes, AccountType.eoa) ||
			setContains(accountTypes, AccountType.mpc))
	const hasSmartWallet =
		accountTypes !== null &&
		(setContains(accountTypes, AccountType.eip7702) ||
			setContains(accountTypes, AccountType.rawErc4337))
	const hasHardware = hasVariant(wallet.variants, Variant.HARDWARE)
	return {
		accountTypes,
		hasEoa,
		hasSmartWallet,
		hasHardware,
		standards: {
			ERC_4337: accountTypes !== null && setContains(accountTypes, AccountType.rawErc4337),
			ERC_7702: accountTypes !== null && setContains(accountTypes, AccountType.eip7702),
			OTHER:
				accountTypes !== null &&
				(setContains(accountTypes, AccountType.eoa) || setContains(accountTypes, AccountType.mpc)),
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
				.filter(val => val !== null)
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
	if (manufactureType !== undefined && manufactureType !== null) {
		return HARDWARE_WALLET_MANUFACTURE_TYPE_DISPLAY[manufactureType] || 'Unknown'
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

	return Boolean(wallet.variants && variant in wallet.variants)
}

// Helper function to get device-specific evaluation tree
function getEvaluationTree(wallet: RatedWallet, selectedVariant: DeviceVariant): EvaluationTree {
	// For hardware wallet variant, use overall evaluation data as hardware wallets don't have separate device variants
	if (selectedVariant === DeviceVariant.HARDWARE) {
		return wallet.overall
	}

	if (selectedVariant === DeviceVariant.NONE || !wallet.variants) {
		return wallet.overall
	}

	const variantData = wallet.variants[selectedVariant]
	return variantData ? variantData.attributes : wallet.overall
}

// Pizza Slice Chart Component (inspired by WalletTableStylingExample)
function PizzaSliceChart({
	attrGroup,
	evalTree,
	isSupported = true,
	walletId,
	features,
	visibleAttributes,
}: {
	attrGroup: AttributeGroup<any>
	evalTree: EvaluationTree
	isSupported?: boolean
	walletId: string
	features: any
	visibleAttributes: [string, any][]
}): React.ReactElement {
	// Add state for the modal
	const [modalOpen, setModalOpen] = useState(false)

	// Map visibleAttributes to get ratings and ids
	const categoryKey = attrGroup.id as keyof EvaluationTree
	const categoryData = evalTree[categoryKey] as Record<string, any>
	const attributeRatings = visibleAttributes
		.map(([key, _attr]) => {
			const evalAttr = categoryData?.[key]
			const rating = evalAttr?.evaluation?.value?.rating
			return { id: key, rating }
		})
		.filter(a => a.rating !== undefined && a.rating !== Rating.EXEMPT)
	const attributeCount = attributeRatings.length > 0 ? attributeRatings.length : 4 // Default to 4 if no attributes
	let overallScore = 0

	try {
		// Calculate the overall score safely
		const categoryData = evalTree[categoryKey]
		if (!categoryData || typeof attrGroup.score !== 'function') {
			// If missing data, leave overallScore as 0
		} else {
			const scoreResult = attrGroup.score(categoryData as any)
			if (typeof scoreResult === 'object' && scoreResult !== null && 'score' in scoreResult) {
				overallScore = scoreResult.score
			}
		}
	} catch (e) {
		console.error(`Error calculating score for ${attrGroup.id}:`, e)
	}

	const tooltipText = `${attrGroup.displayName}: ${Math.round(overallScore * 100)}% (${attributeCount} attributes)`

	// Generate the actual slice colors from the real data
	const sliceColors = attributeRatings.map(attr => {
		switch (attr.rating) {
			case Rating.PASS:
				return 'var(--rating-pass)'
			case Rating.PARTIAL:
				return 'var(--rating-partial)'
			case Rating.FAIL:
				return 'var(--rating-fail)'
			default:
				return 'var(--rating-neutral)'
		}
	})

	// If we don't have any ratings, use default colors
	if (sliceColors.length === 0) {
		for (let i = 0; i < 4; i++) {
			sliceColors.push('var(--rating-neutral)')
		}
	}

	// Create SVG slices for cleaner rendering with gaps
	const createSlices = () => {
		const slices = []
		const centerX = 50
		const centerY = 50
		const radius = 45
		const gapAngle = 2 // Gap in degrees
		const precision = 4 // Number of decimal places to round coordinates to

		const sliceAngle = 360 / attributeCount - gapAngle

		for (let i = 0; i < attributeCount; i++) {
			const startAngle = i * (sliceAngle + gapAngle)
			const endAngle = startAngle + sliceAngle

			// Convert angles to radians
			const startRad = ((startAngle - 90) * Math.PI) / 180
			const endRad = ((endAngle - 90) * Math.PI) / 180

			// Calculate coordinates and round them
			const x1 = parseFloat((centerX + radius * Math.cos(startRad)).toFixed(precision))
			const y1 = parseFloat((centerY + radius * Math.sin(startRad)).toFixed(precision))
			const x2 = parseFloat((centerX + radius * Math.cos(endRad)).toFixed(precision))
			const y2 = parseFloat((centerY + radius * Math.sin(endRad)).toFixed(precision))

			// Create path for the slice
			const largeArcFlag = sliceAngle > 180 ? 1 : 0

			const pathData = `
				M ${centerX} ${centerY}
				L ${x1} ${y1}
				A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
				Z
			`

			slices.push(
				<path key={i} d={pathData} fill={sliceColors[i]} stroke="#ffffff" strokeWidth="1" />,
			)
		}

		return slices
	}

	// Handle click on the pie chart
	const handlePieClick = () => {
		if (isSupported) {
			setModalOpen(true)
		}
	}

	// Create the pizza slice visualization with the correct number of slices
	return (
		<>
			<div className={`flex flex-col items-center ${!isSupported ? 'opacity-40' : ''}`}>
				<div
					className={`w-10 h-10 rounded-full bg-white overflow-hidden relative ${isSupported ? 'cursor-pointer hover:shadow-md' : 'cursor-help'}`}
					title={tooltipText}
					onClick={handlePieClick}
				>
					<svg viewBox="0 0 100 100" className="w-full h-full">
						{createSlices()}
					</svg>
				</div>
			</div>

			{/* Rating Detail Modal */}
			{isSupported && (
				<RatingDetailModal
					open={modalOpen}
					onClose={() => {
						setModalOpen(false)
					}}
					attrGroup={attrGroup}
					evalTree={evalTree}
					attributeRatings={attributeRatings}
					walletId={walletId}
				/>
			)}
		</>
	)
}

// Define hardware wallet models
interface HardwareWalletModel {
	id: string
	name: string
	url: string
	isFlagship?: boolean
}

// Hardware wallet models by brand
const hardwareWalletModels: Record<string, HardwareWalletModel[]> = {
	ledger: [
		{
			id: 'ledger-stax',
			name: 'Ledger Stax',
			url: 'https://shop.ledger.com/products/ledger-stax',
			isFlagship: true,
		},
		{
			id: 'ledger-nano-s',
			name: 'Ledger Nano S',
			url: 'https://www.ledger.com/academy/tutorials/nano-s-configure-a-new-device',
			isFlagship: false,
		},
		{
			id: 'ledger-nano-s-plus',
			name: 'Ledger Nano S+',
			url: 'https://shop.ledger.com/products/ledger-nano-s-plus',
			isFlagship: false,
		},
		{
			id: 'ledger-nano-x',
			name: 'Ledger Nano X',
			url: 'https://shop.ledger.com/products/ledger-nano-x',
			isFlagship: false,
		},
		{
			id: 'ledger-flex',
			name: 'Ledger Flex',
			url: 'https://shop.ledger.com/products/ledger-flex',
			isFlagship: false,
		},
	],
	trezor: [
		{
			id: 'trezor-safe-5',
			name: 'Trezor Safe 5',
			url: 'https://trezor.io/trezor-safe-5',
			isFlagship: true,
		},
		{
			id: 'trezor-safe-3',
			name: 'Trezor Safe 3',
			url: 'https://trezor.io/trezor-safe-3',
			isFlagship: false,
		},
		{
			id: 'trezor-model-one',
			name: 'Trezor Model One',
			url: 'https://trezor.io/trezor-model-one',
			isFlagship: false,
		},
		{
			id: 'trezor-model-t',
			name: 'Trezor Model T',
			url: 'https://trezor.io/trezor-model-t',
			isFlagship: false,
		},
	],
	keystone: [
		{
			id: 'keystone-pro',
			name: 'Keystone Pro',
			url: 'https://keyst.one/pro',
			isFlagship: true,
		},
		{
			id: 'keystone-essential',
			name: 'Keystone Essential',
			url: 'https://keyst.one/essential',
			isFlagship: false,
		},
	],
	gridplus: [
		{
			id: 'gridplus-lattice1',
			name: 'GridPlus Lattice1',
			url: 'https://gridplus.io/products/lattice1',
			isFlagship: true,
		},
	],
	firefly: [
		{ id: 'firefly-v1', name: 'Firefly V1', url: 'https://firefly.technology/', isFlagship: true },
	],
}

// Helper function to get models for a wallet brand
function getHardwareWalletModels(walletId: string): HardwareWalletModel[] {
	// First check if the wallet has models in its metadata
	const wallet = ratedHardwareWallets[walletId as keyof typeof ratedHardwareWallets]
	if (wallet.metadata.hardwareWalletModels && wallet.metadata.hardwareWalletModels.length > 0) {
		return wallet.metadata.hardwareWalletModels
	}

	// Fallback to the hardcoded models if no models in metadata
	return hardwareWalletModels[walletId] || []
}

// Helper function to get flagship model for a wallet brand
function getFlagshipModel(walletId: string): HardwareWalletModel | undefined {
	const models = getHardwareWalletModels(walletId)
	// First, try to find a model explicitly marked as flagship
	const flagshipModel = models.find(model => model.isFlagship)
	// If no flagship is explicitly marked, return the first model as default
	return flagshipModel || models[0]
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
const softwareWalletData: TableRow[] = Object.values(ratedWallets)
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
			if (hasEoa) {
				sortPriority = 2 // Both Smart Wallet & EOA
			} else {
				sortPriority = 1 // Smart Wallet only
			}
		} else if (hasEoa) {
			sortPriority = 3 // EOA only
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
const hardwareWalletData: TableRow[] = Object.values(ratedHardwareWallets).map(wallet => {
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

// Create a reusable cell renderer for wallet name columns
function createWalletNameCell(isHardware: boolean) {
	return ({ row, getValue }: { row: any; getValue: () => any }) => {
		// Regular row rendering with logo
		const walletId = row.original.wallet.metadata.id
		const logoPath = isHardware
			? `/images/hardware-wallets/${walletId}.svg`
			: `/images/wallets/${walletId}.svg`
		const defaultLogo = isHardware
			? '/images/hardware-wallets/default.svg'
			: '/images/wallets/default.svg'

		// Create the wallet detail URL
		const walletUrl = `/${walletId}`

		return (
			<div className="flex items-center">
				{/* Wallet Logo */}
				<div className="flex-shrink-0 mr-3">
					<img
						src={logoPath}
						alt=""
						className="w-6 h-6 object-contain"
						onError={e => {
							// Fallback for missing logos
							e.currentTarget.src = defaultLogo
						}}
					/>
				</div>
				{/* Wallet Name */}
				<a
					href={walletUrl}
					className="text-base font-medium hover:text-blue-600 hover:underline cursor-pointer"
				>
					{getValue()}
				</a>
			</div>
		)
	}
}

// Helper function for EIP standards with hover preview (non-link version)
function EipStandardTag({
	standard,
	standardNumber,
	prefix,
}: {
	standard: string
	standardNumber: string
	prefix: string
}): React.ReactElement {
	const [isHovered, setIsHovered] = useState<boolean>(false)
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

	return (
		<React.Fragment>
			<span
				className="eip-tag text-xs bg-gray-100 px-2 py-1 rounded dark:bg-[#17191f] dark:text-gray-100 dark:border-[#3f3f3f] relative z-10 cursor-help"
				title={`${prefix}-${standardNumber} - Hover for details`}
				onMouseEnter={e => {
					setIsHovered(true)
					setAnchorEl(e.currentTarget)
				}}
				onMouseLeave={() => {
					// Use a timeout to allow moving the mouse to the modal
					setTimeout(() => {
						// Only close if not hovering the modal
						const modalElement = document.querySelector('.eip-preview-modal')
						if (modalElement && modalElement.matches(':hover')) {
							return
						}
						setIsHovered(false)
						setAnchorEl(null)
					}, 100)
				}}
			>
				#{standardNumber}
			</span>
			{isHovered && anchorEl && (
				<EipPreviewModal
					eipNumber={standardNumber}
					eipPrefix={prefix}
					anchorEl={anchorEl}
					onClose={() => {
						setIsHovered(false)
						setAnchorEl(null)
					}}
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
	row: any
	columns: any[]
}): React.ReactElement {
	const [isExpanded, setIsExpanded] = useState(false)
	const [selectedModel, setSelectedModel] = useState<string | null>(null)
	const [selectedModelVariant, setSelectedModelVariant] = useState<DeviceVariant>(
		DeviceVariant.HARDWARE,
	)

	const walletId = row.original.id
	const wallet = row.original.wallet
	const models = getHardwareWalletModels(walletId)
	const flagshipModel = getFlagshipModel(walletId)

	// Set the flagship model as the default selected model
	useEffect(() => {
		// Always have a selected model, even if there's only one
		if (models.length > 0 && !selectedModel) {
			// If there's a flagship model, use it, otherwise use the first model
			const modelToSelect = flagshipModel ? flagshipModel.id : models[0].id
			setSelectedModel(modelToSelect)
		}
	}, [flagshipModel, models, selectedModel])

	// Get the currently selected model name
	const selectedModelName = selectedModel
		? models.find(m => m.id === selectedModel)?.name
		: models.length > 0
			? models[0].name
			: ''

	// Check if the selected model is the flagship
	const isSelectedFlagship = selectedModel
		? models.find(m => m.id === selectedModel)?.isFlagship
		: false

	// Toggle expansion of the models list
	const toggleExpanded = () => {
		setIsExpanded(!isExpanded)
	}

	// Handle click on a model
	const handleModelClick = (modelId: string) => {
		setSelectedModel(modelId)
	}

	// Create updated cells for rating data
	const createUpdatedCell = (cell: any, columnIndex: number) => {
		// Skip first two columns (Wallet name and Manufacture Type)
		if (columnIndex < 2) {
			return cell?.column?.columnDef?.cell
				? flexRender(cell.column.columnDef.cell, cell.getContext())
				: null
		}

		// Handle Rating data columns (Security, Privacy, etc.)
		if (columnIndex >= 3) {
			if (!cell?.getValue) {
				return null
			}

			const cellValue = cell.getValue()

			if (!cellValue) {
				return null
			}

			const { evalTree, walletId } = cellValue

			// Get the column name from the header to determine which attribute group to use
			if (!cell.column?.columnDef?.header) {
				return null
			}

			const headerText = cell.column.columnDef.header as string
			let attrGroup

			switch (headerText) {
				case 'Security':
					attrGroup = securityAttributeGroup
					break
				case 'Privacy':
					attrGroup = privacyAttributeGroup
					break
				case 'Sovereignty':
					attrGroup = selfSovereigntyAttributeGroup
					break
				case 'Transparency':
					attrGroup = transparencyAttributeGroup
					break
				case 'Ecosystem':
					attrGroup = ecosystemAttributeGroup
					break
				default:
					// For other columns, just render the default cell
					return cell?.column?.columnDef?.cell
						? flexRender(cell.column.columnDef.cell, cell.getContext())
						: null
			}

			// For now, with mock model data, we simply return the same pizza slice chart
			// When model-specific data is available, we would modify evalTree based on the model
			const modelName = selectedModel ? models.find(m => m.id === selectedModel)?.name : ''

			return (
				<div className="flex flex-col items-center">
					<PizzaSliceChart
						attrGroup={attrGroup}
						evalTree={evalTree}
						isSupported={true}
						walletId={walletId}
						features={wallet.features}
						visibleAttributes={Array.from(
							getVisibleAttributesForWallet(attrGroup, wallet.features, true),
						)}
					/>
				</div>
			)
		}

		// For other columns (like the device icon column)
		return flexRender(cell.column.columnDef.cell, cell.getContext())
	}

	// Sort models to place flagship first
	const sortedModels = [...models].sort((a, b) => {
		if (a.isFlagship) {
			return -1
		}
		if (b.isFlagship) {
			return 1
		}
		return 0
	})

	// Render the table row with expansion capabilities
	return (
		<>
			<tr
				className={`dark:bg-[#141414] dark:hover:bg-[#1a1a1a] cursor-pointer`}
				onClick={toggleExpanded}
			>
				<td className="px-4 py-2 dark:text-gray-200">
					<div className="flex items-center">
						{models.length > 1 ? (
							<span className="mr-2">
								{isExpanded ? (
									<LuChevronDown className="w-4 h-4" />
								) : (
									<LuChevronRight className="w-4 h-4" />
								)}
							</span>
						) : null}
						{/* Wallet Logo */}
						<div className="flex-shrink-0 mr-3">
							<img
								src={`/images/hardware-wallets/${walletId}.svg`}
								alt=""
								className="w-6 h-6 object-contain"
								onError={e => {
									// Fallback for missing logos
									e.currentTarget.src = '/images/hardware-wallets/default.svg'
								}}
							/>
						</div>
						{/* Wallet Name */}
						<div className="flex flex-col items-start">
							<a
								href={`/${walletId}`}
								className="text-base font-medium hover:text-blue-600 hover:underline cursor-pointer"
							>
								{row.original.name}
							</a>
							{/* Always show model name, but only show flagship indicator in expanded view */}
							<span className="text-xs flex items-center">
								<span className="text-purple-500 dark:text-purple-400 font-medium">
									{selectedModelName}
								</span>
							</span>
						</div>
					</div>
				</td>
				{row
					?.getVisibleCells?.()
					.slice(1)
					.map((cell: any, index: number) => (
						<td key={cell.id} className="px-4 py-2 dark:text-gray-200">
							{index === 0 && cell?.column?.columnDef?.cell
								? // This is the "Manufacture Type" column
									flexRender(cell.column.columnDef.cell, cell.getContext())
								: createUpdatedCell(cell, index + 1)}
						</td>
					))}
			</tr>

			{isExpanded && models.length > 1 && (
				<tr className="bg-gray-50 dark:bg-[#1a1a1a]">
					<td colSpan={columns && columns.length ? columns.length : 8} className="p-0">
						<div className="pl-10 pr-4 py-3">
							<div className="text-sm font-medium mb-2 dark:text-gray-200">Models:</div>
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
								{sortedModels.map((model, index) => (
									<div
										key={model.id}
										className={[
											'p-2 border rounded flex items-center',
											selectedModel === model.id
												? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-700'
												: 'border-gray-200 dark:border-gray-700',
											model.isFlagship ? 'ring-1 ring-purple-300 dark:ring-purple-800' : '',
											'cursor-pointer hover:border-purple-300 dark:hover:border-purple-500 transition-colors',
										].join(' ')}
										onClick={e => {
											e.stopPropagation()
											handleModelClick(model.id)
										}}
									>
										<div
											className={`w-3 h-3 rounded-full mr-2 ${
												selectedModel === model.id ? 'bg-purple-500' : 'bg-gray-400'
											}`}
										></div>
										<div className="flex-grow dark:text-gray-200 font-medium">
											{model.name}
											{model.isFlagship && (
												<span className="ml-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
													(Flagship)
												</span>
											)}
										</div>
										<a
											href={model.url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
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
				if (!row.wallet) {
					return false
				}
				const { hasEoa, hasSmartWallet } = getWalletTypeInfo(row.wallet, 'ALL_VARIANTS')
				return hasEoa && !hasSmartWallet
			}).length,
		[],
	)

	const smartWalletOnlyCount = useMemo(
		() =>
			softwareWalletData.filter(row => {
				if (!row.wallet) {
					return false
				}
				const { hasEoa, hasSmartWallet } = getWalletTypeInfo(row.wallet, 'ALL_VARIANTS')
				return hasSmartWallet && !hasEoa
			}).length,
		[],
	)

	const smartWalletAndEoaCount = useMemo(
		() =>
			softwareWalletData.filter(row => {
				if (!row.wallet) {
					return false
				}
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

		return softwareWalletData.filter(row => {
			if (!row.wallet) {
				return false
			}
			const { hasEoa, hasSmartWallet } = getWalletTypeInfo(row.wallet, 'ALL_VARIANTS')

			// For EOA_ONLY filter, check if the wallet has only EOA type
			if (walletTypeFilter === WalletTypeFilter.EOA_ONLY) {
				return hasEoa && !hasSmartWallet
			}

			// For SMART_WALLET_ONLY filter
			if (walletTypeFilter === WalletTypeFilter.SMART_WALLET_ONLY) {
				return hasSmartWallet && !hasEoa
			}

			// For SMART_WALLET_AND_EOA filter
			if (walletTypeFilter === WalletTypeFilter.SMART_WALLET_AND_EOA) {
				return hasSmartWallet && hasEoa
			}

			return true
		})
	}, [walletTypeFilter])

	// Use the appropriate data based on active tab and filters
	const tableData = useMemo(
		() => (activeTab === WalletTableTab.SOFTWARE ? filteredSoftwareWalletData : hardwareWalletData),
		[activeTab, filteredSoftwareWalletData],
	)

	// Handler for device variant change
	const handleVariantChange = (variant: DeviceVariant) => {
		setSelectedVariant(variant === selectedVariant ? DeviceVariant.NONE : variant)
	}

	// Handler for tab change
	const handleTabChange = (tab: WalletTableTab) => {
		setActiveTab(tab)
		// Reset wallet type filter when switching tabs
		setWalletTypeFilter(WalletTypeFilter.ALL)
	}

	// Handler for wallet type filter change
	const handleWalletTypeFilterChange = (filter: WalletTypeFilter) => {
		setWalletTypeFilter(filter)
	}

	// Define columns for software wallets
	const softwareColumns = [
		{
			header: 'Wallet',
			accessorKey: 'name',
			cell: createWalletNameCell(false), // Use the shared function for software wallets
		},
		{
			header: 'Type',
			accessorFn: (row: any) => {
				const { hasEoa, hasSmartWallet, hasHardware, standards } = getWalletTypeInfo(
					row.wallet,
					'ALL_VARIANTS',
				)
				const typeString = [
					hasEoa ? ('EOA' as WalletTypeCategory) : null,
					hasSmartWallet ? ('SMART_WALLET' as WalletTypeCategory) : null,
					hasHardware ? ('HARDWARE_WALLET' as WalletTypeCategory) : null,
				]
					.filter(val => val !== null)
					.map(cat => WALLET_TYPE_DISPLAY[cat] || cat)
					.join(' & ')
				return { typeString, hasSmartWallet, standards }
			},
			cell: (info: any) => {
				const value = info.getValue()
				if (!value) {
					return null
				}

				const {
					typeString,
					hasSmartWallet,
					standards,
				}: {
					typeString: string
					hasSmartWallet: boolean
					standards: Record<SmartWalletStandard, boolean>
				} = value

				// If no standards, just return the type string
				if (!hasSmartWallet) {
					return typeString
				}

				return (
					<div>
						<span>{typeString}</span>
						<div className="mt-1 flex flex-wrap gap-1">
							{Object.entries(standards).map(([std, supported]: [string, boolean]) => {
								if (!supported) {
									return null
								}

								// Only render tags for specific standards
								if (std === SmartWalletStandard.ERC_4337) {
									return (
										<EipStandardTag
											key={std}
											standard={std}
											standardNumber="4337"
											prefix={EipPrefix.ERC}
										/>
									)
								} else if (std === SmartWalletStandard.ERC_7702) {
									return (
										<EipStandardTag
											key={std}
											standard={std}
											standardNumber="7702"
											prefix={EipPrefix.EIP}
										/>
									)
								}
								// Removed the else block that rendered 'Other'
								return null // Return null for other standards like 'OTHER'
							})}
						</div>
					</div>
				)
			},
		},
		// Remove Website column
		// Add Device Support column
		{
			header: 'Risk by device',
			accessorFn: (row: any) => {
				const wallet = row.wallet
				const supportsWeb = Boolean(wallet.variants?.browser)
				const supportsMobile = Boolean(wallet.variants?.mobile)
				const supportsDesktop = Boolean(wallet.variants?.desktop)
				const hasVariants = supportsWeb || supportsMobile || supportsDesktop

				return {
					supportsWeb,
					supportsMobile,
					supportsDesktop,
					hasVariants,
				}
			},
			cell: (info: any) => {
				const value = info.getValue()
				if (!value) {
					return null
				}

				const { supportsWeb, supportsMobile, supportsDesktop } = value

				return (
					<div className="flex space-x-0 items-center">
						<div className="flex flex-col items-center group">
							<button
								className={`p-2 rounded-md transition-colors ${
									!supportsWeb
										? 'opacity-40 cursor-not-allowed text-[var(--text-tertiary)]'
										: selectedVariant === DeviceVariant.WEB
											? 'text-[var(--active)]'
											: 'text-[var(--text-secondary)] group-hover:text-[var(--hover)]'
								}`}
								onClick={() => {
									if (supportsWeb) {
										handleVariantChange(DeviceVariant.WEB)
									}
								}}
								title={supportsWeb ? 'Web/Browser' : 'Web/Browser (Not Supported)'}
								disabled={!supportsWeb}
							>
								<WebIcon />
							</button>
							<div
								className={`w-2 h-2 rounded-full mt-1 transition-colors ${
									!supportsWeb
										? 'bg-[var(--background-tertiary)]'
										: selectedVariant === DeviceVariant.WEB
											? 'bg-[var(--active)]'
											: 'bg-[var(--background-tertiary)] group-hover:bg-[var(--hover)]'
								}`}
							/>
						</div>
						<div className="flex flex-col items-center group">
							<button
								className={`p-2 rounded-md transition-colors ${
									!supportsMobile
										? 'opacity-40 cursor-not-allowed text-[var(--text-tertiary)]'
										: selectedVariant === DeviceVariant.MOBILE
											? 'text-[var(--active)]'
											: 'text-[var(--text-secondary)] group-hover:text-[var(--hover)]'
								}`}
								onClick={() => {
									if (supportsMobile) {
										handleVariantChange(DeviceVariant.MOBILE)
									}
								}}
								title={supportsMobile ? 'Mobile' : 'Mobile (Not Supported)'}
								disabled={!supportsMobile}
							>
								<MobileIcon />
							</button>
							<div
								className={`w-2 h-2 rounded-full mt-1 transition-colors ${
									!supportsMobile
										? 'bg-[var(--background-tertiary)]'
										: selectedVariant === DeviceVariant.MOBILE
											? 'bg-[var(--active)]'
											: 'bg-[var(--background-tertiary)] group-hover:bg-[var(--hover)]'
								}`}
							/>
						</div>
						<div className="flex flex-col items-center group">
							<button
								className={`p-2 rounded-md transition-colors ${
									!supportsDesktop
										? 'opacity-40 cursor-not-allowed text-[var(--text-tertiary)]'
										: selectedVariant === DeviceVariant.DESKTOP
											? 'text-[var(--active)]'
											: 'text-[var(--text-secondary)] group-hover:text-[var(--hover)]'
								}`}
								onClick={() => {
									if (supportsDesktop) {
										handleVariantChange(DeviceVariant.DESKTOP)
									}
								}}
								title={supportsDesktop ? 'Desktop' : 'Desktop (Not Supported)'}
								disabled={!supportsDesktop}
							>
								<DesktopIcon />
							</button>
							<div
								className={`w-2 h-2 rounded-full mt-1 transition-colors ${
									!supportsDesktop
										? 'bg-[var(--background-tertiary)]'
										: selectedVariant === DeviceVariant.DESKTOP
											? 'bg-[var(--active)]'
											: 'bg-[var(--background-tertiary)] group-hover:bg-[var(--hover)]'
								}`}
							/>
						</div>
					</div>
				)
			},
		},
		// Add the five category columns
		{
			header: 'Security',
			accessorFn: (row: any) => {
				const wallet = row.wallet
				const isSupported =
					selectedVariant === DeviceVariant.NONE || walletSupportsVariant(wallet, selectedVariant)
				const evalTree = getEvaluationTree(wallet, selectedVariant)
				const walletId = wallet.metadata?.id || row.id

				return { wallet, isSupported, evalTree, walletId }
			},
			cell: (info: any) => {
				const value = info.getValue()
				if (!value) {
					return null
				}

				const { wallet, isSupported, evalTree, walletId } = value

				const visibleAttrs = Array.from(
					getVisibleAttributesForWallet(securityAttributeGroup, wallet.features, false),
				)

				return (
					<PizzaSliceChart
						attrGroup={securityAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
						features={wallet.features}
						visibleAttributes={visibleAttrs}
					/>
				)
			},
		},
		{
			header: 'Privacy',
			accessorFn: (row: any) => {
				const wallet = row.wallet
				const isSupported =
					selectedVariant === DeviceVariant.NONE || walletSupportsVariant(wallet, selectedVariant)
				const evalTree = getEvaluationTree(wallet, selectedVariant)
				const walletId = wallet.metadata?.id || row.id

				return { wallet, isSupported, evalTree, walletId }
			},
			cell: (info: any) => {
				const value = info.getValue()
				if (!value) {
					return null
				}

				const { wallet, isSupported, evalTree, walletId } = value

				const visibleAttrs = Array.from(
					getVisibleAttributesForWallet(privacyAttributeGroup, wallet.features, false),
				)

				return (
					<PizzaSliceChart
						attrGroup={privacyAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
						features={wallet.features}
						visibleAttributes={visibleAttrs}
					/>
				)
			},
		},
		{
			header: 'Sovereignty',
			accessorFn: (row: any) => {
				const wallet = row.wallet
				const isSupported =
					selectedVariant === DeviceVariant.NONE || walletSupportsVariant(wallet, selectedVariant)
				const evalTree = getEvaluationTree(wallet, selectedVariant)
				const walletId = wallet.metadata?.id || row.id

				return { wallet, isSupported, evalTree, walletId }
			},
			cell: (info: any) => {
				const value = info.getValue()
				if (!value) {
					return null
				}

				const { wallet, isSupported, evalTree, walletId } = value

				const visibleAttrs = Array.from(
					getVisibleAttributesForWallet(selfSovereigntyAttributeGroup, wallet.features, false),
				)

				return (
					<PizzaSliceChart
						attrGroup={selfSovereigntyAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
						features={wallet.features}
						visibleAttributes={visibleAttrs}
					/>
				)
			},
		},
		{
			header: 'Transparency',
			accessorFn: (row: any) => {
				const wallet = row.wallet
				const isSupported =
					selectedVariant === DeviceVariant.NONE || walletSupportsVariant(wallet, selectedVariant)
				const evalTree = getEvaluationTree(wallet, selectedVariant)
				const walletId = wallet.metadata?.id || row.id

				return { wallet, isSupported, evalTree, walletId }
			},
			cell: (info: any) => {
				const value = info.getValue()
				if (!value) {
					return null
				}

				const { wallet, isSupported, evalTree, walletId } = value

				const visibleAttrs = Array.from(
					getVisibleAttributesForWallet(transparencyAttributeGroup, wallet.features, false),
				)

				return (
					<PizzaSliceChart
						attrGroup={transparencyAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
						features={wallet.features}
						visibleAttributes={visibleAttrs}
					/>
				)
			},
		},
		{
			header: 'Ecosystem',
			accessorFn: (row: any) => {
				const wallet = row.wallet
				const isSupported =
					selectedVariant === DeviceVariant.NONE || walletSupportsVariant(wallet, selectedVariant)
				const evalTree = getEvaluationTree(wallet, selectedVariant)
				const walletId = wallet.metadata?.id || row.id

				return { wallet, isSupported, evalTree, walletId }
			},
			cell: (info: any) => {
				const value = info.getValue()
				if (!value) {
					return null
				}

				const { wallet, isSupported, evalTree, walletId } = value

				const visibleAttrs = Array.from(
					getVisibleAttributesForWallet(ecosystemAttributeGroup, wallet.features, false),
				)

				return (
					<PizzaSliceChart
						attrGroup={ecosystemAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
						features={wallet.features}
						visibleAttributes={visibleAttrs}
					/>
				)
			},
		},
	]

	// Define columns for hardware wallets
	const hardwareColumns = [
		{
			header: 'Wallet',
			accessorKey: 'name',
			// For hardware wallets, we just use a simple accessor since ExpandableHardwareWalletRow handles display
			cell: (info: any) => info.getValue(),
		},
		{
			header: 'Manufacture Type',
			accessorFn: (row: any) => {
				const wallet = row.wallet
				return getHardwareWalletManufactureTypeDisplay(wallet)
			},
			cell: (info: any) => info.getValue(),
		},
		// Replace web/mobile/desktop device selector with hardware icon for hardware wallets
		{
			header: 'Risk by device',
			accessorFn: (row: any) => {
				const wallet = row.wallet
				// For hardware wallets, we just need the wallet and whether it has hardware attributes
				return { wallet }
			},
			cell: (info: any) => {
				const value = info.getValue()
				if (!value) {
					return null
				}

				return (
					<div className="flex space-x-0 items-center justify-center">
						<div className="flex flex-col items-center group">
							<button
								className={`p-2 rounded-md transition-colors ${
									selectedVariant === DeviceVariant.NONE
										? 'text-[var(--text-secondary)] group-hover:text-[var(--hover)]'
										: 'text-[var(--active)]'
								}`}
								onClick={() => {
									handleVariantChange(
										selectedVariant === DeviceVariant.NONE
											? DeviceVariant.HARDWARE
											: DeviceVariant.NONE,
									)
								}}
								title="Hardware"
							>
								<HardwareIcon
									style={{
										width: '24px',
										height: '24px',
										fill: selectedVariant === DeviceVariant.NONE ? 'currentColor' : 'var(--active)',
									}}
								/>
							</button>
							<div
								className={`w-2 h-2 rounded-full mt-1 transition-colors ${
									selectedVariant !== DeviceVariant.NONE
										? 'bg-[var(--active)]'
										: 'bg-[var(--background-tertiary)] group-hover:bg-[var(--hover)]'
								}`}
							/>
						</div>
					</div>
				)
			},
		},
		// Add the five category columns with device variant support for hardware wallets
		{
			header: 'Security',
			accessorFn: (row: any) => {
				const wallet = row.wallet
				const isSupported =
					selectedVariant === DeviceVariant.NONE || walletSupportsVariant(wallet, selectedVariant)
				const evalTree = getEvaluationTree(wallet, selectedVariant)
				const walletId = wallet.metadata?.id || row.id

				return { wallet, isSupported, evalTree, walletId }
			},
			cell: (info: any) => {
				const value = info.getValue()
				if (!value) {
					return null
				}

				const { wallet, isSupported, evalTree, walletId } = value

				const visibleAttrs = Array.from(
					getVisibleAttributesForWallet(securityAttributeGroup, wallet.features, true),
				)

				return (
					<PizzaSliceChart
						attrGroup={securityAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
						features={wallet.features}
						visibleAttributes={visibleAttrs}
					/>
				)
			},
		},
		{
			header: 'Privacy',
			accessorFn: (row: any) => {
				const wallet = row.wallet
				const isSupported =
					selectedVariant === DeviceVariant.NONE || walletSupportsVariant(wallet, selectedVariant)
				const evalTree = getEvaluationTree(wallet, selectedVariant)
				const walletId = wallet.metadata?.id || row.id

				return { wallet, isSupported, evalTree, walletId }
			},
			cell: (info: any) => {
				const value = info.getValue()
				if (!value) {
					return null
				}

				const { wallet, isSupported, evalTree, walletId } = value

				const visibleAttrs = Array.from(
					getVisibleAttributesForWallet(privacyAttributeGroup, wallet.features, true),
				)

				return (
					<PizzaSliceChart
						attrGroup={privacyAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
						features={wallet.features}
						visibleAttributes={visibleAttrs}
					/>
				)
			},
		},
		{
			header: 'Sovereignty',
			accessorFn: (row: any) => {
				const wallet = row.wallet
				const isSupported =
					selectedVariant === DeviceVariant.NONE || walletSupportsVariant(wallet, selectedVariant)
				const evalTree = getEvaluationTree(wallet, selectedVariant)
				const walletId = wallet.metadata?.id || row.id

				return { wallet, isSupported, evalTree, walletId }
			},
			cell: (info: any) => {
				const value = info.getValue()
				if (!value) {
					return null
				}

				const { wallet, isSupported, evalTree, walletId } = value

				const visibleAttrs = Array.from(
					getVisibleAttributesForWallet(selfSovereigntyAttributeGroup, wallet.features, true),
				)

				return (
					<PizzaSliceChart
						attrGroup={selfSovereigntyAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
						features={wallet.features}
						visibleAttributes={visibleAttrs}
					/>
				)
			},
		},
		{
			header: 'Transparency',
			accessorFn: (row: any) => {
				const wallet = row.wallet
				const isSupported =
					selectedVariant === DeviceVariant.NONE || walletSupportsVariant(wallet, selectedVariant)
				const evalTree = getEvaluationTree(wallet, selectedVariant)
				const walletId = wallet.metadata?.id || row.id

				return { wallet, isSupported, evalTree, walletId }
			},
			cell: (info: any) => {
				const value = info.getValue()
				if (!value) {
					return null
				}

				const { wallet, isSupported, evalTree, walletId } = value

				const visibleAttrs = Array.from(
					getVisibleAttributesForWallet(transparencyAttributeGroup, wallet.features, true),
				)

				return (
					<PizzaSliceChart
						attrGroup={transparencyAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
						features={wallet.features}
						visibleAttributes={visibleAttrs}
					/>
				)
			},
		},
		{
			header: 'Ecosystem',
			accessorFn: (row: any) => {
				const wallet = row.wallet
				const isSupported =
					selectedVariant === DeviceVariant.NONE || walletSupportsVariant(wallet, selectedVariant)
				const evalTree = getEvaluationTree(wallet, selectedVariant)
				const walletId = wallet.metadata?.id || row.id

				return { wallet, isSupported, evalTree, walletId }
			},
			cell: (info: any) => {
				const value = info.getValue()
				if (!value) {
					return null
				}

				const { wallet, isSupported, evalTree, walletId } = value

				const visibleAttrs = Array.from(
					getVisibleAttributesForWallet(ecosystemAttributeGroup, wallet.features, true),
				)

				return (
					<PizzaSliceChart
						attrGroup={ecosystemAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
						features={wallet.features}
						visibleAttributes={visibleAttrs}
					/>
				)
			},
		},
	]

	// Use the appropriate columns based on active tab
	const columns = useMemo(
		() => (activeTab === WalletTableTab.SOFTWARE ? softwareColumns : hardwareColumns),
		[activeTab],
	)

	// Create table
	const table = useReactTable({
		data: tableData,
		columns,
		getCoreRowModel: getCoreRowModel(),
	})

	return (
		<div className="overflow-x-auto">
			{/* Tabs - now fixed */}
			<div className="sticky top-0 bg-white dark:bg-[#141414] z-10">
				<div className="flex gap-4">
					<div className="flex gap-1">
						<button
							className={`px-4 py-3 font-medium text-sm rounded-tr-lg rounded-tl-lg transition-transform ${
								activeTab === WalletTableTab.SOFTWARE
									? 'bg-white dark:bg-[#292C34] shadow-sm text-gray-800 dark:text-gray-100 border border-b-0 border-[#DE69BB]'
									: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-[#EAEAEA] dark:bg-[#17191f]'
							}`}
							onClick={() => {
								handleTabChange(WalletTableTab.SOFTWARE)
							}}
						>
							Software wallets
							<span
								className={`ml-2 px-2 py-0.5 text-xs text-white font-medium rounded-full ${
									activeTab === WalletTableTab.SOFTWARE ? 'bg-purple-500' : 'bg-[#3B0E45]'
								}`}
							>
								{filteredSoftwareWalletData.length}
							</span>
						</button>
						<button
							className={`px-4 py-3 font-medium text-sm rounded-tr-lg rounded-tl-lg transition-transform ${
								activeTab === WalletTableTab.HARDWARE
									? 'bg-white dark:bg-[#292C34] shadow-sm text-gray-800 dark:text-gray-100 border border-b-0 border-[#DE69BB]'
									: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-[#EAEAEA] dark:bg-[#17191f]'
							}`}
							onClick={() => {
								handleTabChange(WalletTableTab.HARDWARE)
							}}
						>
							Hardware wallets
							<span
								className={`ml-2 px-2 py-0.5 text-xs text-white font-medium rounded-full ${
									activeTab === WalletTableTab.HARDWARE ? 'bg-purple-500' : 'bg-[#3B0E45]'
								}`}
							>
								{hardwareWalletData.length}
							</span>
						</button>
					</div>
					{/* Wallet Type Filter Buttons - only show for Software wallets tab */}
					{activeTab === WalletTableTab.SOFTWARE && (
						<div className="flex flex-wrap gap-2 py-1 px-1">
							<span className="text-sm font-medium text-gray-600 dark:text-gray-300 self-center mr-2">
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
									className={`inline-block ml-1 px-1.5 py-0.5 text-xs rounded-full ${
										walletTypeFilter === WalletTypeFilter.ALL
											? 'bg-white bg-opacity-30 text-white'
											: 'bg-gray-500 bg-opacity-20 text-gray-700 dark:bg-gray-500 dark:bg-opacity-30 dark:text-gray-200'
									}`}
								>
									{softwareWalletData.length}
								</span>
							</button>
							<button
								className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
									walletTypeFilter === WalletTypeFilter.SMART_WALLET_ONLY
										? 'bg-purple-500 text-white'
										: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
								}`}
								onClick={() => {
									handleWalletTypeFilterChange(WalletTypeFilter.SMART_WALLET_ONLY)
								}}
							>
								Smart Wallet
								<span
									className={`inline-block ml-1 px-1.5 py-0.5 text-xs rounded-full ${
										walletTypeFilter === WalletTypeFilter.SMART_WALLET_ONLY
											? 'bg-white bg-opacity-30 text-white'
											: 'bg-gray-500 bg-opacity-20 text-gray-700 dark:bg-gray-500 dark:bg-opacity-30 dark:text-gray-200'
									}`}
								>
									{smartWalletOnlyCount}
								</span>
							</button>
							<button
								className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
									walletTypeFilter === WalletTypeFilter.SMART_WALLET_AND_EOA
										? 'bg-purple-500 text-white'
										: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
								}`}
								onClick={() => {
									handleWalletTypeFilterChange(WalletTypeFilter.SMART_WALLET_AND_EOA)
								}}
							>
								Smart Wallet & EOA
								<span
									className={`inline-block ml-1 px-1.5 py-0.5 text-xs rounded-full ${
										walletTypeFilter === WalletTypeFilter.SMART_WALLET_AND_EOA
											? 'bg-white bg-opacity-30 text-white'
											: 'bg-gray-500 bg-opacity-20 text-gray-700 dark:bg-gray-500 dark:bg-opacity-30 dark:text-gray-200'
									}`}
								>
									{smartWalletAndEoaCount}
								</span>
							</button>
							<button
								className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
									walletTypeFilter === WalletTypeFilter.EOA_ONLY
										? 'bg-purple-500 text-white'
										: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
								}`}
								onClick={() => {
									handleWalletTypeFilterChange(WalletTypeFilter.EOA_ONLY)
								}}
							>
								EOA
								<span
									className={`inline-block ml-1 px-1.5 py-0.5 text-xs rounded-full ${
										walletTypeFilter === WalletTypeFilter.EOA_ONLY
											? 'bg-white bg-opacity-30 text-white'
											: 'bg-gray-500 bg-opacity-20 text-gray-700 dark:bg-gray-500 dark:bg-opacity-30 dark:text-gray-200'
									}`}
								>
									{eoaOnlyWalletCount}
								</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border">
					<thead>
						{table.getHeaderGroups().map(headerGroup => (
							<tr className="bg-tertiary" key={headerGroup.id}>
								{headerGroup.headers.map(header => (
									<th
										key={header.id}
										className={`px-4 py-2 text-center text-[14px] text-secondary ${
											(header.column &&
												header.column.columnDef &&
												header.column.columnDef.header === 'Wallet') ||
											(header.column &&
												header.column.columnDef &&
												header.column.columnDef.header === 'Type') ||
											(header.column &&
												header.column.columnDef &&
												header.column.columnDef.header === 'Manufacture Type')
												? 'font-bold !text-left'
												: header.column &&
													  header.column.columnDef &&
													  header.column.columnDef.header === 'Risk by device'
													? 'font-semibold'
													: 'font-normal'
										}`}
									>
										{header &&
										header.column &&
										header.column.columnDef &&
										header.column.columnDef.header
											? flexRender(header.column.columnDef.header, header.getContext())
											: null}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
						{(activeTab as string) === WalletTableTab.HARDWARE
							? table
									.getRowModel()
									.rows.map(row => (
										<ExpandableHardwareWalletRow key={row.id} row={row} columns={columns} />
									))
							: table.getRowModel().rows.map(row => {
									const parentWallet = row.original.wallet
									const isSupported =
										!parentWallet ||
										(activeTab === WalletTableTab.HARDWARE &&
											(selectedVariant === DeviceVariant.NONE ||
												selectedVariant === DeviceVariant.HARDWARE)) ||
										(activeTab === WalletTableTab.SOFTWARE &&
											(selectedVariant === DeviceVariant.NONE ||
												walletSupportsVariant(parentWallet, selectedVariant)))

									return (
										<tr
											key={row.id}
											className={`${!isSupported ? 'opacity-50' : ''} dark:bg-[#141414] dark:hover:bg-[#1a1a1a]`}
										>
											{row &&
												row.getVisibleCells &&
												row.getVisibleCells().map(cell => (
													<td key={cell.id} className="px-4 py-2 dark:text-gray-200">
														{cell &&
														cell.column &&
														cell.column.columnDef &&
														cell.column.columnDef.cell
															? flexRender(cell.column.columnDef.cell, cell.getContext())
															: null}
													</td>
												))}
										</tr>
									)
								})}
					</tbody>
				</table>
			</div>
		</div>
	)
}
