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

	try {
		// Access features data
		const features = walletData.features as any
		if (!features) {
			return refs
		}

		// Check for category-specific references
		if (attrGroupId === 'security') {
			// Special handling for security attributes that have complex structures

			// Security audits
			if (attributeId === 'securityAudits' && features.security?.publicSecurityAudits) {
				const audits = features.security.publicSecurityAudits
				if (Array.isArray(audits)) {
					audits.forEach(audit => {
						if (audit.ref) {
							processRefToArray(audit.ref, refs, {
								defaultLabel: audit.auditor?.name
									? `Audit by ${audit.auditor.name}`
									: 'Security Audit',
								defaultExplanation: audit.auditor?.name
									? `Security audit performed by ${audit.auditor.name} on ${audit.auditDate || 'an unspecified date'}.`
									: 'This wallet has been audited for security vulnerabilities.',
							})
						}
					})
				}
				if (refs.length > 0) {
					return refs
				}
			}

			// Passkey implementation
			if (attributeId === 'passkeyImplementation' && features.security?.passkeyVerification) {
				const passkey = features.security.passkeyVerification
				if (passkey.ref) {
					processRefToArray(passkey.ref, refs, {
						defaultLabel: 'Passkey Implementation',
						defaultExplanation:
							passkey.details || `Uses ${passkey.library || 'passkey verification'}`,
					})
					if (refs.length > 0) {
						return refs
					}
				}
			}

			// Hardware wallet clear signing
			if (
				attributeId === 'hardwareWalletClearSigning' &&
				features.security?.hardwareWalletClearSigning
			) {
				const clearSigning = features.security.hardwareWalletClearSigning
				if (clearSigning.ref) {
					processRefToArray(clearSigning.ref, refs, {
						defaultLabel: 'Hardware Wallet Clear Signing',
						defaultExplanation: clearSigning.clearSigningSupport?.details || '',
					})
					if (refs.length > 0) {
						return refs
					}
				} else if (clearSigning.clearSigningSupport?.details) {
					refs.push({
						urls: [{ url: '#', label: 'Clear Signing Details' }],
						explanation: clearSigning.clearSigningSupport.details,
					})
					return refs
				}
			}

			// Bug bounty program
			if (attributeId === 'bugBountyProgram' && features.security?.bugBountyProgram) {
				const bounty = features.security.bugBountyProgram
				if (bounty.ref) {
					processRefToArray(bounty.ref, refs, {
						defaultLabel: 'Bug Bounty Program',
						defaultExplanation: bounty.details || '',
					})
					if (refs.length > 0) {
						return refs
					}
				} else if (bounty.details || bounty.url) {
					refs.push({
						urls: [{ url: bounty.url || '#', label: 'Bug Bounty Program' }],
						explanation: bounty.details || 'This wallet has a bug bounty program.',
					})
					return refs
				}
			}

			// Scam prevention
			if (attributeId === 'scamPrevention' && features.security?.scamAlerts) {
				const scamAlerts = features.security.scamAlerts

				// Check each alert type for references
				;['scamUrlWarning', 'contractTransactionWarning', 'sendTransactionWarning'].forEach(
					alertType => {
						const alert = scamAlerts[alertType as keyof typeof scamAlerts]
						if (alert && 'ref' in alert) {
							processRefToArray(alert.ref, refs, {
								defaultLabel: alertType,
								defaultExplanation: '',
							})
						}
					},
				)
				if (refs.length > 0) {
					return refs
				}
			}
		}

		// Handle privacy category
		else if (attrGroupId === 'privacy') {
			// Address correlation and multi-address correlation
			if (attributeId === 'addressCorrelation' && features.privacy?.dataCollection) {
				// Check for references in dataCollection
				const dataCollection = features.privacy.dataCollection
				if (dataCollection.onchain?.ref) {
					processRefToArray(dataCollection.onchain.ref, refs, {
						defaultLabel: 'Address Correlation',
						defaultExplanation: '',
					})
				}
				if (
					dataCollection.collectedByEntities &&
					Array.isArray(dataCollection.collectedByEntities)
				) {
					dataCollection.collectedByEntities.forEach(entity => {
						if (entity.leaks?.walletAddress && entity.leaks.ref) {
							processRefToArray(entity.leaks.ref, refs, {
								defaultLabel: `Data Collection by ${entity.entity?.name || 'Entity'}`,
								defaultExplanation: '',
							})
						}
					})
				}
				if (refs.length > 0) {
					return refs
				}
			}

			if (attributeId === 'multiAddressCorrelation' && features.privacy?.dataCollection) {
				// Check for references in dataCollection
				const dataCollection = features.privacy.dataCollection
				if (
					dataCollection.collectedByEntities &&
					Array.isArray(dataCollection.collectedByEntities)
				) {
					dataCollection.collectedByEntities.forEach(entity => {
						if (entity.leaks?.multiAddress && entity.leaks.ref) {
							processRefToArray(entity.leaks.ref, refs, {
								defaultLabel: `Multi-Address Data Collection by ${entity.entity?.name || 'Entity'}`,
								defaultExplanation: '',
							})
						}
					})
				}
				if (refs.length > 0) {
					return refs
				}
			}
		}

		// Handle self-sovereignty category
		else if (attrGroupId === 'selfSovereignty') {
			// Check for references in specific attributes
			if (attributeId === 'selfHostedNode' && features.selfSovereignty?.transactionSubmission) {
				const txSubmission = features.selfSovereignty.transactionSubmission
				if (txSubmission.l1?.selfBroadcastViaSelfHostedNode?.ref) {
					processRefToArray(txSubmission.l1.selfBroadcastViaSelfHostedNode.ref, refs, {
						defaultLabel: 'Self-Hosted Node Support',
						defaultExplanation: '',
					})
					if (refs.length > 0) {
						return refs
					}
				}
			}

			if (attributeId === 'accountPortability' && features.accountSupport) {
				const accountSupport = features.accountSupport
				if (
					accountSupport.defaultAccountType &&
					accountSupport[accountSupport.defaultAccountType]?.ref
				) {
					processRefToArray(accountSupport[accountSupport.defaultAccountType].ref, refs, {
						defaultLabel: 'Account Portability',
						defaultExplanation: '',
					})
					if (refs.length > 0) {
						return refs
					}
				}
			}
		}

		// Handle transparency category
		else if (attrGroupId === 'transparency') {
			// Check for license information
			if (attributeId === 'openSource' && features.license?.ref) {
				processRefToArray(features.license.ref, refs, {
					defaultLabel: 'License Information',
					defaultExplanation: `This wallet uses the ${features.license.value || ''} license.`,
				})
				if (refs.length > 0) {
					return refs
				}
			}

			// Check for monetization/funding information
			if (attributeId === 'funding' && features.monetization?.ref) {
				processRefToArray(features.monetization.ref, refs, {
					defaultLabel: 'Funding Information',
					defaultExplanation: '',
				})
				if (refs.length > 0) {
					return refs
				}
			}
		}

		// Handle ecosystem category
		else if (attrGroupId === 'ecosystem') {
			// Browser integration
			if (attributeId === 'browserIntegration' && features.integration?.browser?.ref) {
				processRefToArray(features.integration.browser.ref, refs, {
					defaultLabel: 'Browser Integration',
					defaultExplanation: '',
				})
				if (refs.length > 0) {
					return refs
				}
			}

			// Address resolution
			if (attributeId === 'addressResolution' && features.addressResolution?.ref) {
				processRefToArray(features.addressResolution.ref, refs, {
					defaultLabel: 'Address Resolution',
					defaultExplanation: '',
				})
				if (refs.length > 0) {
					return refs
				}
			}
		}

		// Generic approach for all other attributes - check direct references in the attribute
		// First, try to get the attribute group
		const attrGroup = features[attrGroupId]
		if (attrGroup && typeof attrGroup === 'object') {
			// Then check if the attribute ID exists and has a ref
			if (attributeId in attrGroup) {
				const attr = attrGroup[attributeId]
				if (attr && typeof attr === 'object' && 'ref' in attr) {
					processRefToArray(attr.ref, refs, {
						defaultLabel: getAttributeName(attributeId),
						defaultExplanation: '',
					})
					if (refs.length > 0) {
						return refs
					}
				}
			}
		}

		// Last resort: try to find references in any category that match the attribute ID
		Object.keys(features).forEach(category => {
			const categoryData = features[category]
			if (categoryData && typeof categoryData === 'object' && attributeId in categoryData) {
				const attr = categoryData[attributeId]
				if (attr && typeof attr === 'object' && 'ref' in attr) {
					processRefToArray(attr.ref, refs, {
						defaultLabel: getAttributeName(attributeId),
						defaultExplanation: '',
					})
				}
			}
		})
	} catch (e) {
		console.error('Error extracting references:', e)
	}

	return refs
}

// Helper function to process a reference into the refs array
function processRefToArray(
	ref: any,
	refs: FullyQualifiedReference[],
	options: {
		defaultLabel?: string
		defaultExplanation?: string
	} = {},
): void {
	const defaultLabel = options.defaultLabel || 'Reference'
	const defaultExplanation = options.defaultExplanation || ''

	if (!ref) {
		return
	}

	// Handle array of references
	if (Array.isArray(ref)) {
		ref.forEach(r => processRefItem(r, refs, defaultLabel, defaultExplanation))
		return
	}

	// Handle single reference
	processRefItem(ref, refs, defaultLabel, defaultExplanation)
}

// Process a single reference item
function processRefItem(
	ref: any,
	refs: FullyQualifiedReference[],
	defaultLabel: string,
	defaultExplanation: string,
): void {
	// Handle string reference
	if (typeof ref === 'string') {
		refs.push({
			urls: [{ url: ref, label: defaultLabel }],
			explanation: defaultExplanation,
		})
		return
	}

	// Handle object reference
	if (ref && typeof ref === 'object') {
		// With urls array
		if ('urls' in ref && Array.isArray(ref.urls)) {
			refs.push({
				urls: ref.urls.map((u: any) => {
					if (typeof u === 'string') {
						return { url: u, label: defaultLabel }
					}
					return {
						url: u.url || '#',
						label: u.label || defaultLabel,
					}
				}),
				explanation: ref.explanation || defaultExplanation,
			})
			return
		}

		// With single url
		if ('url' in ref) {
			refs.push({
				urls: [
					{
						url: ref.url || '#',
						label: ref.label || defaultLabel,
					},
				],
				explanation: ref.explanation || defaultExplanation,
			})
			return
		}
	}
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
			// Use type assertion to work with complex features structure
			const features = walletData.features as any

			// Security attributes
			if (attrGroupId === 'security') {
				if (attributeId === 'securityAudits' && features.security?.publicSecurityAudits) {
					const audits = features.security.publicSecurityAudits
					if (Array.isArray(audits) && audits.length > 0) {
						return `Has undergone security audits by ${audits
							.map(a => a.auditor?.name)
							.filter(Boolean)
							.join(', ')}.`
					}
				}

				if (attributeId === 'passkeyImplementation' && features.security?.passkeyVerification) {
					const passkey = features.security.passkeyVerification
					if (passkey.library) {
						return `Implements passkeys using ${passkey.library}.`
					}
					return passkey.details || 'Implements passkeys.'
				}

				if (
					attributeId === 'hardwareWalletClearSigning' &&
					features.security?.hardwareWalletClearSigning?.clearSigningSupport
				) {
					return (
						features.security.hardwareWalletClearSigning.clearSigningSupport.details ||
						'Provides clear signing for hardware wallets.'
					)
				}

				if (attributeId === 'bugBountyProgram' && features.security?.bugBountyProgram) {
					return (
						features.security.bugBountyProgram.details || 'Maintains an active bug bounty program.'
					)
				}

				if (attributeId === 'scamPrevention' && features.security?.scamAlerts) {
					const alerts = features.security.scamAlerts
					const enabledAlerts: string[] = []

					if (alerts.scamUrlWarning && alerts.scamUrlWarning !== 'NOT_SUPPORTED') {
						enabledAlerts.push('URL warning')
					}
					if (
						alerts.contractTransactionWarning &&
						alerts.contractTransactionWarning !== 'NOT_SUPPORTED'
					) {
						enabledAlerts.push('contract transaction warning')
					}
					if (alerts.sendTransactionWarning && alerts.sendTransactionWarning !== 'NOT_SUPPORTED') {
						enabledAlerts.push('send transaction warning')
					}

					if (enabledAlerts.length > 0) {
						return `Implements ${enabledAlerts.join(', ')} to prevent scams.`
					}

					return 'Implements features to prevent scams and fraudulent transactions.'
				}

				if (attributeId === 'chainVerification' && features.security?.lightClient?.ethereumL1) {
					return `Uses ${features.security.lightClient.ethereumL1} for chain verification.`
				}
			}

			// Privacy attributes
			else if (attrGroupId === 'privacy') {
				if (attributeId === 'addressCorrelation') {
					if (features.privacy?.dataCollection?.onchain?.pseudonym) {
						const onchain = features.privacy.dataCollection.onchain
						if (onchain.ref && typeof onchain.ref === 'object' && onchain.ref.explanation) {
							return onchain.ref.explanation
						}
						return `Uses ${onchain.pseudonym} pseudonym on chain.`
					}
				}

				if (
					attributeId === 'multiAddressCorrelation' &&
					features.privacy?.dataCollection?.collectedByEntities
				) {
					const entities = features.privacy.dataCollection.collectedByEntities
					if (Array.isArray(entities)) {
						const multiAddrEntities = entities.filter(e => e.leaks?.multiAddress)
						if (multiAddrEntities.length > 0) {
							return `Shares multi-address data with ${multiAddrEntities
								.map(e => e.entity?.name)
								.filter(Boolean)
								.join(', ')}.`
						}
					}
				}
			}

			// Self-sovereignty attributes
			else if (attrGroupId === 'selfSovereignty') {
				if (
					attributeId === 'selfHostedNode' &&
					features.selfSovereignty?.transactionSubmission?.l1
				) {
					const l1 = features.selfSovereignty.transactionSubmission.l1
					if (
						l1.selfBroadcastViaSelfHostedNode &&
						l1.selfBroadcastViaSelfHostedNode !== 'NOT_SUPPORTED'
					) {
						return 'Supports self-hosted node for transaction submission.'
					}
					return 'Does not support self-hosted nodes for transaction submission.'
				}

				if (attributeId === 'accountPortability' && features.accountSupport) {
					const accountSupport = features.accountSupport
					return `Uses ${accountSupport.defaultAccountType || 'standard'} account type.`
				}

				if (
					attributeId === 'transactionInclusion' &&
					features.selfSovereignty?.transactionSubmission
				) {
					const tx = features.selfSovereignty.transactionSubmission
					if (tx.l2?.opStack === 'SUPPORTED_WITH_FORCE_INCLUSION') {
						return 'Supports force-including transactions in L2 blocks.'
					}
				}
			}

			// Transparency attributes
			else if (attrGroupId === 'transparency') {
				if (attributeId === 'openSource' && features.license?.value) {
					return `Uses the ${features.license.value} license.`
				}

				if (attributeId === 'sourceVisibility' && features.license?.value) {
					// Most open source licenses also imply source visibility
					if (
						features.license.value.includes('GPL') ||
						features.license.value.includes('MIT') ||
						features.license.value.includes('Apache')
					) {
						return 'Source code is publicly available.'
					}
				}

				if (attributeId === 'funding' && features.monetization?.strategies) {
					const strategies = features.monetization.strategies
					const fundingSources: string[] = []

					if (strategies.ventureCapital) {
						fundingSources.push('venture capital')
					}
					if (strategies.ecosystemGrants) {
						fundingSources.push('ecosystem grants')
					}
					if (strategies.donations) {
						fundingSources.push('donations')
					}
					if (strategies.publicOffering) {
						fundingSources.push('public offering')
					}

					if (fundingSources.length > 0) {
						return `Funded through ${fundingSources.join(', ')}.`
					}
				}

				if (attributeId === 'feeTransparency' && features.transparency?.feeTransparency) {
					return 'Has transparent fee structure.'
				}
			}

			// Ecosystem attributes
			else if (attrGroupId === 'ecosystem') {
				if (attributeId === 'browserIntegration' && features.integration?.browser) {
					const browser = features.integration.browser
					if (browser === 'NOT_A_BROWSER_WALLET') {
						return 'Not a browser wallet.'
					}
					return 'Integrates with browser.'
				}

				if (attributeId === 'addressResolution' && features.addressResolution) {
					if (features.addressResolution.nonChainSpecificEnsResolution) {
						return 'Supports ENS name resolution.'
					}
				}

				if (attributeId === 'accountAbstraction' && features.accountSupport?.defaultAccountType) {
					// Account abstraction is related to 4337 accounts
					if (features.accountSupport.defaultAccountType.includes('4337')) {
						return 'Implements account abstraction via ERC-4337.'
					}
				}
			}

			// Generic approach - look for a direct property with the attribute ID
			// First, try in the direct attribute group
			if (features[attrGroupId] && features[attrGroupId][attributeId]) {
				const attr = features[attrGroupId][attributeId]

				// If attribute has details or description property
				if (attr.details) {
					return attr.details
				}
				if (attr.description) {
					return attr.description
				}

				// If attribute is an object with a ref that has explanation
				if (attr.ref && typeof attr.ref === 'object' && attr.ref.explanation) {
					return attr.ref.explanation
				}
			}

			// Last resort - look in any category for the attribute ID
			for (const category in features) {
				if (features[category] && features[category][attributeId]) {
					const attr = features[category][attributeId]

					// If attribute has details or description property
					if (attr.details) {
						return attr.details
					}
					if (attr.description) {
						return attr.description
					}

					// If attribute is an object with a ref that has explanation
					if (attr.ref && typeof attr.ref === 'object' && attr.ref.explanation) {
						return attr.ref.explanation
					}
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
