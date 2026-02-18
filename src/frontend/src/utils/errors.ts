/**
 * Error normalization utility
 * Strips or replaces backend authorization trap messages to prevent them from being displayed in the UI
 */

/**
 * Normalizes error messages by removing or replacing authorization-related trap strings
 * @param error - The error object or message to normalize
 * @returns A sanitized error message suitable for display
 */
export function normalizeErrorMessage(error: unknown): string {
  let message = '';
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    message = 'Παρουσιάστηκε ένα σφάλμα';
  }
  
  // Check for authorization trap strings and replace them with generic messages
  const authPatterns = [
    /Unauthorized:\s*Only\s+users\s+can\s+perform\s+this\s+action/i,
    /Unauthorized:\s*Only\s+admins\s+can\s+perform\s+this\s+action/i,
    /Unauthorized:\s*Only\s+users\s+can\s+access\s+profiles/i,
    /Unauthorized:\s*Can\s+only\s+view\s+your\s+own\s+profile/i,
    /Unauthorized:/i,
  ];
  
  for (const pattern of authPatterns) {
    if (pattern.test(message)) {
      // Return a generic error message instead of the authorization trap string
      return 'Παρουσιάστηκε ένα σφάλμα κατά την επεξεργασία';
    }
  }
  
  return message;
}

/**
 * Creates a normalized Error object from any error input
 * @param error - The error to normalize
 * @returns A new Error with normalized message
 */
export function normalizeError(error: unknown): Error {
  const message = normalizeErrorMessage(error);
  return new Error(message);
}
