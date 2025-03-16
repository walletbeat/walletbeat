/**
 * Registry file to expose key functions and utilities globally
 */

import { getAttributeReferences } from './attributeReferences';

// Create a global namespace for the walletbeat application
declare global {
  interface Window {
    walletbeat?: {
      schema?: {
        attributeReferences?: {
          getAttributeReferences: typeof getAttributeReferences;
        };
      };
    };
  }
}

// Initialize the global namespace if it doesn't exist
if (typeof window !== 'undefined') {
  window.walletbeat = window.walletbeat || {};
  window.walletbeat.schema = window.walletbeat.schema || {};
  window.walletbeat.schema.attributeReferences = window.walletbeat.schema.attributeReferences || {
    getAttributeReferences
  };
}

export default {
  attributeReferences: {
    getAttributeReferences
  }
}; 