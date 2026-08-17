import type { WithRef } from '@/schema/reference'

import type { CalendarDate } from '../date'

/**
 * Status of a security incident or vulnerability affecting a wallet
 */
export enum IncidentStatus {
	/** Incident is currently active and affecting users */
	ONGOING = 'ONGOING',
	/** Incident has been partially addressed but not fully resolved */
	MITIGATED = 'MITIGATED',
	/** Incident has been completely resolved */
	RESOLVED = 'RESOLVED',
	/** Incident details or severity are disputed by the wallet team */
	DISPUTED = 'DISPUTED',
}

export const incidentStatuses = {
	[IncidentStatus.RESOLVED]: {
		label: 'Resolved',
		icon: (await import('lucide-static/icons/shield-check.svg?raw')).default,
		color: '#10b981',
	},
	[IncidentStatus.MITIGATED]: {
		label: 'Mitigated',
		icon: (await import('lucide-static/icons/shield-alert.svg?raw')).default,
		color: '#f59e0b',
	},
	[IncidentStatus.ONGOING]: {
		label: 'Ongoing',
		icon: (await import('lucide-static/icons/triangle-alert.svg?raw')).default,
		color: '#ef4444',
	},
	[IncidentStatus.DISPUTED]: {
		label: 'Disputed',
		icon: (await import('lucide-static/icons/info.svg?raw')).default,
		color: '#6b7280',
	},
} as const satisfies Record<
	IncidentStatus,
	{
		label: string
		icon: string
		color: string
	}
>

/**
 * Category of security-related news event
 */
export enum NewsType {
	/**
	 * Exploit or attack resulting in theft of cryptocurrency or wallet funds.
	 * Severity:
	 *   - Low: Total loss limited to under 10,000 USD in aggregate.
	 *   - Medium: Total loss limited to under 1,000,000 USD in aggregate.
	 *   - High: Total loss limited to under 10,000,000 USD in aggregate.
	 *   - Critical: Anything higher.
	 */
	HACK = 'HACK',

	/**
	 * Unauthorized exposure of user personal information (not funds).
	 *
	 * Severity:
	 *   - Low: Breach of information unrelated to customers or wallet users, e.g. company employee information.
	 *   - Medium: Breach of customer/user information limited to name and/or email address.
	 *   - High: Breach of customer/user information including phone number, home address, payment information,
	 *           IP addresses, public Ethereum addresses.
	 *           Also includes leakage of customer support chat messages as they typically contain such information.
	 *   - Critical: Breach of user private key material, even if partial (e.g. for MPC wallets).
	 */
	DATA_BREACH = 'DATA_BREACH',

	/**
	 * Discovered security flaw or weakness (may or may not be exploited).
	 *
	 * Severity:
	 *   - Low: Vulnerability with no loss of user funds and no impact on user security or privacy,
	 *          e.g. an exploit by which web apps can remotely cause a wallet user's browser to crash.
	 *   - Medium: Vulnerability with no loss of user funds but has impact on user security or privacy,
	 *             e.g. an exploit that allows web apps to read the user's Ethereum address or other
	 *             information prior to the user consenting it to do so.
	 *   - High: Any vulnerability that allows irrevocable loss of user funds for a subset of wallet users.
	 *   - Critical: Any vulnerability that allows irrevocable loss of user funds for all wallet users.
	 *               Also includes any vulnerability that can be escalated into such loss,
	 *               e.g. a remote code execution exploit that allows an attacker to obtain users' private key.
	 */
	VULNERABILITY = 'VULNERABILITY',

	/**
	 * General security event not covered by other categories.
	 *
	 * Severity rating is determined on a case-by-case basis, in line with the
	 * rough thresholds described in other security event types.
	 */
	INCIDENT = 'INCIDENT',
}

export const newsTypes = {
	[NewsType.HACK]: {
		label: 'Hack',
	},
	[NewsType.DATA_BREACH]: {
		label: 'Data Breach',
	},
	[NewsType.VULNERABILITY]: {
		label: 'Vulnerability',
	},
	[NewsType.INCIDENT]: {
		label: 'Incident',
	},
} as const satisfies Record<
	NewsType,
	{
		label: string
	}
>

/**
 * Severity level of a security incident.
 * Its meaning depends on the NewsType; see above.
 */
export enum Severity {
	/** Critical severity - immediate action required, significant impact */
	CRITICAL = 'CRITICAL',
	/** High severity - serious issue requiring prompt attention */
	HIGH = 'HIGH',
	/** Medium severity - moderate impact */
	MEDIUM = 'MEDIUM',
	/** Low severity - minor impact or informational */
	LOW = 'LOW',
}

export const severities = {
	[Severity.CRITICAL]: {
		label: 'Critical',
		color: '#ef4444',
	},
	[Severity.HIGH]: {
		label: 'High',
		color: '#f59e0b',
	},
	[Severity.MEDIUM]: {
		label: 'Medium',
		color: '#fbbf24',
	},
	[Severity.LOW]: {
		label: 'Low',
		color: '#3b82f6',
	},
} as const satisfies Record<
	Severity,
	{
		label: string
		color: string
	}
>

/**
 * Category of impact from a security incident
 */
export enum ImpactCategory {
	/** Seed phrase or recovery phrase was exposed or leaked */
	SEED_PHRASE_LEAK = 'SEED_PHRASE_LEAK',
	/** Private key was exposed or leaked */
	PRIVATE_KEY_LEAK = 'PRIVATE_KEY_LEAK',
	/** Bug or vulnerability in transaction signing functionality */
	SIGNING_BUG = 'SIGNING_BUG',
	/** Compromise in the software supply chain (dependencies, build process, etc.) */
	SUPPLY_CHAIN = 'SUPPLY_CHAIN',
	/** User privacy data was exposed or leaked */
	PRIVACY_LEAK = 'PRIVACY_LEAK',
	/** Related to phishing attacks or social engineering */
	PHISHING_RELATED = 'PHISHING_RELATED',
	/** Related to attacks and vulnerabilities on hardware (e.g. secure elements). */
	HARDWARE_VULNERABILITY = 'HARDWARE_VULNERABILITY',
	/** A malicious actor manages to become part of a wallet development entity. */
	VENDOR_INFILTRATION = 'VENDOR_INFILTRATION',
	/** Impact category not covered by other types */
	OTHER = 'OTHER',
}

export const impactCategories = {
	[ImpactCategory.SEED_PHRASE_LEAK]: {
		label: 'Seed Phrase Leak',
	},
	[ImpactCategory.PRIVATE_KEY_LEAK]: {
		label: 'Private Key Leak',
	},
	[ImpactCategory.SIGNING_BUG]: {
		label: 'Signing Bug',
	},
	[ImpactCategory.SUPPLY_CHAIN]: {
		label: 'Supply Chain',
	},
	[ImpactCategory.PRIVACY_LEAK]: {
		label: 'Privacy Leak',
	},
	[ImpactCategory.PHISHING_RELATED]: {
		label: 'Phishing Related',
	},
	[ImpactCategory.HARDWARE_VULNERABILITY]: {
		label: 'Hardware Vulnerability',
	},
	[ImpactCategory.VENDOR_INFILTRATION]: {
		label: 'Vendor Infiltration',
	},
	[ImpactCategory.OTHER]: {
		label: 'Other',
	},
} as const satisfies Record<
	ImpactCategory,
	{
		label: string
	}
>

/** Represents a security-related news item about a wallet */
export type WalletSecurityNews = WithRef<{
	/** Identifier slug for the news item */
	slug: string
	/** Category of security event */
	type: NewsType
	/** Severity level of the incident */
	severity: Severity

	/** Display title for the news item */
	title: string
	/** Brief description of the incident */
	summary: string
	/**
	 * Wallet ID(s) affected by this incident.
	 * Empty array indicates a general incident not specific to tracked wallets.
	 */
	wallets: string[]

	/** Details about the impact of the incident */
	impact: {
		/** Whether user funds were affected or at risk */
		fundsImpacted: boolean
		/** Category of impact from the incident */
		category: ImpactCategory
	}

	/** Current status of the incident */
	status: IncidentStatus

	/** Date when the incident occurred or was first disclosed */
	publishedAt: CalendarDate
	/** Date when the news item was last updated */
	updatedAt: CalendarDate
}>
