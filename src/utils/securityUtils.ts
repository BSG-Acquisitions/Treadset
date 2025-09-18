// Security utility functions

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export const sanitizeHtml = (html: string): string => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

/**
 * Validates if a URL is safe for redirection
 */
export const isSafeUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    // Prevent javascript: URLs
    if (parsedUrl.protocol === 'javascript:') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Generates a cryptographically secure random string
 */
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Validates input against common injection patterns
 */
export const validateInput = (input: string): boolean => {
  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/i,
    /(union.*select|select.*from)/i,
    /('|('')|;|\/\*|\*\/|--)/i
  ];

  // Check for XSS patterns
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  const patterns = [...sqlPatterns, ...xssPatterns];
  
  return !patterns.some(pattern => pattern.test(input));
};

/**
 * Rate limiting utility
 */
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  isAllowed(identifier: string, maxAttempts: number = 5, windowMs: number = 900000): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (attempt.count >= maxAttempts) {
      return false;
    }

    attempt.count++;
    return true;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  getRemainingAttempts(identifier: string, maxAttempts: number = 5): number {
    const attempt = this.attempts.get(identifier);
    if (!attempt || Date.now() > attempt.resetTime) {
      return maxAttempts;
    }
    return Math.max(0, maxAttempts - attempt.count);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Content Security Policy helper
 */
export const applyCSP = (): void => {
  if (typeof document !== 'undefined') {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://wvjehbozyxhmgdljwsiz.supabase.co wss://wvjehbozyxhmgdljwsiz.supabase.co https://api.resend.com",
      "frame-ancestors 'none'",
      "base-uri 'self'"
    ].join('; ');
    
    document.head.appendChild(meta);
  }
};

/**
 * Secure session storage wrapper
 */
export const secureSession = {
  set: (key: string, value: any, expiresInMinutes: number = 60): void => {
    try {
      const data = {
        value,
        expires: Date.now() + (expiresInMinutes * 60 * 1000),
        checksum: generateSecureToken(8)
      };
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to set secure session data:', error);
    }
  },

  get: <T>(key: string): T | null => {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;

      const data = JSON.parse(item);
      
      // Check expiration
      if (Date.now() > data.expires) {
        sessionStorage.removeItem(key);
        return null;
      }

      return data.value;
    } catch (error) {
      console.error('Failed to get secure session data:', error);
      return null;
    }
  },

  remove: (key: string): void => {
    sessionStorage.removeItem(key);
  },

  clear: (): void => {
    sessionStorage.clear();
  }
};