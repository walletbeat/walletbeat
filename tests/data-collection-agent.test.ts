import { describe, expect, it } from 'vitest'

import { isPlainAgentInvocation } from '@/tools/wallet-data-collection/agent/command-classification'

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

	describe('chains of && / ; / |', () => {
		it('accepts a chain with one agent command and allowed side commands', () => {
			expect(
				isPlainAgentInvocation("cd /tmp && pnpm wallet-data-collection:agent --id='metamask'"),
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
					"cd /tmp && echo hi && pwd && cat a.json && grep x && head file && tail file && pnpm wallet-data-collection:agent --id='metamask'",
				),
			).toBe(true)
		})

		it('accepts conditionals with ||', () => {
			expect(isPlainAgentInvocation('echo hi || pnpm wallet-data-collection:agent')).toBe(true)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent || pwd')).toBe(true)
			expect(
				isPlainAgentInvocation(
					"cd /tmp || pnpm wallet-data-collection:agent --id='metamask' || echo fallback",
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
					'cd /tmp && pnpm wallet-data-collection:agent && pnpm wallet-data-collection:agent',
				),
			).toBe(false)
		})

		it('rejects a chain with no agent command', () => {
			expect(isPlainAgentInvocation('echo hi && pwd')).toBe(false)
			expect(isPlainAgentInvocation('cd /tmp && cat file')).toBe(false)
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
			expect(isPlainAgentInvocation("pnpm wallet-data-collection:agent --id='$(x)'")).toBe(false)
		})

		it('rejects redirection', () => {
			expect(isPlainAgentInvocation('echo hi > out && pnpm wallet-data-collection:agent')).toBe(
				false,
			)
			expect(isPlainAgentInvocation('pnpm wallet-data-collection:agent < in')).toBe(false)
			expect(isPlainAgentInvocation('grep x < file && pnpm wallet-data-collection:agent')).toBe(
				false,
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
})
