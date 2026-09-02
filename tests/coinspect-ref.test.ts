import { describe, expect, it } from 'vitest'

import coinspectUpstreamCommit from '@/data/coinspect/upstream-commit?raw'
import { softwareWalletAttributeTree } from '@/data/software-wallets'
import { completedTemplate } from '@/data/software-wallets/completed.tmpl'
import { coinspectDataSource, coinspectRef } from '@/schema/data-sources/coinspect'
import { isSupported } from '@/schema/features/support'
import { softwareLadders } from '@/schema/ladders'
import { toFullyQualified } from '@/schema/reference'
import { rateWallet } from '@/schema/wallet'

const COMMIT = coinspectUpstreamCommit.trim()
const REPORT_DATE = '2026-01-12T17:52:05.136Z'
const CHECK = 'WSR-001.v1'
const NOTE = 'The wallet warns when sending to a new recipient.'
const WALLET_UID = 'metamask-browser'

describe('coinspectRef', () => {
	it('pins the trimmed upstream commit, labels the check, and stamps the Coinspect source', () => {
		const ref = coinspectRef({
			report: { walletUID: WALLET_UID, date: REPORT_DATE },
			check: CHECK,
			note: NOTE,
		})

		expect(ref.urls).toEqual([
			{
				url: `https://github.com/coinspect/wallet-security-ranking/blob/${COMMIT}/current-reports/${WALLET_UID}/${WALLET_UID}.json`,
				label: `Coinspect ${CHECK}`,
			},
		])
		expect(ref.explanation).toBe(NOTE)
		expect(ref.lastRetrieved).toBe('2026-01-12')
		expect(ref.source).toBe(coinspectDataSource)
		expect(COMMIT.endsWith('\n')).toBe(false)
		expect(COMMIT).toHaveLength(40)
	})
})

describe('coinspectRef through rateWallet', () => {
	it('preserves source.id on scam-prevention evaluation.references without attribute awareness', () => {
		const wallet = structuredClone(completedTemplate)
		const { scamAlerts } = wallet.features.security

		if (scamAlerts === null || !('sendTransactionWarning' in scamAlerts)) {
			throw new Error('completed template should have non-variant scamAlerts')
		}

		const sendWarning = scamAlerts.sendTransactionWarning

		if (sendWarning === null || !isSupported(sendWarning)) {
			throw new Error('completed template should support sendTransactionWarning')
		}

		sendWarning.ref = coinspectRef({
			report: { walletUID: WALLET_UID, date: REPORT_DATE },
			check: CHECK,
			note: NOTE,
		})

		const rated = rateWallet(softwareWalletAttributeTree, softwareLadders, wallet)
		const evalAttr = rated.overall.security.scamPrevention

		if (evalAttr === undefined) {
			throw new Error('expected scamPrevention evaluation')
		}

		const references = toFullyQualified(evalAttr.evaluation.references)

		expect(references.some(ref => ref.source?.entity.id === 'coinspect')).toBe(true)
	})
})
