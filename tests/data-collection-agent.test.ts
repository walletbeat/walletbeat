import { describe, expect, it } from 'vitest'

import {
	buildAgentEnv,
	isDomainClassificationCommand,
	isPlainAgentInvocation,
	redactCdPath,
	referencesRestrictedEnvVar,
} from '@/tools/wallet-data-collection/agent/command-classification'
import { getRepositoryRoot, normalizePath } from '@/utils/codebase'

const bashRepoRoot = normalizePath(getRepositoryRoot())

/** `cd <repo-root>` — the only `cd` a plain agent invocation allows. */
const cdRepo = `cd ${bashRepoRoot}`

describe('isDomainClassificationCommand', () => {
	const domainMappingFile = '/data/entities/domains/entity-domains.json'

	it('detects mark-domain and mark-domain-update when only the mapping file changed', () => {
		expect(
			isDomainClassificationCommand(
				'pnpm wallet-data-collection:agent mark-domain --domain=x --entity=y',
				[domainMappingFile],
			),
		).toBe(true)
		expect(
			isDomainClassificationCommand(
				'pnpm wallet-data-collection:agent mark-domain-update --domain=x',
				[domainMappingFile],
			),
		).toBe(true)
	})

	it('detects the subcommand even with a cd prefix', () => {
		expect(
			isDomainClassificationCommand(
				`${cdRepo} && pnpm wallet-data-collection:agent mark-domain --domain=x --entity=y`,
				[domainMappingFile],
			),
		).toBe(true)
	})

	it('returns false when the command did not change only the mapping file', () => {
		// No files changed at all.
		expect(
			isDomainClassificationCommand(
				'pnpm wallet-data-collection:agent mark-domain --domain=x --entity=y',
				[],
			),
		).toBe(false)
		// The mapping file plus some other file changed.
		expect(
			isDomainClassificationCommand(
				'pnpm wallet-data-collection:agent mark-domain --domain=x --entity=y',
				[domainMappingFile, '/data/software-wallets/ambire.ts'],
			),
		).toBe(false)
		// Some other single file changed.
		expect(
			isDomainClassificationCommand(
				'pnpm wallet-data-collection:agent mark-domain --domain=x --entity=y',
				['/data/software-wallets/ambire.ts'],
			),
		).toBe(false)
	})

	it('returns false for other subcommands even when the mapping file changed', () => {
		expect(
			isDomainClassificationCommand('pnpm wallet-data-collection:agent check', [domainMappingFile]),
		).toBe(false)
		expect(
			isDomainClassificationCommand(
				'pnpm wallet-data-collection:agent explain-request --domain=x',
				[domainMappingFile],
			),
		).toBe(false)
		expect(
			isDomainClassificationCommand('pnpm wallet-data-collection:agent mark-string --string=x', [
				domainMappingFile,
			]),
		).toBe(false)
	})

	it('does not mistake a mark-domain mention inside an argument for the subcommand', () => {
		expect(
			isDomainClassificationCommand(
				'pnpm wallet-data-collection:agent check --domain=mark-domain',
				[domainMappingFile],
			),
		).toBe(false)
	})
})

describe('referencesRestrictedEnvVar', () => {
	it('detects the arbitrary-command sentinel', () => {
		expect(
			referencesRestrictedEnvVar('echo $WALLETBEAT_WALLET_DATA_COLLECTION_ARBITRARY_COMMAND'),
		).toBe(true)
	})

	it('detects the open-mutation env var', () => {
		expect(referencesRestrictedEnvVar('WALLETBEAT_WALLET_DATA_COLLECTION_OPEN_MUTATION')).toBe(true)
	})

	it('detects WALLETBEAT_ENV', () => {
		expect(referencesRestrictedEnvVar('echo $WALLETBEAT_ENV')).toBe(true)
		expect(referencesRestrictedEnvVar('WALLETBEAT_ENV=HUMAN')).toBe(true)
	})

	it('accepts ordinary agent commands', () => {
		expect(referencesRestrictedEnvVar('pnpm wallet-data-collection:agent check')).toBe(false)
		expect(
			referencesRestrictedEnvVar(
				'pnpm wallet-data-collection:agent justify --request-id=a --url=https://x.com/y',
			),
		).toBe(false)
	})
})

describe('buildAgentEnv', () => {
	it('always sets WALLETBEAT_ENV=AGENT', () => {
		const env = buildAgentEnv({}, { isArbitrary: false, openMutationActive: false })

		expect(env.WALLETBEAT_ENV).toBe('AGENT')
	})

	it('sets the arbitrary-command env var only for arbitrary commands', () => {
		const arbitrary = buildAgentEnv({}, { isArbitrary: true, openMutationActive: false })

		expect(arbitrary.WALLETBEAT_WALLET_DATA_COLLECTION_ARBITRARY_COMMAND).toBe('true')
		expect(arbitrary.WALLETBEAT_WALLET_DATA_COLLECTION_OPEN_MUTATION).toBeUndefined()

		const plain = buildAgentEnv({}, { isArbitrary: false, openMutationActive: false })

		expect(plain.WALLETBEAT_WALLET_DATA_COLLECTION_ARBITRARY_COMMAND).toBeUndefined()
	})

	it('sets the open-mutation env var only while a mutation is open', () => {
		const open = buildAgentEnv({}, { isArbitrary: false, openMutationActive: true })

		expect(open.WALLETBEAT_WALLET_DATA_COLLECTION_OPEN_MUTATION).toBe('true')
		expect(open.WALLETBEAT_WALLET_DATA_COLLECTION_ARBITRARY_COMMAND).toBeUndefined()

		const closed = buildAgentEnv({}, { isArbitrary: false, openMutationActive: false })

		expect(closed.WALLETBEAT_WALLET_DATA_COLLECTION_OPEN_MUTATION).toBeUndefined()
	})

	it('preserves the base environment', () => {
		const env = buildAgentEnv(
			{ PATH: '/usr/bin' },
			{ isArbitrary: false, openMutationActive: false },
		)

		expect(env.PATH).toBe('/usr/bin')
	})
})

describe('isPlainAgentInvocation', () => {
	describe('single agent invocation', () => {
		it('accepts a bare agent invocation', () => {
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent')).toBe(true)
		})

		it('accepts an agent invocation with arguments', () => {
			expect(isPlainAgentInvocation("pnpm wallet-data-collection:agent --id='metamask'")).toBe(true)
			expect(
				isPlainAgentInvocation(
					"pnpm wallet-data-collection:agent --id='metamask' --variant='BROWSER'",
				),
			).toBe(true)
		})

		it('accepts an agent invocation with quoted arguments', () => {
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent --id="metamask"')).toBe(true)
		})
	})

	describe('subcommand requirement', () => {
		const domainMappingFile = '/data/entities/domains/entity-domains.json'

		it('accepts an agent invocation with a subcommand', () => {
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent check')).toBe(true)
			expect(
				isPlainAgentInvocation(
					"pnpm wallet-data-collection:agent mark-domain --domain='x' --entity='y'",
				),
			).toBe(true)
		})

		it('accepts a subcommand following leading global flags', () => {
			expect(
				isPlainAgentInvocation("pnpm wallet-data-collection:agent --id='metamask' check"),
			).toBe(true)
			// Global flags before the subcommand, plus more flags after it.
			expect(
				isPlainAgentInvocation(
					"pnpm wallet-data-collection:agent --id='metamask' --variant='BROWSER' check --format=SUMMARY",
				),
			).toBe(true)
			expect(
				isPlainAgentInvocation(
					"pnpm wallet-data-collection:agent --id='metamask' --variant='BROWSER' mark-domain --domain='x' --entity='y'",
				),
			).toBe(true)
		})

		it('extracts the subcommand past leading global flags', () => {
			// A domain classification with global flags before the subcommand is still recognized
			// as one, proving the subcommand is extracted correctly past the flags.
			expect(
				isDomainClassificationCommand(
					"pnpm wallet-data-collection:agent --id='metamask' --variant='BROWSER' mark-domain --domain='x' --entity='y'",
					[domainMappingFile],
				),
			).toBe(true)
			expect(
				isDomainClassificationCommand(
					"pnpm wallet-data-collection:agent --id='metamask' --variant='BROWSER' check",
					[domainMappingFile],
				),
			).toBe(false)
		})

		it('accepts space-separated global flags before and after the subcommand', () => {
			// Space-separated global flags before the subcommand.
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent --id metamask check')).toBe(
				true,
			)
			// Space-separated global flags after the subcommand.
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent check --id metamask')).toBe(
				true,
			)
			// A mix of space-separated global flags before and after the subcommand.
			expect(
				isPlainAgentInvocation(
					'pnpm wallet-data-collection:agent --id metamask check --variant BROWSER',
				),
			).toBe(true)
			// A mix of equals and space-separated forms.
			expect(
				isPlainAgentInvocation(
					"pnpm wallet-data-collection:agent --id='metamask' check --variant BROWSER",
				),
			).toBe(true)
		})

		it('accepts a space-separated global flag with no subcommand', () => {
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent --id metamask')).toBe(true)
		})

		it('extracts the subcommand past space-separated global flags', () => {
			// The subcommand is extracted even when a space-separated flag value precedes it.
			expect(
				isDomainClassificationCommand(
					'pnpm wallet-data-collection:agent --id metamask --variant BROWSER mark-domain --domain=x --entity=y',
					[domainMappingFile],
				),
			).toBe(true)
			expect(
				isDomainClassificationCommand('pnpm wallet-data-collection:agent --id metamask check', [
					domainMappingFile,
				]),
			).toBe(false)
		})

		it('accepts a recognized no-subcommand invocation', () => {
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent --help')).toBe(true)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent -h')).toBe(true)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent --version')).toBe(true)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent -v')).toBe(true)
		})

		it('rejects a bare invocation that is not a recognized no-subcommand form', () => {
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent --garbage')).toBe(false)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent --id=')).toBe(false)
		})

		it('rejects a subcommand mention inside an argument', () => {
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent --domain=mark-domain')).toBe(
				false,
			)
		})
	})

	describe('chains of && / ; / |', () => {
		it('accepts a chain with one agent command and allowed side commands', () => {
			expect(
				isPlainAgentInvocation(` ${cdRepo} && pnpm wallet-data-collection:agent --id='metamask'`),
			).toBe(true)
			expect(isPlainAgentInvocation("pnpm wallet-data-collection:agent --id='metamask'; pwd")).toBe(
				true,
			)
			expect(
				isPlainAgentInvocation("echo hi | pnpm wallet-data-collection:agent --id='metamask'"),
			).toBe(true)
			expect(
				isPlainAgentInvocation(
					"cat foo.json && pnpm wallet-data-collection:agent --id='metamask' && grep bar",
				),
			).toBe(true)
			expect(
				isPlainAgentInvocation(
					"pnpm wallet-data-collection:agent --id='metamask' && head -n 5 file && tail -n 3 file",
				),
			).toBe(true)
		})

		it('accepts a chain mixing multiple allowed side commands', () => {
			expect(
				isPlainAgentInvocation(
					` ${cdRepo} && echo hi && pwd && cat a.json && grep x && head file && tail file && pnpm wallet-data-collection:agent --id='metamask'`,
				),
			).toBe(true)
		})

		it('accepts conditionals with ||', () => {
			expect(isPlainAgentInvocation('echo hi || pnpm wallet-data-collection:agent')).toBe(true)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent || pwd')).toBe(true)
			expect(
				isPlainAgentInvocation(
					` ${cdRepo} || pnpm wallet-data-collection:agent --id='metamask' || echo fallback`,
				),
			).toBe(true)
			expect(
				isPlainAgentInvocation("grep x file || pnpm wallet-data-collection:agent --id='metamask'"),
			).toBe(true)
		})

		it('rejects conditionals with || when a disallowed command is used', () => {
			expect(isPlainAgentInvocation('rm -rf / || pnpm wallet-data-collection:agent')).toBe(false)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent || touch newfile')).toBe(
				false,
			)
		})

		it('rejects || chains with more than one agent command', () => {
			expect(
				isPlainAgentInvocation(
					'pnpm wallet-data-collection:agent || pnpm wallet-data-collection:agent',
				),
			).toBe(false)
		})

		it('rejects a chain with more than one agent command', () => {
			expect(
				isPlainAgentInvocation(
					'pnpm wallet-data-collection:agent && pnpm wallet-data-collection:agent',
				),
			).toBe(false)
			expect(
				isPlainAgentInvocation(
					` ${cdRepo} && pnpm wallet-data-collection:agent && pnpm wallet-data-collection:agent`,
				),
			).toBe(false)
		})

		it('rejects a chain with no agent command', () => {
			expect(isPlainAgentInvocation('echo hi && pwd')).toBe(false)
			expect(isPlainAgentInvocation(`${cdRepo} && cat file`)).toBe(false)
		})

		it('rejects a chain with a disallowed side command', () => {
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent && rm -rf /')).toBe(false)
			expect(isPlainAgentInvocation('mv a b && pnpm wallet-data-collection:agent')).toBe(false)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent && curl example.com')).toBe(
				false,
			)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent && ls -la')).toBe(false)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent && touch newfile')).toBe(
				false,
			)
		})

		it('rejects a chain with a trailing or empty segment', () => {
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent &&')).toBe(false)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent;')).toBe(false)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent |')).toBe(false)
			expect(isPlainAgentInvocation('&& pnpm wallet-data-collection:agent')).toBe(false)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent && && echo')).toBe(false)
		})
	})

	describe('subshells and metacharacters', () => {
		it('rejects subshells', () => {
			expect(isPlainAgentInvocation('(pnpm wallet-data-collection:agent)')).toBe(false)
			expect(isPlainAgentInvocation('echo hi && (pnpm wallet-data-collection:agent)')).toBe(false)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent; (echo hi)')).toBe(false)
		})

		it('rejects command substitution', () => {
			expect(isPlainAgentInvocation('echo $(date) && pnpm wallet-data-collection:agent')).toBe(
				false,
			)
			expect(isPlainAgentInvocation('echo `date` && pnpm wallet-data-collection:agent')).toBe(false)
			// Command substitution inside single quotes is literal and safe.
			expect(isPlainAgentInvocation("pnpm wallet-data-collection:agent --id='$(x)'")).toBe(true)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent | grep "$(date)"')).toBe(
				false,
			)
		})

		it('rejects file and input redirection', () => {
			expect(isPlainAgentInvocation('echo hi > out && pnpm wallet-data-collection:agent')).toBe(
				false,
			)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent < in')).toBe(false)
			expect(isPlainAgentInvocation('grep x < file && pnpm wallet-data-collection:agent')).toBe(
				false,
			)
			expect(isPlainAgentInvocation('echo hi >> out && pnpm wallet-data-collection:agent')).toBe(
				false,
			)
			expect(isPlainAgentInvocation('echo hi 2> out && pnpm wallet-data-collection:agent')).toBe(
				false,
			)
		})

		it('rejects multi-digit and out-of-range descriptors', () => {
			expect(isPlainAgentInvocation('echo hi 12>&1 && pnpm wallet-data-collection:agent')).toBe(
				false,
			)
			expect(isPlainAgentInvocation('echo hi 2>&12 && pnpm wallet-data-collection:agent')).toBe(
				false,
			)
			expect(isPlainAgentInvocation('echo hi 3>&1 && pnpm wallet-data-collection:agent')).toBe(
				false,
			)
			expect(isPlainAgentInvocation('echo hi 2>&3 && pnpm wallet-data-collection:agent')).toBe(
				false,
			)
		})

		it('accepts stdout/stderr dup redirection', () => {
			expect(isPlainAgentInvocation("pnpm wallet-data-collection:agent --id='metamask' 2>&1")).toBe(
				true,
			)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent 1>&2')).toBe(true)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent >&2')).toBe(true)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent >&1')).toBe(true)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent 2>& 1')).toBe(true)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent 2 >&1')).toBe(true)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent 2 >& 1')).toBe(true)
		})

		it('accepts a chain using stdout/stderr dup redirection', () => {
			expect(
				isPlainAgentInvocation(
					` ${cdRepo} && pnpm wallet-data-collection:agent --id='metamask' 2>&1 | head -40`,
				),
			).toBe(true)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent 2>&1; pwd')).toBe(true)
		})

		it('accepts grep patterns with | inside quotes', () => {
			expect(
				isPlainAgentInvocation(
					'pnpm wallet-data-collection:agent 2>&1 | grep -iE "successfully|Error|already" | head',
				),
			).toBe(true)
			expect(isPlainAgentInvocation("pnpm wallet-data-collection:agent | grep -E 'foo|bar'")).toBe(
				true,
			)
		})

		it('rejects backgrounding', () => {
			expect(isPlainAgentInvocation('echo hi & pnpm wallet-data-collection:agent')).toBe(false)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent & echo hi')).toBe(false)
		})

		it('rejects backslashes and newlines', () => {
			expect(isPlainAgentInvocation('echo hi \\\n pnpm wallet-data-collection:agent')).toBe(false)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent\n')).toBe(false)
		})
	})

	describe('bash keywords', () => {
		it('rejects control-flow keywords', () => {
			expect(
				isPlainAgentInvocation('for x in a; do echo $x; done && pnpm wallet-data-collection:agent'),
			).toBe(false)
			expect(isPlainAgentInvocation('if true; then echo hi; fi')).toBe(false)
			expect(isPlainAgentInvocation('switch x && pnpm wallet-data-collection:agent')).toBe(false)
			expect(
				isPlainAgentInvocation('while true; do echo hi; done && pnpm wallet-data-collection:agent'),
			).toBe(false)
			expect(
				isPlainAgentInvocation('case $x in a) echo;; esac && pnpm wallet-data-collection:agent'),
			).toBe(false)
			expect(isPlainAgentInvocation('done && pnpm wallet-data-collection:agent')).toBe(false)
		})

		it('rejects a keyword used as a command word', () => {
			expect(isPlainAgentInvocation('if pnpm wallet-data-collection:agent')).toBe(false)
			expect(isPlainAgentInvocation('for && pnpm wallet-data-collection:agent')).toBe(false)
		})
	})

	describe('malformed input', () => {
		it('rejects empty and whitespace-only commands', () => {
			expect(isPlainAgentInvocation('')).toBe(false)
			expect(isPlainAgentInvocation('   ')).toBe(false)
			expect(isPlainAgentInvocation('\t\n')).toBe(false)
		})

		it('rejects unbalanced quotes', () => {
			expect(
				isPlainAgentInvocation("echo 'unterminated && pnpm wallet-data-collection:agent"),
			).toBe(false)
			expect(
				isPlainAgentInvocation('echo "unterminated && pnpm wallet-data-collection:agent'),
			).toBe(false)
		})

		it('rejects a trailing escape', () => {
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent \\')).toBe(false)
		})

		it('rejects commands that are not the agent command', () => {
			expect(isPlainAgentInvocation('echo hi')).toBe(false)
			expect(isPlainAgentInvocation('pwd')).toBe(false)
			expect(isPlainAgentInvocation('cat file')).toBe(false)
		})
	})

	describe('cd argument validation', () => {
		it('accepts cd to the repository root', () => {
			expect(isPlainAgentInvocation(` ${cdRepo} && pnpm wallet-data-collection:agent`)).toBe(true)
		})

		it('accepts a quoted cd to the repository root', () => {
			expect(
				isPlainAgentInvocation(`cd '${bashRepoRoot}' && pnpm wallet-data-collection:agent`),
			).toBe(true)
		})

		it('rejects cd to a different real path', () => {
			expect(isPlainAgentInvocation('cd /tmp && pnpm wallet-data-collection:agent')).toBe(false)
			expect(isPlainAgentInvocation('cd /var && pnpm wallet-data-collection:agent')).toBe(false)
		})

		it('rejects cd to a subdirectory of the repo root', () => {
			expect(
				isPlainAgentInvocation(`cd ${bashRepoRoot}/sub && pnpm wallet-data-collection:agent`),
			).toBe(false)
		})

		it('rejects a bare cd with no argument', () => {
			expect(isPlainAgentInvocation('cd && pnpm wallet-data-collection:agent')).toBe(false)
		})

		it('rejects cd with a flag', () => {
			expect(
				isPlainAgentInvocation(`cd --flag ${bashRepoRoot} && pnpm wallet-data-collection:agent`),
			).toBe(false)
		})

		it('rejects cd with more than one argument', () => {
			expect(isPlainAgentInvocation('cd /a /b && pnpm wallet-data-collection:agent')).toBe(false)
		})
	})

	describe('redactCdPath', () => {
		const repoRoot = getRepositoryRoot()

		it('redacts a cd to the repo root', () => {
			expect(redactCdPath(`cd ${repoRoot} && pnpm wallet-data-collection:agent check`)).toBe(
				'cd /walletbeat && pnpm wallet-data-collection:agent check',
			)
		})

		it('redacts a cd with a trailing slash', () => {
			expect(redactCdPath(`cd ${repoRoot}/ && pnpm wallet-data-collection:agent check`)).toBe(
				'cd /walletbeat && pnpm wallet-data-collection:agent check',
			)
		})

		it('redacts a quoted cd to the repo root, preserving quotes', () => {
			expect(redactCdPath(`cd '${repoRoot}' && pnpm wallet-data-collection:agent check`)).toBe(
				"cd '/walletbeat' && pnpm wallet-data-collection:agent check",
			)
		})

		it('leaves a cd to a different path unchanged', () => {
			expect(redactCdPath('cd /tmp && pnpm wallet-data-collection:agent check')).toBe(
				'cd /tmp && pnpm wallet-data-collection:agent check',
			)
		})

		it('leaves a command with no cd unchanged', () => {
			expect(redactCdPath('pnpm wallet-data-collection:agent check')).toBe(
				'pnpm wallet-data-collection:agent check',
			)
		})
	})
})
