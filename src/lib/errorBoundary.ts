/**
 * Error Boundary and Async Guard Utilities for Manifest Operations
 * Provides structured error handling with user feedback and logging
 */

import { toast } from "@/hooks/use-toast";

export interface ErrorContext {
  operation: string;
  manifestId?: string;
  userId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface StructuredError {
  code: string;
  message: string;
  userMessage: string;
  recoverable: boolean;
  context: ErrorContext;
  originalError?: Error;
}

/**
 * Error codes for different failure scenarios
 */
export const ERROR_CODES = {
  // Manifest creation
  MANIFEST_VALIDATION_FAILED: 'MANIFEST_VALIDATION_FAILED',
  MANIFEST_SAVE_FAILED: 'MANIFEST_SAVE_FAILED',
  MANIFEST_NOT_FOUND: 'MANIFEST_NOT_FOUND',
  
  // PDF generation
  PDF_GENERATION_FAILED: 'PDF_GENERATION_FAILED',
  PDF_TEMPLATE_MISSING: 'PDF_TEMPLATE_MISSING',
  PDF_DATA_INVALID: 'PDF_DATA_INVALID',
  
  // Data access
  CLIENT_NOT_FOUND: 'CLIENT_NOT_FOUND',
  HAULER_NOT_FOUND: 'HAULER_NOT_FOUND',
  RECEIVER_NOT_FOUND: 'RECEIVER_NOT_FOUND',
  
  // Signatures
  SIGNATURE_SAVE_FAILED: 'SIGNATURE_SAVE_FAILED',
  SIGNATURE_MISSING: 'SIGNATURE_MISSING',
  
  // Network/Infrastructure
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // Unknown
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

/**
 * Classify errors and provide user-friendly messages
 */
export function classifyError(error: any, context: ErrorContext): StructuredError {
  const message = error?.message || error?.toString() || 'Unknown error';
  
  // Network/connectivity errors
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return {
      code: ERROR_CODES.NETWORK_ERROR,
      message,
      userMessage: 'Network connection failed. Please check your internet connection and try again.',
      recoverable: true,
      context,
      originalError: error
    };
  }
  
  // Timeout errors
  if (message.includes('timeout') || message.includes('AbortError')) {
    return {
      code: ERROR_CODES.TIMEOUT_ERROR,
      message,
      userMessage: 'The operation timed out. Please try again.',
      recoverable: true,
      context,
      originalError: error
    };
  }
  
  // Permission errors
  if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
    return {
      code: ERROR_CODES.PERMISSION_DENIED,
      message,
      userMessage: 'You do not have permission to perform this action.',
      recoverable: false,
      context,
      originalError: error
    };
  }
  
  // Data not found errors
  if (message.includes('not found')) {
    if (message.includes('client')) {
      return {
        code: ERROR_CODES.CLIENT_NOT_FOUND,
        message,
        userMessage: 'The selected client could not be found. Please refresh and try again.',
        recoverable: true,
        context,
        originalError: error
      };
    }
    if (message.includes('hauler')) {
      return {
        code: ERROR_CODES.HAULER_NOT_FOUND,
        message,
        userMessage: 'The selected hauler could not be found. Please choose a different hauler.',
        recoverable: true,
        context,
        originalError: error
      };
    }
    if (message.includes('receiver')) {
      return {
        code: ERROR_CODES.RECEIVER_NOT_FOUND,
        message,
        userMessage: 'The selected receiver could not be found. Please choose a different receiver.',
        recoverable: true,
        context,
        originalError: error
      };
    }
    if (message.includes('template')) {
      return {
        code: ERROR_CODES.PDF_TEMPLATE_MISSING,
        message,
        userMessage: 'PDF template is missing. Please contact support.',
        recoverable: false,
        context,
        originalError: error
      };
    }
  }
  
  // PDF generation errors
  if (message.includes('PDF') || message.includes('pdf')) {
    return {
      code: ERROR_CODES.PDF_GENERATION_FAILED,
      message,
      userMessage: 'Failed to generate PDF. Please try again or contact support if the issue persists.',
      recoverable: true,
      context,
      originalError: error
    };
  }
  
  // Signature errors
  if (message.includes('signature')) {
    return {
      code: ERROR_CODES.SIGNATURE_SAVE_FAILED,
      message,
      userMessage: 'Failed to save signature. Please re-sign and try again.',
      recoverable: true,
      context,
      originalError: error
    };
  }
  
  // Validation errors
  if (message.includes('validation') || message.includes('required') || message.includes('invalid')) {
    return {
      code: ERROR_CODES.MANIFEST_VALIDATION_FAILED,
      message,
      userMessage: 'Please check all required fields are filled correctly.',
      recoverable: true,
      context,
      originalError: error
    };
  }
  
  // Default unknown error
  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message,
    userMessage: 'An unexpected error occurred. Please try again or contact support.',
    recoverable: true,
    context,
    originalError: error
  };
}

/**
 * Log structured error without PII
 */
export function logStructuredError(structuredError: StructuredError) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    code: structuredError.code,
    operation: structuredError.context.operation,
    message: structuredError.message,
    recoverable: structuredError.recoverable,
    manifestId: structuredError.context.manifestId,
    userId: structuredError.context.userId ? '***' : undefined, // Mask PII
    metadata: structuredError.context.metadata,
    stack: structuredError.originalError?.stack?.slice(0, 500) // Truncate stack trace
  };
  
  console.error('[MANIFEST_ERROR]', JSON.stringify(logEntry, null, 2));
}

/**
 * Show user-friendly error feedback
 */
export function showErrorToUser(structuredError: StructuredError) {
  toast({
    title: "Error",
    description: structuredError.userMessage,
    variant: "destructive",
    duration: structuredError.recoverable ? 5000 : 10000
  });
}

/**
 * Async guard wrapper for manifest operations
 */
export async function withErrorBoundary<T>(
  operation: () => Promise<T>,
  context: ErrorContext
): Promise<{ data?: T; error?: StructuredError }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    const structuredError = classifyError(error, context);
    logStructuredError(structuredError);
    showErrorToUser(structuredError);
    return { error: structuredError };
  }
}

/**
 * Timeout wrapper for operations - accepts both Promise and PromiseLike
 */
export function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, timeoutMs: number = 30000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise), // Convert PromiseLike to Promise
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    retryableErrors?: string[];
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    retryableErrors = ['NETWORK_ERROR', 'TIMEOUT_ERROR']
  } = options;
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Check if error is retryable
      const message = error?.message || '';
      const isRetryable = retryableErrors.some(code => message.includes(code));
      
      if (!isRetryable) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}