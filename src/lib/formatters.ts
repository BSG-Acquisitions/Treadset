/**
 * Formatting utilities for consistent display of numbers, dates, and currency
 * across the application. All formatters handle null/undefined gracefully.
 */

/**
 * Format currency values with proper locale support
 */
export const formatCurrency = (
  amount: number | null | undefined,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  if (amount == null) return '$0.00';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format numbers with proper thousands separators
 */
export const formatNumber = (
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string => {
  if (value == null) return '0';
  
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
};

/**
 * Format percentage values
 */
export const formatPercentage = (
  value: number | null | undefined,
  decimals: number = 1
): string => {
  if (value == null) return '0%';
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

/**
 * Formats a Date object to a local date string (YYYY-MM-DD) without timezone conversion
 * This avoids issues where toISOString() converts to UTC and can shift dates by one day
 */
export const formatLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Gets today's date as a local date string (YYYY-MM-DD)
 */
export const getTodayLocalDateString = (): string => {
  return formatLocalDateString(new Date());
};

/**
 * Format dates with consistent locale support
 */
export const formatDate = (
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(dateObj);
};

/**
 * Format date and time
 */
export const formatDateTime = (
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  }).format(dateObj);
};

/**
 * Format time only
 */
export const formatTime = (
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  }).format(dateObj);
};

/**
 * Format relative time (e.g., "2 days ago")
 */
export const formatRelativeTime = (
  date: Date | string | null | undefined
): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];
  
  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'Just now';
};

/**
 * Parse a date that may be a YYYY-MM-DD string into a local Date without TZ shift
 */
export const parseLocalDate = (
  date: Date | string | null | undefined
): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return date;
  // Detect date-only string to avoid UTC shift
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (m) {
    const [_, y, mo, d] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d));
  }
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Format a date (supports YYYY-MM-DD) to 'MMM d, yyyy' without TZ shift for date-only
 */
export const formatDateLocal = (
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  const d = parseLocalDate(date);
  if (!d) return '';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(d);
};
export const formatBusinessHours = (
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string => {
  if (!startTime || !endTime) return 'Hours not specified';
  
  // Convert 24-hour format to 12-hour format
  const formatHour = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };
  
  return `${formatHour(startTime)} - ${formatHour(endTime)}`;
};

/**
 * Format phone numbers with US format
 */
export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';
  
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX for 10 digits
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Format as +1 (XXX) XXX-XXXX for 11 digits starting with 1
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  // Return original if it doesn't match expected patterns
  return phone;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (
  text: string | null | undefined,
  maxLength: number = 50
): string => {
  if (!text) return '';
  
  if (text.length <= maxLength) return text;
  
  return text.slice(0, maxLength).trim() + '...';
};

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes: number | null | undefined): string => {
  if (bytes == null || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};