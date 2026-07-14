import { describe, expect, it } from 'vitest'

import { eip7702 } from '@/data/eips/eip-7702'
import { erc4337 } from '@/data/eips/erc-4337'
import { EipStatus } from '@/schema/eips'
import {
	mapUpstreamStatus,
	parseUpstreamStatus,
	upstreamUrls,
} from '@/tools/eip-status-checker/eip-status-checker-lib'

/**
 * Offline unit tests for the pure logic of the EIP status checker. The live
 * upstream comparison runs out-of-band (see `pnpm check:eip-status`); these
 * tests deliberately avoid the network so they stay hermetic.
 */

const frontMatter = (status: string): string =>
	['---', 'eip: 7702', 'title: Set EOA account code', `status: ${status}`, '---', '', 'Body'].join(
		'\n',
	)

describe('parseUpstreamStatus', () => {
	it('reads the status from YAML front-matter', () => {
		expect(parseUpstreamStatus(frontMatter('Final'))).toBe('Final')
	})

	it('handles CRLF line endings', () => {
		expect(parseUpstreamStatus(frontMatter('Last Call').replace(/\n/g, '\r\n'))).toBe('Last Call')
	})

	it('returns null when there is no front-matter', () => {
		expect(parseUpstreamStatus('# Just a heading\n\nNo front-matter here.')).toBeNull()
	})

	it('does not read a status appearing outside the front-matter block', () => {
		expect(parseUpstreamStatus('# Heading\n\nstatus: Draft\n')).toBeNull()
	})
})

describe('mapUpstreamStatus', () => {
	it('maps known statuses case-insensitively', () => {
		expect(mapUpstreamStatus('Final')).toBe(EipStatus.FINAL)
		expect(mapUpstreamStatus('draft')).toBe(EipStatus.DRAFT)
		expect(mapUpstreamStatus('Review')).toBe(EipStatus.REVIEW)
		expect(mapUpstreamStatus('Last Call')).toBe(EipStatus.LAST_CALL)
		expect(mapUpstreamStatus('Living')).toBe(EipStatus.LIVING)
	})

	it('returns null for statuses Walletbeat does not model', () => {
		expect(mapUpstreamStatus('Stagnant')).toBeNull()
		expect(mapUpstreamStatus('Withdrawn')).toBeNull()
		expect(mapUpstreamStatus('Moved')).toBeNull()
	})
})

describe('upstreamUrls', () => {
	it('tries the EIPs repository first for an EIP-prefixed proposal', () => {
		const [first, second] = upstreamUrls(eip7702)

		expect(first).toContain('/ethereum/EIPs/master/EIPS/eip-7702.md')
		expect(second).toContain('/ethereum/ERCs/master/ERCS/erc-7702.md')
	})

	it('tries the ERCs repository first for an ERC-prefixed proposal', () => {
		const [first, second] = upstreamUrls(erc4337)

		expect(first).toContain('/ethereum/ERCs/master/ERCS/erc-4337.md')
		expect(second).toContain('/ethereum/EIPs/master/EIPS/eip-4337.md')
	})
})
