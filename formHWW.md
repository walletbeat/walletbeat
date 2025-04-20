Hardware Wallet Evaluation Criteria

This document is structured using the WalletBeat format for evaluating hardware wallets. Each section defines a single attribute with markdown headers and WalletBeat-compatible fields.

Reputation

This section provides an aggregate rating for a hardware wallet's reputation based on the following sub-criteria:

Original Product Design

Product Availability

Warranty and Support Risk

Vulnerability Disclosure History

Bug Bounty Program

Each sub-section receives an individual rating, and the overall Reputation score is calculated as the lowest score among these criteria unless otherwise justified.

Original Product Design

attributeCategory: transparency

ID: original-product

Display Name: Original Product Design

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} is based on [original/custom/third-party] hardware and software.

Product Availability

attributeCategory: ecosystem

ID: availability

Display Name: Product Availability

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} is [readily/intermittently/not] available.

Warranty and Support Risk

attributeCategory: maintenance

ID: warranty-support-risk

Display Name: Warranty and Support Risk

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [has/has limited/lacks] reliable support and warranty enforcement.

Vulnerability Disclosure History

attributeCategory: security

ID: disclosure-history

Display Name: Vulnerability History and Disclosure

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [has/has limited/lacks] a public disclosure record.

Bug Bounty Program

attributeCategory: security

ID: bug-bounty

Display Name: Bug Bounty Program

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [offers/partially offers/does not offer] a bug bounty program.

Supply Chain (Pre-built or Non-DIY)

This section provides an aggregate rating for supply chain integrity and tamper resistance, based on:

Manufacturing OPSEC Documentation

OPSEC Audit Frequency

Tamper Evidence in Packaging

Hardware Transparency

Tamper Resistance Features

Genuine Check Mechanism

Each sub-criterion receives an individual rating, and the overall Supply Chain score is computed from the worst rating unless otherwise justified.

Factory-Level OPSEC Documentation

attributeCategory: security

ID: factory-opsec-docs

Display Name: Manufacturing OPSEC Documentation

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [documents/lacks documentation of] factory-level security.

Factory-Level OPSEC Verification

attributeCategory: security

ID: factory-opsec-audit

Display Name: Factory OPSEC Verification

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [regularly undergoes/occasionally undergoes/does not undergo] external OPSEC audits.

Tamper Evidence in Packaging

attributeCategory: security

ID: tamper-evidence

DisplayName: Tamper Evidence Packaging

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [uses glitter tape, tamper mesh, etc./uses tamper seals only/has no tamper indicators].

Hardware Transparency and Verification

attributeCategory: transparency

ID: hardware-verification

Display Name: Hardware Transparency

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [has a BOM/transparent case/easy teardown] or [lacks these features].

Tamper Resistance Mechanism

attributeCategory: security

ID: tamper-resistance

Display Name: Tamper Resistance Design

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [includes/partially includes/does not include] tamper detection (mesh, coatings, sensors).

Genuine Check

attributeCategory: security

ID: genuine-check

Display Name: Device Authenticity Verification

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [allows/prevents] verifying device authenticity before sensitive operations.

Factory-Level OPSEC Documentation

attributeCategory: security

ID: factory-opsec-docs

Display Name: Manufacturing OPSEC Documentation

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [documents/lacks documentation of] factory-level security.

Factory-Level OPSEC Verification

attributeCategory: security

ID: factory-opsec-audit

Display Name: Factory OPSEC Verification

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [regularly undergoes/occasionally undergoes/does not undergo] external OPSEC audits.

Tamper Evidence in Packaging

attributeCategory: security

ID: tamper-evidence

Display Name: Tamper Evidence Packaging

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [uses glitter tape, tamper mesh, etc./uses tamper seals only/has no tamper indicators].

Hardware Transparency and Verification

attributeCategory: transparency

ID: hardware-verification

Display Name: Hardware Transparency

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [has a BOM/transparent case/easy teardown] or [lacks these features].

Tamper Resistance Mechanism

attributeCategory: security

ID: tamper-resistance

Display Name: Tamper Resistance Design

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [includes/partially includes/does not include] tamper detection (mesh, coatings, sensors).

Genuine Check

attributeCategory: security

ID: genuine-check

Display Name: Device Authenticity Verification

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [allows/prevents] verifying device authenticity before sensitive operations.

Supply Chain (DIY)

Component Availability Without NDA

attributeCategory: self-sovereignty

ID: diy-no-nda

Display Name: NDA-Free Components

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [requires/does not require] NDAs to source components.

Regional Sourcing Flexibility

attributeCategory: self-sovereignty

ID: component-sourcing-complexity

Display Name: Component Sourcing Flexibility

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [can/cannot] be sourced from multiple suppliers globally.

Keys Handling

This section provides an aggregate rating for key generation, protection, and handling, based on the following sub-criteria:

Interoperable Master Secret Generation

Proprietary Key Handling Mechanisms

Key Transmission and Isolation

Physical Attack Resistance (Active and Passive)

Each sub-section receives an individual rating, and the overall Keys Handling score is computed from the worst rating unless otherwise justified.

Master Secret Interoperability

attributeCategory: self-sovereignty

ID: master-secret-generation

Display Name: Interoperable Secret Generation

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [follows/partially follows/does not follow] open secret generation standards.

Proprietary Key Handling Mechanisms

attributeCategory: security

ID: proprietary-key-mechanisms

Display Name: Proprietary Key Handling

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [uses/avoids] proprietary mechanisms that affect security.

Key Visibility and Protection

attributeCategory: security

ID: key-transmission

Display Name: Key Visibility and Isolation

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [transmits/never transmits] secrets externally.

Active/Passive Attack Resistance

attributeCategory: security

ID: physical-attack-resistance

Display Name: Physical Attack Resistance

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [includes/lacks] protections against side-channel and fault injection attacks.

Firmware

This section provides an aggregate rating for firmware security and openness based on the following sub-criteria:

Silent Update Resistance

Firmware Open Source Status

Reproducible Builds

Custom Firmware Support

Each sub-section receives an individual rating, and the overall Firmware score is derived from the lowest-rated component unless otherwise justified.

Silent Update Resistance

attributeCategory: security

ID: silent-update-protection

Display Name: Silent Update Protection

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [requires user approval for updates / allows forced updates].

Firmware Open Source Status

attributeCategory: transparency

ID: firmware-open-source

Display Name: Firmware Source Code

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} firmware is [fully/partially/not] open source.

Build Reproducibility

attributeCategory: transparency

ID: reproducible-builds

Display Name: Reproducible Builds

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [supports/does not support] reproducible builds.

Custom Firmware Loading

attributeCategory: self-sovereignty

ID: custom-firmware

Display Name: Custom Firmware Support

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [allows/partially allows/blocks] custom firmware with integrity validation.

Hardware Privacy

Phoning Home

attributeCategory: privacy

ID: phoning-home

Display Name: Setup & Operation Privacy

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [does/does not] contact vendor services during setup or usage.

Inspectability of Remote Calls

attributeCategory: privacy

ID: inspectable-remote-calls

Display Name: Inspectability of Phoning Home

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [provides/does not provide] visibility into data sent to servers.

Wireless Communication Security

attributeCategory: privacy

ID: wireless-privacy

Display Name: Wireless Communication Protection

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [encrypts/lacks encryption for] wireless (BLE, WiFi) transmissions.

Interoperability

Third-Party Wallet Compatibility

attributeCategory: ecosystem

ID: third-party-compatibility

Display Name: Third-Party Wallet Compatibility

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [works/partially works/does not work] with independent wallets.

Supplier Independence During Usage

attributeCategory: privacy

ID: no-supplier-linkage

Display Name: Supplier Independence

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [avoids/leaks] identifying metadata to the supplier.

Ecosystem Alignment

EIP-1559 Support

attributeCategory: ecosystem

ID: eip1559-support

Display Name: EIP-1559 Support

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [supports/does not support] EIP-1559.

EIP-7702 Support

attributeCategory: ecosystem

ID: eip7702-support

Display Name: EIP-7702 Support

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [supports/does not support] EIP-7702 smart contract delegation.

EIP-4337 Support

attributeCategory: ecosystem

ID: eip4337-support

Display Name: EIP-4337 UserOperation Support

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [supports/does not support] account abstraction and third-party bundlers.
User Safety

This section provides an aggregate rating for user-facing transaction clarity and protection mechanisms, based on:

Human-Readable Address Display

Contract Identification

TX and EIP-712 Parameter Display

Risk Analysis and Simulation Features

Human-Readable Addresses

attributeCategory: user-safety

ID: readable-address

Display Name: Human Readable Address Display

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [shows/does not show] ENS names and raw address comparison.

Contract Identification

attributeCategory: user-safety

ID: contract-labeling

Display Name: Known Contract Identification

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [provides/does not provide] verified contract labels for users.

Raw Transaction Parameter Review

attributeCategory: user-safety

ID: raw-tx-review

Display Name: Raw TX Parameter Review

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [shows/hides] full transaction calldata and raw parameters.

Human-Readable TX Parameters

attributeCategory: user-safety

ID: readable-tx

Display Name: Human Readable TX Parameter Display

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [displays/does not display] readable TX parameter summaries.

TX Parameter Coverage and Extensibility

attributeCategory: user-safety

ID: tx-coverage-extensibility

Display Name: TX Parameter Coverage & Extensibility

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [supports/lacks] extensive coverage and user-extensible parsing.

Expert Mode for TX Review

attributeCategory: user-safety

ID: tx-expert-mode

Display Name: Expert Mode for TX Review

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [has/does not have] a fast-scan mode with raw+summarized info.

EIP-712 Raw Parameter Review

attributeCategory: user-safety

ID: raw-eip712

Display Name: Raw EIP-712 Review

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [displays/does not display] raw data fields for EIP-712 messages.

EIP-712 Readable Display

attributeCategory: user-safety

ID: readable-eip712

Display Name: Human Readable EIP-712 Parameters

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [displays/does not display] readable info for EIP-712 messages.

EIP-712 Coverage and Extensibility

attributeCategory: user-safety

ID: eip712-coverage-extensibility

Display Name: EIP-712 Coverage & Extensibility

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [has/lacks] deep support and customization for typed data.

Expert Mode for EIP-712 Review

attributeCategory: user-safety

ID: eip712-expert-mode

Display Name: Expert Mode for EIP-712 Review

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [has/does not have] a trusted-screen review mode for EIP-712.

Risk Analysis Support

attributeCategory: user-safety

ID: risk-analysis

Display Name: Risk Analysis Support

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [performs/does not perform] risk scoring for signatures.

Risk Analysis Without Phoning Home

attributeCategory: user-safety

ID: risk-analysis-local

Display Name: Local Risk Analysis Capability

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [can/cannot] perform threat checks without internet.

Fully Local Risk Analysis

attributeCategory: user-safety

ID: fully-local-risk-analysis

Display Name: Fully Local Risk Analysis

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [includes/does not include] offline threat engines.

Transaction Simulation Support

attributeCategory: user-safety

ID: tx-simulation

Display Name: Transaction Simulation Support

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [simulates/does not simulate] transaction outcomes.

TX Simulation Without Phoning Home

attributeCategory: user-safety

ID: tx-simulation-local

Display Name: Local TX Simulation

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [can/cannot] simulate transactions without internet.

Fully Local TX Simulation

attributeCategory: user-safety

ID: fully-local-tx-simulation

Display Name: Fully Local TX Simulation

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [includes/does not include] local simulators for signatures.

Maintenance

This section provides an aggregate rating for long-term usability and maintainability based on the following sub-criteria:

Physical Ruggedness

MTBF Documentation

Repairability

Battery Handling

Warranty and Extension Options

Each sub-section receives an individual rating, and the overall Maintenance score is computed from the lowest score unless otherwise justified.

Physical Durability

attributeCategory: maintenance

ID: ruggedness

Display Name: Physical Ruggedness

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} is [built to withstand/fragile in] typical portable use.

MTBF Documentation

attributeCategory: maintenance

ID: mtbf-doc

Display Name: MTBF Documentation

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [documents/does not document] its expected reliability.

Repairability

attributeCategory: maintenance

ID: repairability

Display Name: Repairability and Replacement

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [is/is not] designed to be repaired without affecting security.

Battery Handling

attributeCategory: maintenance

ID: battery

Display Name: Battery Handling

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} [has a replaceable/embedded] battery and [continues/fails] to work when discharged.

Warranty and Extensions

attributeCategory: maintenance

ID: warranty-extension

Display Name: Warranty and Extension Options

Rating: PASS / PARTIAL / FAIL

Short Explanation: ${walletMetadata.displayName} offers [reasonable/extensive/limited or no] warranty coverage.

So I would move the 