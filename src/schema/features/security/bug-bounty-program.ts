import type { WithRef } from '@/schema/reference';

/**
 * Types of bug bounty programs that can be implemented
 */
export enum BugBountyProgramType {
  COMPREHENSIVE = 'COMPREHENSIVE',
  BASIC = 'BASIC',
  DISCLOSURE_ONLY = 'DISCLOSURE_ONLY',
  NONE = 'NONE',
}

/**
 * Information about the bug bounty program implementation
 */
export interface BugBountyProgramSupport {
  /**
   * The type of bug bounty program implemented
   */
  type: BugBountyProgramType;

  /**
   * URL to the bug bounty program details
   */
  url?: string;

  /**
   * Additional details about the bug bounty program implementation
   */
  details?: string;

  /**
   * Whether the wallet offers an upgrade path for security issues
   */
  upgradePathAvailable: boolean;
}

/**
 * A record of bug bounty program support
 */
export type BugBountyProgramImplementation = WithRef<BugBountyProgramSupport>;
