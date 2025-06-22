import {
	type CellContext,
	type ColumnDef,
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table'
import React from 'react'

import { eip7702 } from '@/data/eips/eip-7702'
import { erc4337 } from '@/data/eips/erc-4337'
import { ratedSoftwareWallets } from '@/data/software-wallets'
import type { EVMAddress, SmartWalletContract } from '@/schema/contracts'
import { AccountType, isAccountTypeSupported } from '@/schema/features/account-support'
import { refs } from '@/schema/reference'
import { isLabeledUrl } from '@/schema/url'
import type { Variant } from '@/schema/variants'
import {
	getVariantResolvedWallet,
	getWalletVariants,
	type RatedWallet,
	walletSupportedAccountTypes,
} from '@/schema/wallet'
import { isNonEmptyArray, nonEmptyGet, setContains, setItems } from '@/types/utils/non-empty'
import { cx } from '@/utils/cx'

import { ExternalLink } from '../atoms/ExternalLink'
import { EipStandardTag, walletNameCell } from './WalletTable'

enum WalletTypeFor7702 {
	EIP7702 = 'EIP7702',
	NON_7702_SMART_WALLET = 'NON_7702_SMART_WALLET',
	NON_7702_EOA = 'NON_7702_EOA',
	OTHER = 'OTHER',
}

// TableRow interface for better type safety
interface TableRow {
	id: string
	name: string
	wallet: RatedWallet
	typeFor7702: WalletTypeFor7702
	contract: SmartWalletContract | 'UNKNOWN' | 'NONE'
	sortPriority: number
}

function walletContractUrl(contractAddress: EVMAddress, anchor?: string): string {
	return (
		`https://etherscan.io/address/${contractAddress}` +
		(anchor !== undefined && anchor !== '' ? `#${anchor}` : '')
	)
}

// Create software wallet table data
const softwareWalletData: TableRow[] = Object.values(ratedSoftwareWallets)
	.map(wallet => {
		const accountTypes = walletSupportedAccountTypes(wallet, 'ALL_VARIANTS')
		const hasErc4337 =
			accountTypes !== null && setContains<AccountType>(accountTypes, AccountType.rawErc4337)
		const hasEip7702 =
			accountTypes !== null && setContains<AccountType>(accountTypes, AccountType.eip7702)
		const hasEoa =
			accountTypes !== null &&
			(hasEip7702 || setContains<AccountType>(accountTypes, AccountType.eoa))
		const typeFor7702 = hasEip7702
			? WalletTypeFor7702.EIP7702
			: hasErc4337
				? WalletTypeFor7702.NON_7702_SMART_WALLET
				: hasEoa
					? WalletTypeFor7702.NON_7702_EOA
					: WalletTypeFor7702.OTHER
		const contract = ((): TableRow['contract'] => {
			for (const variant of setItems<Variant>(getWalletVariants(wallet))) {
				const variantWallet = getVariantResolvedWallet(wallet, variant)

				if (variantWallet === null || variantWallet.features.accountSupport === null) {
					continue
				}

				if (isAccountTypeSupported(variantWallet.features.accountSupport.eip7702)) {
					return variantWallet.features.accountSupport.eip7702.contract
				}

				if (isAccountTypeSupported(variantWallet.features.accountSupport.rawErc4337)) {
					return variantWallet.features.accountSupport.rawErc4337.contract
				}
			}

			return 'NONE'
		})()

		const sortPriority = ((): number => {
			switch (typeFor7702) {
				case WalletTypeFor7702.EIP7702:
					return 0
				case WalletTypeFor7702.NON_7702_SMART_WALLET:
					return 1
				case WalletTypeFor7702.NON_7702_EOA:
					return 2
				case WalletTypeFor7702.OTHER:
					return 3
			}
		})()

		return {
			id: wallet.metadata.id,
			name: wallet.metadata.displayName,
			wallet,
			sortPriority,
			typeFor7702,
			contract,
		}
	})
	.sort((a, b) => a.sortPriority - b.sortPriority)

interface WalletTypeCell {
	typeString: string
	hasSmartWallet: boolean
}

type CellValue = string | WalletTypeCell

export default function Eip7702Table(): React.JSX.Element {
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
		header: 'Type',
		cell: (info: CellContext<TableRow, unknown>): React.ReactNode => {
			switch (info.row.original.typeFor7702) {
				case WalletTypeFor7702.EIP7702:
					return (
						<div className='mt-1 flex flex-wrap gap-1'>
							<EipStandardTag standard={eip7702} usePrefix={true} />
						</div>
					)
				case WalletTypeFor7702.NON_7702_SMART_WALLET:
					return (
						<div className='mt-1 flex flex-wrap gap-1'>
							<EipStandardTag standard={erc4337} usePrefix={true} />
						</div>
					)
				case WalletTypeFor7702.NON_7702_EOA:
					return <span>Non-7702 EOA</span>
				case WalletTypeFor7702.OTHER:
					return <span>Non-7702</span>
			}
		},
	})
	const walletContractColumn = columnHelper.display({
		id: 'contract',
		header: 'Contract',
		cell: (info: CellContext<TableRow, unknown>): React.ReactNode => {
			if (info.row.original.contract === 'NONE') {
				return <span style={{ opacity: 0.5 }}>N/A</span>
			}

			const contract = info.row.original.contract

			if (contract === 'UNKNOWN') {
				return <span style={{ opacity: 1 }}>Unknown - Send PR!</span>
			}

			return <ExternalLink url={walletContractUrl(contract.address)} defaultLabel={contract.name} />
		},
	})
	const walletContractSource = columnHelper.display({
		id: 'contract-source',
		header: 'Source',
		cell: (info: CellContext<TableRow, unknown>): React.ReactNode => {
			if (info.row.original.contract === 'NONE') {
				return <span style={{ opacity: 0.5 }}>N/A</span>
			}

			const contract = info.row.original.contract

			if (contract === 'UNKNOWN') {
				return null
			}

			if (!contract.sourceCode.available) {
				return <span style={{ color: 'var(--color-error)' }}>Unavailable</span>
			}

			const sourceRefs = refs(contract.sourceCode)
			const sourceUrl = isNonEmptyArray(sourceRefs)
				? nonEmptyGet(nonEmptyGet(sourceRefs).urls)
				: walletContractUrl(contract.address, 'code')
			const rawUrl = isLabeledUrl(sourceUrl) ? sourceUrl.url : sourceUrl

			return <ExternalLink url={rawUrl} defaultLabel='Available' />
		},
	})
	const walletTransactionBatchingColumn = columnHelper.display({
		id: 'transaction-batching',
		header: 'Batching',
		cell: (info: CellContext<TableRow, unknown>): React.ReactNode => {
			if (info.row.original.contract === 'NONE') {
				return <span style={{ opacity: 0.5 }}>N/A</span>
			}

			return <span style={{ opacity: 0.5 }}>Coming soon</span>
		},
	})
	const columns: Array<ColumnDef<TableRow, CellValue>> = [
		rankColumn,
		walletNameColumn,
		walletTypeColumn,
		walletContractColumn,
		walletContractSource,
		walletTransactionBatchingColumn,
	]

	// Create table
	const table = useReactTable({
		data: softwareWalletData,
		columns,
		getCoreRowModel: getCoreRowModel(),
	})

	// Render table body based on active tab
	const renderTableBody = (): React.ReactNode => {
		return table.getRowModel().rows.map(row => {
			return (
				<tr key={row.id} className={'dark:bg-[#141414] dark:hover:bg-[#1a1a1a]'}>
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
											header.column.id === 'wallet'
												? 'font-bold'
												: header.column.id === 'type'
													? 'font-semibold'
													: 'font-normal',
										)}
									>
										{headerContent !== undefined && flexRender(headerContent, header.getContext())}
									</th>
								)
							})}
						</tr>
					))}
				</thead>
				<tbody className='divide-y divide-gray-200 dark:divide-gray-700'>{renderTableBody()}</tbody>
			</table>
		</div>
	)
}
