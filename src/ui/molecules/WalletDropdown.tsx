import type { Wallet } from "@/schema/wallet"
import { WalletIcon } from "../atoms/WalletIcon"
import { wallets } from "@/data/wallets"
import * as Popover from "@radix-ui/react-popover"
import { Command } from "cmdk"
import { useState, useCallback, useRef, useEffect } from "react"
import { LuChevronDown, LuSearch } from "react-icons/lu"

export function WalletDropdown({ wallet }: { wallet?: Wallet }): React.JSX.Element {
	const [open, setOpen] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const [width, setWidth] = useState(0)

	// Update width when popover opens
	useEffect(() => {
		if (open && triggerRef.current) {
			setWidth(triggerRef.current.offsetWidth)
		}
	}, [open])

	// Convert wallets object to array with ids
	const allWallets = Object.entries(wallets).map(([id, walletData]) => ({
		id,
		...walletData,
	}))

	const handleSelect = useCallback((walletId: string) => {
		setOpen(false)
		// Use simple navigation instead of router
		window.location.href = `/${walletId}`
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
								<WalletIcon
									walletMetadata={wallet.metadata}
									iconSize={24}
									variants={wallet.variants}
								/>
								<span>{wallet.metadata.displayName}</span>
							</>
						) : (
							<span className="text-gray-400">Select a wallet</span>
						)}
					</div>
					<LuChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} />
				</button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					className="bg-background border rounded-md shadow-lg p-1"
					style={{ width: width > 0 ? width : 'auto' }}
					sideOffset={8}
					align="start"
					onOpenAutoFocus={(e) => {
						e.preventDefault()
						inputRef.current?.focus()
					}}
				>
					<Command className="w-full">
						<div className="flex items-center border-b px-2 mb-1">
							<LuSearch className="text-gray-400 mr-2" />
							<Command.Input
								ref={inputRef}
								placeholder="Search wallets..."
								className="flex-1 h-9 bg-transparent outline-none placeholder:text-gray-400"
							/>
						</div>

						<Command.List className="max-h-[300px] overflow-auto py-1">
							{allWallets.map(w => (
								<Command.Item
									key={w.id}
									value={w.id}
									onSelect={handleSelect}
									className="flex items-center gap-2 px-2 py-1.5 rounded m-1 cursor-pointer hover:bg-backgroundSecondary aria-selected:bg-backgroundSecondary"
								>
									<WalletIcon walletMetadata={w.metadata} iconSize={20} variants={w.variants} />
									<span>{w.metadata.displayName}</span>
								</Command.Item>
							))}
						</Command.List>
						<Command.Empty>
							<div className="px-2 py-4 text-center text-gray-400">
								No wallets found
							</div>
						</Command.Empty>
					</Command>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
