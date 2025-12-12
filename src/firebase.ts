// 🔥 TEMP DEBUG — MUST BE AT VERY TOP
// @ts-ignore
window.firebaseAuthLoaded = "YES - FIREBASE FILE RAN";
console.log("🔥 FIREBASE FILE LOADED");


import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  signInAnonymously 
} from "firebase/auth";



const firebaseConfig = {
  apiKey: "AIzaSyAgwFECmmUXjyaZc2r6554IsffPBFmmsXY",
  authDomain: "reglazemequote.firebaseapp.com",
  projectId: "reglazemequote",
  storageBucket: "reglazemequote.firebasestorage.app",


  messagingSenderId: "573136801814",
  appId: "1:573136801814:web:10c33d828c3485d5a7e537",
  measurementId: "G-J47F8N177B",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// ⭐ Enable persistent auth so user keeps the same UID after refresh
setPersistence(auth, browserLocalPersistence)
  .then(() => signInAnonymously(auth))
  .catch((err) => {
    console.error("Auth persistence or anonymous login failed:", err);
  });

export const db = getFirestore(app);

export const storage = getStorage(app);

// TEMP DEBUG — confirm firebase.ts was loaded
// @ts-ignore
