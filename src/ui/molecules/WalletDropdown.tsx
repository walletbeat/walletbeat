import * as Popover from '@radix-ui/react-popover'
import { Command } from 'cmdk'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuChevronDown, LuKey, LuSearch, LuWallet } from 'react-icons/lu'

import { ratedHardwareWallets } from '@/data/hardware-wallets'
import { ratedWallets } from '@/data/wallets'
import type { RatedWallet } from '@/schema/wallet'
import { cx } from '@/utils/cx'

import { WalletIcon } from '../atoms/WalletIcon'

// Interface for wallet items with additional metadata
interface WalletItem {
	id: string
	type: 'software' | 'hardware'
	wallet: RatedWallet
}

export function WalletDropdown({ wallet }: { wallet?: RatedWallet }): React.JSX.Element {
	const [open, setOpen] = useState(false)
	const [search, setSearch] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const [width, setWidth] = useState(0)

	// Update width when popover opens
	useEffect(() => {
		if (open && triggerRef.current !== null) {
			setWidth(triggerRef.current.offsetWidth)
		}
	}, [open])

	// Convert all wallets to a unified array with type information
	const allWalletItems: WalletItem[] = [
		// Regular wallets
		...Object.entries(ratedWallets).map(([id, walletData]) => ({
			id,
			type: 'software' as const,
			wallet: walletData,
		})),
		// Hardware wallets
		...Object.entries(ratedHardwareWallets).map(([id, walletData]) => ({
			id,
			type: 'hardware' as const,
			wallet: walletData,
		})),
	]

	// Filter wallets for each category
	const softwareWalletItems = allWalletItems.filter(w => w.type === 'software')
	const hardwareWalletItems = allWalletItems.filter(w => w.type === 'hardware')

	const handleSelect = useCallback((walletId: string) => {
		setOpen(false)

		const isHardware = hardwareWalletItems.some(w => w.id === walletId)

		// Use simple navigation instead of router
		window.location.href = `/${isHardware ? 'hww' : 'wallet'}/projects/${walletId}`
	}, [])

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger asChild>
				<button
					ref={triggerRef}
					className="border px-2 py-1 rounded-md flex items-center justify-between gap-2 bg-backgroundSecondary w-full"
					aria-label="Select wallet"
				>
					<div className="flex items-center gap-2">
						{wallet !== undefined ? (
							<>
								<WalletIcon wallet={wallet} iconSize={24} />
								<span>{wallet.metadata.displayName}</span>
							</>
						) : (
							<span className="text-gray-400">Select a wallet</span>
						)}
					</div>
					<LuChevronDown className={cx('transition-transform', open ? 'rotate-180' : '')} />
				</button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					className="bg-background border rounded-md shadow-lg p-1"
					style={{ width: width > 0 ? Math.max(width, 320) : 320 }}
					sideOffset={8}
					align="start"
					onOpenAutoFocus={e => {
						e.preventDefault()
						inputRef.current?.focus()
					}}
				>
					<Command
						className="w-full"
						filter={(value, search) => {
							// Custom filter function to search in wallet name
							if (value.includes(search.toLowerCase())) {
								return 1
							}
							return 0
						}}
					>
						<div className="flex items-center border-b px-2">
							<LuSearch className="text-gray-400 mr-2" />
							<Command.Input
								ref={inputRef}
								value={search}
								onValueChange={setSearch}
								placeholder="Search all wallets..."
								className="flex-1 h-9 bg-transparent outline-none placeholder:text-gray-400"
							/>
						</div>

						<Command.List className="max-h-[350px] overflow-auto">
							{/* Only show section headers when there are matching items */}
							{softwareWalletItems.some(
								w =>
									w.wallet.metadata.displayName.toLowerCase().includes(search.toLowerCase()) ||
									w.id.toLowerCase().includes(search.toLowerCase()),
							) && (
								<Command.Group
									heading="Software Wallets"
									className="text-xs font-medium text-gray-500 uppercase flex flex-col gap-1 px-1"
								>
									{softwareWalletItems
										.filter(
											w =>
												w.wallet.metadata.displayName
													.toLowerCase()
													.includes(search.toLowerCase()) ||
												w.id.toLowerCase().includes(search.toLowerCase()),
										)
										.map(w => (
											<Command.Item
												key={w.id}
												value={w.id}
												onSelect={handleSelect}
												className="flex items-center justify-between px-2 py-1.5 rounded cursor-pointer hover:bg-backgroundSecondary aria-selected:bg-backgroundSecondary"
											>
												<span className="flex items-center gap-2 flex-1 min-w-0">
													<WalletIcon wallet={w.wallet} iconSize={20} />
													<span className="truncate">{w.wallet.metadata.displayName}</span>
												</span>
												<LuWallet className="ml-2 flex-shrink-0 opacity-40" size={14} />
											</Command.Item>
										))}
								</Command.Group>
							)}

							{hardwareWalletItems.some(
								w =>
									w.wallet.metadata.displayName.toLowerCase().includes(search.toLowerCase()) ||
									w.id.toLowerCase().includes(search.toLowerCase()),
							) && (
								<Command.Group
									heading="Hardware Wallets"
									className="text-xs font-medium text-gray-500 uppercase flex flex-col gap-1 px-1"
								>
									{hardwareWalletItems
										.filter(
											w =>
												w.wallet.metadata.displayName
													.toLowerCase()
													.includes(search.toLowerCase()) ||
												w.id.toLowerCase().includes(search.toLowerCase()),
										)
										.map(w => (
											<Command.Item
												key={w.id}
												value={w.id}
												onSelect={handleSelect}
												className="flex items-center justify-between px-2 py-1.5 rounded cursor-pointer hover:bg-backgroundSecondary aria-selected:bg-backgroundSecondary"
											>
												<span className="flex items-center gap-2 flex-1 min-w-0">
													<WalletIcon wallet={w.wallet} iconSize={20} />
													<span className="truncate">{w.wallet.metadata.displayName}</span>
												</span>
												<LuKey className="ml-2 flex-shrink-0 opacity-40" size={14} />
											</Command.Item>
										))}
								</Command.Group>
							)}
						</Command.List>
						<Command.Empty>
							<div className="px-2 py-4 text-center text-gray-400">No wallets found</div>
						</Command.Empty>
					</Command>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	)
}
