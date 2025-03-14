import { ratedWallets } from '@/data/wallets'
import { ratedHardwareWallets } from '@/data/hardwareWallets'
import type { AttributeGroup, ValueSet, EvaluatedGroup } from '@/schema/attributes'
import type { RatedWallet } from '@/schema/wallet'
import { Box, type SxProps, Tooltip } from '@mui/material'
import { DataGrid, type GridColDef, GridToolbar } from '@mui/x-data-grid'
import type React from 'react'
import {
	WalletRatingCell,
	walletRatingColumnProps,
} from '@/ui/molecules/WalletRatingCell'
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
import { WalletTypeCategory, SmartWalletStandard, createHardwareWalletType } from '@/schema/features/wallet-type'
import { useTheme } from '@mui/material/styles'

// Define display strings for wallet types
const WALLET_TYPE_DISPLAY = {
	[WalletTypeCategory.EOA]: 'EOA',
	[WalletTypeCategory.SMART_WALLET]: 'SW',
	[WalletTypeCategory.HARDWARE_WALLET]: 'HW'
};

// Define display strings for smart wallet standards
const SMART_WALLET_STANDARD_DISPLAY = {
	[SmartWalletStandard.ERC_4337]: 'ERC-4337',
	[SmartWalletStandard.ERC_7702]: 'ERC-7702',
	[SmartWalletStandard.OTHER]: 'Other'
};

// Define EIP file paths for standards
const SMART_WALLET_STANDARD_LINKS: Record<string, string> = {
	[SmartWalletStandard.ERC_4337]: 'https://eips.ethereum.org/EIPS/eip-4337',
	[SmartWalletStandard.ERC_7702]: 'https://eips.ethereum.org/EIPS/eip-7702',
};

// Helper to create a multi-type wallet definition for the UI
interface MultiWalletTypeInfo {
	categories: WalletTypeCategory[];
	smartWalletStandards?: SmartWalletStandard[];
	details?: string;
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
		return this.expanded ? expandedRowHeight : Math.max(shortRowHeight + 40, 120);
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
			return this.wallet.metadata.multiWalletType.categories;
		}
		return [this.wallet.metadata.walletType?.category || WalletTypeCategory.EOA];
	}
	
	/** Get the smart wallet standards if applicable */
	getSmartWalletStandards(): SmartWalletStandard[] | undefined {
		if (this.wallet.metadata.multiWalletType?.smartWalletStandards) {
			return this.wallet.metadata.multiWalletType.smartWalletStandards;
		}
		
		if (this.getWalletTypeCategories().includes(WalletTypeCategory.SMART_WALLET)) {
			const standard = this.wallet.metadata.walletType?.smartWalletStandard;
			return standard ? [standard] : undefined;
		}
		
		return undefined;
	}
	
	/** Get human-readable wallet type for display */
	getDisplayWalletType(): string {
		const categories = this.getWalletTypeCategories();
		
		// Compact display
		const typeDisplay = categories.map(cat => WALLET_TYPE_DISPLAY[cat]).join(' & ');
		return typeDisplay;
	}
	
	/** Get detailed wallet type for tooltip */
	getDetailedWalletType(): string {
		const categories = this.getWalletTypeCategories();
		const standards = this.getSmartWalletStandards();
		
		// If we have both EOA and Smart Wallet
		if (categories.includes(WalletTypeCategory.EOA) && categories.includes(WalletTypeCategory.SMART_WALLET)) {
			const smartWalletStandardsStr = standards?.map(std => SMART_WALLET_STANDARD_DISPLAY[std]).join(' + ');
			return `Externally Owned Account + Smart Wallet (${smartWalletStandardsStr})`;
		}
		
		// If just EOA
		if (categories.length === 1 && categories[0] === WalletTypeCategory.EOA) {
			return 'Externally Owned Account';
		}
		
		// If just Smart Wallet with standards
		if (categories.length === 1 && categories[0] === WalletTypeCategory.SMART_WALLET && standards?.length) {
			return `Smart Wallet (${standards.map(std => SMART_WALLET_STANDARD_DISPLAY[std]).join(' + ')})`;
		}
		
		// If hardware wallet
		if (categories.length === 1 && categories[0] === WalletTypeCategory.HARDWARE_WALLET) {
			return 'Hardware Wallet';
		}
		
		// Fallback for other multi-type combinations
		const fullTypeNames = categories.map(cat => {
			if (cat === WalletTypeCategory.EOA) return 'Externally Owned Account';
			if (cat === WalletTypeCategory.SMART_WALLET) return 'Smart Wallet';
			if (cat === WalletTypeCategory.HARDWARE_WALLET) return 'Hardware Wallet';
			return cat;
		}).join(' + ');
		
		return fullTypeNames;
	}
	
	/** Check if wallet has a specific standard */
	hasStandard(standard: SmartWalletStandard): boolean {
		const standards = this.getSmartWalletStandards();
		return standards ? standards.includes(standard) : false;
	}
	
	/** Render the wallet type cell with tooltip and standard links */
	renderWalletType(): React.JSX.Element {
		const displayText = this.getDisplayWalletType();
		const detailedText = this.getDetailedWalletType();
		const standards = this.getSmartWalletStandards();
		
		// Ensure the row has enough height to display both the type and standards
		const rowHeight = this.expanded ? expandedRowHeight : Math.max(shortRowHeight + 40, 120);
		
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
					<Box sx={{ 
						fontWeight: 'medium',
						fontSize: '1.05rem',
						mb: 0.25,
						lineHeight: 1.2,
						color: 'var(--text-primary)',
					}}>
						{displayText}
					</Box>
				</Tooltip>
				
				<Box sx={{ 
					display: 'flex', 
					gap: 0.5, 
					flexWrap: 'wrap',
					alignItems: 'center'
				}}>
					{standards && standards.length > 0 ? (
						standards.map(std => {
							const standardKey = std as string;
							const displayNumber = std === SmartWalletStandard.ERC_4337 ? '4337' : '7702';
							const linkPath = SMART_WALLET_STANDARD_LINKS[standardKey] || '#';
							
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
											backgroundColor: 'var(--hashtag-bg-hover)'
										} 
									}}
								>
									#{displayNumber}
								</Box>
							);
						})
					) : (
						// If no standards, still show a placeholder to maintain consistent row height
						<Box sx={{ height: '18px' }}></Box>
					)}
				</Box>
			</Box>
		);
	}
	
	/** Check if this is a hardware wallet */
	isHardwareWallet(): boolean {
		return this.getWalletTypeCategories().includes(WalletTypeCategory.HARDWARE_WALLET);
	}
	
	/** Check if this is a smart wallet */
	isSmartWallet(): boolean {
		return this.getWalletTypeCategories().includes(WalletTypeCategory.SMART_WALLET);
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
		headerName: `${group.icon} ${group.displayName}`,
		type: 'number',
		valueGetter: (_: never, row: WalletRow): number => row.score(group, evalGroupFn),
		renderCell: params => params.row.render(group, evalGroupFn),
	}
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
			wallet.metadata.walletType = createHardwareWalletType();
		}
		return new WalletRow(wallet, tableStateHandle, rowsState, setRowsState);
	});
	
	// Create software wallet rows
	const softwareWalletRows = Object.values(ratedWallets).map(wallet => 
		new WalletRow(wallet, tableStateHandle, rowsState, setRowsState)
	);
	
	// Add wallet type column
	const walletTypeColumn: GridColDef<WalletRow, string> = {
		field: 'walletType',
		headerName: 'Type',
		width: 104,
		minWidth: 103,
		flex: 0.15,
		renderCell: params => (
			<Box sx={{ fontSize: '0.85rem' }}>{(params.row as WalletRow).renderWalletType()}</Box>
		),
		sortable: true,
		resizable: true
	};
	
	const walletNameColumn: GridColDef<WalletRow, string> = {
		field: 'displayName',
		headerName: 'Wallet',
		type: 'string',
		width: 280,
		minWidth: 277,
		flex: 0.7,
		valueGetter: (_: never, row: WalletRow): string => row.wallet.metadata.displayName,
		renderCell: params => (
			<Box sx={{ fontSize: '0.9rem' }}>{params.row.renderName()}</Box>
		)
	};
	
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
	
	// Define columns for hardware wallet table (without wallet type column)
	const hardwareColumns: GridColDef[] = [
		walletNameColumn,
		walletTableColumn(securityAttributeGroup, tree => tree.security),
		walletTableColumn(privacyAttributeGroup, tree => tree.privacy),
		walletTableColumn(selfSovereigntyAttributeGroup, tree => tree.selfSovereignty),
		walletTableColumn(transparencyAttributeGroup, tree => tree.transparency),
		walletTableColumn(ecosystemAttributeGroup, tree => tree.ecosystem),
	]
	
	// Common DataGrid style
	const theme = useTheme();
	// Determine which theme to use based on the current mode
	const currentWalletTableTheme = theme.palette.mode === 'light' ? lightWalletTableTheme : walletTableTheme;

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
			}
		},
		'& .MuiDataGrid-cell': {
			padding: '10px 8px',
			fontSize: '1rem',
			color: 'var(--text-primary)',
		},
		'& .MuiDataGrid-row--borderBottom': {
			backgroundColor: 'var(--background-row-border) !important',
		},
	};
	
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
								sortModel: [{ field: walletNameColumn.field, sort: 'asc' }],
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
