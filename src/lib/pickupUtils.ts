/**
 * Utility functions for handling pickup data
 */

interface Client {
  company_name?: string;
  mailing_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  physical_address?: string;
  physical_city?: string;
  physical_state?: string;
  physical_zip?: string;
}

interface Location {
  name?: string;
  address?: string;
}

interface Pickup {
  location?: Location | null;
  client?: Client | null;
}

/**
 * Get the service address for a pickup, preferring location but falling back to client address
 */
export function getPickupAddress(pickup: Pickup): string {
  // If there's a specific location, use it
  if (pickup.location?.address) {
    return pickup.location.address;
  }
  
  // Otherwise, construct address from client data
  if (pickup.client) {
    const address = pickup.client.physical_address || pickup.client.mailing_address;
    const city = pickup.client.physical_city || pickup.client.city;
    const state = pickup.client.physical_state || pickup.client.state;
    const zip = pickup.client.physical_zip || pickup.client.zip;
    
    if (address && city && state && zip) {
      return `${address}, ${city}, ${state} ${zip}`;
    }
    
    if (address) {
      return address;
    }
  }
  
  return "No address on file";
}

/**
 * Get the location name or reference
 */
export function getPickupLocationName(pickup: Pickup): string | null {
  return pickup.location?.name || null;
}
