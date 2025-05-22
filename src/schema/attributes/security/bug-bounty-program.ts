import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes';
import type { ResolvedFeatures } from '@/schema/features';
import {
	type BugBountyProgramSupport,
	BugBountyProgramType,
} from '@/schema/features/security/bug-bounty-program';
import { popRefs } from '@/schema/reference';
import { type AtLeastOneVariant, Variant } from '@/schema/variants';
import type { WalletMetadata } from '@/schema/wallet';
import { markdown, mdParagraph, mdSentence, paragraph, sentence } from '@/types/content';

import { exempt, pickWorstRating, unrated } from '../common';

const brand = 'attributes.security.bug_bounty_program';

export type BugBountyProgramValue = Value & {
	programType: BugBountyProgramType;
	upgradePathAvailable: boolean;
	__brand: 'attributes.security.bug_bounty_program';
};

function noBugBountyProgram(): Evaluation<BugBountyProgramValue> {
	return {
		value: {
			id: 'no_bug_bounty_program',
			rating: Rating.FAIL,
			displayName: 'No bug bounty program',
			shortExplanation: sentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} does not implement a bug bounty program and doesn't provide security updates.
				`,
			),
			programType: BugBountyProgramType.NONE,
			upgradePathAvailable: false,
			__brand: brand,
		},
		details: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} does not implement a bug bounty program and does not provide a clear
				path for security researchers to report vulnerabilities. The wallet also lacks a documented process
				for providing security updates to address critical issues.
			`,
		),
		howToImprove: paragraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should implement a bug bounty program to incentivize security researchers
				to responsibly disclose vulnerabilities. At minimum, the wallet should provide a clear vulnerability 
				disclosure policy and ensure a process exists for providing security updates to users.
			`,
		),
	};
}

function disclosureOnlyProgram(
	support: BugBountyProgramSupport,
): Evaluation<BugBountyProgramValue> {
	return {
		value: {
			id: 'disclosure_only_program',
			rating: Rating.PARTIAL,
			displayName: 'Basic disclosure policy',
			shortExplanation: mdSentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} implements a basic vulnerability disclosure policy but no formal bounty program.
				`,
			),
			programType: BugBountyProgramType.DISCLOSURE_ONLY,
			upgradePathAvailable: support.upgradePathAvailable,
			__brand: brand,
		},
		details: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} implements a basic vulnerability disclosure policy, allowing security
				researchers to report issues. However, it does not offer financial incentives or a formal bug bounty program,
				which may limit the motivation for researchers to find and report vulnerabilities.
				${
					support.upgradePathAvailable
						? '\n\nPositively, the wallet does provide an upgrade path for users when security issues are identified.'
						: '\n\nUnfortunately, the wallet does not provide a clear upgrade path for users when security issues are identified.'
				}
			`,
		),
		howToImprove: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should:
				- Implement a formal bug bounty program with clear rewards to incentivize security researchers
				${!support.upgradePathAvailable ? '- Establish a clear upgrade path for users when security vulnerabilities are discovered' : ''}
				- Provide transparent communication about security issues and their resolutions
			`,
		),
	};
}

function basicBugBountyProgram(
	support: BugBountyProgramSupport,
): Evaluation<BugBountyProgramValue> {
	return {
		value: {
			id: 'basic_bug_bounty_program',
			rating: Rating.PARTIAL,
			displayName: 'Basic bug bounty program',
			shortExplanation: mdSentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} implements a basic bug bounty program but with limited scope or rewards.
				`,
			),
			programType: BugBountyProgramType.BASIC,
			upgradePathAvailable: support.upgradePathAvailable,
			__brand: brand,
		},
		details: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} implements a basic bug bounty program that offers some incentives for
				security researchers to find and report vulnerabilities. However, the program has limitations in terms
				of scope, reward size, or responsiveness.
				${
					support.upgradePathAvailable
						? '\n\nPositively, the wallet provides an upgrade path for users when security issues are identified.'
						: '\n\nUnfortunately, the wallet does not provide a clear upgrade path for users when security issues are identified.'
				}
			`,
		),
		howToImprove: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} should:
				- Expand the scope and increase rewards for their bug bounty program
				${!support.upgradePathAvailable ? '- Establish a clear upgrade path for users when security vulnerabilities are discovered' : ''}
				- Improve response times and transparency in the vulnerability handling process
			`,
		),
	};
}

function comprehensiveBugBountyProgram(
	support: BugBountyProgramSupport,
): Evaluation<BugBountyProgramValue> {
	return {
		value: {
			id: 'comprehensive_bug_bounty_program',
			rating: Rating.PASS,
			displayName: 'Comprehensive bug bounty program',
			shortExplanation: mdSentence(
				(walletMetadata: WalletMetadata) => `
					${walletMetadata.displayName} implements a comprehensive bug bounty program with clear incentives and processes.
				`,
			),
			programType: BugBountyProgramType.COMPREHENSIVE,
			upgradePathAvailable: support.upgradePathAvailable,
			__brand: brand,
		},
		details: mdParagraph(
			({ wallet }) => `
				${wallet.metadata.displayName} implements a comprehensive bug bounty program that offers strong incentives for
				security researchers to find and report vulnerabilities. The program has a wide scope, competitive rewards,
				and a responsive disclosure process.
				${
					support.upgradePathAvailable
						? '\n\nAdditionally, the wallet provides a clear upgrade path for users when security issues are identified.'
						: '\n\nHowever, the wallet should still improve by providing a clearer upgrade path for users when security issues are identified.'
				}
			`,
		),
		howToImprove: support.upgradePathAvailable
			? undefined
			: mdParagraph(
					({ wallet }) => `
				${wallet.metadata.displayName} should establish a clearer upgrade path for users when security vulnerabilities are discovered,
				such as offering discounted replacements or firmware updates when possible.
			`,
				),
	};
}

export const bugBountyProgram: Attribute<BugBountyProgramValue> = {
	id: 'bugBountyProgram',
	icon: '\u{1F41B}', // Bug emoji
	displayName: 'Bug Bounty Program',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a hardware wallet's bug bounty program evaluated?",
		whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
			`What can ${walletMetadata.displayName} do to improve its bug bounty program?`,
	},
	question: sentence(
		(walletMetadata: WalletMetadata) =>
			`Does ${walletMetadata.displayName} implement a bug bounty program and provide security updates?`,
	),
	why: markdown(`
		Hardware wallets manage sensitive cryptographic keys and access to users' funds, making them high-value targets for attackers.
		Bug bounty programs incentivize security researchers to responsibly discover and disclose vulnerabilities, rather than exploit them.
		
		A well-structured bug bounty program:
		1. Provides clear guidelines for researchers to report vulnerabilities
		2. Offers appropriate rewards based on severity of findings
		3. Demonstrates a commitment to addressing security issues quickly
		4. Communicates transparently about discovered vulnerabilities and their resolution
		
		Additionally, hardware wallets should provide upgrade paths for users when critical security issues are discovered,
		as these physical devices can't always be fixed with simple software updates.
	`),
	methodology: markdown(`
		Hardware wallets are assessed based on the comprehensiveness of their bug bounty program:

		1. **Pass (Best)**: Implements a comprehensive bug bounty program with:
			- Clear scope and guidelines
			- Competitive rewards based on severity
			- Responsive disclosure process
			- Transparent communication about fixes
			- Offers upgrade paths for users when needed

		2. **Partial**: Implements a basic bug bounty program with limitations:
			- Basic vulnerability disclosure policy but no formal rewards
			- Limited scope or small rewards
			- Slower response times
			- Unclear upgrade paths for users

		3. **Fail**: No bug bounty program or security update process:
			- No formal process for reporting vulnerabilities
			- No incentives for responsible disclosure
			- No clear path for providing security updates
			- Known critical vulnerabilities remain unaddressed
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				mdParagraph(`
					The hardware wallet implements a comprehensive bug bounty program with clear incentives and responsive processes.
					It offers competitive rewards based on severity, has a transparent disclosure process, and provides upgrade paths for users.
				`),
				comprehensiveBugBountyProgram({
					type: BugBountyProgramType.COMPREHENSIVE,
					upgradePathAvailable: true,
				}).value,
			),
		],
		partial: [
			exampleRating(
				mdParagraph(`
					The hardware wallet implements a basic bug bounty program with limited scope or rewards.
					However, it does provide a clear upgrade path for users when security issues are discovered.
				`),
				basicBugBountyProgram({
					type: BugBountyProgramType.BASIC,
					upgradePathAvailable: true,
				}).value,
			),
			exampleRating(
				mdParagraph(`
					The hardware wallet implements a vulnerability disclosure policy but does not offer formal rewards.
					It also lacks a clear upgrade path for users when security issues are discovered.
				`),
				disclosureOnlyProgram({
					type: BugBountyProgramType.DISCLOSURE_ONLY,
					upgradePathAvailable: false,
				}).value,
			),
		],
		fail: [
			exampleRating(
				mdParagraph(`
					The hardware wallet does not implement any bug bounty program or vulnerability disclosure policy.
					It also lacks a clear process for providing security updates to address critical issues.
				`),
				noBugBountyProgram().value,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<BugBountyProgramValue>>) =>
		pickWorstRating<BugBountyProgramValue>(perVariant),
	evaluate: (features: ResolvedFeatures): Evaluation<BugBountyProgramValue> => {
		// This attribute is only applicable for hardware wallets
		// For software wallets, we exempt them from this attribute
		if (features.variant !== Variant.HARDWARE) {
			return exempt(
				bugBountyProgram,
				sentence('This attribute is only applicable for hardware wallets.'),
				brand,
				{
					programType: BugBountyProgramType.NONE,
					upgradePathAvailable: false,
				},
			);
		}

		if (features.security.bugBountyProgram === null) {
			return unrated(bugBountyProgram, brand, {
				programType: BugBountyProgramType.NONE,
				upgradePathAvailable: false,
			});
		}

		const { withoutRefs, refs } = popRefs<BugBountyProgramSupport>(
			features.security.bugBountyProgram,
		);

		// Initialize result with a default value
		let result: Evaluation<BugBountyProgramValue> = noBugBountyProgram();

		switch (withoutRefs.type) {
			case BugBountyProgramType.COMPREHENSIVE:
				result = comprehensiveBugBountyProgram(withoutRefs);
				break;
			case BugBountyProgramType.BASIC:
				result = basicBugBountyProgram(withoutRefs);
				break;
			case BugBountyProgramType.DISCLOSURE_ONLY:
				result = disclosureOnlyProgram(withoutRefs);
				break;
			case BugBountyProgramType.NONE:
				result = noBugBountyProgram();
				break;
		}

		// Return result with references if any
		return {
			...result,
			...(refs.length > 0 && { references: refs }),
		};
	},
};
