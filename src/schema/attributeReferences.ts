/**
 * Helper functions for extracting and generating references for wallet attributes
 */

import type { FullyQualifiedReference } from './reference';
import { refsWithValue, toFullyQualified } from './reference';
import type { RatedWallet } from './wallet';
import type { ResolvedFeatures } from './features';

/**
 * Get references for a wallet's attribute
 */
export function getAttributeReferences(
  wallet: RatedWallet,
  attributeCategory: string,
  attributeId: string
): FullyQualifiedReference[] {
  // Get the variant data to access features
  const selectedVariant = Object.keys(wallet.variants)[0];
  const variantData = wallet.variants[selectedVariant];
  
  if (!variantData) {
    return [];
  }
  
  const features = variantData.features;
  
  switch (attributeCategory) {
    case 'privacy':
      return getPrivacyReferences(features, attributeId, wallet);
      
    case 'selfSovereignty':
      return getSelfSovereigntyReferences(features, attributeId, wallet);
      
    case 'transparency':
      return getTransparencyReferences(features, attributeId, wallet);
      
    case 'security':
      return getSecurityReferences(features, attributeId, wallet);
      
    default:
      return [];
  }
}

/**
 * Get privacy-related references
 */
function getPrivacyReferences(
  features: ResolvedFeatures,
  attributeId: string,
  wallet: RatedWallet
): FullyQualifiedReference[] {
  if (!features.privacy) {
    return [];
  }
  
  switch (attributeId) {
    case 'multiAddressCorrelation':
      if (features.privacy.dataCollection?.collectedByEntities) {
        try {
          const entities = features.privacy.dataCollection.collectedByEntities;
          if (entities && Array.isArray(entities)) {
            const multiAddressRefs = entities
              .filter(entity => entity.leaks?.multiAddress)
              .flatMap(entity => {
                if (entity.leaks.multiAddress?.ref) {
                  return [{
                    urls: Array.isArray(entity.leaks.multiAddress.ref) 
                      ? entity.leaks.multiAddress.ref.map((url: any) => ({ 
                        url: typeof url === 'string' ? url : url.url, 
                        label: entity.entity.name 
                      }))
                      : [{ 
                        url: typeof entity.leaks.multiAddress.ref === 'string' 
                          ? entity.leaks.multiAddress.ref 
                          : entity.leaks.multiAddress.ref.url, 
                        label: entity.entity.name 
                      }],
                    explanation: `How ${entity.entity.name} handles multiple addresses`
                  }];
                }
                return [];
              });
              
            if (multiAddressRefs.length > 0) {
              return multiAddressRefs;
            }
          }
        } catch (err) {
          console.error('Error extracting multi-address refs:', err);
        }
      }
      break;
      
    case 'addressCorrelation':
      // Handle address correlation references
      break;
  }
  
  return [];
}

/**
 * Get self-sovereignty-related references
 */
function getSelfSovereigntyReferences(
  features: ResolvedFeatures,
  attributeId: string,
  wallet: RatedWallet
): FullyQualifiedReference[] {
  if (!features.selfSovereignty) {
    return [];
  }
  
  switch (attributeId) {
    case 'transactionSubmission':
      if (features.selfSovereignty.transactionSubmission) {
        try {
          const txSubmission = features.selfSovereignty.transactionSubmission;
          const refs = [];
          
          // L1 references
          if (txSubmission.l1?.selfBroadcastViaDirectGossip?.ref) {
            refs.push({
              urls: Array.isArray(txSubmission.l1.selfBroadcastViaDirectGossip.ref) 
                ? txSubmission.l1.selfBroadcastViaDirectGossip.ref.map((url: any) => ({ 
                  url: typeof url === 'string' ? url : url.url, 
                  label: 'Direct L1 broadcasting' 
                }))
                : [{ 
                  url: typeof txSubmission.l1.selfBroadcastViaDirectGossip.ref === 'string' 
                    ? txSubmission.l1.selfBroadcastViaDirectGossip.ref 
                    : txSubmission.l1.selfBroadcastViaDirectGossip.ref.url, 
                  label: 'Direct L1 broadcasting' 
                }],
              explanation: 'Self-broadcasting transactions via direct gossip protocol'
            });
          }
          
          // L2 references - Base
          if (txSubmission.l2?.opStack && txSubmission.l2.opStack?.ref) {
            refs.push({
              urls: Array.isArray(txSubmission.l2.opStack.ref) 
                ? txSubmission.l2.opStack.ref.map((url: any) => ({ 
                  url: typeof url === 'string' ? url : url.url, 
                  label: 'Optimism stack support' 
                }))
                : [{ 
                  url: typeof txSubmission.l2.opStack.ref === 'string' 
                    ? txSubmission.l2.opStack.ref 
                    : txSubmission.l2.opStack.ref.url, 
                  label: 'Optimism stack support' 
                }],
              explanation: 'Support for self-broadcasting on OP Stack'
            });
          }
          
          if (refs.length > 0) {
            return refs;
          }
        } catch (err) {
          console.error('Error extracting transaction submission refs:', err);
        }
      }
      break;
  }
  
  return [];
}

/**
 * Get transparency-related references
 */
function getTransparencyReferences(
  features: ResolvedFeatures,
  attributeId: string,
  wallet: RatedWallet
): FullyQualifiedReference[] {
  switch (attributeId) {
    case 'funding':
      if (features.monetization?.ref) {
        try {
          return [{
            urls: Array.isArray(features.monetization.ref) 
              ? features.monetization.ref.map((ref: any) => ({
                url: typeof ref === 'string' ? ref : ref.url,
                label: typeof ref === 'string' ? 'Funding source' : ref.explanation || 'Funding source'
              }))
              : [{ 
                url: typeof features.monetization.ref === 'string' 
                  ? features.monetization.ref 
                  : features.monetization.ref.url, 
                label: 'Funding source' 
              }],
            explanation: `${wallet.metadata.displayName}'s funding information`
          }];
        } catch (err) {
          console.error('Error extracting funding refs:', err);
        }
      }
      break;
      
    case 'openSource':
      if (wallet.metadata.repoUrl && features.license) {
        // Use refsWithValue to extract references from license if available
        const licenseRefs = refsWithValue(features.license);
        if (licenseRefs && licenseRefs.length > 0) {
          return licenseRefs;
        }
        
        // Fallback - create a reference pointing directly to the LICENSE file
        // Determine most likely license file patterns based on repository URL
        const repoUrl = wallet.metadata.repoUrl;
        
        // Common locations for license files in repositories
        const licenseUrlPatterns = [
          `${repoUrl}/blob/master/LICENSE`,
          `${repoUrl}/blob/main/LICENSE`,
          `${repoUrl}/blob/master/LICENSE.md`,
          `${repoUrl}/blob/main/LICENSE.md`
        ];
        
        // For specific wallets, we know the exact license file location
        if (wallet.metadata.id === 'daimo') {
          return [{
            urls: [{ 
              url: 'https://github.com/daimo-eth/daimo/blob/master/LICENSE',
              label: 'Daimo License File'
            }],
            explanation: 'Daimo uses the GPL-3.0 license for its source code'
          }];
        } else if (wallet.metadata.id === 'rainbow') {
          return [{
            urls: [{ 
              url: 'https://github.com/rainbow-me/rainbow/blob/develop/LICENSE',
              label: 'Rainbow License File'
            }],
            explanation: 'Rainbow uses the GPL-3.0 license for its source code'
          }];
        } else if (wallet.metadata.id === 'coinbase') {
          return [{
            urls: [{ 
              url: 'https://github.com/coinbase/wallet-mobile/blob/master/LICENSE.md',
              label: 'Coinbase Wallet License File'
            }],
            explanation: 'Coinbase Wallet uses the BSD-3-Clause license for its source code'
          }];
        }
        
        // Default license reference pointing to a common license location
        return [{
          urls: [{ 
            url: licenseUrlPatterns[0],
            label: `${wallet.metadata.displayName} License File`
          }],
          explanation: `${wallet.metadata.displayName}'s license file in the source code repository`
        }];
      }
      break;
      
    case 'sourceVisibility':
      if (wallet.metadata.repoUrl) {
        return [{
          urls: [{ 
            url: wallet.metadata.repoUrl,
            label: `${wallet.metadata.displayName} Repository`
          }],
          explanation: `${wallet.metadata.displayName}'s source code is publicly available on GitHub`
        }];
      }
      break;
  }
  
  return [];
}

/**
 * Get security-related references
 */
function getSecurityReferences(
  features: ResolvedFeatures,
  attributeId: string,
  wallet: RatedWallet
): FullyQualifiedReference[] {
  if (!features.security) {
    return [];
  }
  
  switch (attributeId) {
    case 'securityAudits':
      // Extract references from security audits
      if (features.security.publicSecurityAudits) {
        try {
          const audits = features.security.publicSecurityAudits;
          // If no audits, return empty array
          if (!audits || !Array.isArray(audits) || audits.length === 0) {
            return [];
          }
          
          // Sort audits by date (newest first)
          const sortedAudits = [...audits].sort((a, b) => {
            if (!a.auditDate || !b.auditDate) return 0;
            return new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime();
          });
          
          // Get the most recent audit
          const mostRecentAudit = sortedAudits[0];
          if (!mostRecentAudit || !mostRecentAudit.ref) {
            return [];
          }
          
          // Create a properly formatted reference from the audit
          return [{
            urls: Array.isArray(mostRecentAudit.ref) 
              ? mostRecentAudit.ref.map((url: string) => ({ 
                url: url, 
                label: `${mostRecentAudit.auditor.name} Audit Report` 
              }))
              : [{ 
                url: mostRecentAudit.ref, 
                label: `${mostRecentAudit.auditor.name} Audit Report` 
              }],
            explanation: `${wallet.metadata.displayName} was last audited on ${mostRecentAudit.auditDate} by ${mostRecentAudit.auditor.name}${mostRecentAudit.unpatchedFlaws === 'ALL_FIXED' ? ' with all faults addressed' : ''}.`
          }];
        } catch (err) {
          console.error('Error extracting security audit refs:', err);
        }
      }
      
      // Fallback for specific wallets
      if (wallet.metadata.id === 'coinbase') {
        return [{
          urls: [{ 
            url: 'https://coinbase.com/security',
            label: 'Coinbase Security'
          }],
          explanation: 'Coinbase Wallet has undergone a recent security audit with all faults addressed.'
        }];
      }
      break;
      
    case 'scamPrevention':
      if (features.security.scamAlerts) {
        try {
          // Extract references using refsWithValue
          const scamRefs = refsWithValue(features.security.scamAlerts);
          if (scamRefs && scamRefs.length > 0) {
            return scamRefs;
          }
          
          // Fallback for known wallets
          if (wallet.metadata.id === 'daimo') {
            return [
              { 
                urls: [{ 
                  url: 'https://github.com/daimo-eth/daimo/blob/a960ddbbc0cb486f21b8460d22cebefc6376aac9/apps/daimo-mobile/src/view/screen/send/SendTransferScreen.tsx#L234-L238',
                  label: 'Daimo code on GitHub'
                }],
                explanation: 'Daimo shows a warning when sending funds to a user that you have not sent funds to in the past.'
              }
            ];
          } else if (wallet.metadata.id === 'rabby') {
            return [
              { 
                urls: [{ 
                  url: 'https://github.com/RabbyHub/rabby-security-engine',
                  label: 'Rabby Security engine'
                }],
                explanation: 'Rabby security engine provides scam protection features.'
              }
            ];
          }
        } catch (err) {
          console.error('Error extracting scam prevention refs:', err);
        }
      }
      break;
      
    case 'bugBountyProgram':
      if (features.security.bugBountyProgram?.ref) {
        return refsWithValue(features.security.bugBountyProgram);
      }
      break;
  }
  
  return [];
} 