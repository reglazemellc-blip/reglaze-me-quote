/**
 * Error handling utilities for Firebase operations
 * Provides consistent error messages and logging across the app
 */

import { FirebaseError } from 'firebase/app';

/**
 * Standard error types for the application
 */
export enum ErrorType {
  NETWORK = 'network',
  PERMISSION = 'permission',
  NOT_FOUND = 'not_found',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown',
}

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES = {
  [ErrorType.NETWORK]: 'Network error. Please check your connection and try again.',
  [ErrorType.PERMISSION]: 'You don\'t have permission to perform this action.',
  [ErrorType.NOT_FOUND]: 'The requested item was not found.',
  [ErrorType.VALIDATION]: 'Invalid data. Please check your input and try again.',
  [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.',
};

/**
 * Parse Firebase errors into user-friendly messages
 */
export function parseFirebaseError(error: unknown): { type: ErrorType; message: string } {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      // Network errors
      case 'unavailable':
      case 'deadline-exceeded':
      case 'failed-precondition':
        return { type: ErrorType.NETWORK, message: ERROR_MESSAGES[ErrorType.NETWORK] };

      // Permission errors
      case 'permission-denied':
      case 'unauthenticated':
        return { type: ErrorType.PERMISSION, message: ERROR_MESSAGES[ErrorType.PERMISSION] };

      // Not found errors
      case 'not-found':
        return { type: ErrorType.NOT_FOUND, message: ERROR_MESSAGES[ErrorType.NOT_FOUND] };

      // Validation errors
      case 'invalid-argument':
      case 'already-exists':
        return { type: ErrorType.VALIDATION, message: ERROR_MESSAGES[ErrorType.VALIDATION] };

      default:
        console.error('Unhandled Firebase error:', error.code, error.message);
        return { type: ErrorType.UNKNOWN, message: ERROR_MESSAGES[ErrorType.UNKNOWN] };
    }
  }

  // Non-Firebase errors
  if (error instanceof Error) {
    return { type: ErrorType.UNKNOWN, message: error.message };
  }

  return { type: ErrorType.UNKNOWN, message: ERROR_MESSAGES[ErrorType.UNKNOWN] };
}

/**
 * Wrap async Firestore operations with error handling
 * Logs errors and re-throws with user-friendly messages
 */
export async function handleFirestoreOperation<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const { type, message } = parseFirebaseError(error);
    console.error(`${context} failed:`, { type, error });
    throw new Error(message);
  }
}

/**
 * Wrap async operations with error handling and optional toast notification
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: {
    context: string;
    showToast?: boolean;
    toastStore?: { error: (message: string) => void };
  }
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const { message } = parseFirebaseError(error);
    console.error(`${options.context} failed:`, error);

    if (options.showToast && options.toastStore) {
      options.toastStore.error(message);
    }

    return null;
  }
}

/**
 * Validate required fields before Firestore operations
 */
export function validateRequired<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missing = requiredFields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Retry failed operations with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry permission or validation errors
      const { type } = parseFirebaseError(error);
      if (type === ErrorType.PERMISSION || type === ErrorType.VALIDATION) {
        throw lastError;
      }

      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
