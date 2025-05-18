import type React from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { type Eip, eipEthereumDotOrgUrl } from '@/schema/eips'
import { trimWhitespacePrefix } from '@/types/utils/text'

import { MarkdownTypography } from '../atoms/MarkdownTypography'

interface EipPreviewModalProps {
	eip: Eip
	anchorEl: HTMLElement | null
	onMouseEnter?: () => void
	onMouseLeave?: () => void
}

export function EipPreviewModal({
	eip,
	anchorEl,
	onMouseEnter,
	onMouseLeave,
}: EipPreviewModalProps): React.ReactElement | null {
	const modalRef = useRef<HTMLDivElement>(null)
	const [popupPosition, setPopupPosition] = useState<{ top: number; left: number }>({
		top: 0,
		left: 0,
	})

	useLayoutEffect(() => {
		if (anchorEl !== null && modalRef.current !== null) {
			const modalDiv = modalRef.current
			const rect = anchorEl.getBoundingClientRect()

			const actualPopupHeight = modalDiv.offsetHeight
			const actualPopupWidth = modalDiv.offsetWidth

			// Default position: to the right of the anchor, vertically centered
			let top = rect.top + rect.height / 2 - actualPopupHeight / 2
			let left = rect.right + 10 // 10px offset

			// Adjust horizontal position
			if (left + actualPopupWidth > window.innerWidth - 10) {
				// Check right overflow (10px margin)
				left = rect.left - actualPopupWidth - 10 // Move to the left
			}
			if (left < 10) {
				// Ensure 10px left margin
				left = 10
			}

			// Clamp top position to be within viewport with 10px margins
			const maxPossibleTop = window.innerHeight - actualPopupHeight - 10
			top = Math.max(10, Math.min(top, maxPossibleTop))

			setPopupPosition({ top, left })
		}
	}, [anchorEl, eip]) // Added eip to dependencies, modalRef implicitly stable

	if (anchorEl === null) {
		return null
	}

	return ReactDOM.createPortal(
		<div
			ref={modalRef}
			className="eip-preview-modal fixed z-50"
			style={{
				top: `${popupPosition.top}px`,
				left: `${popupPosition.left}px`,
				width: 500,
				maxWidth: '95vw',
				maxHeight: 'calc(100vh - 20px)',
				overflowY: 'auto',
			}}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			<div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5 w-full border border-gray-200 dark:border-gray-700">
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

				<div className="mt-4 flex justify-between items-center">
					<button
						type="button"
						onClick={onMouseLeave}
						className="text-xs text-gray-600 dark:text-gray-400 hover:underline cursor-pointer"
					>
						Close
					</button>
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
