/**
 * Idempotency & Concurrency Control
 * PR#7: Prevent duplicate operations and handle concurrent updates
 */

import { supabase } from '@/integrations/supabase/client';
import { generateSecureToken } from '@/utils/securityUtils';

export interface IdempotencyOptions {
  operation: string;
  resourceId?: string;
  userId?: string;
  ttlMinutes?: number;
  allowRetry?: boolean;
}

export interface IdempotencyResult<T = any> {
  success: boolean;
  data?: T;
  duplicate: boolean;
  originalRequestTime?: string;
  error?: string;
}

/**
 * Generate or extract idempotency key
 */
export function generateIdempotencyKey(options: IdempotencyOptions): string {
  if (options.resourceId && options.userId) {
    // Use deterministic key for operations on specific resources
    const dateBucket = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${options.operation}-${options.resourceId}-${options.userId}-${dateBucket}`;
  }
  
  // Fallback to random key (caller must provide it)
  return generateSecureToken(16);
}

/**
 * Check if operation is duplicate and return existing result if found
 */
export async function checkIdempotency<T>(
  idempotencyKey: string,
  options: IdempotencyOptions
): Promise<IdempotencyResult<T> | null> {
  const startTime = Date.now();
  
  try {
    // Use untyped query since idempotency_records table doesn't exist in types yet
    const { data: existing, error } = await (supabase as any)
      .from('idempotency_records')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .eq('operation', options.operation)
      .maybeSingle();

    if (error) {
      // Table might not exist yet - that's ok for now
      console.warn('[IDEMPOTENCY] Table not available or check failed:', error.message);
      return null;
    }

    if (!existing) {
      return null; // No duplicate found
    }

    // Check if record is expired
    const recordAge = Date.now() - new Date(existing.created_at).getTime();
    const maxAge = (options.ttlMinutes || 60) * 60 * 1000;

    if (recordAge > maxAge) {
      console.log('[IDEMPOTENCY] Expired record found, allowing retry');
      // Clean up expired record
      await (supabase as any)
        .from('idempotency_records')
        .delete()
        .eq('id', existing.id);
      return null;
    }

    console.log(`[IDEMPOTENCY] Duplicate detected`, {
      key: idempotencyKey,
      operation: options.operation,
      originalTime: existing.created_at,
      elapsedMs: Date.now() - startTime
    });

    return {
      success: existing.status === 'completed',
      data: existing.response_data,
      duplicate: true,
      originalRequestTime: existing.created_at,
      error: existing.status === 'failed' ? existing.error_message : undefined
    };

  } catch (error) {
    console.error('[IDEMPOTENCY] Check exception:', error);
    return null;
  }
}

/**
 * Record idempotency result
 */
export async function recordIdempotency(
  idempotencyKey: string,
  options: IdempotencyOptions,
  result: { success: boolean; data?: any; error?: string }
): Promise<void> {
  try {
    await (supabase as any)
      .from('idempotency_records')
      .upsert({
        idempotency_key: idempotencyKey,
        operation: options.operation,
        resource_id: options.resourceId,
        user_id: options.userId,
        status: result.success ? 'completed' : 'failed',
        response_data: result.data,
        error_message: result.error,
        created_at: new Date().toISOString()
      });

    console.log(`[IDEMPOTENCY] Recorded result`, {
      key: idempotencyKey,
      operation: options.operation,
      success: result.success
    });

  } catch (error) {
    console.warn('[IDEMPOTENCY] Record failed (table may not exist yet):', error);
    // Don't throw - this is best-effort logging
  }
}

/**
 * Optimistic locking for concurrent updates
 */
export interface OptimisticLockOptions {
  table: string;
  id: string;
  expectedVersion?: number;
  expectedUpdatedAt?: string;
}

export async function checkOptimisticLock(
  options: OptimisticLockOptions
): Promise<{ valid: boolean; currentVersion?: any; error?: string }> {
  try {
    // Use untyped query to work with any table
    const { data, error } = await (supabase as any)
      .from(options.table)
      .select('updated_at, id')
      .eq('id', options.id)
      .maybeSingle();

    if (error) {
      return { valid: false, error: 'LOCK_CHECK_FAILED' };
    }

    if (!data) {
      return { valid: false, error: 'RESOURCE_NOT_FOUND' };
    }

    // Check timestamp-based optimistic locking
    if (options.expectedUpdatedAt && data.updated_at) {
      const currentTime = new Date(data.updated_at).getTime();
      const expectedTime = new Date(options.expectedUpdatedAt).getTime();
      
      if (currentTime !== expectedTime) {
        console.warn('[OPTIMISTIC_LOCK] Stale update detected', {
          table: options.table,
          id: options.id,
          expectedTime: options.expectedUpdatedAt,
          currentTime: data.updated_at
        });
        
        return { 
          valid: false, 
          currentVersion: data,
          error: 'STALE_UPDATE'
        };
      }
    }

    return { valid: true, currentVersion: data };

  } catch (error) {
    console.error('[OPTIMISTIC_LOCK] Check exception:', error);
    return { valid: false, error: 'LOCK_CHECK_EXCEPTION' };
  }
}

/**
 * Wrapper for idempotent operations
 */
export async function withIdempotency<T>(
  idempotencyKey: string,
  options: IdempotencyOptions,
  operation: () => Promise<T>
): Promise<IdempotencyResult<T>> {
  // Check for duplicate
  const duplicateCheck = await checkIdempotency<T>(idempotencyKey, options);
  if (duplicateCheck) {
    return duplicateCheck;
  }

  // Execute operation
  try {
    const result = await operation();
    
    // Record success
    await recordIdempotency(idempotencyKey, options, {
      success: true,
      data: result
    });

    return {
      success: true,
      data: result,
      duplicate: false
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Record failure
    await recordIdempotency(idempotencyKey, options, {
      success: false,
      error: errorMessage
    });

    return {
      success: false,
      duplicate: false,
      error: errorMessage
    };
  }
}