// src/firebase.jsx
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuració de Firebase des de variables d'entorn
const firebaseConfig = import.meta.env.VITE_FIREBASE_CONFIG 
    ? JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG) 
    : {};

console.log('Firebase config from environment:', firebaseConfig);

// Inicialitzar Firebase de manera segura
let app;
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('New Firebase app initialized');
} else {
    app = getApp();
    console.log('Using existing Firebase app');
}

// Exportar els serveis
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
