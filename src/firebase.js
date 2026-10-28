// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// Si no hay variables VITE_FIREBASE_* (por ejemplo en producción) se usa la
// configuración de producción de siempre. Para staging, ver .env.example
const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyBFQsRmXU7JKLpJp6O8RMJytIJQoxhNv7I",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "la-purisima-conchi.firebaseapp.com",
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || "https://la-purisima-conchi-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "la-purisima-conchi",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "la-purisima-conchi.appspot.com",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1088437635815",
  appId: env.VITE_FIREBASE_APP_ID || "1:1088437635815:web:97a37a40e53c99e55bf042"
};

const app = initializeApp(firebaseConfig);

const dbRealtime = getDatabase(app);  // ✅ Solo Realtime
const auth = getAuth(app);            // ✅ Autenticación

export { dbRealtime, auth };          // ✅ Exporta solo lo que usas
