// -------------------------------------------------------------
// firebase.ts — STORAGE + FIRESTORE CONFIG
// -------------------------------------------------------------

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// -------------------------------------------------------------
// Your Firebase Config
// -------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAgwFECmmUXjyaZc2r6554IsffPBFmmsXY",
  authDomain: "reglazemequote.firebaseapp.com",
  projectId: "reglazemequote",
  storageBucket: "reglazemequote.appspot.com", // <-- FIXED
  messagingSenderId: "573136801814",
  appId: "1:573136801814:web:10c33d828c3485d5a7e537",
  measurementId: "G-J47F8N177B",
};

// -------------------------------------------------------------
// Initialize
// -------------------------------------------------------------
const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Storage — used by photos, attachments, etc.
export const storage = getStorage(app);
