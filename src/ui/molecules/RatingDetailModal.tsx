/* eslint-disable @typescript-eslint/no-explicit-any -- Disabled for complex typing with attribute groups */
import React from 'react'
import { Modal, Button, useMediaQuery, useTheme } from '@mui/material'
import type { Theme } from '@mui/material'
import { Rating, type AttributeGroup } from '@/schema/attributes'
import type { EvaluationTree } from '@/schema/attribute-groups'
import { getAttributeReferences } from '@/schema/attributeReferences'
import type { FullyQualifiedReference } from '@/schema/reference'
import { walletRatingColumnProps } from './WalletRatingCell'
import { getDisplayName } from '@mui/utils'
import { daimo } from '@/data/wallets/daimo'
import { metamask } from '@/data/wallets/metamask'
import { coinbase } from '@/data/wallets/coinbase'
import { keystoneWallet } from '@/data/hardware-wallets/keystone'
import { safe } from '@/data/wallets/safe'
import { rabby } from '@/data/wallets/rabby'
import { rainbow } from '@/data/wallets/rainbow'
import { frame } from '@/data/wallets/frame'
import { elytro } from '@/data/wallets/elytro'
import { phantom } from '@/data/wallets/phantom'
import type { Wallet } from '@/schema/wallet'

interface RatingDetailModalProps {
	open: boolean
	onClose: () => void
	attrGroup: AttributeGroup<any>
	evalTree: EvaluationTree
	attributeRatings: Array<{ rating: Rating; id: string }>
	walletId?: string // Add walletId to generate links
}

// Helper function to get readable name for attribute IDs
function getAttributeName(attrId: string): string {
	// Convert camelCase to Title Case with spaces
	return attrId
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, str => str.toUpperCase())
		.trim()
}

// Convert attribute ID to kebab-case for URLs
function toKebabCase(str: string): string {
	// Handle camelCase
	const fromCamel = str.replace(/([a-z])([A-Z])/g, '$1-$2')
	// Handle snake_case
	const fromSnake = fromCamel.replace(/_/g, '-')
	// Convert to lowercase
	return fromSnake.toLowerCase()
}

// Helper function to get rating color based on theme
function getRatingColor(rating: Rating, theme: Theme): string {
	switch (rating) {
		case Rating.PASS:
			return '#2ecc71' // Green
		case Rating.PARTIAL:
			return '#f1c40f' // Yellow
		case Rating.FAIL:
			return '#e74c3c' // Red
		case Rating.UNRATED:
		case Rating.EXEMPT:
			return '#bdc3c7' // Gray
	}
}

// Helper function to get human-readable rating text
function getRatingText(rating: Rating): string {
	switch (rating) {
		case Rating.PASS:
			return 'Pass'
		case Rating.PARTIAL:
			return 'Partial'
		case Rating.FAIL:
			return 'Fail'
		case Rating.UNRATED:
			return 'Unrated'
		case Rating.EXEMPT:
			return 'Exempt'
	}
}

// Add a function to get wallet data by ID
function getWalletById(id?: string): Wallet | undefined {
	if (!id) {
		return undefined
	}

	// Map of wallet IDs to wallet data
	const walletMap: Record<string, Wallet> = {
		daimo,
		metamask,
		coinbase,
		keystone: keystoneWallet,
		safe,
		rabby,
		rainbow,
		frame,
		elytro,
		phantom,
	}

	return walletMap[id]
}

// Helper function to get references for an attribute
function getAttributeRefs(
	evalTree: EvaluationTree,
	attrGroupId: string,
	attributeId: string,
	walletId?: string,
): FullyQualifiedReference[] {
	if (!walletId) {
		return []
	}

	// Get the actual wallet data
	const walletData = getWalletById(walletId)
	if (!walletData) {
		return []
	}

	const refs: FullyQualifiedReference[] = []

	// Look in the features structure where references are stored
	if (walletData.features && typeof walletData.features === 'object') {
		// Security attributes
		if (attrGroupId === 'security') {
			// Security audits
			if (attributeId === 'securityAudits' && walletData.features.security?.publicSecurityAudits) {
				const audits = walletData.features.security.publicSecurityAudits
				if (Array.isArray(audits)) {
					audits.forEach(audit => {
						if (audit.ref) {
							const auditRef = audit.ref
							refs.push({
								urls: [
									{
										url: typeof auditRef === 'string' ? auditRef : auditRef.url || '#',
										label: audit.auditor?.name
											? `Audit by ${audit.auditor.name}`
											: 'Security Audit',
									},
								],
								explanation: audit.auditor?.name
									? `Security audit performed by ${audit.auditor.name} on ${audit.auditDate || 'an unspecified date'}.`
									: 'This wallet has been audited for security vulnerabilities.',
							})
						}
					})
				}
			}

			// Passkey implementation
			if (
				attributeId === 'passkeyImplementation' &&
				walletData.features.security?.passkeyVerification
			) {
				const passkey = walletData.features.security.passkeyVerification
				if (passkey.ref) {
					const ref = passkey.ref
					if (Array.isArray(ref)) {
						ref.forEach(r => {
							refs.push({
								urls: [
									{
										url: typeof r === 'string' ? r : r.url || '#',
										label:
											typeof r === 'string'
												? 'Passkey Implementation'
												: r.label || 'Passkey Implementation',
									},
								],
								explanation:
									typeof r === 'object'
										? r.explanation
										: passkey.details || `Uses ${passkey.library || 'passkey verification'}`,
							})
						})
					} else {
						refs.push({
							urls: [
								{
									url: typeof ref === 'string' ? ref : ref.url || '#',
									label: 'Passkey Implementation',
								},
							],
							explanation:
								typeof ref === 'object'
									? ref.explanation
									: passkey.details || `Uses ${passkey.library || 'passkey verification'}`,
						})
					}
				}
			}

			// Hardware wallet clear signing
			if (
				attributeId === 'hardwareWalletClearSigning' &&
				walletData.features.security?.hardwareWalletClearSigning
			) {
				const clearSigning = walletData.features.security.hardwareWalletClearSigning
				if (clearSigning.ref) {
					const ref = clearSigning.ref
					if (Array.isArray(ref)) {
						ref.forEach(r => {
							refs.push({
								urls: [
									{
										url: typeof r === 'string' ? r : r.url || '#',
										label:
											typeof r === 'string'
												? 'Hardware Wallet Clear Signing'
												: r.label || 'Hardware Wallet Clear Signing',
									},
								],
								explanation:
									typeof r === 'object'
										? r.explanation
										: clearSigning.clearSigningSupport?.details || '',
							})
						})
					} else {
						refs.push({
							urls: [
								{
									url: typeof ref === 'string' ? ref : ref.url || '#',
									label: 'Hardware Wallet Clear Signing',
								},
							],
							explanation:
								typeof ref === 'object'
									? ref.explanation
									: clearSigning.clearSigningSupport?.details || '',
						})
					}
				} else if (clearSigning.clearSigningSupport?.details) {
					refs.push({
						urls: [{ url: '#', label: 'Clear Signing Details' }],
						explanation: clearSigning.clearSigningSupport.details,
					})
				}
			}

			// Bug bounty program
			if (attributeId === 'bugBountyProgram' && walletData.features.security?.bugBountyProgram) {
				const bounty = walletData.features.security.bugBountyProgram
				if (bounty.ref) {
					const ref = bounty.ref
					if (Array.isArray(ref)) {
						ref.forEach(r => {
							refs.push({
								urls: [
									{
										url: typeof r === 'string' ? r : r.url || '#',
										label: typeof r === 'string' ? 'Bug Bounty' : r.label || 'Bug Bounty',
									},
								],
								explanation: typeof r === 'object' ? r.explanation : bounty.details || '',
							})
						})
					} else {
						refs.push({
							urls: [
								{
									url: typeof ref === 'string' ? ref : ref.url || '#',
									label: 'Bug Bounty Program',
								},
							],
							explanation: typeof ref === 'object' ? ref.explanation : bounty.details || '',
						})
					}
				} else if (bounty.details || bounty.url) {
					refs.push({
						urls: [{ url: bounty.url || '#', label: 'Bug Bounty Program' }],
						explanation: bounty.details || 'This wallet has a bug bounty program.',
					})
				}
			}

			// Scam prevention
			if (attributeId === 'scamPrevention' && walletData.features.security?.scamAlerts) {
				const scamAlerts = walletData.features.security.scamAlerts

				// Check each alert type for references
				;['scamUrlWarning', 'contractTransactionWarning', 'sendTransactionWarning'].forEach(
					alertType => {
						const alert = scamAlerts[alertType as keyof typeof scamAlerts]
						if (alert && 'ref' in alert) {
							const alertRef = alert.ref

							if (Array.isArray(alertRef)) {
								alertRef.forEach(r => {
									if (typeof r === 'string') {
										refs.push({
											urls: [{ url: r, label: alertType }],
											explanation: '',
										})
									} else if (r && typeof r === 'object') {
										refs.push({
											urls: [{ url: r.url || '#', label: r.label || alertType }],
											explanation: r.explanation || '',
										})
									}
								})
							} else if (typeof alertRef === 'string') {
								refs.push({
									urls: [{ url: alertRef, label: alertType }],
									explanation: '',
								})
							} else if (alertRef && typeof alertRef === 'object') {
								refs.push({
									urls: [{ url: alertRef.url || '#', label: alertRef.label || alertType }],
									explanation: alertRef.explanation || '',
								})
							}
						}
					},
				)
			}
		}

		// Check for direct references in the attribute group
		const attrGroup = walletData.features[attrGroupId as keyof typeof walletData.features]
		if (attrGroup && typeof attrGroup === 'object' && attributeId in attrGroup) {
			const attr = attrGroup[attributeId as keyof typeof attrGroup]

			// Check if the attribute has a ref property
			if (attr && typeof attr === 'object' && 'ref' in attr) {
				const attrRef = attr.ref

				if (Array.isArray(attrRef)) {
					attrRef.forEach(r => {
						if (typeof r === 'string') {
							refs.push({
								urls: [{ url: r, label: 'Reference' }],
								explanation: '',
							})
						} else if (r && typeof r === 'object') {
							refs.push({
								urls: r.urls || [{ url: r.url || '#', label: r.label || 'Reference' }],
								explanation: r.explanation || '',
							})
						}
					})
				} else if (typeof attrRef === 'string') {
					refs.push({
						urls: [{ url: attrRef, label: 'Reference' }],
						explanation: '',
					})
				} else if (attrRef && typeof attrRef === 'object') {
					refs.push({
						urls: attrRef.urls || [
							{ url: attrRef.url || '#', label: attrRef.label || 'Reference' },
						],
						explanation: attrRef.explanation || '',
					})
				}
			}
		}
	}

	return refs
}

// Get explanation text for an attribute
function getShortExplanation(
	evalTree: EvaluationTree,
	attrGroupId: string,
	attributeId: string,
	walletId?: string,
): string {
	// Try to get the explanation from the evaluation value first
	try {
		const categoryKey = attrGroupId as keyof EvaluationTree
		const categoryData = evalTree[categoryKey]
		if (categoryData && typeof categoryData === 'object') {
			const attrData = (categoryData as any)[attributeId]
			if (attrData?.evaluation?.value?.shortExplanation?.render) {
				const rendered = attrData.evaluation.value.shortExplanation.render(evalTree.metadata || {})
				if (rendered) {
					if (typeof rendered === 'object' && 'text' in rendered) {
						return rendered.text
					}
					return String(rendered)
				}
			}
		}
	} catch (e) {
		console.error('Error getting evaluation explanation:', e)
	}

	// If not available, check for explanation in the wallet data
	if (walletId) {
		const walletData = getWalletById(walletId)
		if (walletData?.features) {
			// Security attributes
			if (attrGroupId === 'security') {
				if (
					attributeId === 'securityAudits' &&
					walletData.features.security?.publicSecurityAudits
				) {
					const audits = walletData.features.security.publicSecurityAudits
					if (Array.isArray(audits) && audits.length > 0) {
						return `Has undergone security audits by ${audits
							.map(a => a.auditor?.name)
							.filter(Boolean)
							.join(', ')}.`
					}
				}

				if (
					attributeId === 'passkeyImplementation' &&
					walletData.features.security?.passkeyVerification
				) {
					const passkey = walletData.features.security.passkeyVerification
					if (passkey.library) {
						return `Implements passkeys using ${passkey.library}.`
					}
					return passkey.details || 'Implements passkeys.'
				}

				if (
					attributeId === 'hardwareWalletClearSigning' &&
					walletData.features.security?.hardwareWalletClearSigning?.clearSigningSupport
				) {
					return (
						walletData.features.security.hardwareWalletClearSigning.clearSigningSupport.details ||
						'Provides clear signing for hardware wallets.'
					)
				}

				if (attributeId === 'bugBountyProgram' && walletData.features.security?.bugBountyProgram) {
					return (
						walletData.features.security.bugBountyProgram.details ||
						'Maintains an active bug bounty program.'
					)
				}
			}
		}
	}

	// Default explanation
	return `Information about ${getAttributeName(attributeId)}.`
}

export function RatingDetailModal({
	open,
	onClose,
	attrGroup,
	evalTree,
	attributeRatings,
	walletId,
}: RatingDetailModalProps): React.ReactElement {
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
	const [highlightedSlice, setHighlightedSlice] = React.useState<number | null>(null)
	const [expandedAttribute, setExpandedAttribute] = React.useState<string | null>(null)

	// Calculate overall score
	let overallScore = 0
	try {
		// Get the category object based on attribute group ID
		const categoryKey = attrGroup.id as keyof EvaluationTree
		const categoryData = evalTree[categoryKey]

		// Only calculate score if we have a score function
		if (typeof attrGroup.score === 'function') {
			// Use the category data directly since null checks are handled in the score function
			const result = attrGroup.score(categoryData)

			// Check for valid result with score property
			if (result != null && typeof result === 'object' && 'score' in result) {
				overallScore = result.score
			}
		}
	} catch (e) {
		// Silently handle errors in score calculation
		overallScore = 0
	}

	// Create SVG slices for the enlarged chart
	const createEnlargedSlices = (): React.ReactNode[] => {
		const slices = []
		const attributeCount = attributeRatings.length > 0 ? attributeRatings.length : 4
		const centerX = 150
		const centerY = 150
		const radius = 120
		const gapAngle = 2 // Gap in degrees

		const sliceAngle = 360 / attributeCount - gapAngle

		for (let i = 0; i < attributeCount; i++) {
			const startAngle = i * (sliceAngle + gapAngle)
			const endAngle = startAngle + sliceAngle

			// Convert angles to radians
			const startRad = ((startAngle - 90) * Math.PI) / 180
			const endRad = ((endAngle - 90) * Math.PI) / 180

			// Calculate coordinates
			const x1 = centerX + radius * Math.cos(startRad)
			const y1 = centerY + radius * Math.sin(startRad)
			const x2 = centerX + radius * Math.cos(endRad)
			const y2 = centerY + radius * Math.sin(endRad)

			// Create path for the slice
			const largeArcFlag = sliceAngle > 180 ? 1 : 0

			const pathData = `
                M ${centerX} ${centerY}
                L ${x1} ${y1}
                A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
                Z
            `

			const rating = attributeRatings[i]?.rating ?? Rating.UNRATED
			const sliceColor = getRatingColor(rating, theme)

			// Add the slice
			slices.push(
				<path
					key={i}
					d={pathData}
					fill={sliceColor}
					stroke="#ffffff"
					strokeWidth="2"
					style={{
						opacity: highlightedSlice === null || highlightedSlice === i ? 1 : 0.4,
						transition: 'opacity 0.2s ease-in-out',
						cursor: 'pointer',
					}}
					onMouseEnter={() => {
						handleMouseEnter(i)
					}}
					onMouseLeave={handleMouseLeave}
				/>,
			)
		}

		return slices
	}

	// Handlers for hover events
	const handleMouseEnter = (index: number): void => {
		setHighlightedSlice(index)
	}

	const handleMouseLeave = (): void => {
		setHighlightedSlice(null)
	}

	// Toggle expanded state for an attribute
	const toggleExpandedAttribute = (attributeId: string): void => {
		setExpandedAttribute(expandedAttribute === attributeId ? null : attributeId)
	}

	return (
		<Modal open={open} onClose={onClose} aria-labelledby="rating-detail-modal-title">
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] max-w-[95vw] max-h-[90vh] overflow-auto bg-white dark:bg-[#292C34] text-[#292C34] dark:text-[#FAFDFF] shadow-2xl rounded-lg p-6 sm:p-4">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-medium" id="rating-detail-modal-title">
						{attrGroup.displayName} - {Math.round(overallScore * 100)}% Overall
					</h2>
					<Button onClick={onClose} variant="outlined" size="small">
						Close
					</Button>
				</div>

				<div
					className={`flex ${isMobile ? 'flex-col items-center' : 'flex-row items-start'} gap-4`}
				>
					{/* Chart */}
					<div className="w-[280px] h-[280px] flex-shrink-0 rounded p-1">
						<svg viewBox="0 0 300 300" width="100%" height="100%">
							{createEnlargedSlices()}
						</svg>
					</div>

					{/* Attribute details */}
					<div className="flex-1 w-full">
						<h3 className="font-bold mb-2 text-base">Attribute Details:</h3>
						{attributeRatings.length > 0 ? (
							<div className="flex flex-col gap-2 max-h-[350px] sm:max-h-[300px] overflow-y-auto pr-1">
								{attributeRatings.map((attr, index) => {
									const isExpanded = expandedAttribute === attr.id
									const references = getAttributeRefs(evalTree, attrGroup.id, attr.id, walletId)
									const hasReferences = references.length > 0

									// Create proper attribute anchor for links
									const detailUrl = walletId
										? `/${walletId}#${toKebabCase(attr.id)}`
										: '#' + toKebabCase(attr.id)

									return (
										<div key={attr.id} className="mb-2">
											<div
												className={`flex items-center p-2 rounded cursor-pointer text-sm ${
													highlightedSlice === index
														? 'bg-gray-200 dark:bg-gray-700'
														: 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
												}`}
												onMouseEnter={() => {
													handleMouseEnter(index)
												}}
												onMouseLeave={handleMouseLeave}
												onClick={() => toggleExpandedAttribute(attr.id)}
											>
												<div
													className="w-3 h-3 rounded-full mr-3 flex-shrink-0 border border-gray-300 dark:border-gray-600"
													style={{ backgroundColor: getRatingColor(attr.rating, theme) }}
												/>
												<span className="flex-1 text-sm">{getAttributeName(attr.id)}</span>
												<div
													className="px-2 py-1 rounded min-w-[50px] text-center text-xs font-bold"
													style={{
														backgroundColor: getRatingColor(attr.rating, theme),
														color: theme.palette.getContrastText(
															getRatingColor(attr.rating, theme),
														),
													}}
												>
													{getRatingText(attr.rating)}
												</div>
											</div>

											{/* References and Learn More button */}
											{isExpanded && (
												<div className="pl-8 mt-2 text-sm">
													{/* Show the short explanation */}
													<div className="mb-3 font-medium text-gray-800 dark:text-gray-200">
														{getShortExplanation(evalTree, attrGroup.id, attr.id, walletId)}
													</div>

													{hasReferences ? (
														<div className="space-y-3">
															{references.map((ref, refIndex) => (
																<div
																	key={refIndex}
																	className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 py-1"
																>
																	{ref.explanation && (
																		<p className="mb-2 text-gray-700 dark:text-gray-300">
																			{ref.explanation}
																		</p>
																	)}
																	<div className="flex flex-wrap gap-2 mt-1">
																		{ref.urls.map((urlObj, urlIndex) => (
																			<a
																				key={urlIndex}
																				href={urlObj.url}
																				target="_blank"
																				rel="noopener noreferrer"
																				className="text-blue-500 hover:underline inline-flex items-center"
																			>
																				<span>{urlObj.label || 'Reference'}</span>
																				<svg
																					className="w-3 h-3 ml-1"
																					fill="none"
																					stroke="currentColor"
																					viewBox="0 0 24 24"
																					xmlns="http://www.w3.org/2000/svg"
																				>
																					<path
																						strokeLinecap="round"
																						strokeLinejoin="round"
																						strokeWidth="2"
																						d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
																					></path>
																				</svg>
																			</a>
																		))}
																	</div>
																</div>
															))}
														</div>
													) : (
														<p className="text-gray-500 dark:text-gray-400 italic">
															No references available for this attribute.
														</p>
													)}

													{/* Learn More Button */}
													<div className="mt-3">
														<a
															href={detailUrl}
															className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs font-medium hover:bg-blue-600 inline-flex items-center"
														>
															Learn More
															<svg
																className="w-3 h-3 ml-1"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
																xmlns="http://www.w3.org/2000/svg"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth="2"
																	d="M14 5l7 7m0 0l-7 7m7-7H3"
																></path>
															</svg>
														</a>
													</div>
												</div>
											)}
										</div>
									)
								})}
							</div>
						) : (
							<p className="text-gray-500 dark:text-gray-400 text-sm">
								No attribute ratings available for this category.
							</p>
						)}
					</div>
				</div>
			</div>
		</Modal>
	)
}
