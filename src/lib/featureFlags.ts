/**
 * Feature Flags Configuration
 * 
 * These flags allow enabling/disabling major features without code changes.
 * Set via environment variables (VITE_FEATURE_*) or defaults.
 */

export const FEATURE_FLAGS = {
  /**
   * TRAILERS - Trailer Asset Tracking System
   * When false, all trailer-related navigation, routes, and components are hidden.
   * This allows the trailer subsystem to be completely disabled without errors.
   */
  TRAILERS: import.meta.env.VITE_FEATURE_TRAILERS !== 'false',
  
  /**
   * INVENTORY - Product Inventory Tracking System
   * When false, all inventory-related navigation, routes, and components are hidden.
   * This allows the inventory subsystem to be completely disabled without errors.
   */
  INVENTORY: import.meta.env.VITE_FEATURE_INVENTORY !== 'false',
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] ?? false;
}

/**
 * Hook-friendly feature flag check
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  return isFeatureEnabled(flag);
}
