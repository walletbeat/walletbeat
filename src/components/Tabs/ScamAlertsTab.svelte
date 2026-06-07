<script lang="ts">
	import type { ScamAlertTest } from '../../constants/test-scam-alerts';

	interface Props {
		selectedTest: ScamAlertTest | undefined;
		scamAlertState: {
			activeId: string | null;
			isPending: boolean;
			hashes: Record<string, `0x${string}`>;
			signatures: Record<string, string>;
		};
		disclaimerAccepted: boolean;
		account: { address?: string } | null;
		onAcceptDisclaimer: () => void;
		onSendScamAlert: (test: ScamAlertTest) => void;
		onSignScamAlert: (test: ScamAlertTest) => void;
		onOpenInExplorer: (txHash: string) => void;
	}

	let {
		selectedTest,
		scamAlertState,
		disclaimerAccepted,
		account,
		onAcceptDisclaimer,
		onSendScamAlert,
		onSignScamAlert,
		onOpenInExplorer,
	}: Props = $props();

	let checkboxChecked = $state(false);
	let customAddress = $state('');
	let customAddressError = $state('');

	const isActive = $derived(
		selectedTest && scamAlertState.activeId === selectedTest.id
	);
	const isPending = $derived(scamAlertState.isPending && isActive);
	const txHash = $derived(selectedTest ? scamAlertState.hashes[selectedTest.id] : undefined);
	const sigResult = $derived(selectedTest ? scamAlertState.signatures[selectedTest.id] : undefined);

	const isWalletOwn = $derived(selectedTest?.customAddress === true);
	const isSignature = $derived(selectedTest?.testType === 'signature');

	function isValidAddress(addr: string): addr is `0x${string}` {
		return /^0x[0-9a-fA-F]{40}$/.test(addr);
	}

	function handleAction() {
		if (!selectedTest || !account?.address) return;

		customAddressError = '';

		if (isSignature) {
			onSignScamAlert(selectedTest);
		} else if (isWalletOwn) {
			if (!isValidAddress(customAddress)) {
				customAddressError = 'Enter a valid Ethereum address (0x…)';

				return;
			}

			onSendScamAlert({ ...selectedTest, contractAddress: customAddress });
		} else {
			onSendScamAlert(selectedTest);
		}
	}

	// Teleports the element to document.body so it escapes the ancestor
	// transform: perspective() on [data-scroll-item], which otherwise traps
	// position: fixed children within the section instead of the viewport.
	function portal(node: HTMLElement) {
		document.body.appendChild(node);

		return { destroy() { node.remove(); } };
	}

	function getRiskLabel(riskType: ScamAlertTest['riskType']): string {
		switch (riskType) {
			case 'recent-deploy': return 'Recently Deployed';
			case 'previous-interaction': return 'Previous Interaction';
			case 'known-scam': return 'Known Scam';
			case 'allow-infinite': return 'Infinite Approval';
		}
	}
</script>

{#if !disclaimerAccepted}
	<div class="disclaimer-fullscreen" use:portal>
		<div class="disclaimer-overlay" data-card="radius-8 padding-5">
			<div class="disclaimer-content" data-column="gap-4">
				<div class="disclaimer-icon">&#9888;</div>
				<h3 class="disclaimer-title">Scam Alert Testing</h3>
				<div class="disclaimer-warnings" data-column="gap-3">
					<p class="disclaimer-rule">
						Every transaction on this tab should be treated as a <strong>SCAM</strong> transaction.
					</p>
					<p class="disclaimer-rule">
						Do <strong>NOT</strong> send real funds &mdash; nothing should ever be sent.
					</p>
					<p class="disclaimer-rule">
						Use only <strong>disposable wallets</strong> with no real assets.
					</p>
				</div>
				<label class="disclaimer-checkbox">
					<input
						type="checkbox"
						bind:checked={checkboxChecked}
					/>
					<span>I understand the risks and will only use disposable wallets for testing</span>
				</label>
				<button
					type="button"
					class="disclaimer-button"
					data-pressable
					disabled={!checkboxChecked}
					onclick={onAcceptDisclaimer}
				>
					I Understand
				</button>
			</div>
		</div>
	</div>
{:else if selectedTest}
	<div class="scam-zone">
		<div class="scam-ticker" aria-hidden="true">
			<span class="scam-ticker-inner">
				{#each [0, 1] as _ (_)}
					⚠️ SCAM TEST &nbsp;•&nbsp; DO NOT SEND REAL FUNDS &nbsp;•&nbsp; USE DISPOSABLE WALLETS ONLY &nbsp;•&nbsp; SCAM TEST &nbsp;•&nbsp; DO NOT SEND REAL FUNDS &nbsp;•&nbsp; USE DISPOSABLE WALLETS ONLY &nbsp;•&nbsp;
				{/each}
			</span>
		</div>

		<div class="detail-card" data-card="radius-8 padding-5">
			<div class="scam-badge" aria-label="Scam test warning">☠️ SCAM TEST ☠️</div>
			<header data-row="gap-2 start wrap">
				<div data-column="gap-1">
					<h3>{selectedTest.name}</h3>
					{#if selectedTest.description}
						<p class="body-text">{selectedTest.description}</p>
					{/if}
				</div>
				{#if txHash}
					<button
						type="button"
						class="explorer-link"
						onclick={() => onOpenInExplorer(txHash)}
						title="View on Etherscan"
					>
						&#8599;
					</button>
				{/if}
			</header>

			<div data-column="gap-4">
				{#if selectedTest.requirements && selectedTest.requirements.length > 0}
					<div class="requirements-box">
						<h4 class="requirements-title">Requirements:</h4>
						<ul class="requirements-list">
							{#each selectedTest.requirements as requirement (requirement)}
								<li>{requirement}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if isWalletOwn}
					<div class="detail-section">
						<label class="detail-label" for="custom-address">Address to Send To:</label>
						<input
							id="custom-address"
							type="text"
							class="address-input"
							class:error={!!customAddressError}
							placeholder="0x…"
							bind:value={customAddress}
							oninput={() => { customAddressError = ''; }}
						/>
						{#if customAddressError}
							<span class="address-error">{customAddressError}</span>
						{/if}
					</div>
				{:else}
					<div class="detail-section">
						<span class="detail-label">Address:</span>
						<code class="detail-code">{selectedTest.contractAddress}</code>
					</div>
				{/if}

				{#if selectedTest.value !== undefined}
					<div class="detail-section">
						<span class="detail-label">Value Sent:</span>
						<span class="value-badge">0.0001 ETH</span>
					</div>
				{/if}

				<div class="detail-section">
					<span class="detail-label">Risk Type:</span>
					<span class="risk-badge risk-{selectedTest.riskType}">
						{getRiskLabel(selectedTest.riskType)}
					</span>
				</div>

				{#if isSignature && selectedTest.messageData}
					<div class="detail-section">
						<span class="detail-label">Permit Details:</span>
						<div class="permit-details">
							<div class="permit-row">
								<span class="permit-key">spender</span>
								<code class="permit-value">{selectedTest.messageData.spender}</code>
							</div>
							<div class="permit-row">
								<span class="permit-key">value</span>
								<code class="permit-value">2<sup>256</sup>&minus;1 (infinite)</code>
							</div>
							<div class="permit-row">
								<span class="permit-key">deadline</span>
								<code class="permit-value">{new Date(Number(selectedTest.messageData.deadline) * 1000).toLocaleDateString()} (~5 years)</code>
							</div>
							<div class="permit-row">
								<span class="permit-key">chainId</span>
								<code class="permit-value">{selectedTest.domain?.chainId} (Mainnet)</code>
							</div>
						</div>
					</div>
				{/if}

				<div class="detail-section">
					<span class="detail-label">Expected Wallet Behavior:</span>
					<p class="expected-behavior">{selectedTest.expectedBehavior}</p>
				</div>

				<div class="warning-box">
					<p class="warning-text">
						<strong>&#9888;&#65039; WARNING:</strong> This page is for testing only. Do NOT send real transactions.
					</p>
				</div>

				<button
					type="button"
					data-pressable
					onclick={handleAction}
					disabled={!account?.address || isPending}
				>
					{#if isPending}
						Preparing...
					{:else if isSignature}
						{sigResult ? 'Signed' : 'Sign Message (Testing Only)'}
					{:else if txHash}
						Transaction Sent
					{:else if selectedTest.value !== undefined}
						Send 0.0001 ETH (Testing Only)
					{:else}
						Send Transaction (Testing Only)
					{/if}
				</button>

				{#if txHash}
					<div class="result-box">
						<span class="result-label">Transaction Hash:</span>
						<button type="button" class="result-link" onclick={() => onOpenInExplorer(txHash)}>
							{txHash} &#8599;
						</button>
					</div>
				{/if}

				{#if sigResult}
					<div class="result-box">
						<span class="result-label">Signature:</span>
						<code class="result-sig">{sigResult}</code>
					</div>
				{/if}
			</div>
		</div>

		<div class="scam-footer" aria-hidden="true">
			☠️ EVERY TRANSACTION ON THIS TAB IS A SCAM TEST — DO NOT SEND REAL FUNDS ☠️
		</div>
	</div>
{/if}

<style>
	.disclaimer-fullscreen {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
	}

	.disclaimer-overlay {
		border: 2px solid var(--rating-fail);
		background: var(--background-primary);
		max-width: 36rem;
		width: 90%;
		max-height: 90vh;
		overflow-y: auto;
	}

	.disclaimer-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		max-width: 32rem;
		margin: 0 auto;
	}

	.disclaimer-icon {
		font-size: 3rem;
		color: var(--rating-fail);
	}

	.disclaimer-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--rating-fail);
		margin: 0;
	}

	.disclaimer-warnings {
		width: 100%;
	}

	.disclaimer-rule {
		font-size: 0.95rem;
		color: var(--text-primary);
		margin: 0;
		padding: 0.75rem;
		background: color-mix(in srgb, var(--rating-fail) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--rating-fail) 25%, transparent);
		border-radius: 0.5rem;
	}

	.disclaimer-checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.disclaimer-checkbox input {
		width: 1.1rem;
		height: 1.1rem;
		cursor: pointer;
		appearance: auto;
		accent-color: var(--rating-fail);
	}

	.disclaimer-button {
		background-color: var(--rating-fail);
		color: white;
		font-weight: 600;
		padding: 0.7em 2em;
		border: none;
		border-radius: 0.5em;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.disclaimer-button:hover:not(:disabled) {
		opacity: 0.9;
	}

	.disclaimer-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* ── Scam zone wrapper ─────────────────────────────────────────────────── */
	.scam-zone {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background-color: #cc0000;
		/* Tiled diagonal "SCAM TEST" watermark rendered as an inline SVG data URI */
		/* cspell:disable-next-line */
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='80'%3E%3Ctext x='10' y='55' font-family='monospace' font-size='20' font-weight='900' fill='rgba(255%2C255%2C255%2C0.1)' transform='rotate(-20 110 40)'%3ESCAM TEST%3C/text%3E%3C/svg%3E");
		background-repeat: repeat;
		padding: 0.75rem;
		border-radius: 0.5rem;
		border: 3px solid #ff0000;
		overflow: hidden;
		min-width: 0;
	}

	/* Scrolling ticker — inner is position:absolute so it can't affect parent width */
	.scam-ticker {
		position: relative;
		overflow: hidden;
		height: 2.1rem;
		background: #8b0000;
		border-radius: 0.25rem;
	}

	.scam-ticker-inner {
		position: absolute;
		top: 50%;
		transform: translateY(-50%) translateX(0);
		white-space: nowrap;
		color: white;
		font-weight: 900;
		font-size: 0.85rem;
		letter-spacing: 0.05em;
		animation: scam-scroll 22s linear infinite;
	}

	@keyframes scam-scroll {
		from { transform: translateY(-50%) translateX(0); }
		to   { transform: translateY(-50%) translateX(-50%); }
	}

	/* "☠️ SCAM TEST ☠️" badge inside the card */
	.scam-badge {
		font-size: 0.8rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		color: #cc0000;
		text-align: center;
		padding: 0.35rem;
		margin-bottom: 0.5rem;
		background: color-mix(in srgb, #cc0000 10%, transparent);
		border: 1px dashed #cc0000;
		border-radius: 0.25rem;
	}

	/* Override card background so content stays readable */
	.scam-zone .detail-card {
		background: var(--background-primary);
		border: 2px solid #cc0000;
	}

	/* Footer banner */
	.scam-footer {
		background: #8b0000;
		color: white;
		font-weight: 900;
		font-size: 0.85rem;
		letter-spacing: 0.05em;
		text-align: center;
		padding: 0.5rem;
		border-radius: 0.25rem;
	}

	/* ── End scam zone ──────────────────────────────────────────────────────── */

	.detail-card h3 {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0 0 0.5rem 1rem;
	}

	.body-text {
		font-size: 0.9rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.explorer-link {
		background: transparent;
		border: none;
		color: var(--accent);
		font-size: 1.2rem;
		cursor: pointer;
		padding: 0.25rem;
		margin-left: auto;
	}

	.explorer-link:hover {
		opacity: 0.8;
	}

	.requirements-box {
		padding: 1rem;
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		border-radius: 0.5rem;
	}

	.requirements-title {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--accent);
		margin: 0 0 0.75rem 0;
	}

	.requirements-list {
		margin: 0;
		padding-left: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.requirements-list li {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.detail-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.detail-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.detail-code {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		font-size: 0.8rem;
		background-color: var(--background-secondary);
		padding: 0.75rem;
		border-radius: 0.5rem;
		word-break: break-all;
		overflow-wrap: break-word;
		color: var(--text-primary);
		display: block;
		min-width: 0;
	}

	.address-input {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		font-size: 0.85rem;
		background-color: var(--background-secondary);
		color: var(--text-primary);
		border: 1px solid var(--background-secondary);
		border-radius: 0.5rem;
		padding: 0.75rem;
		width: 100%;
		box-sizing: border-box;
		outline: none;
		transition: border-color 0.15s;
	}

	.address-input:focus {
		border-color: var(--accent);
	}

	.address-input.error {
		border-color: var(--rating-fail);
	}

	.address-error {
		font-size: 0.8rem;
		color: var(--rating-fail);
	}

	.permit-details {
		background: var(--background-secondary);
		border-radius: 0.5rem;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.permit-row {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		min-width: 0;
	}

	.permit-key {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		min-width: 5rem;
	}

	.permit-value {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		font-size: 0.8rem;
		color: var(--text-primary);
		word-break: break-all;
		overflow-wrap: break-word;
		min-width: 0;
	}

	.value-badge {
		display: inline-block;
		padding: 0.3em 0.75em;
		border-radius: 0.4em;
		font-size: 0.8rem;
		font-weight: 600;
		width: fit-content;
		background: color-mix(in srgb, var(--rating-partial) 15%, transparent);
		color: var(--rating-partial);
		border: 1px solid color-mix(in srgb, var(--rating-partial) 40%, transparent);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
	}

	.risk-badge {
		display: inline-block;
		padding: 0.3em 0.75em;
		border-radius: 0.4em;
		font-size: 0.8rem;
		font-weight: 600;
		width: fit-content;
	}

	.risk-badge.risk-recent-deploy {
		background: color-mix(in srgb, #f59e0b 15%, transparent);
		color: #f59e0b;
		border: 1px solid color-mix(in srgb, #f59e0b 40%, transparent);
	}

	.risk-badge.risk-previous-interaction {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
	}

	.risk-badge.risk-known-scam {
		background: color-mix(in srgb, var(--rating-fail) 15%, transparent);
		color: var(--rating-fail);
		border: 1px solid color-mix(in srgb, var(--rating-fail) 40%, transparent);
	}

	.risk-badge.risk-allow-infinite {
		background: color-mix(in srgb, #a855f7 15%, transparent);
		color: #a855f7;
		border: 1px solid color-mix(in srgb, #a855f7 40%, transparent);
	}

	.expected-behavior {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin: 0;
		padding: 0.75rem;
		background: color-mix(in srgb, var(--background-secondary) 50%, transparent);
		border: 1px solid var(--background-secondary);
		border-radius: 0.5rem;
	}

	.warning-box {
		padding: 0.75rem;
		background: color-mix(in srgb, var(--rating-fail) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--rating-fail) 30%, transparent);
		border-radius: 0.5rem;
	}

	.warning-text {
		font-size: 0.8rem;
		color: var(--rating-fail);
		margin: 0;
		text-align: center;
	}

	.result-box {
		padding: 0.75rem;
		background: var(--background-secondary);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		border-radius: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.result-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.result-link {
		background: transparent;
		border: none;
		color: var(--accent);
		font-size: 0.8rem;
		cursor: pointer;
		text-align: left;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		word-break: break-all;
		overflow-wrap: break-word;
		min-width: 0;
	}

	.result-link:hover {
		opacity: 0.8;
	}

	.result-sig {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		font-size: 0.8rem;
		color: var(--text-primary);
		word-break: break-all;
		overflow-wrap: break-word;
		min-width: 0;
	}
</style>
