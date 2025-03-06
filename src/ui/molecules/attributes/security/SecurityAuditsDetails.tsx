import { Box, Typography } from '@mui/material'
import React from 'react'
import { subsectionWeight } from '@/components/constants'
import { WrapRatingIcon } from '../../../atoms/WrapRatingIcon'
import { isNonEmptyArray, nonEmptyGet, nonEmptyMap, nonEmptySorted } from '@/types/utils/non-empty'
import type { SecurityAuditsDetailsProps } from '@/types/content/security-audits-details'
import { dateCompare } from '@/types/date'
import { toFullyQualified } from '@/schema/reference'
import { EntityLink } from '@/ui/atoms/EntityLink'
import {
	securityAuditId,
	securityFlawSeverityName,
} from '@/schema/features/security/security-audits'
import { ReferenceLinks } from '@/ui/atoms/ReferenceLinks'

export function SecurityAuditsDetails({
	wallet,
	value,
	auditedInLastYear,
	hasUnaddressedFlaws,
}: SecurityAuditsDetailsProps): React.JSX.Element {
	const audits = value.securityAudits
	if (!isNonEmptyArray(audits)) {
		throw new Error('This component cannot be used to render an empty set of security audits.')
	}
	const sortedAudits = nonEmptySorted(
		audits,
		(audit1, audit2) => dateCompare(audit1.auditDate, audit2.auditDate),
		true /* Reverse */,
	)
	const mostRecentAudit = nonEmptyGet(sortedAudits)
	return (
		<>
			<WrapRatingIcon rating={value.rating}>
				<Typography fontWeight={subsectionWeight}>
					{wallet.metadata.displayName} was last audited on {mostRecentAudit.auditDate}
					{auditedInLastYear ? '.' : ', which was over a year ago.'}{' '}
					<ReferenceLinks ref={toFullyQualified(mostRecentAudit.ref)} />
					{hasUnaddressedFlaws && ' There remains unaddressed security flaws in the codebase.'}
				</Typography>
			</WrapRatingIcon>
			<Box sx={{ maxHeight: '16rem', overflowY: 'auto' }}>
				<ul>
					{nonEmptyMap(sortedAudits, audit => (
						<li key={securityAuditId(audit)}>
							<strong>{audit.auditDate}</strong>{' '}
							<ReferenceLinks ref={toFullyQualified(audit.ref)} /> by{' '}
							<EntityLink entity={audit.auditor} />.{' '}
							<React.Fragment key="unpatchedFlaws">
								{audit.unpatchedFlaws === 'NONE_FOUND' &&
									'No security flaws of severity level medium or higher were found.'}
								{audit.unpatchedFlaws === 'ALL_FIXED' &&
									'All security flaws of severity level medium or higher were addressed.'}
								{Array.isArray(audit.unpatchedFlaws) && (
									<>
										The following security flaws were identified
										{!nonEmptyMap(audit.unpatchedFlaws, flaw => flaw.presentStatus).includes(
											'NOT_FIXED',
										) && ' and have all been addressed since'}
										:
										<ul>
											{nonEmptyMap(audit.unpatchedFlaws, flaw => (
												<React.Fragment key={flaw.name}>
													<li>
														<strong>
															{securityFlawSeverityName(flaw.severityAtAuditPublication)}
														</strong>
														:{' '}
														{flaw.presentStatus === 'FIXED' ? (
															<>
																<Typography sx={{ textDecoration: 'line-through', opacity: 0.75 }}>
																	{flaw.name}
																</Typography>{' '}
																(<strong>Fixed</strong>)
															</>
														) : (
															<>
																{flaw.name} (<strong>Not fixed</strong>)
															</>
														)}
													</li>
												</React.Fragment>
											))}
										</ul>
									</>
								)}
							</React.Fragment>
						</li>
					))}
				</ul>
			</Box>
		</>
	)
}
