/**
 * Address Source of Truth Resolution Strategy
 * Consistently resolves addresses using the cascade: Locations → Clients → Fallbacks
 * Logs fallback occurrences to quantify tech debt before migration
 */

import { dataSource } from "./dataSource";

export interface ResolvedAddress {
  address: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
  phone?: string;
  source: 'location' | 'client' | 'fallback' | 'empty';
  fallbackReason?: string;
}

export interface AddressResolutionContext {
  clientId?: string;
  locationId?: string;
  operation: string;
  manifestId?: string;
}

/**
 * Log address resolution events for tech debt tracking
 */
function logAddressResolution(context: AddressResolutionContext, result: ResolvedAddress) {
  const logEntry = {
    event: 'address_resolution',
    timestamp: new Date().toISOString(),
    operation: context.operation,
    manifestId: context.manifestId,
    clientId: context.clientId ? '***' : undefined, // Mask PII
    locationId: context.locationId ? '***' : undefined, // Mask PII
    source: result.source,
    fallbackReason: result.fallbackReason,
    hasFullAddress: !!(result.address && result.city && result.state && result.zip)
  };
  
  console.log('[ADDRESS_RESOLVER]', JSON.stringify(logEntry, null, 2));
}

/**
 * Resolve generator (client) address using cascade strategy
 */
export async function resolveGeneratorAddress(context: AddressResolutionContext): Promise<ResolvedAddress> {
  let result: ResolvedAddress;

  try {
    // 1. Try location-specific address first (highest priority)
    if (context.locationId) {
      // Note: locations table doesn't have full address fields, just 'address'
      // This would need to be expanded when location address fields are added
      console.log('[ADDRESS_RESOLVER] Location-based addresses not yet implemented');
    }

    // 2. Fall back to client address (current standard)
    if (context.clientId) {
      const client = await dataSource.getClient(context.clientId);
      
      if (client && client.mailing_address) {
        result = {
          address: client.mailing_address,
          city: client.city || '',
          state: client.state || '',
          zip: client.zip || '',
          county: client.county,
          phone: client.phone,
          source: 'client'
        };
      } else {
        result = {
          address: '',
          city: '',
          state: '',
          zip: '',
          source: 'fallback',
          fallbackReason: client ? 'client_missing_address' : 'client_not_found'
        };
      }
    } else {
      result = {
        address: '',
        city: '',
        state: '',
        zip: '',
        source: 'empty',
        fallbackReason: 'no_client_id'
      };
    }

  } catch (error) {
    console.error('[ADDRESS_RESOLVER] Error resolving generator address:', error);
    result = {
      address: '',
      city: '',
      state: '',
      zip: '',
      source: 'fallback',
      fallbackReason: `error: ${(error as Error).message.slice(0, 50)}`
    };
  }

  logAddressResolution(context, result);
  return result;
}

/**
 * Resolve hauler address
 */
export async function resolveHaulerAddress(
  haulerId: string,
  context: AddressResolutionContext
): Promise<ResolvedAddress> {
  let result: ResolvedAddress;

  try {
    const hauler = await dataSource.getHauler(haulerId);
    
    if (hauler && hauler.hauler_mailing_address) {
      result = {
        address: hauler.hauler_mailing_address,
        city: hauler.hauler_city || '',
        state: hauler.hauler_state || '',
        zip: hauler.hauler_zip || '',
        phone: hauler.hauler_phone,
        source: 'client' // Hauler data is treated as client-level
      };
    } else {
      result = {
        address: '',
        city: '',
        state: '',
        zip: '',
        source: 'fallback',
        fallbackReason: hauler ? 'hauler_missing_address' : 'hauler_not_found'
      };
    }

  } catch (error) {
    console.error('[ADDRESS_RESOLVER] Error resolving hauler address:', error);
    result = {
      address: '',
      city: '',
      state: '',
      zip: '',
      source: 'fallback',
      fallbackReason: `error: ${(error as Error).message.slice(0, 50)}`
    };
  }

  logAddressResolution({ ...context, operation: 'resolve_hauler_address' }, result);
  return result;
}

/**
 * Resolve receiver address
 */
export async function resolveReceiverAddress(
  receiverId: string,
  context: AddressResolutionContext
): Promise<ResolvedAddress> {
  let result: ResolvedAddress;

  try {
    const receiver = await dataSource.getReceiver(receiverId);
    
    if (receiver && receiver.receiver_mailing_address) {
      result = {
        address: receiver.receiver_mailing_address,
        city: receiver.receiver_city || '',
        state: receiver.receiver_state || '',
        zip: receiver.receiver_zip || '',
        phone: receiver.receiver_phone,
        source: 'client' // Receiver data is treated as client-level
      };
    } else {
      result = {
        address: '',
        city: '',
        state: '',
        zip: '',
        source: 'fallback',
        fallbackReason: receiver ? 'receiver_missing_address' : 'receiver_not_found'
      };
    }

  } catch (error) {
    console.error('[ADDRESS_RESOLVER] Error resolving receiver address:', error);
    result = {
      address: '',
      city: '',
      state: '',
      zip: '',
      source: 'fallback',
      fallbackReason: `error: ${(error as Error).message.slice(0, 50)}`
    };
  }

  logAddressResolution({ ...context, operation: 'resolve_receiver_address' }, result);
  return result;
}

/**
 * Get address resolution statistics for tech debt analysis
 */
export interface AddressResolutionStats {
  total: number;
  bySource: Record<string, number>;
  fallbackReasons: Record<string, number>;
  incompleteAddresses: number;
}

// Simple in-memory stats tracking (could be enhanced with persistence)
let resolutionStats: AddressResolutionStats = {
  total: 0,
  bySource: {},
  fallbackReasons: {},
  incompleteAddresses: 0
};

/**
 * Update resolution statistics (called internally by resolution functions)
 */
function updateResolutionStats(result: ResolvedAddress) {
  resolutionStats.total++;
  resolutionStats.bySource[result.source] = (resolutionStats.bySource[result.source] || 0) + 1;
  
  if (result.fallbackReason) {
    resolutionStats.fallbackReasons[result.fallbackReason] = 
      (resolutionStats.fallbackReasons[result.fallbackReason] || 0) + 1;
  }
  
  if (!result.address || !result.city || !result.state || !result.zip) {
    resolutionStats.incompleteAddresses++;
  }
}

/**
 * Get current address resolution statistics
 */
export function getAddressResolutionStats(): AddressResolutionStats {
  return { ...resolutionStats };
}

/**
 * Reset address resolution statistics
 */
export function resetAddressResolutionStats() {
  resolutionStats = {
    total: 0,
    bySource: {},
    fallbackReasons: {},
    incompleteAddresses: 0
  };
}