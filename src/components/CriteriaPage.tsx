import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table'
import type React from 'react'
import { LuCpu, LuKey, LuWallet } from 'react-icons/lu'

import { navigationAbout } from '@/components/navigation'
import { allRatedWallets, representativeWalletForType } from '@/data/wallets'
import { NavigationPageLayout } from '@/layouts/NavigationPageLayout'
import {
	getAttributeGroupById,
	getAttributeGroupInTree,
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import { defaultRatingScore, Rating } from '@/schema/attributes'
import type { RatedWallet } from '@/schema/wallet'
import { mapWalletTypes, WalletType, walletTypeToUrlSlug } from '@/schema/wallet-types'
import { RenderContent } from '@/ui/atoms/RenderContent'
import { RenderTypographicContent } from '@/ui/atoms/RenderTypographicContent'
import type { NavigationGroup } from '@/ui/organisms/Navigation'
import { cx } from '@/utils/cx'

export const walletNavigationGroups: NavigationGroup[] = Object.values(
	mapWalletTypes(
		(walletType: WalletType): NavigationGroup => ({
			id: walletTypeToUrlSlug(walletType),
			items: [
				{
					title: ((): string => {
						switch (walletType) {
							case WalletType.SOFTWARE:
								return 'Wallets'
							case WalletType.HARDWARE:
								return 'Hardware Wallets'
							case WalletType.EMBEDDED:
								return 'Embedded Wallets'
						}
					})(),
					icon: ((): React.ReactNode => {
						switch (walletType) {
							case WalletType.SOFTWARE:
								return <LuWallet />
							case WalletType.HARDWARE:
								return <LuKey />
							case WalletType.EMBEDDED:
								return <LuCpu />
						}
					})(),
					href: `/${walletTypeToUrlSlug(walletType)}`,
					id: `${walletTypeToUrlSlug(walletType)}s`,
					children: [
						{
							title: 'Summary',
							id: 'summary',
							href: `/${walletTypeToUrlSlug(walletType)}/summary`,
						},
						...mapNonExemptAttributeGroupsInTree(
							representativeWalletForType(walletType).overall,
							attr => ({
								title: attr.displayName,
								href: `/${walletTypeToUrlSlug(walletType)}/${attr.id}`,
								id: attr.id,
							}),
						),
					],
				},
			],
			overflow: false,
		}),
	),
)

export function getStaticPathsForWalletType(walletType: WalletType) {
	return (): Array<{ params: { attrGroupId: string } }> =>
		mapNonExemptAttributeGroupsInTree(
			representativeWalletForType(walletType).overall,
			attrGroup => ({
				params: {
					attrGroupId: attrGroup.id,
				},
			}),
		)
}

export function CriteriaPage({
	walletType,
	attrGroupId,
}: {
	walletType: WalletType
	attrGroupId: string
}): React.JSX.Element {
	const representativeWallet = representativeWalletForType(walletType)
	const attrGroup = getAttributeGroupById(attrGroupId, representativeWallet.overall)

	if (attrGroup === null) {
		throw new Error('Invalid attribute group')
	}

	const evalGroup = getAttributeGroupInTree(representativeWallet.overall, attrGroup)
	const wallets = Object.values(allRatedWallets).filter(wallet => {
		if (wallet.types[walletType]) {
			return true
		}

		return false
	})

	return (
		<NavigationPageLayout
			groups={[
				// {
				// 	id: 'home',
				// 	items: [
				// 		{
				// 			title: 'Summary',
				// 			href: '/#summary',
				// 			id: 'summary',
				// 			icon: undefined,
				// 		},
				// 	],
				// 	overflow: false,
				// },
				...walletNavigationGroups,
				{
					id: 'about',
					items: [navigationAbout],
					overflow: false,
				},
			]}
			selectedItemId={attrGroupId}
			// wallets, hww, embedded
			selectedGroupId={walletTypeToUrlSlug(walletType).toLowerCase().replace('s', '')}
		>
			<div className="max-w-screen-xl 3xl:max-w-screen-2xl mx-auto w-full">
				<div className="flex flex-col lg:mt-10 gap-4">
					<div className="px-8 py-6 flex justify-between items-start flex-wrap min-h-96 w-full relative">
						<div className="flex flex-col gap-4 py-8 flex-1 w-full">
							<h1 className="text-4xl font-extrabold text-accent">{attrGroup.displayName}</h1>
							<p className="text-secondary">
								<RenderTypographicContent
									content={attrGroup.perWalletQuestion.render({
										displayName: 'your wallet',
									})}
									typography={{
										variant: 'caption',
										fontStyle: 'italic',
									}}
								/>
							</p>
							<AttributeGroupSummary wallets={wallets} attrGroup={attrGroup} />
							{mapNonExemptGroupAttributes(evalGroup, evalAttr => (
								<div key={evalAttr.attribute.id} className="space-y-2">
									<h2 className="text-2xl font-extrabold text-accent">
										{evalAttr.attribute.displayName}
									</h2>
									<div className="card whitespace-pre-wrap">
										<RenderContent
											content={evalAttr.attribute.why.render({})}
											typography={{ variant: 'body2' }}
										/>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</NavigationPageLayout>
	)
}

interface AttributeRatingCell {
	attributeId: string
	rating: Rating
}

interface WalletRow {
	wallet: RatedWallet
	attributes: Record<string, AttributeRatingCell>
	score: number
}

export const AttributeGroupSummary = ({
	wallets,
	attrGroup,
}: {
	wallets: RatedWallet[]
	attrGroup: NonNullable<ReturnType<typeof getAttributeGroupById>>
}): React.JSX.Element => {
	// Create a column helper
	const columnHelper = createColumnHelper<WalletRow>()

	// Prepare data
	const data = wallets.map(wallet => {
		const evalGroup = getAttributeGroupInTree(wallet.overall, attrGroup)
		const attributes: Record<string, AttributeRatingCell> = {}

		// Calculate wallet score for this attribute group
		let totalScore = 0
		let nonExemptCount = 0

		mapNonExemptGroupAttributes(evalGroup, evalAttr => {
			const { rating } = evalAttr.evaluation.value

			attributes[evalAttr.attribute.id] = {
				attributeId: evalAttr.attribute.id,
				rating,
			}

			// Add to score calculation
			const score = defaultRatingScore(rating)

			if (score !== null) {
				totalScore += score
				nonExemptCount++
			}
		})

		// Calculate average score
		const avgScore = nonExemptCount > 0 ? totalScore / nonExemptCount : 0

		return {
			wallet,
			attributes,
			score: avgScore,
		}
	})

	// Sort data by score (highest first)
	const sortedData = [...data].sort((a, b) => b.score - a.score)

	// Define columns
	const columns = [
		// Wallet column
		columnHelper.accessor('wallet', {
			id: 'wallet',
			header: 'Wallet',
			cell: info => <div className="py-2 font-medium">{info.getValue().metadata.displayName}</div>,
		}),

		// Dynamic columns for each attribute
		...mapNonExemptGroupAttributes(
			getAttributeGroupInTree(representativeWalletForType(WalletType.SOFTWARE).overall, attrGroup),
			evalAttr =>
				columnHelper.accessor(
					row =>
						row.attributes[evalAttr.attribute.id] ?? {
							attributeId: evalAttr.attribute.id,
							rating: Rating.UNRATED,
						},
					{
						id: evalAttr.attribute.id,
						header: evalAttr.attribute.displayName,
						cell: info => {
							const attributeData = info.getValue()
							const { rating } = attributeData

							const ratingText =
								rating === Rating.PASS
									? 'PASS'
									: rating === Rating.FAIL
										? 'FAIL'
										: rating === Rating.PARTIAL
											? 'PARTIAL'
											: rating === Rating.EXEMPT
												? 'EXEMPT'
												: 'UNRATED'

							return (
								<div
									className={cx(
										'py-1 px-1.5 text-center text-sm rounded-md max-w-[96px]',
										rating === Rating.PASS && 'bg-rating-pass text-primary',
										rating === Rating.FAIL && 'bg-rating-fail text-primary',
										rating === Rating.PARTIAL && 'bg-rating-partial text-primary',
										(rating === Rating.EXEMPT || rating === Rating.UNRATED) &&
											'bg-rating-neutral text-primary',
									)}
								>
									{ratingText}
								</div>
							)
						},
					},
				),
		),
	]

	// Create the table
	const table = useReactTable({
		data: sortedData,
		columns,
		getCoreRowModel: getCoreRowModel(),
	})

	return (
		<div className="overflow-x-auto rounded-lg border border-border shadow-sm w-full">
			<table className="min-w-full divide-y divide-border">
				<thead className="bg-background">
					{table.getHeaderGroups().map(headerGroup => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map(header => (
								<th
									key={header.id}
									className="px-2 first:pl-4 py-2 text-left text-xs font-medium text-secondary uppercase tracking-wider"
								>
									{header.isPlaceholder
										? null
										: flexRender(header.column.columnDef.header, header.getContext())}
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody className="bg-background divide-y divide-border">
					{table.getRowModel().rows.map(row => (
						<tr key={row.id}>
							{row.getVisibleCells().map(cell => (
								<td key={cell.id} className="px-2 first:pl-4 py-0.5">
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
