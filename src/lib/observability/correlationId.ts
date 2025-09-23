/**
 * Correlation ID and Observability Infrastructure  
 * PR#10: Add structured logging and request tracing
 */

import { generateSecureToken } from '@/utils/securityUtils';

// Global correlation context
let currentCorrelationId: string | null = null;

/**
 * Generate and set correlation ID for current request/operation
 */
export function generateCorrelationId(): string {
  const corrId = generateSecureToken(12);
  currentCorrelationId = corrId;
  
  // Add to headers if in browser context
  if (typeof window !== 'undefined') {
    // Store in session for subsequent requests
    sessionStorage.setItem('x-corr-id', corrId);
  }
  
  return corrId;
}

/**
 * Get current correlation ID
 */
export function getCorrelationId(): string | null {
  if (currentCorrelationId) return currentCorrelationId;
  
  // Try to get from session storage
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('x-corr-id');
  }
  
  return null;
}

/**
 * Set correlation ID (for receiving from headers)
 */
export function setCorrelationId(corrId: string): void {
  currentCorrelationId = corrId;
  
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('x-corr-id', corrId);
  }
}

/**
 * Clear correlation ID (end of request/operation)
 */
export function clearCorrelationId(): void {
  currentCorrelationId = null;
  
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('x-corr-id');
  }
}

/**
 * Enhanced Supabase client with correlation ID injection
 */
export function createCorrelatedSupabaseCall(originalCall: Function) {
  return function(...args: any[]) {
    const corrId = getCorrelationId();
    
    if (corrId && args[0] && typeof args[0] === 'object') {
      // Inject correlation ID into headers if not already present
      if (!args[0].headers) args[0].headers = {};
      if (!args[0].headers['x-corr-id']) {
        args[0].headers['x-corr-id'] = corrId;
      }
    }
    
    return originalCall.apply(this, args);
  };
}

export interface LogContext {
  corrId?: string;
  userRole?: string;
  userIdHash?: string;
  clientId?: string;
  pickupId?: string;
  manifestId?: string;
  pdfEngine?: string;
  elapsedMs?: number;
  result?: 'success' | 'error';
  errorCode?: string;
  operation?: string;
}

/**
 * Structured logging with correlation ID
 */
export class StructuredLogger {
  private baseContext: Partial<LogContext>;

  constructor(baseContext: Partial<LogContext> = {}) {
    this.baseContext = {
      corrId: getCorrelationId() || undefined,
      ...baseContext
    };
  }

  private formatLog(level: string, message: string, context: Partial<LogContext> = {}) {
    const timestamp = new Date().toISOString();
    const fullContext = { ...this.baseContext, ...context };
    
    // Hash PII data
    if (fullContext.userIdHash && fullContext.userIdHash.length > 12) {
      fullContext.userIdHash = this.hashUserId(fullContext.userIdHash);
    }

    return JSON.stringify({
      timestamp,
      level,
      message,
      ...fullContext
    });
  }

  private hashUserId(userId: string): string {
    // Simple hash for logging (not cryptographically secure)
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  info(message: string, context: Partial<LogContext> = {}) {
    console.log(this.formatLog('INFO', message, { ...context, result: 'success' }));
  }

  error(message: string, context: Partial<LogContext> = {}) {
    console.error(this.formatLog('ERROR', message, { ...context, result: 'error' }));
  }

  warn(message: string, context: Partial<LogContext> = {}) {
    console.warn(this.formatLog('WARN', message, context));
  }

  /** Log manifest/PDF operation */
  manifestOp(
    operation: string,
    result: 'success' | 'error',
    context: Partial<LogContext> = {}
  ) {
    const level = result === 'success' ? 'INFO' : 'ERROR';
    const message = `${operation} ${result.toUpperCase()}`;
    
    if (level === 'INFO') {
      this.info(message, { ...context, operation });
    } else {
      this.error(message, { ...context, operation });
    }
  }
}

/**
 * Create logger with operation-specific context
 */
export function createLogger(operation: string, context: Partial<LogContext> = {}): StructuredLogger {
  return new StructuredLogger({ operation, ...context });
}

/**
 * Performance measurement wrapper
 */
export function withPerformanceLogging<T>(
  operation: string,
  fn: () => Promise<T> | T,
  context: Partial<LogContext> = {}
): Promise<T> {
  return new Promise<T>(async (resolve, reject) => {
    const logger = createLogger(operation, context);
    const startTime = Date.now();
    
    try {
      logger.info(`${operation} started`, context);
      
      const result = await fn();
      const elapsedMs = Date.now() - startTime;
      
      logger.manifestOp(operation, 'success', { ...context, elapsedMs });
      resolve(result);
      
    } catch (error) {
      const elapsedMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.manifestOp(operation, 'error', {
        ...context,
        elapsedMs,
        errorCode: (error as any)?.code || 'UNKNOWN_ERROR'
      });
      
      reject(error);
    }
  });
}