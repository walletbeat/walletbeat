import { Typography } from '@mui/material'
import React from 'react'
import { subsectionWeight } from '@/components/constants'
import { WrapRatingIcon } from '../../../atoms/WrapRatingIcon'
import type { TransactionInclusionDetailsProps } from '@/types/content/transaction-inclusion-details'
import { transactionSubmissionL2TypeName } from '@/schema/features/self-sovereignty/transaction-submission'
import { commaListPrefix } from '@/types/utils/text'

export function TransactionInclusionDetails({
	wallet,
	value,
	supportsL1Broadcast,
	supportAnyL2Transactions,
	supportForceWithdrawal,
	unsupportedL2s,
}: TransactionInclusionDetailsProps): React.JSX.Element {
	const allSupportedForceWithdrawals = supportAnyL2Transactions
		.concat(supportForceWithdrawal)
		.toSorted()
	return (
		<WrapRatingIcon rating={value.rating}>
			{allSupportedForceWithdrawals.length > 0 && (
				<>
					<Typography fontWeight={subsectionWeight}>
						{wallet.metadata.displayName} supports L2 force-inclusion withdrawal transactions on{' '}
						{allSupportedForceWithdrawals.map((l2Type, index) => (
							<React.Fragment key={l2Type}>
								{commaListPrefix(index, allSupportedForceWithdrawals.length)}
								<strong>{transactionSubmissionL2TypeName(l2Type)}</strong>
							</React.Fragment>
						))}{' '}
						L2s.
					</Typography>
					<Typography fontWeight={subsectionWeight}>
						This means users may withdraw funds from these L2s without relying on intermediaries.
					</Typography>
				</>
			)}
			{unsupportedL2s.length > 0 && (
				<>
					<Typography fontWeight={subsectionWeight}>
						{allSupportedForceWithdrawals.length === 0
							? wallet.metadata.displayName
							: ' However, it'}{' '}
						does not support L2 force-inclusion withdrawal transactions on{' '}
						{unsupportedL2s.map((l2Type, index) => (
							<React.Fragment key={l2Type}>
								{commaListPrefix(index, unsupportedL2s.length, 'or')}
								<strong>{transactionSubmissionL2TypeName(l2Type)}</strong>
							</React.Fragment>
						))}{' '}
						L2s.
					</Typography>
					<Typography fontWeight={subsectionWeight}>
						This means users rely on intermediaries in order to withdraw their funds from these L2s.
					</Typography>
				</>
			)}
			{(() => {
				switch (supportsL1Broadcast) {
					case 'NO':
						return (
							<>
								<Typography fontWeight={subsectionWeight}>
									{wallet.metadata.displayName} does not support Ethereum peer-to-peer gossipping
									nor connecting to a user&apos;s self-hosted Ethereum node.
								</Typography>
								<Typography fontWeight={subsectionWeight}>
									Therefore, L1 transactions are subject to censorship by intermediaries.
								</Typography>
							</>
						)
					case 'OWN_NODE':
						return (
							<Typography fontWeight={subsectionWeight}>
								{wallet.metadata.displayName} supports connecting to a user&apos;s self-hosted
								Ethereum node, which can be used to broadcast L1 transactions without trusting
								intermediaries.
							</Typography>
						)
					case 'SELF_GOSSIP':
						return (
							<Typography fontWeight={subsectionWeight}>
								{wallet.metadata.displayName} supports directly gossipping over Ethereum&apos;s
								peer-to-peer network, allowing L1 transactions to be reliably included without
								trusting intermediaries.
							</Typography>
						)
				}
			})()}
		</WrapRatingIcon>
	)
}
