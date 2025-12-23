import type { SmartWalletContract } from '@/schema/contracts'
import { featureSupported } from '@/schema/features/support'
import { refTodo } from '@/schema/reference'

export const kernal7702Contract: SmartWalletContract = {
	name: 'Kernal 7702',
	address: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
	eip7702Delegatable: true,
	methods: {
		isValidSignature: featureSupported,
		validateUserOp: featureSupported,
	},
	sourceCode: {
		ref: refTodo,
		available: true,
	},
}
