import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { eips, lookupEip } from '@/data/eips'
import type { Eip, EipNumber } from '@/schema/eips'
import { EipPrefix } from '@/schema/eips'

interface EipPreviewModalProps {
	eipNumber: string
	eipPrefix: string
	anchorEl: HTMLElement | null
	onClose: () => void
}

export function EipPreviewModal({
	eipNumber,
	eipPrefix,
	anchorEl,
	onClose,
}: EipPreviewModalProps): React.ReactElement | null {
	const [popupPosition, setPopupPosition] = useState<{ top: number; left: number }>({
		top: 0,
		left: 0,
	})
	const [eipData, setEipData] = useState<Eip | null>(null)
	const [loading, setLoading] = useState<boolean>(true)

	// Load EIP data
	useEffect(() => {
		const fetchEipData = async () => {
			setLoading(true)
			try {
				// Normalize the EIP number and look it up in the data
				const normalizedEipNumber = eipNumber.replace(/^#/, '') as EipNumber

				// Get the EIP data directly from the record
				if (normalizedEipNumber in eips) {
					const eipData = eips[normalizedEipNumber]
					// Only use if the prefix matches (if provided)
					if (!eipPrefix || eipData.prefix === eipPrefix) {
						setEipData(eipData)
					}
				} else {
					// Try looking up by number as a fallback
					const numericEipNumber = parseInt(normalizedEipNumber, 10)
					if (!isNaN(numericEipNumber)) {
						const lookedUpEip = lookupEip(numericEipNumber)
						if (lookedUpEip && (!eipPrefix || lookedUpEip.prefix === eipPrefix)) {
							setEipData(lookedUpEip)
						}
					}

					if (!eipData) {
						console.error(`EIP ${normalizedEipNumber} not found`)
					}
				}
			} catch (error) {
				console.error('Error fetching EIP data:', error)
			} finally {
				setLoading(false)
			}
		}

		fetchEipData()
	}, [eipNumber, eipPrefix])

	// Calculate position of popup
	useEffect(() => {
		if (anchorEl) {
			const rect = anchorEl.getBoundingClientRect()
			const scrollTop = window.scrollY || document.documentElement.scrollTop
			const scrollLeft = window.scrollX || document.documentElement.scrollLeft

			// Start with a position below the anchor element
			let top = rect.bottom + scrollTop + 5 // Add small offset for visual separation
			let left = rect.left + scrollLeft

			// Check if popup would go off the bottom of the screen
			const popupHeight = 600 // Fixed height
			const viewportHeight = window.innerHeight
			if (rect.bottom + popupHeight > viewportHeight) {
				// Position above the anchor element instead
				top = rect.top + scrollTop - popupHeight - 5 // Add small offset for visual separation
			}

			// Check if popup would go off the right of the screen
			const popupWidth = 450 // Increased width for better readability
			const viewportWidth = window.innerWidth
			if (rect.left + popupWidth > viewportWidth) {
				// Align right edge of popup with right edge of anchor
				left = rect.right + scrollLeft - popupWidth
			}

			// Ensure popup doesn't go off the left edge
			if (left < scrollLeft) {
				left = scrollLeft
			}

			// Ensure popup doesn't go off the top of the screen
			if (top < scrollTop) {
				top = scrollTop
			}

			setPopupPosition({ top, left })
		}
	}, [anchorEl, eipData])

	// Create a portal for the popup
	if (!anchorEl || !eipData) {
		return null
	}

	return ReactDOM.createPortal(
		<div
			className="fixed z-50 eip-preview-popup"
			style={{ top: `${popupPosition.top}px`, left: `${popupPosition.left}px` }}
			onMouseLeave={onClose}
		>
			<div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5 w-[450px] h-auto max-h-[600px] border border-gray-200 dark:border-gray-700">
				{loading ? (
					<div className="flex justify-center items-center h-32">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
					</div>
				) : (
					<>
						<div className="flex items-center mb-4">
							<div className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
								{eipData.prefix}-{eipData.number}
							</div>
							<div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-xs font-medium px-2.5 py-0.5 rounded-full">
								{eipData.status}
							</div>
						</div>

						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
							{eipData.friendlyName || eipData.formalTitle}
						</h3>

						{eipData.formalTitle && eipData.formalTitle !== eipData.friendlyName && (
							<h4 className="text-sm text-gray-700 dark:text-gray-300 mb-4">
								{eipData.formalTitle}
							</h4>
						)}

						<div className="prose dark:prose-invert prose-sm max-w-none text-left">
							{eipData.summaryMarkdown && (
								<div className="mb-4">
									<h5 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2">
										Summary
									</h5>
									<div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
										{eipData.summaryMarkdown.trim()}
									</div>
								</div>
							)}

							{eipData.whyItMattersMarkdown && (
								<div>
									<h5 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2">
										Why It Matters
									</h5>
									<div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
										{eipData.whyItMattersMarkdown.trim()}
									</div>
								</div>
							)}
						</div>

						<div className="mt-4 text-right">
							<a
								href={`https://eips.ethereum.org/EIPS/eip-${eipData.number}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
							>
								Read full specification →
							</a>
						</div>
					</>
				)}
			</div>
		</div>,
		document.body,
	)
}
