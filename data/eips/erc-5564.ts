import { type Eip, EipPrefix, EipStatus } from '@/schema/eips';

export const erc5564: Eip = {
  friendlyName: 'Stealth Addresses',
  formalTitle: 'Stealth Addresses',
  number: '5564',
  prefix: EipPrefix.ERC,
  status: EipStatus.FINAL,
  summaryMarkdown: `
		A standard for generating stealth addresses, which allow senders to
		non-interactively generate private accounts exclusively accessible
		by their intended recipient.
	`,
  whyItMattersMarkdown: `
		Stealth addresses add a layer of privacy on top of otherwise-public
		Ether and ERC-20 token transfers.
	`,
};
