/**
 * Firebase Authentication Error Codes → User-Friendly Messages
 * 
 * Maps Firebase error codes to clear, actionable messages.
 * Add new error codes here as needed.
 */

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  // Credential errors
  'auth/invalid-credential': 'Invalid email or password',
  'auth/wrong-password': 'Invalid email or password',
  'auth/user-not-found': 'No account found with this email',
  
  // Registration errors
  'auth/email-already-in-use': 'This email is already registered',
  'auth/weak-password': 'Password must be at least 6 characters',
  'auth/invalid-email': 'Please enter a valid email address',
  
  // Account status
  'auth/user-disabled': 'This account has been disabled',
  'auth/too-many-requests': 'Too many attempts. Please try again later',
  
  // OAuth errors
  'auth/operation-not-allowed': 'This sign-in method is not enabled',
  'auth/popup-closed-by-user': 'Sign-in was cancelled',
  'auth/cancelled-popup-request': 'Only one sign-in window allowed at a time',
  'auth/popup-blocked': 'Sign-in popup was blocked by browser',
};

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again';

/**
 * Converts Firebase errors to user-friendly messages
 */
export function getFirebaseErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    return FIREBASE_ERROR_MESSAGES[code] ?? DEFAULT_ERROR_MESSAGE;
  }
  return DEFAULT_ERROR_MESSAGE;
}

