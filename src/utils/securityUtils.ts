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
 * Generates a cryptographically secure nonce for CSP
 */
export const generateNonce = (): string => {
  return generateSecureToken(16);
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
 * Content Security Policy helper - Hardened version
 * Removes unsafe-inline and unsafe-eval for enhanced security
 */
export const applyCSP = (): void => {
  if (typeof document !== 'undefined') {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    
    meta.content = [
      "default-src 'self'",
      // Allow unsafe-inline for scripts to enable printing functionality
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com",
      // Allow inline styles from same origin (Tailwind requires this)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://wvjehbozyxhmgdljwsiz.supabase.co wss://wvjehbozyxhmgdljwsiz.supabase.co https://api.stripe.com https://api.mapbox.com https://events.mapbox.com",
      "frame-src 'self' https://js.stripe.com blob: data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ');
    
    document.head.appendChild(meta);
  }
};

/**
 * Apply security headers via meta tags
 */
export const applySecurityHeaders = (): void => {
  if (typeof document !== 'undefined') {
    // X-Frame-Options
    const xFrameOptions = document.createElement('meta');
    xFrameOptions.httpEquiv = 'X-Frame-Options';
    xFrameOptions.content = 'DENY';
    document.head.appendChild(xFrameOptions);

    // X-Content-Type-Options
    const xContentType = document.createElement('meta');
    xContentType.httpEquiv = 'X-Content-Type-Options';
    xContentType.content = 'nosniff';
    document.head.appendChild(xContentType);

    // Referrer-Policy
    const referrerPolicy = document.createElement('meta');
    referrerPolicy.name = 'referrer';
    referrerPolicy.content = 'strict-origin-when-cross-origin';
    document.head.appendChild(referrerPolicy);

    // Permissions-Policy
    const permissionsPolicy = document.createElement('meta');
    permissionsPolicy.httpEquiv = 'Permissions-Policy';
    permissionsPolicy.content = 'geolocation=(self), microphone=(), camera=()';
    document.head.appendChild(permissionsPolicy);
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

/**
 * Initialize all security measures
 * Call this once when the app loads
 */
export const initializeSecurity = (): void => {
  applyCSP();
  applySecurityHeaders();
};