/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/strict-boolean-expressions - Disabled for integration with tanstack table */
import * as React from 'react'
import { useState } from 'react'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { ratedWallets } from '@/data/wallets'
import { ratedHardwareWallets } from '@/data/hardware-wallets'
import {
	securityAttributeGroup,
	privacyAttributeGroup,
	selfSovereigntyAttributeGroup,
	transparencyAttributeGroup,
	ecosystemAttributeGroup,
} from '@/schema/attribute-groups'
import { Rating, type AttributeGroup } from '@/schema/attributes'
import type { EvaluationTree } from '@/schema/attribute-groups'
import { RatingDetailModal } from '../molecules/RatingDetailModal'
import { HardwareWalletManufactureType } from '@/schema/features/profile'
import { WebIcon, MobileIcon, DesktopIcon } from '@/icons'
import { HardwareIcon } from '@/icons/devices/HardwareIcon'

// Define wallet type constants from the previous implementation
const WalletTypeCategory = {
	EOA: 'EOA',
	SMART_WALLET: 'SMART_WALLET',
	HARDWARE_WALLET: 'HARDWARE_WALLET',
} as const

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
	[WalletTypeCategory.SMART_WALLET]: 'SW',
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
interface WalletInfo {
	categories: WalletTypeCategory[]
	standards: SmartWalletStandard[]
	isMultiType: boolean
}

// Helper type for wallet metadata access
interface WalletMetadataLike {
	id: string
	displayName: string
	url?: string
	walletType?: {
		category?: WalletTypeCategory
		smartWalletStandard?: SmartWalletStandard
	}
	multiWalletType?: {
		categories?: WalletTypeCategory[]
		smartWalletStandards?: SmartWalletStandard[]
	}
	hardwareWalletManufactureType?: HardwareWalletManufactureType
	// Add properties for variants
	variants?: Record<string, any>
}

interface WalletLike {
	metadata: WalletMetadataLike
	overall: EvaluationTree
	variants?: Record<string, { attributes: EvaluationTree }>
}

// Helper function to get wallet type information
function getWalletTypeInfo(wallet: WalletLike): WalletInfo {
	const walletType = wallet.metadata.walletType ?? {}
	const category = walletType.category ?? WalletTypeCategory.EOA
	const standards: SmartWalletStandard[] = []

	if (category === WalletTypeCategory.SMART_WALLET && walletType.smartWalletStandard) {
		standards.push(walletType.smartWalletStandard)
	}

	// Also check for multiWalletType
	if (wallet.metadata.multiWalletType) {
		const multiType = wallet.metadata.multiWalletType
		const categories = multiType.categories ?? []
		if (multiType.smartWalletStandards) {
			standards.push(...multiType.smartWalletStandards)
		}
		return {
			categories,
			standards,
			isMultiType: true,
		}
	}

	return {
		categories: [category],
		standards,
		isMultiType: false,
	}
}

// Helper function to get a detailed description of the wallet
function getDetailedWalletDescription(wallet: WalletLike): string {
	const { categories, standards } = getWalletTypeInfo(wallet)

	const typeDescriptions: string[] = []

	if (categories.includes(WalletTypeCategory.EOA)) {
		typeDescriptions.push('Externally Owned Account')
	}

	if (categories.includes(WalletTypeCategory.SMART_WALLET)) {
		const standardsStr =
			standards.length > 0
				? `(${standards.map(std => SMART_WALLET_STANDARD_DISPLAY[std] ?? std).join(', ')})`
				: ''
		typeDescriptions.push(`Smart Wallet ${standardsStr}`)
	}

	if (categories.includes(WalletTypeCategory.HARDWARE_WALLET)) {
		typeDescriptions.push('Hardware Wallet')
	}

	return typeDescriptions.join(' + ')
}

// Helper function to get hardware wallet manufacture type display name
function getHardwareWalletManufactureTypeDisplay(wallet: WalletLike): string {
	const manufactureType = wallet.metadata.hardwareWalletManufactureType
	if (manufactureType !== undefined && manufactureType !== null) {
		return HARDWARE_WALLET_MANUFACTURE_TYPE_DISPLAY[manufactureType] || 'Unknown'
	}
	return 'Unknown'
}

// Helper function to check if wallet supports a specific device variant
function walletSupportsVariant(wallet: WalletLike, variant: DeviceVariant): boolean {
	if (variant === DeviceVariant.NONE) {
		return true
	}

	// For hardware variant in hardware wallets tab
	if (variant === DeviceVariant.HARDWARE) {
		// Hardware wallets always support the hardware variant
		const isHardware =
			wallet.metadata.walletType?.category === WalletTypeCategory.HARDWARE_WALLET ||
			Boolean(
				wallet.metadata.multiWalletType?.categories?.includes(WalletTypeCategory.HARDWARE_WALLET),
			)

		return isHardware
	}

	return Boolean(wallet.variants && variant in wallet.variants)
}

// Helper function to get device-specific evaluation tree
function getEvaluationTree(wallet: WalletLike, selectedVariant: DeviceVariant): EvaluationTree {
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

// Helper function to extract attribute ratings from evaluation tree
function getAttributeRatings(
	attrGroup: AttributeGroup<any>,
	evalTree: EvaluationTree,
): { rating: Rating; id: string }[] {
	const attributes: { rating: Rating; id: string }[] = []

	try {
		// Get the category key and data safely
		const categoryKey = attrGroup.id as keyof EvaluationTree
		const categoryData = evalTree[categoryKey]

		if (!categoryData) {
			return attributes
		}

		// We need to handle the categoryData as a dynamic object
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const dataObj = categoryData as Record<string, any>

		// Extract ratings from attributes
		for (const key in dataObj) {
			if (Object.prototype.hasOwnProperty.call(dataObj, key)) {
				const evalAttr = dataObj[key]

				// Check if evaluation data is present and has a rating
				if (evalAttr?.evaluation?.value?.rating !== undefined) {
					const rating = evalAttr.evaluation.value.rating

					// Skip exempt ratings
					if (rating !== Rating.EXEMPT) {
						attributes.push({
							id: key,
							rating: rating as Rating,
						})
					}
				}
			}
		}
	} catch (e) {
		// eslint-disable-next-line no-console -- Error logging needed for debugging
		console.error(`Error extracting ratings for ${attrGroup.id}:`, e)
	}

	return attributes
}

// Pizza Slice Chart Component (inspired by WalletTableStylingExample)
function PizzaSliceChart({
	attrGroup,
	evalTree,
	isSupported = true,
	walletId,
}: {
	attrGroup: AttributeGroup<any>
	evalTree: EvaluationTree
	isSupported?: boolean
	walletId: string
}): React.ReactElement {
	// Add state for the modal
	const [modalOpen, setModalOpen] = useState(false)

	// Get attribute ratings and calculate overall score
	const attributeRatings = getAttributeRatings(attrGroup, evalTree)
	const attributeCount = attributeRatings.length > 0 ? attributeRatings.length : 4 // Default to 4 if no attributes
	let overallScore = 0

	try {
		// Calculate the overall score safely
		const categoryKey = attrGroup.id as keyof EvaluationTree
		const categoryData = evalTree[categoryKey]

		// Only proceed if we have both category data and a score function
		if (!categoryData || typeof attrGroup.score !== 'function') {
			// If missing data, leave overallScore as 0
		} else {
			// Type assertions needed due to complexity of types
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
			const scoreResult = attrGroup.score(categoryData as any)

			// Check for valid score result with safe object property access
			if (typeof scoreResult === 'object' && scoreResult !== null && 'score' in scoreResult) {
				// Safe access to score property
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				overallScore = scoreResult.score
			}
		}
	} catch (e) {
		// eslint-disable-next-line no-console -- Error logging needed for debugging
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

		const sliceAngle = 360 / attributeCount - gapAngle

		for (let i = 0; i < attributeCount; i++) {
			const startAngle = i * (sliceAngle + gapAngle)
			const endAngle = startAngle + sliceAngle

			// Convert angles to radians
			const startRad = ((startAngle - 90) * Math.PI) / 180
			const endRad = ((endAngle - 90) * Math.PI) / 180

			// Calculate coordinates
			const x1 = centerX + radius * Math.cos(startRad)
			const y1 = centerY + radius * Math.sin(startRad)
			const x2 = centerX + radius * Math.cos(endRad)
			const y2 = centerY + radius * Math.sin(endRad)

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

// TableRow interface for better type safety
interface TableRow {
	id: string
	name: string
	wallet: WalletLike
	typeDescription?: string
	standards?: string
	websiteUrl?: string
	manufactureType?: string
}

// Create software wallet table data
const softwareWalletData: TableRow[] = Object.values(ratedWallets).map(wallet => {
	const detailedType = getDetailedWalletDescription(wallet as WalletLike)
	const { standards } = getWalletTypeInfo(wallet as WalletLike)

	// Format wallet standards for display
	const standardsDisplay =
		standards.length > 0
			? standards
					.map(std => {
						const display = SMART_WALLET_STANDARD_DISPLAY[std]
						return display !== undefined ? display : std
					})
					.join(', ')
			: 'None'

	const websiteUrl =
		typeof wallet.metadata.url === 'string' && wallet.metadata.url !== ''
			? wallet.metadata.url
			: 'Not available'

	return {
		id: wallet.metadata.id,
		name: wallet.metadata.displayName,
		wallet: wallet as WalletLike,
		typeDescription: detailedType,
		standards: standardsDisplay,
		websiteUrl,
	}
})

// Create hardware wallet table data
const hardwareWalletData: TableRow[] = Object.values(ratedHardwareWallets).map(wallet => {
	const walletLike = wallet as WalletLike
	const manufactureType = getHardwareWalletManufactureTypeDisplay(walletLike)
	const websiteUrl =
		typeof walletLike.metadata.url === 'string' && walletLike.metadata.url !== ''
			? walletLike.metadata.url
			: 'Not available'

	return {
		id: walletLike.metadata.id,
		name: walletLike.metadata.displayName,
		wallet: walletLike,
		manufactureType,
		websiteUrl,
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

export default function WalletTable(): React.ReactElement {
	// Add state for selected device variant and active tab
	const [selectedVariant, setSelectedVariant] = useState<DeviceVariant>(DeviceVariant.NONE)
	const [activeTab, setActiveTab] = useState<WalletTableTab>(WalletTableTab.SOFTWARE)

	// Use the appropriate data based on active tab
	const tableData = activeTab === WalletTableTab.SOFTWARE ? softwareWalletData : hardwareWalletData

	// Handler for device variant change
	const handleVariantChange = (variant: DeviceVariant) => {
		setSelectedVariant(variant === selectedVariant ? DeviceVariant.NONE : variant)
	}

	// Handler for tab change
	const handleTabChange = (tab: WalletTableTab) => {
		setActiveTab(tab)
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
				const { categories } = getWalletTypeInfo(row.wallet)
				return categories.map(cat => WALLET_TYPE_DISPLAY[cat] || cat).join(' & ')
			},
			cell: (info: any) => info.getValue(),
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
						<div className="flex flex-col items-center">
							<button
								className={`p-2 rounded-md ${
									!supportsWeb
										? 'opacity-40 cursor-not-allowed text-gray-400'
										: selectedVariant === DeviceVariant.WEB
											? 'text-purple-700'
											: 'text-gray-600 hover:text-gray-900'
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
								className={`w-2 h-2 rounded-full mt-1 ${
									selectedVariant === DeviceVariant.WEB ? 'bg-purple-700' : 'bg-gray-300'
								}`}
							/>
						</div>
						<div className="flex flex-col items-center">
							<button
								className={`p-2 rounded-md ${
									!supportsMobile
										? 'opacity-40 cursor-not-allowed text-gray-400'
										: selectedVariant === DeviceVariant.MOBILE
											? 'text-purple-700'
											: 'text-gray-600 hover:text-gray-900'
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
								className={`w-2 h-2 rounded-full mt-1 ${
									selectedVariant === DeviceVariant.MOBILE ? 'bg-purple-700' : 'bg-gray-300'
								}`}
							/>
						</div>
						<div className="flex flex-col items-center">
							<button
								className={`p-2 rounded-md ${
									!supportsDesktop
										? 'opacity-40 cursor-not-allowed text-gray-400'
										: selectedVariant === DeviceVariant.DESKTOP
											? 'text-purple-700'
											: 'text-gray-600 hover:text-gray-900'
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
								className={`w-2 h-2 rounded-full mt-1 ${
									selectedVariant === DeviceVariant.DESKTOP ? 'bg-purple-700' : 'bg-gray-300'
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

				return (
					<PizzaSliceChart
						attrGroup={securityAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
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

				return (
					<PizzaSliceChart
						attrGroup={privacyAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
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

				return (
					<PizzaSliceChart
						attrGroup={selfSovereigntyAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
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

				return (
					<PizzaSliceChart
						attrGroup={transparencyAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
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

				return (
					<PizzaSliceChart
						attrGroup={ecosystemAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
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
			cell: createWalletNameCell(true), // Use the shared function for hardware wallets
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
						<div className="flex flex-col items-center">
							<button
								className={`p-2 rounded-md ${
									selectedVariant === DeviceVariant.NONE
										? 'text-gray-600 hover:text-gray-900'
										: 'text-purple-700'
								}`}
								onClick={() => {
									// Toggle between none and hardware selection
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
										fill: selectedVariant === DeviceVariant.NONE ? 'currentColor' : '#9333EA',
									}}
								/>
							</button>
							<div
								className={`w-2 h-2 rounded-full mt-1 ${
									selectedVariant !== DeviceVariant.NONE ? 'bg-purple-700' : 'bg-gray-300'
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

				return (
					<PizzaSliceChart
						attrGroup={securityAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
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

				return (
					<PizzaSliceChart
						attrGroup={privacyAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
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

				return (
					<PizzaSliceChart
						attrGroup={selfSovereigntyAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
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

				return (
					<PizzaSliceChart
						attrGroup={transparencyAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
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

				return (
					<PizzaSliceChart
						attrGroup={ecosystemAttributeGroup}
						evalTree={evalTree}
						isSupported={isSupported}
						walletId={walletId}
					/>
				)
			},
		},
	]

	// Use the appropriate columns based on active tab
	const columns = activeTab === WalletTableTab.SOFTWARE ? softwareColumns : hardwareColumns

	// Create table
	const table = useReactTable({
		data: tableData,
		columns,
		getCoreRowModel: getCoreRowModel(),
	})

	return (
		<div className="overflow-x-auto">
			{/* Tabs - now fixed */}
			<div className="sticky top-0 bg-white z-10">
				<div className="flex">
					<button
						className={`px-4 py-3 font-medium text-sm rounded-tr-lg rounded-tl-lg transition-transform ${
							activeTab === WalletTableTab.SOFTWARE
								? 'bg-white shadow-sm text-gray-800 border border-b-0 border-[#DE69BB]'
								: 'text-gray-500 hover:text-gray-700 bg-[#EAEAEA]'
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
							{softwareWalletData.length}
						</span>
					</button>
					<button
						className={`px-4 py-3 font-medium text-sm rounded-tr-lg rounded-tl-lg transition-transform ${
							activeTab === WalletTableTab.HARDWARE
								? 'bg-white shadow-sm text-gray-800 border border-b-0 border-[#DE69BB]'
								: 'text-gray-500 hover:text-gray-700 bg-[#EAEAEA]'
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
			</div>

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead>
						{table.getHeaderGroups().map(headerGroup => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map(header => (
									<th
										key={header.id}
										className={`px-4 py-2 text-left text-[14px] text-[#616161] bg-gray-100 ${
											header.column.columnDef.header === 'Wallet' ||
											header.column.columnDef.header === 'Type'
												? 'font-bold'
												: header.column.columnDef.header === 'Risk by device'
													? 'font-semibold'
													: 'font-normal'
										}`}
									>
										{flexRender(header.column.columnDef.header, header.getContext())}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody className="divide-y divide-gray-200">
						{table
							.getRowModel()
							.rows.map(row => {
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
									<tr key={row.id} className={`${!isSupported ? 'opacity-50' : ''}`}>
										{row.getVisibleCells().map(cell => (
											<td key={cell.id} className="px-4 py-2">
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</td>
										))}
									</tr>
								)
							})
							.filter(Boolean)}
					</tbody>
				</table>
			</div>
		</div>
	)
}
