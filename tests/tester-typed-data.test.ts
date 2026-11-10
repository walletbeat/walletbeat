import { describe, expect, it } from 'vitest'

import { scamAlertTests } from '@/constants/test-scam-alerts'
import { testSignatures } from '@/constants/test-transactions-signatures'
import { hashTypedData } from '@/types/utils/eip712'

const typedDataTests = [
	...testSignatures.filter(signature => signature.type === 'typed'),
	...scamAlertTests.filter(test => test.testType === 'signature'),
]

describe('wallet tester typed-data requests', () => {
	it.each(typedDataTests.map(test => [test.id, test] as const))(
		'%s is a complete, encodable EIP-712 request',
		(_, test) => {
			const { domain, types, primaryType, messageData } = test

			expect(domain).toBeDefined()
			expect(types).toBeDefined()
			expect(primaryType).toBeDefined()
			expect(messageData).toBeDefined()

			if (
				domain === undefined ||
				types === undefined ||
				primaryType === undefined ||
				messageData === undefined
			) {
				return
			}

			expect(Object.keys(types)).toContain(primaryType)
			expect(Object.keys(messageData).sort()).toEqual(
				types[primaryType].map(field => field.name).sort(),
			)
			expect(hashTypedData({ domain, types, primaryType, message: messageData })).toMatch(
				/^0x[0-9a-f]{64}$/,
			)
		},
	)
})
