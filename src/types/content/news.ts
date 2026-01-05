import type { WithRef } from '@/schema/reference'
import type { WalletMetadata } from '@/schema/wallet'

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

/**
 * Category of security-related news event
 */
export enum NewsType {
	/** Security breach resulting in unauthorized access or theft */
	HACK = 'HACK',
	/** Unauthorized access or exposure of user data */
	DATA_BREACH = 'DATA_BREACH',
	/** Discovered security vulnerability or flaw */
	VULNERABILITY = 'VULNERABILITY',
	/** General security incident not covered by other categories */
	INCIDENT = 'INCIDENT',
}

/**
 * Severity level of a security incident
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
	/** Impact category not covered by other types */
	OTHER = 'OTHER',
}

/** Represents a security-related news item about a wallet */
export type WalletSecurityNews = WithRef<{
	/** Identifier name for the news item */
	name: string
	/** Category of security event */
	type: NewsType
	/** Severity level of the incident */
	severity: Severity

	/** Display title for the news item */
	title: string
	/** Brief description of the incident */
	summary: string
	/** Wallet involved */
	wallet: WalletMetadata

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
