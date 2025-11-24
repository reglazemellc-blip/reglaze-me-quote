// -------------------------------------------------------------
// firebase.ts — STORAGE + FIRESTORE CONFIG
// -------------------------------------------------------------

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// -------------------------------------------------------------
// Firebase Config
// -------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAgwFECmmUXjyaZc2r6554IsffPBFmmsXY",
  authDomain: "reglazemequote.firebaseapp.com",
  projectId: "reglazemequote",
  storageBucket: "reglazemequote.firebasestorage.app",   // <--- FIXED
  messagingSenderId: "573136801814",
  appId: "1:573136801814:web:10c33d828c3485d5a7e537",
  measurementId: "G-J47F8N177B",
};

// -------------------------------------------------------------
// Initialize App
// -------------------------------------------------------------
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
