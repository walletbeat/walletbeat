import { ratedWallets } from '@/data/wallets'
import type { AttributeGroup, ValueSet, EvaluatedGroup } from '@/schema/attributes'
import type { RatedWallet } from '@/schema/wallet'
import { Box, type SxProps } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
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
import { walletTableTheme } from '@/components/ThemeRegistry/theme'

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
		this.rowWideStyle = {}
		this.evalTree = wallet.overall
		if (tableStateHandle.variantSelected !== null) {
			const walletForVariant = wallet.variants[tableStateHandle.variantSelected]
			if (walletForVariant === undefined) {
				this.rowWideStyle = {
					filter: 'contrast(65%)',
					opacity: 0.5,
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
		return this.expanded ? expandedRowHeight : shortRowHeight
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
		width: 128,
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
	const rows = Object.values(ratedWallets).map(
		wallet => new WalletRow(wallet, tableStateHandle, rowsState, setRowsState),
	)
	const walletNameColumn: GridColDef<WalletRow, string> = {
		field: 'displayName',
		headerName: 'Wallet',
		type: 'string',
		width: 320,
		valueGetter: (_: never, row: WalletRow): string => row.wallet.metadata.displayName,
		renderCell: params => params.row.renderName(),
	}
	const columns: GridColDef[] = [
		walletNameColumn,
		walletTableColumn(securityAttributeGroup, tree => tree.security),
		walletTableColumn(privacyAttributeGroup, tree => tree.privacy),
		walletTableColumn(selfSovereigntyAttributeGroup, tree => tree.selfSovereignty),
		walletTableColumn(transparencyAttributeGroup, tree => tree.transparency),
		walletTableColumn(ecosystemAttributeGroup, tree => tree.ecosystem),
	]
	return (
		<Box maxWidth="100%" height="80vh" width="fit-content" overflow="auto">
			<ThemeProvider theme={walletTableTheme}>
				<DataGrid<WalletRow>
					rows={rows}
					columns={columns}
					getRowHeight={row => (row.model as WalletRow).getRowHeight()} // eslint-disable-line @typescript-eslint/no-unsafe-type-assertion -- The row model is WalletRow.
					density="standard"
					disableRowSelectionOnClick
					initialState={{
						sorting: {
							sortModel: [{ field: walletNameColumn.field, sort: 'asc' }],
						},
					}}
					disableVirtualization={true}
					sx={{
						'& .MuiDataGrid-cell:first-child': {
							position: 'sticky',
							left: 0,
							zIndex: 1,
							backgroundColor: 'background.default',
							borderRight: '1px solid #141519',
						},
					}}
				/>
			</ThemeProvider>
		</Box>
	)
}
