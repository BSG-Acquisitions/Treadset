/**
 * Shared validation utilities for edge functions
 * Uses zod for schema validation
 */

// Simple validation schemas without external dependencies
// Edge functions don't have npm zod, so we use a lightweight validation approach

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (allows common phone formats)
const PHONE_REGEX = /^[0-9+\-\(\)\s]{7,20}$/;

// Sanitize string to prevent XSS
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';
  
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove HTML brackets
    .trim();
}

// Validate email format
export function isValidEmail(email: string): boolean {
  return typeof email === 'string' && EMAIL_REGEX.test(email) && email.length <= 255;
}

// Validate phone format
export function isValidPhone(phone: string | undefined | null): boolean {
  if (!phone) return true; // Optional field
  return typeof phone === 'string' && PHONE_REGEX.test(phone);
}

// Validate required string
export function isValidString(value: any, minLength: number = 1, maxLength: number = 1000): boolean {
  return typeof value === 'string' && value.trim().length >= minLength && value.length <= maxLength;
}

// Validate positive number
export function isPositiveNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= 0;
}

// Contact form validation
export interface ContactFormInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
}

export function validateContactForm(body: any): ValidationResult<ContactFormInput> {
  const errors: string[] = [];
  
  // Name validation
  if (!isValidString(body.name, 2, 100)) {
    errors.push('Name must be between 2 and 100 characters');
  }
  
  // Email validation
  if (!isValidEmail(body.email)) {
    errors.push('Invalid email address');
  }
  
  // Subject validation
  if (!isValidString(body.subject, 2, 200)) {
    errors.push('Subject must be between 2 and 200 characters');
  }
  
  // Message validation
  if (!isValidString(body.message, 10, 5000)) {
    errors.push('Message must be between 10 and 5000 characters');
  }
  
  // Phone validation (optional)
  if (body.phone && !isValidPhone(body.phone)) {
    errors.push('Invalid phone number format');
  }
  
  if (errors.length > 0) {
    return { success: false, error: errors.join('; ') };
  }
  
  return {
    success: true,
    data: {
      name: sanitizeString(body.name, 100),
      email: sanitizeString(body.email, 255),
      subject: sanitizeString(body.subject, 200),
      message: sanitizeString(body.message, 5000),
      phone: body.phone ? sanitizeString(body.phone, 20) : undefined,
    }
  };
}

// Partner application validation
export interface PartnerApplicationInput {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  dotNumber: string;
  mcNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  fleetSize?: string;
  notes?: string;
}

export function validatePartnerApplication(body: any): ValidationResult<PartnerApplicationInput> {
  const errors: string[] = [];
  
  // Company name validation
  if (!isValidString(body.companyName, 2, 200)) {
    errors.push('Company name must be between 2 and 200 characters');
  }
  
  // Contact name validation
  if (!isValidString(body.contactName, 2, 100)) {
    errors.push('Contact name must be between 2 and 100 characters');
  }
  
  // Email validation
  if (!isValidEmail(body.email)) {
    errors.push('Invalid email address');
  }
  
  // Phone validation
  if (!isValidPhone(body.phone) || !body.phone) {
    errors.push('Valid phone number is required');
  }
  
  // DOT number validation (required, alphanumeric)
  if (!isValidString(body.dotNumber, 1, 20)) {
    errors.push('DOT number is required');
  }
  
  if (errors.length > 0) {
    return { success: false, error: errors.join('; ') };
  }
  
  return {
    success: true,
    data: {
      companyName: sanitizeString(body.companyName, 200),
      contactName: sanitizeString(body.contactName, 100),
      email: sanitizeString(body.email, 255),
      phone: sanitizeString(body.phone, 20),
      dotNumber: sanitizeString(body.dotNumber, 20),
      mcNumber: body.mcNumber ? sanitizeString(body.mcNumber, 20) : undefined,
      address: body.address ? sanitizeString(body.address, 300) : undefined,
      city: body.city ? sanitizeString(body.city, 100) : undefined,
      state: body.state ? sanitizeString(body.state, 50) : undefined,
      zip: body.zip ? sanitizeString(body.zip, 20) : undefined,
      fleetSize: body.fleetSize ? sanitizeString(body.fleetSize, 50) : undefined,
      notes: body.notes ? sanitizeString(body.notes, 2000) : undefined,
    }
  };
}

// Booking request validation
export interface BookingRequestInput {
  name: string;
  email: string;
  company: string;
  address: string;
  phone?: string;
  passengerOffRim?: number;
  passengerOnRim?: number;
  semiCount?: number;
  oversizedCount?: number;
  pteCount?: number;
  otrCount?: number;
  tractorCount?: number;
  preferredDate: string;
  preferredWindow: 'AM' | 'PM' | 'Any';
  notes?: string;
  source?: string;
  clientId?: string;
  inviteId?: string;
  fromEmailBooking?: boolean;
}

export function validateBookingRequest(body: any): ValidationResult<BookingRequestInput> {
  const errors: string[] = [];
  
  // Name validation
  if (!isValidString(body.name, 2, 100)) {
    errors.push('Name must be between 2 and 100 characters');
  }
  
  // Email validation
  if (!isValidEmail(body.email)) {
    errors.push('Invalid email address');
  }
  
  // Company validation
  if (!isValidString(body.company, 2, 200)) {
    errors.push('Company name must be between 2 and 200 characters');
  }
  
  // Address validation
  if (!isValidString(body.address, 10, 500)) {
    errors.push('Address must be between 10 and 500 characters');
  }
  
  // Phone validation (optional)
  if (body.phone && !isValidPhone(body.phone)) {
    errors.push('Invalid phone number format');
  }
  
  // Date validation
  if (!body.preferredDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.preferredDate)) {
    errors.push('Invalid date format (YYYY-MM-DD required)');
  }
  
  // Time window validation
  if (!['AM', 'PM', 'Any'].includes(body.preferredWindow)) {
    errors.push('Preferred window must be AM, PM, or Any');
  }
  
  // Tire counts validation (if provided, must be positive numbers)
  const tireFields = ['passengerOffRim', 'passengerOnRim', 'semiCount', 'oversizedCount', 'pteCount', 'otrCount', 'tractorCount'];
  for (const field of tireFields) {
    if (body[field] !== undefined && body[field] !== null) {
      const value = Number(body[field]);
      if (isNaN(value) || value < 0 || value > 10000) {
        errors.push(`${field} must be a number between 0 and 10000`);
      }
    }
  }
  
  if (errors.length > 0) {
    return { success: false, error: errors.join('; ') };
  }
  
  return {
    success: true,
    data: {
      name: sanitizeString(body.name, 100),
      email: sanitizeString(body.email, 255),
      company: sanitizeString(body.company, 200),
      address: sanitizeString(body.address, 500),
      phone: body.phone ? sanitizeString(body.phone, 20) : undefined,
      passengerOffRim: body.passengerOffRim ? Math.max(0, Math.min(10000, Number(body.passengerOffRim))) : undefined,
      passengerOnRim: body.passengerOnRim ? Math.max(0, Math.min(10000, Number(body.passengerOnRim))) : undefined,
      semiCount: body.semiCount ? Math.max(0, Math.min(10000, Number(body.semiCount))) : undefined,
      oversizedCount: body.oversizedCount ? Math.max(0, Math.min(10000, Number(body.oversizedCount))) : undefined,
      pteCount: body.pteCount ? Math.max(0, Math.min(10000, Number(body.pteCount))) : undefined,
      otrCount: body.otrCount ? Math.max(0, Math.min(10000, Number(body.otrCount))) : undefined,
      tractorCount: body.tractorCount ? Math.max(0, Math.min(10000, Number(body.tractorCount))) : undefined,
      preferredDate: body.preferredDate,
      preferredWindow: body.preferredWindow as 'AM' | 'PM' | 'Any',
      notes: body.notes ? sanitizeString(body.notes, 2000) : undefined,
      source: body.source ? sanitizeString(body.source, 50) : undefined,
      clientId: body.clientId ? sanitizeString(body.clientId, 50) : undefined,
      inviteId: body.inviteId ? sanitizeString(body.inviteId, 50) : undefined,
      fromEmailBooking: Boolean(body.fromEmailBooking),
    }
  };
}

// Rate limiting helper (simple in-memory for edge functions)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  
  let entry = rateLimitStore.get(key);
  
  // Clean up expired entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }
  
  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, entry);
    return { allowed: true, remaining: maxRequests - 1, resetAt: entry.resetAt };
  }
  
  entry.count++;
  
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

// Get client IP from request headers
export function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}
