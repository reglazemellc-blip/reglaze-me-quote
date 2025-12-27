// src/auth.ts
import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User
} from "firebase/auth";

/**
 * Authenticate user with email and password
 * @throws {Error} If authentication fails
 */
export function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
    .catch((error) => {
      console.error("Login failed:", error);
      // Re-throw with user-friendly message
      if (error.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed login attempts. Please try again later.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw new Error('Login failed. Please try again.');
    });
}

/**
 * Sign out the current user
 * @throws {Error} If sign out fails
 */
export function logout() {
  return signOut(auth)
    .catch((error) => {
      console.error("Logout failed:", error);
      throw new Error('Failed to sign out. Please try again.');
    });
}

/**
 * Listen to authentication state changes
 * Filters out anonymous users
 */
export function listenToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    if (user && user.isAnonymous) {
      callback(null);
      return;
    }
    callback(user);
  });
}

