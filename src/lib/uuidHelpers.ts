/**
 * Sanitizes a UUID value to ensure it's valid for database insertion.
 * Converts empty strings and undefined to null, which PostgreSQL accepts.
 * 
 * @param value - The UUID value to sanitize (can be string, null, or undefined)
 * @returns null if the value is empty/undefined, otherwise returns the original value
 */
export function sanitizeUUID(value: string | null | undefined): string | null {
  if (!value || value === '') {
    return null;
  }
  return value;
}
