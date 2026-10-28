import { AbiFunction, AbiItem } from 'ox'
import { describe, expect, it } from 'vitest'

import { testTransactions } from '@/constants/test-transactions-signatures'

const singleCallTransactions = testTransactions.filter(tx => tx.calls === undefined)

describe('wallet tester transactions', () => {
	it.each(singleCallTransactions.map(tx => [tx.id, tx] as const))(
		'%s calldata encodes its function and parameters',
		(_, tx) => {
			const abiFunction: AbiFunction.AbiFunction = {
				type: 'function',
				name: tx.function.slice(0, tx.function.indexOf('(')),
				inputs: tx.parameters.map(param => ({ name: param.name, type: param.type })),
				outputs: [],
				stateMutability: 'nonpayable',
			}
			const args = tx.parameters.map(param =>
				/^u?int\d*$/.test(param.type) ? BigInt(param.value) : param.value,
			)

			expect(AbiItem.getSignature(abiFunction)).toBe(tx.function)
			expect(AbiFunction.encodeData(abiFunction, args)).toBe(tx.calldata.toLowerCase())
		},
	)
})
