import { Typography } from '@mui/material'
import React from 'react'

import { subsectionWeight } from '@/components/constants'
import {
	securityAuditId,
	securityFlawSeverityName,
} from '@/schema/features/security/security-audits'
import { toFullyQualified } from '@/schema/reference'
import type { SecurityAuditsDetailsProps } from '@/types/content/security-audits-details'
import { dateCompare } from '@/types/date'
import { isNonEmptyArray, nonEmptyGet, nonEmptyMap, nonEmptySorted } from '@/types/utils/non-empty'
import { EntityLink } from '@/ui/atoms/EntityLink'
import { ReferenceLinks } from '@/ui/atoms/ReferenceLinks'

import { WrapRatingIcon } from '../../../atoms/WrapRatingIcon'

export function SecurityAuditsDetails({
	wallet,
	value,
	auditedInLastYear,
	hasUnaddressedFlaws,
}: SecurityAuditsDetailsProps): React.JSX.Element {
	const audits = value.securityAudits

	if (!isNonEmptyArray(audits)) {
		return (
			<WrapRatingIcon rating={value.rating}>
				<Typography fontWeight={subsectionWeight}>
					{wallet.metadata.displayName} has not undergone any security audits.
				</Typography>
			</WrapRatingIcon>
		)
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
					<ReferenceLinks references={toFullyQualified(mostRecentAudit.ref)} />
					{hasUnaddressedFlaws && ' There remains unaddressed security flaws in the codebase.'}
				</Typography>
			</WrapRatingIcon>
			<div className='max-h-48 overflow-y-auto border p-2 rounded-md'>
				<ul>
					{nonEmptyMap(sortedAudits, audit => (
						<li key={securityAuditId(audit)}>
							<strong>{audit.auditDate}</strong>{' '}
							<ReferenceLinks references={toFullyQualified(audit.ref)} /> by{' '}
							<EntityLink entity={audit.auditor} />.{' '}
							<React.Fragment key='unpatchedFlaws'>
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
			</div>
		</>
	)
}
