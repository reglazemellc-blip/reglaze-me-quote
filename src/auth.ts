// src/auth.ts
import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User
} from "firebase/auth";

export function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export function listenToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
