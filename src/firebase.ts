// Firebase initialization


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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
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
