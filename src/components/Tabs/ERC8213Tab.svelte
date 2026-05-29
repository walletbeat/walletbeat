<script lang="ts">
  import { concat, hashTypedData, keccak256, numberToHex, toBytes } from 'viem'
  import { hashStruct } from 'viem/utils'

  export type ERC8213SubTab = 'calldata' | 'eip712'

  interface Props {
    activeSubTab: ERC8213SubTab
  }

  let { activeSubTab }: Props = $props()

  // -------------------------------------------------------------------
  // Calldata state
  // -------------------------------------------------------------------

  const calldataState = $state({
    input: '0x095ea7b300000000000000000000000087870bca3f3fd6335c3f4ce8392d69350b4fa4e200000000000000000000000000000000000000000000000000000000000f4240',
    digest: '' as string,
    error: '',
  })

  function computeCalldataDigest() {
    calldataState.error = ''
    calldataState.digest = ''
    let hex = calldataState.input.trim()

    if (!hex.startsWith('0x')) { hex = '0x' + hex; }

    if (!/^0x[0-9a-fA-F]*$/.test(hex)) {
      calldataState.error = 'Invalid hex input — must be a 0x-prefixed hex string.'

      return
    }

    try {
      const calldataBytes = toBytes(hex)
      // ERC-8213: keccak256(len(calldata) ‖ calldata), length as 32-byte big-endian
      const lenWord = toBytes(numberToHex(calldataBytes.length, { size: 32 }))

      calldataState.digest = keccak256(concat([lenWord, calldataBytes]))
    } catch (e) {
      calldataState.error = e instanceof Error ? e.message : 'Failed to compute digest.'
    }
  }

  // -------------------------------------------------------------------
  // EIP-712 state — single JSON input (eth_signTypedData_v4 format)
  // -------------------------------------------------------------------

  const eip712State = $state({
    json: `{
  "types": {
    "Person": [
      { "name": "name",   "type": "string"  },
      { "name": "wallet", "type": "address" }
    ],
    "Mail": [
      { "name": "from",     "type": "Person" },
      { "name": "to",       "type": "Person" },
      { "name": "contents", "type": "string" }
    ]
  },
  "domain": {
    "name": "Ether Mail",
    "version": "1",
    "chainId": 1,
    "verifyingContract": "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
  },
  "primaryType": "Mail",
  "message": {
    "from":     { "name": "Cow", "wallet": "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826" },
    "to":       { "name": "Bob", "wallet": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB" },
    "contents": "Hello, Bob!"
  }
}`,
    primaryType: '' as string,
    domainSeparator: '' as string,
    messageHash: '' as string,
    fullDigest: '' as string,
    error: '',
  })

  function computeEip712Hash() {
    eip712State.error = ''
    eip712State.domainSeparator = ''
    eip712State.messageHash = ''
    eip712State.fullDigest = ''
    eip712State.primaryType = ''

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- user-supplied JSON
      const parsed = JSON.parse(eip712State.json) as Parameters<typeof hashTypedData>[0]
      const { types, domain, primaryType, message } = parsed

      if (!primaryType) { throw new Error('Missing "primaryType" in JSON.'); }

      if (!types) { throw new Error('Missing "types" in JSON.'); }

      if (!domain) { throw new Error('Missing "domain" in JSON.'); }

      if (!message) { throw new Error('Missing "message" in JSON.'); }

      // Build EIP712Domain type from whichever fields are present in domain
      const domainFields: { name: string; type: string }[] = []

      if (domain.name !== undefined) { domainFields.push({ name: 'name', type: 'string' }); }

      if (domain.version !== undefined) { domainFields.push({ name: 'version', type: 'string' }); }

      if (domain.chainId !== undefined) { domainFields.push({ name: 'chainId', type: 'uint256' }); }

      if (domain.verifyingContract !== undefined) { domainFields.push({ name: 'verifyingContract', type: 'address' }); }

      if (domain.salt !== undefined) { domainFields.push({ name: 'salt', type: 'bytes32' }); }

      eip712State.primaryType = primaryType
      eip712State.domainSeparator = hashStruct({
         
        data: domain as Record<string, unknown>,
        types: { EIP712Domain: domainFields },
        primaryType: 'EIP712Domain',
      })
      eip712State.messageHash = hashStruct({ data: message, types, primaryType })
      eip712State.fullDigest = hashTypedData({ domain, types, primaryType, message })
    } catch (e) {
      eip712State.error = e instanceof Error ? e.message : 'Failed to compute EIP-712 hash.'
    }
  }
</script>

{#if activeSubTab === 'calldata'}
  <div class="tab-content" data-column="gap-5">
    <div data-column="gap-2">
      <h3 class="section-title">Calldata digest</h3>
      <p class="section-desc">
        ERC-8213 specifies <code>keccak256(len(calldata) ‖ calldata)</code> — the 32-byte
        big-endian length word prepended before the raw calldata — so users can verify the
        transaction data is unmodified. Paste any calldata hex below.
      </p>
    </div>

    <div data-column="gap-3">
      <label class="field-label" for="calldata-input">Raw calldata (hex)</label>
      <textarea
        id="calldata-input"
        class="code-input"
        rows="4"
        spellcheck="false"
        bind:value={calldataState.input}
      ></textarea>
      <button type="button" data-pressable onclick={computeCalldataDigest}>
        Compute digest
      </button>
    </div>

    {#if calldataState.error}
      <p class="error-text">{calldataState.error}</p>
    {/if}

    {#if calldataState.digest}
      <div class="result-card" data-column="gap-3">
        <div data-column="gap-1">
          <span class="result-label">Calldata digest — <code>keccak256(len ‖ calldata)</code></span>
          <code class="hash-value">{calldataState.digest}</code>
        </div>
        <p class="result-note">
          A wallet with ERC-8213 support should show this hash alongside or instead of raw hex,
          so the user can independently verify the calldata is unmodified.
        </p>
      </div>
    {/if}
  </div>
{:else}
  <div class="tab-content" data-column="gap-5">
    <div data-column="gap-2">
      <h3 class="section-title">EIP-712 typed data digest</h3>
      <p class="section-desc">
        ERC-8213 requires wallets to show the final
        <code>keccak256("\x19\x01" ‖ domainSeparator ‖ hashStruct(message))</code>
        so users can verify typed-data signatures without trusting the dApp.
      </p>
    </div>

    <div data-column="gap-3">
      <div data-column="gap-1">
        <label class="field-label" for="eip712-input">
          Typed data JSON (<code>eth_signTypedData_v4</code> format)
        </label>
        <textarea
          id="eip712-input"
          class="code-input"
          rows="28"
          spellcheck="false"
          bind:value={eip712State.json}
        ></textarea>
      </div>

      <button type="button" data-pressable onclick={computeEip712Hash}>
        Compute EIP-712 digest
      </button>
    </div>

    {#if eip712State.error}
      <p class="error-text">{eip712State.error}</p>
    {/if}

    {#if eip712State.fullDigest}
      <div class="result-card" data-column="gap-4">
        <div data-column="gap-1">
          <span class="result-label">Domain separator — <code>hashStruct(EIP712Domain)</code></span>
          <code class="hash-value">{eip712State.domainSeparator}</code>
        </div>
        <div data-column="gap-1">
          <span class="result-label">Message hash — <code>hashStruct({eip712State.primaryType})</code></span>
          <code class="hash-value">{eip712State.messageHash}</code>
        </div>
        <div data-column="gap-1">
          <span class="result-label">
            Full EIP-712 digest — <code>keccak256("\x19\x01" ‖ domainSep ‖ msgHash)</code>
          </span>
          <code class="hash-value highlight">{eip712State.fullDigest}</code>
        </div>
        <p class="result-note">
          A wallet with ERC-8213 support should display the full digest when asking the user to
          approve a typed-data signature, so it can be verified independently of the dApp.
        </p>
      </div>
    {/if}
  </div>
{/if}

<style>
  .tab-content {
    width: 100%;
  }

  .section-title {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }

  .section-desc {
    font-size: 0.875rem;
    color: var(--text-secondary);
    max-width: 42rem;
    margin: 0;
    line-height: 1.5;
  }

  .field-label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .code-input {
    width: 100%;
    font-family: monospace;
    font-size: 0.8rem;
    padding: 0.6rem 0.75rem;
    background: var(--background-secondary);
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    color: var(--text-primary);
    resize: vertical;
    box-sizing: border-box;
  }

  .code-input.single-line {
    resize: none;
  }

  .code-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .result-card {
    background: var(--background-secondary);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    padding: 1rem 1.25rem;
  }

  .result-label {
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .hash-value {
    font-size: 0.8rem;
    word-break: break-all;
    color: var(--text-primary);
    display: block;
  }

  .hash-value.highlight {
    color: var(--accent, #3b82f6);
    font-weight: 600;
  }

  .result-note {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
  }

  .error-text {
    font-size: 0.85rem;
    color: var(--rating-fail, #ef4444);
    margin: 0;
  }

  button[data-pressable] {
    align-self: flex-start;
    min-width: 0;
    background-color: var(--accent-color, #3b82f6);
    color: white;
    font-weight: 500;
    padding: 0.6em 1.2em;
    border: none;
    border-radius: 0.5em;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: background-color 0.15s ease, box-shadow 0.15s ease;

    &:hover {
      background-color: color-mix(in srgb, var(--accent-color, #3b82f6) 85%, black);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }
  }
</style>
