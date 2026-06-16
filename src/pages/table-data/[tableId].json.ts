import {
	getWalletTableData,
	isWalletTableDataId,
	walletTableDataIds,
} from '@/utils/wallet-table-data'

export function getStaticPaths() {
	return walletTableDataIds.map(tableId => ({
		params: { tableId },
	}))
}

export function GET({ params }: { params: { tableId: string } }) {
	if (!isWalletTableDataId(params.tableId)) {
		return new Response('Not found', { status: 404 })
	}

	return new Response(JSON.stringify(getWalletTableData(params.tableId)), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	})
}
