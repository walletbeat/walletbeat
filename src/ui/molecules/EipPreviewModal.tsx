import type React from 'react'
import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { eipEthereumDotOrgUrl, type Eip } from '@/schema/eips'
import { MarkdownTypography } from '../atoms/MarkdownTypography'
import { trimWhitespacePrefix } from '@/types/utils/text'

interface EipPreviewModalProps {
	eip: Eip
	anchorEl: HTMLElement | null
	onClose: () => void
}

export function EipPreviewModal({
	eip,
	anchorEl,
	onClose,
}: EipPreviewModalProps): React.ReactElement | null {
	const [popupPosition, setPopupPosition] = useState<{ top: number; left: number }>({
		top: 0,
		left: 0,
	})

	// Calculate position of popup
	useEffect(() => {
		if (anchorEl === null) {
			return
		}
		const rect = anchorEl.getBoundingClientRect()
		const scrollTop = window.scrollY === 0 ? document.documentElement.scrollTop : window.scrollY
		const scrollLeft = window.scrollX === 0 ? document.documentElement.scrollLeft : window.scrollX

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
		const popupWidth = 500 // Increased width for better readability
		const viewportWidth = window.innerWidth
		if (rect.left + popupWidth > viewportWidth) {
			// Align right edge of popup with right edge of anchor
			left = rect.right + scrollLeft - popupWidth
		}

		// Ensure popup doesn't go off the left edge
		if (left < scrollLeft) {
			left = scrollLeft + 10 // Add a small margin
		}

		// Ensure popup doesn't go off the top of the screen
		if (top < scrollTop) {
			top = scrollTop + 10 // Add a small margin
		}

		setPopupPosition({ top, left })
	}, [anchorEl, eip.number])

	// Create a portal for the popup
	if (anchorEl === null) {
		return null
	}

	return ReactDOM.createPortal(
		<div
			className="fixed z-50 eip-preview-modal"
			style={{ top: `${popupPosition.top}px`, left: `${popupPosition.left}px` }}
			onMouseLeave={onClose}
		>
			<div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5 w-[500px] overflow-hidden border border-gray-200 dark:border-gray-700">
				<div className="flex items-center mb-4">
					<div className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
						{eip.prefix}-{eip.number}
					</div>
					<div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-xs font-medium px-2.5 py-0.5 rounded-full">
						{eip.status}
					</div>
				</div>

				<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
					{eip.friendlyName !== '' ? eip.friendlyName : eip.formalTitle}
				</h3>

				{eip.formalTitle !== '' && eip.formalTitle !== eip.friendlyName && (
					<h4 className="text-sm text-gray-700 dark:text-gray-300 mb-4">{eip.formalTitle}</h4>
				)}

				<div className="prose dark:prose-invert prose-sm max-w-none text-left">
					{eip.summaryMarkdown !== '' && (
						<div className="mb-4">
							<h5 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2">
								Summary
							</h5>
							<div className="text-sm text-gray-700 dark:text-gray-300">
								<MarkdownTypography variant="caption">
									{trimWhitespacePrefix(eip.summaryMarkdown)}
								</MarkdownTypography>
							</div>
						</div>
					)}

					{eip.whyItMattersMarkdown !== '' && (
						<div>
							<h5 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2">
								Why It Matters
							</h5>
							<div className="text-sm text-gray-700 dark:text-gray-300">
								<MarkdownTypography variant="caption">
									{trimWhitespacePrefix(eip.whyItMattersMarkdown)}
								</MarkdownTypography>
							</div>
						</div>
					)}
				</div>

				<div className="mt-4 text-right">
					<a
						href={eipEthereumDotOrgUrl(eip)}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
					>
						Read full specification →
					</a>
				</div>
			</div>
		</div>,
		document.body,
	)
}
