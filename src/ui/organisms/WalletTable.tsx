import { ratedWallets } from '@/data/wallets'
import { ratedHardwareWallets } from '@/data/hardware-wallets'
import type { AttributeGroup, ValueSet, EvaluatedGroup } from '@/schema/attributes'
import type { RatedWallet } from '@/schema/wallet'
import { Box, type SxProps, Tooltip } from '@mui/material'
import { DataGrid, type GridColDef, GridToolbar, type GridSortModel } from '@mui/x-data-grid'
import type React from 'react'
import { WalletRatingCell, walletRatingColumnProps } from '@/ui/molecules/WalletRatingCell'
import {
	ecosystemAttributeGroup,
	type EvaluationTree,
	privacyAttributeGroup,
	securityAttributeGroup,
	selfSovereigntyAttributeGroup,
	transparencyAttributeGroup,
} from '@/schema/attribute-groups'
import { WalletNameCell } from '@/ui/molecules/WalletNameCell'
import { type Dispatch, type SetStateAction, useState } from 'react'
import { expandedRowHeight, shortRowHeight } from '../../components/constants'
import type {
	WalletRowState,
	WalletRowStateHandle,
	WalletTableState,
	WalletTableStateHandle,
} from '../WalletTableState'
import type { Variant } from '@/schema/variants'
import { ThemeProvider } from '@mui/system'
import { walletTableTheme, lightWalletTableTheme } from '@/components/ThemeRegistry/theme'
import {
	WalletTypeCategory,
	SmartWalletStandard,
	createHardwareWalletType,
} from '@/schema/features/wallet-type'
import { useTheme } from '@mui/material/styles'
import { HardwareWalletManufactureType } from '@/schema/features/profile'
import { eipMarkdownLink } from '@/schema/eips'
import { RenderTypographicContent } from '@/ui/atoms/RenderTypographicContent'
import { eip7702 } from '@/data/eips/eip-7702'
import { erc4337 } from '@/data/eips/erc-4337'
import { ContentType } from '@/types/content'

// Define display strings for wallet types
const WALLET_TYPE_DISPLAY = {
	[WalletTypeCategory.EOA]: 'EOA',
	[WalletTypeCategory.SMART_WALLET]: 'SW',
	[WalletTypeCategory.HARDWARE_WALLET]: 'HW',
}

// Define display strings for smart wallet standards
const SMART_WALLET_STANDARD_DISPLAY = {
	[SmartWalletStandard.ERC_4337]: 'ERC-4337',
	[SmartWalletStandard.ERC_7702]: 'ERC-7702',
	[SmartWalletStandard.OTHER]: 'Other',
}

// Define EIP file paths for standards
const SMART_WALLET_STANDARD_LINKS: Record<string, string> = {
	[SmartWalletStandard.ERC_4337]: 'https://eips.ethereum.org/EIPS/eip-4337',
	[SmartWalletStandard.ERC_7702]: 'https://eips.ethereum.org/EIPS/eip-7702',
}

// Define display strings for hardware wallet manufacture types
const HARDWARE_WALLET_MANUFACTURE_TYPE_DISPLAY = {
	[HardwareWalletManufactureType.FACTORY_MADE]: 'Factory-Made',
	[HardwareWalletManufactureType.DIY]: 'DIY',
}

// Helper to create a multi-type wallet definition for the UI
interface MultiWalletTypeInfo {
	categories: WalletTypeCategory[]
	smartWalletStandards?: SmartWalletStandard[]
	details?: string
}

class TableStateHandle implements WalletTableStateHandle {
	readonly variantSelected: Variant | null

	private readonly setTableState: Dispatch<SetStateAction<WalletTableState>>

	constructor(
		tableState: WalletTableState,
		setTableState: Dispatch<SetStateAction<WalletTableState>>,
	) {
		this.variantSelected = tableState.variantSelected
		this.setTableState = setTableState
	}

	variantClick(clicked: Variant): void {
		this.setTableState(prevState => ({
			variantSelected: clicked === prevState.variantSelected ? null : clicked,
		}))
	}
}

/** Class handling rendering and scoring a single wallet row. */
class WalletRow implements WalletRowStateHandle {
	readonly wallet: RatedWallet
	readonly evalTree: EvaluationTree
	readonly table: WalletTableStateHandle
	readonly expanded: boolean
	readonly rowWideStyle: SxProps

	/** Data table ID; required by DataGrid. */
	readonly id: string

	private readonly setRowsState: Dispatch<SetStateAction<Record<string, WalletRowState>>>

	constructor(
		wallet: RatedWallet,
		tableStateHandle: WalletTableStateHandle,
		rowsState: Record<string, WalletRowState>,
		setRowsState: Dispatch<SetStateAction<Record<string, WalletRowState>>>,
	) {
		this.wallet = wallet
		this.id = wallet.metadata.id
		this.table = tableStateHandle
		const rowState = rowsState[this.id] ?? { expanded: false }
		this.expanded = rowState.expanded
		this.setRowsState = setRowsState
		this.rowWideStyle = {
			color: 'var(--text-primary)',
		}
		this.evalTree = wallet.overall
		if (tableStateHandle.variantSelected !== null) {
			const walletForVariant = wallet.variants[tableStateHandle.variantSelected]
			if (walletForVariant === undefined) {
				this.rowWideStyle = {
					filter: 'contrast(65%)',
					opacity: 0.5,
					color: 'var(--text-primary)',
				}
			} else {
				this.evalTree = walletForVariant.attributes
			}
		}
	}

	toggleExpanded(): void {
		this.setRowsState((prevState: Record<string, WalletRowState>) => ({
			...prevState,
			[this.id]: {
				expanded: !this.expanded,
			},
		}))
	}

	setExpanded(expanded: boolean): void {
		this.setRowsState((prevState: Record<string, WalletRowState>) => ({
			...prevState,
			[this.id]: {
				expanded,
			},
		}))
	}

	/** Get the height of the row in pixels. */
	getRowHeight(): number {
		// Increase row height for all rows to accommodate pie charts better
		return this.expanded ? expandedRowHeight + 100 : Math.max(shortRowHeight + 60, 140)
	}

	/** Render the "Name" cell. */
	renderName(): React.JSX.Element {
		return <WalletNameCell row={this} />
	}

	/** Compute numerical score for an attribute group. */
	score<Vs extends ValueSet>(
		attrGroup: AttributeGroup<Vs>,
		evalGroupFn: (tree: EvaluationTree) => EvaluatedGroup<Vs>,
	): number {
		const score = attrGroup.score(evalGroupFn(this.wallet.overall))
		return score === null ? 0.0 : score.score
	}

	/** Render a cell for a rating column. */
	render<Vs extends ValueSet>(
		attrGroup: AttributeGroup<Vs>,
		evalGroupFn: (tree: EvaluationTree) => EvaluatedGroup<Vs>,
	): React.JSX.Element {
		return <WalletRatingCell<Vs> row={this} attrGroup={attrGroup} evalGroupFn={evalGroupFn} />
	}

	/** Get all wallet type categories */
	getWalletTypeCategories(): WalletTypeCategory[] {
		if (this.wallet.metadata.multiWalletType) {
			return this.wallet.metadata.multiWalletType.categories
		}
		return [this.wallet.metadata.walletType?.category || WalletTypeCategory.EOA]
	}

	/** Get the smart wallet standards if applicable */
	getSmartWalletStandards(): SmartWalletStandard[] | undefined {
		if (this.wallet.metadata.multiWalletType?.smartWalletStandards) {
			return this.wallet.metadata.multiWalletType.smartWalletStandards
		}

		if (this.getWalletTypeCategories().includes(WalletTypeCategory.SMART_WALLET)) {
			const standard = this.wallet.metadata.walletType?.smartWalletStandard
			return standard ? [standard] : undefined
		}

		return undefined
	}

	/** Get human-readable wallet type for display */
	getDisplayWalletType(): string {
		const categories = this.getWalletTypeCategories()

		// Compact display
		const typeDisplay = categories.map(cat => WALLET_TYPE_DISPLAY[cat]).join(' & ')
		return typeDisplay
	}

	/** Get detailed wallet type for tooltip */
	getDetailedWalletType(): string {
		const categories = this.getWalletTypeCategories()
		const standards = this.getSmartWalletStandards()

		// If we have both EOA and Smart Wallet
		if (
			categories.includes(WalletTypeCategory.EOA) &&
			categories.includes(WalletTypeCategory.SMART_WALLET)
		) {
			const smartWalletStandardsStr = standards
				?.map(std => SMART_WALLET_STANDARD_DISPLAY[std])
				.join(' + ')
			return `Externally Owned Account + Smart Wallet (${smartWalletStandardsStr})`
		}

		// If just EOA
		if (categories.length === 1 && categories[0] === WalletTypeCategory.EOA) {
			return 'Externally Owned Account'
		}

		// If just Smart Wallet with standards
		if (
			categories.length === 1 &&
			categories[0] === WalletTypeCategory.SMART_WALLET &&
			standards?.length
		) {
			return `Smart Wallet (${standards.map(std => SMART_WALLET_STANDARD_DISPLAY[std]).join(' + ')})`
		}

		// If hardware wallet
		if (categories.length === 1 && categories[0] === WalletTypeCategory.HARDWARE_WALLET) {
			return 'Hardware Wallet'
		}

		// Fallback for other multi-type combinations
		const fullTypeNames = categories
			.map(cat => {
				if (cat === WalletTypeCategory.EOA) {
					return 'Externally Owned Account'
				}
				if (cat === WalletTypeCategory.SMART_WALLET) {
					return 'Smart Wallet'
				}
				if (cat === WalletTypeCategory.HARDWARE_WALLET) {
					return 'Hardware Wallet'
				}
				return cat
			})
			.join(' + ')

		return fullTypeNames
	}

	/** Check if wallet has a specific standard */
	hasStandard(standard: SmartWalletStandard): boolean {
		const standards = this.getSmartWalletStandards()
		return standards ? standards.includes(standard) : false
	}

	/** Render the wallet type cell with tooltip and standard links */
	renderWalletType(): React.JSX.Element {
		const displayText = this.getDisplayWalletType()
		const detailedText = this.getDetailedWalletType()
		const standards = this.getSmartWalletStandards()

		// Ensure the row has enough height to display both the type and standards
		const rowHeight = this.expanded ? expandedRowHeight : Math.max(shortRowHeight + 40, 120)

		// Create markdown links for EIP standards
		const getEipMarkdownContent = (std: SmartWalletStandard) => {
			if (std === SmartWalletStandard.ERC_4337) {
				return {
					contentType: ContentType.MARKDOWN as ContentType.MARKDOWN,
					markdown: eipMarkdownLink(erc4337),
				}
			} else if (std === SmartWalletStandard.ERC_7702) {
				return {
					contentType: ContentType.MARKDOWN as ContentType.MARKDOWN,
					markdown: eipMarkdownLink(eip7702),
				}
			}
			return null
		}

		return (
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					width: '100%',
					minHeight: `${rowHeight}px`,
					py: 1.5,
					justifyContent: 'center',
					gap: '4px',
					color: 'var(--text-primary)',
				}}
			>
				<Tooltip title={detailedText} arrow placement="top">
					<Box
						sx={{
							fontWeight: 'medium',
							fontSize: '1.05rem',
							mb: 0.25,
							lineHeight: 1.2,
							color: 'var(--text-primary)',
						}}
					>
						{displayText}
					</Box>
				</Tooltip>

				<Box
					sx={{
						display: 'flex',
						gap: 0.5,
						flexWrap: 'wrap',
						alignItems: 'center',
					}}
				>
					{standards && standards.length > 0 ? (
						standards.map(std => {
							const markdownContent = getEipMarkdownContent(std)

							if (markdownContent) {
								return (
									<Box
										key={std}
										sx={{
											fontSize: '0.8rem',
											'& a': {
												color: 'var(--hashtag-text)',
												backgroundColor: 'var(--hashtag-bg)',
												borderRadius: '4px',
												padding: '1px 6px',
												textDecoration: 'none',
												fontWeight: 'medium',
												'&:hover': {
													textDecoration: 'underline',
													backgroundColor: 'var(--hashtag-bg-hover)',
												},
											},
										}}
									>
										<RenderTypographicContent content={markdownContent} />
									</Box>
								)
							}

							// Fallback for OTHER standard
							const standardKey = std as string
							const displayNumber = std === SmartWalletStandard.ERC_4337 ? '4337' : '7702'
							const linkPath = SMART_WALLET_STANDARD_LINKS[standardKey] || '#'

							return (
								<Box
									key={std}
									component="a"
									href={linkPath}
									target="_blank"
									rel="noopener"
									sx={{
										fontSize: '0.75rem',
										fontWeight: 'medium',
										color: 'var(--hashtag-text)',
										backgroundColor: 'var(--hashtag-bg)',
										borderRadius: '4px',
										padding: '1px 4px',
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										lineHeight: 1.2,
										textDecoration: 'none',
										'&:hover': {
											textDecoration: 'underline',
											backgroundColor: 'var(--hashtag-bg-hover)',
										},
									}}
								>
									#{displayNumber}
								</Box>
							)
						})
					) : (
						// If no standards, still show a placeholder to maintain consistent row height
						<Box sx={{ height: '18px' }}></Box>
					)}
				</Box>
			</Box>
		)
	}

	/** Check if this is a hardware wallet */
	isHardwareWallet(): boolean {
		return this.getWalletTypeCategories().includes(WalletTypeCategory.HARDWARE_WALLET)
	}

	/** Check if this is a smart wallet */
	isSmartWallet(): boolean {
		return this.getWalletTypeCategories().includes(WalletTypeCategory.SMART_WALLET)
	}

	/** Get the hardware wallet manufacture type */
	getHardwareWalletManufactureType(): HardwareWalletManufactureType | undefined {
		return this.wallet.metadata.hardwareWalletManufactureType
	}

	/** Render the hardware wallet manufacture type */
	renderHardwareWalletManufactureType(): React.ReactNode {
		const manufactureType = this.getHardwareWalletManufactureType()
		if (!manufactureType) {
			return 'Unknown'
		}

		return HARDWARE_WALLET_MANUFACTURE_TYPE_DISPLAY[manufactureType] || 'Unknown'
	}
}

/** Column definition for wallet rating columns. */
function walletTableColumn<Vs extends ValueSet>(
	group: AttributeGroup<Vs>,
	evalGroupFn: (tree: EvaluationTree) => EvaluatedGroup<Vs>,
): GridColDef<WalletRow, number> {
	return {
		...walletRatingColumnProps,
		field: group.id,
		headerName: `${group.displayName}`,
		type: 'number',
		valueGetter: (_: never, row: WalletRow): number => row.score(group, evalGroupFn),
		renderCell: params => params.row.render(group, evalGroupFn),
	}
}

/** Get sorting weight for wallet type */
function getWalletTypeSortWeight(row: WalletRow): number {
	const standards = row.getSmartWalletStandards()
	const categories = row.getWalletTypeCategories()

	// Smart Wallets first
	if (categories.includes(WalletTypeCategory.SMART_WALLET)) {
		// ERC-4337 wallets first
		if (standards?.includes(SmartWalletStandard.ERC_4337)) {
			return 1
		}
		// ERC-7702 wallets second
		if (standards?.includes(SmartWalletStandard.ERC_7702)) {
			return 2
		}
		// Other smart wallets third
		return 3
	}

	// EOA wallets fourth
	if (categories.includes(WalletTypeCategory.EOA)) {
		return 4
	}

	// Hardware wallets last
	if (categories.includes(WalletTypeCategory.HARDWARE_WALLET)) {
		return 5
	}

	// Unknown types at the very end
	return 6
}

/** Main wallet comparison table. */
export default function WalletTable(): React.JSX.Element {
	const [tableState, setTableState] = useState<WalletTableState>({
		variantSelected: null,
	})
	const tableStateHandle = new TableStateHandle(tableState, setTableState)
	const [rowsState, setRowsState] = useState<Record<string, WalletRowState>>({})

	// Set wallet types for hardware wallets if not already set
	const hardwareWalletRows = Object.values(ratedHardwareWallets).map(wallet => {
		// Add hardware wallet type if not set
		if (!wallet.metadata.walletType) {
			wallet.metadata.walletType = createHardwareWalletType()
		}
		return new WalletRow(wallet, tableStateHandle, rowsState, setRowsState)
	})

	// Create software wallet rows
	const softwareWalletRows = Object.values(ratedWallets).map(
		wallet => new WalletRow(wallet, tableStateHandle, rowsState, setRowsState),
	)

	// Add wallet type column with custom sorting
	const walletTypeColumn: GridColDef<WalletRow, string> = {
		field: 'walletType',
		headerName: 'Type',
		width: 142,
		minWidth: 142,
		flex: 0.15,
		renderCell: params => (
			<Box sx={{ fontSize: '0.85rem' }}>{(params.row as WalletRow).renderWalletType()}</Box>
		),
		sortable: true,
		resizable: true,
		sortComparator: (v1, v2, param1, param2) => {
			const row1 = param1.api.getRow(param1.id) as WalletRow
			const row2 = param2.api.getRow(param2.id) as WalletRow

			const weight1 = getWalletTypeSortWeight(row1)
			const weight2 = getWalletTypeSortWeight(row2)

			return weight1 - weight2
		},
	}

	const walletNameColumn: GridColDef<WalletRow, string> = {
		field: 'displayName',
		headerName: 'Wallet',
		type: 'string',
		width: 310,
		minWidth: 310,
		flex: 0.7,
		valueGetter: (_: never, row: WalletRow): string => row.wallet.metadata.displayName,
		renderCell: params => <Box sx={{ fontSize: '0.9rem' }}>{params.row.renderName()}</Box>,
	}

	// Add hardware wallet manufacture type column
	const hardwareWalletManufactureTypeColumn: GridColDef<WalletRow, string> = {
		field: 'hardwareWalletManufactureType',
		headerName: 'Manufacture Type',
		width: 150,
		minWidth: 130,
		flex: 0.2,
		renderCell: params => (
			<Box sx={{ fontSize: '0.85rem' }}>
				{(params.row as WalletRow).renderHardwareWalletManufactureType()}
			</Box>
		),
		sortable: true,
		resizable: true,
	}

	// Define columns for main wallet table
	const mainColumns: GridColDef[] = [
		walletNameColumn,
		walletTypeColumn,
		walletTableColumn(securityAttributeGroup, tree => tree.security),
		walletTableColumn(privacyAttributeGroup, tree => tree.privacy),
		walletTableColumn(selfSovereigntyAttributeGroup, tree => tree.selfSovereignty),
		walletTableColumn(transparencyAttributeGroup, tree => tree.transparency),
		walletTableColumn(ecosystemAttributeGroup, tree => tree.ecosystem),
	]

	// Define columns for hardware wallet table (add manufacture type column)
	const hardwareColumns: GridColDef[] = [
		walletNameColumn,
		hardwareWalletManufactureTypeColumn,
		walletTableColumn(securityAttributeGroup, tree => tree.security),
		walletTableColumn(privacyAttributeGroup, tree => tree.privacy),
		walletTableColumn(selfSovereigntyAttributeGroup, tree => tree.selfSovereignty),
		walletTableColumn(transparencyAttributeGroup, tree => tree.transparency),
		walletTableColumn(ecosystemAttributeGroup, tree => tree.ecosystem),
	]

	// Common DataGrid style
	const theme = useTheme()
	// Determine which theme to use based on the current mode
	const currentWalletTableTheme =
		theme.palette.mode === 'light' ? lightWalletTableTheme : walletTableTheme

	const dataGridSx = {
		'& .MuiDataGrid-cell:first-child': {
			position: 'sticky',
			left: 0,
			zIndex: 1,
			backgroundColor: 'var(--background-primary)',
			borderRight: '1px solid var(--border)',
			color: 'var(--text-primary)',
		},
		'& .MuiDataGrid-row--borderBottom css-gvoll6': {
			borderBottom: '2px solid var(--border)',
			backgroundColor: 'var(--background-row-border) !important',
			height: '64px !important',
			lineHeight: '64px !important',
			color: 'var(--text-primary)',
			'& .MuiDataGrid-columnHeaderTitle': {
				fontWeight: 'bold',
				fontSize: '1.05rem',
				lineHeight: 1.3,
				color: 'var(--text-primary)',
			},
		},
		'& .MuiDataGrid-main': {
			overflow: 'visible',
			color: 'var(--text-primary)',
		},
		'& .MuiDataGrid-virtualScroller': {
			overflowX: 'visible !important',
		},
		'& .MuiDataGrid-toolbarContainer': {
			paddingLeft: 2,
			paddingRight: 2,
			borderBottom: '1px solid var(--border)',
		},
		'& .MuiDataGrid-row': {
			'&:hover': {
				backgroundColor: 'rgba(25, 118, 210, 0.04)',
			},
			minHeight: `${shortRowHeight + 30}px !important`,
			color: 'var(--text-primary)',
			'& > *': {
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'flex-start',
				color: 'var(--text-primary)',
			},
		},
		'& .MuiDataGrid-cell': {
			padding: '10px 8px',
			fontSize: '1rem',
			color: 'var(--text-primary)',
			wordBreak: 'break-word',
			overflowWrap: 'break-word',
			whiteSpace: 'normal',
			lineHeight: 1.4,
		},
		'& .MuiDataGrid-row--borderBottom': {
			backgroundColor: 'var(--background-row-border) !important',
		},
	}

	return (
		<div className="w-full h-full overflow-auto pl-2 pr-2">
			<ThemeProvider theme={currentWalletTableTheme}>
				<h2 className="text-2xl font-bold mb-4 text-accent border-b pb-2">Wallets</h2>
				<Box sx={{ mb: 6, width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
					<DataGrid<WalletRow>
						rows={softwareWalletRows}
						columns={mainColumns}
						getRowHeight={row => (row.model as WalletRow).getRowHeight()}
						density="standard"
						disableRowSelectionOnClick
						initialState={{
							sorting: {
								sortModel: [{ field: 'walletType', sort: 'asc' }],
							},
							filter: {
								filterModel: {
									items: [],
								},
							},
						}}
						slots={{ toolbar: GridToolbar }}
						slotProps={{
							toolbar: {
								showQuickFilter: true,
							},
						}}
						filterModel={{
							items: [],
						}}
						autoHeight
						disableVirtualization={true}
						sx={{ width: '100%', minWidth: '1200px', ...dataGridSx }}
					/>
				</Box>

				<h2 className="text-2xl font-bold mb-4 text-accent border-b pb-2">Hardware Wallets</h2>
				<Box sx={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
					<DataGrid<WalletRow>
						rows={hardwareWalletRows}
						columns={hardwareColumns}
						getRowHeight={row => (row.model as WalletRow).getRowHeight()}
						density="standard"
						disableRowSelectionOnClick
						initialState={{
							sorting: {
								sortModel: [{ field: walletNameColumn.field, sort: 'asc' }],
							},
						}}
						autoHeight
						disableVirtualization={true}
						sx={{ width: '100%', minWidth: '1200px', ...dataGridSx }}
					/>
				</Box>
			</ThemeProvider>
		</div>
	)
}
