# Criteria Evaluation Form Template

- **attributeCategory**: e.g security or ecosystem "src/schema/attributes"
- **ID**: example_criteria
- **Display Name**: Example Criteria
- **Rating**: PASS/PARTIAL/FAIL
- **Short Explanation**: ${walletMetadata.displayName} implements [feature] using [implementation details].

## Details
${walletMetadata.displayName} implements [feature] using [specific details about implementation]. This [explains why this implementation is good/bad/partial] and provides [benefits/drawbacks] for users.
The implementation uses ${libraryUrl} which is [describe qualities of the library/technology - e.g., "well-audited", "gas-efficient", etc.].


## How To Improve
${walletMetadata.displayName} could improve its implementation by [specific recommendations]:
- Consider upgrading to [better alternative] for [specific benefit]
- Implement [additional feature] to enhance [specific aspect]
- Fix [specific issue] to address [specific concern]

## Rating Criteria

### Pass (Best)
The wallet implements [feature] using [optimal implementation], which provides [specific benefits like security, efficiency, etc.]. This implementation is [describe positive qualities - e.g., "well-audited", "most gas-efficient", etc.].

### Partial
The wallet implements [feature] using [acceptable but suboptimal implementation]. While this provides basic functionality, it [describe limitations or concerns].

### Fail
${walletMetadata.displayName} does not implement [feature] or uses an implementation that [describe critical issues]. This creates [specific risks or problems] for users.

---

# Hardware Wallet Specific Criteria

## Bug Bounty Program

- **attributeCategory**: security 
- **ID**: Bug Bounty Program
- **Display Name**: Bug Bounty Program
- **Rating**: PASS/PARTIAL/FAIL
- **Short Explanation**: ${walletMetadata.displayName} implements [feature] using [implementation details].
- **WalletType**: Hardware wallet

## Details
${walletMetadata.displayName} implements [feature] using [specific details about implementation]. This [explains why this implementation is good/bad/partial] and provides [benefits/drawbacks] for users.

The implementation uses ${libraryUrl} which is [describe qualities of the library/technology - e.g., "well-audited", "gas-efficient", etc.].


## How To Improve
${walletMetadata.displayName} could improve its implementation by:
- Offering customer an upgrade path to another device for security purposes.
- Fix the vulnerabilities to address and/or implement a bug bounty program

## Bug bounty program

### Pass (Best)
The wallet implements a bounty program using its own security department or a third party provider, which provides incentives for security researchers. This implementation is [describe positive qualities - e.g., "well-audited", "most gas-efficient", etc.].

### Partial
The wallet implements a disclosure policy but doesn't disclose a reward or bounty program. While this provides basic functionality, it doesn't incentivize security researchers to attack.

### Fail
${walletMetadata.displayName} does not implement a bug bounty and doesn't provide security updates. Or use a wallet that has an unpatchable critical vulnerability. This creates a high risk for users.
