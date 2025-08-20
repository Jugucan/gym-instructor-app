// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Crear el context
const AuthContext = createContext();

// Hook personalitzat per utilitzar el context d'autenticació
export function useAuth() {
    return useContext(AuthContext);
}

// Funcions per inicialitzar Firebase de manera segura
function initializeFirebaseApp() {
    // Debug logs
    console.log('VITE_FIREBASE_CONFIG:', import.meta.env.VITE_FIREBASE_CONFIG);
    
    // Obtenir la configuració de Firebase de les variables d'entorn
    const firebaseConfig = import.meta.env.VITE_FIREBASE_CONFIG 
        ? JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG) 
        : {};
    
    console.log('Firebase config parsed:', firebaseConfig);
    console.log('Existing apps:', getApps().length);
    
    // Verificar si l'app ja està inicialitzada
    let app;
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
        console.log('Firebase app initialized');
    } else {
        app = getApp();
        console.log('Using existing Firebase app');
    }
    
    return app;
}

// Inicialitzar Firebase
const firebaseApp = initializeFirebaseApp();
const auth = getAuth(firebaseApp);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);

    // Funció per iniciar sessió anònimament o amb un token personalitzat
    const signIn = async () => {
        try {
            const initialAuthToken = import.meta.env.VITE_INITIAL_AUTH_TOKEN || null;
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth);
            }
        } catch (error) {
            console.error("Error during authentication:", error);
            throw error;
        }
    };

    useEffect(() => {
        // Escolta els canvis en l'estat d'autenticació
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('Auth state changed:', user ? user.uid : 'no user');
            setCurrentUser(user);
            setUserId(user ? user.uid : null);
            setLoading(false);
        });

        // Neteja el listener quan el component es desmunta
        return unsubscribe;
    }, []);

    // Proporcionar el valor del context a tots els components fills
    const value = {
        currentUser,
        userId,
        loading,
        signIn
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
