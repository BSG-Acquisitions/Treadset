/**
 * CRITICAL: Manifest signature timestamps must ALWAYS show seconds
 * This ensures legal compliance and accurate record-keeping
 */

/**
 * Format a timestamp for manifest signatures with second-level precision
 * @param date - The date to format (Date object, ISO string, or null)
 * @returns Formatted time string with seconds (e.g., "1:23:45 PM")
 */
export const formatManifestTimestamp = (date: Date | string | null | undefined): string => {
  if (!date) {
    return new Date().toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleTimeString('en-US', {
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Create a print name with timestamp for manifest signatures
 * @param name - The signer's name
 * @param signedAt - When the signature occurred
 * @returns Formatted string like "John Doe - 1:23:45 PM"
 */
export const createPrintNameWithTimestamp = (
  name: string | null | undefined,
  signedAt: Date | string | null | undefined,
  defaultName: string = 'Representative'
): string => {
  const displayName = name || defaultName;
  const timestamp = formatManifestTimestamp(signedAt);
  return `${displayName} - ${timestamp}`;
};
