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

// Obtenir la configuració de Firebase de les variables d'entorn
const firebaseConfig = import.meta.env.VITE_FIREBASE_CONFIG 
    ? JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG) 
    : {};

// Verificar si l'app ja està inicialitzada
import { getApps, getApp } from 'firebase/app';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null); // Afegit per tenir l'userId disponible al context

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
            throw error; // Propagar l'error perquè els components puguin gestionar-lo
        }
    };

    useEffect(() => {
        // Escolta els canvis en l'estat d'autenticació
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setUserId(user ? user.uid : null); // Actualitzar userId al context
            setLoading(false);
        });

        // Neteja el listener quan el component es desmunta
        return unsubscribe;
    }, []);

    // Proporcionar el valor del context a tots els components fills
    const value = {
        currentUser,
        userId, // Fer l'userId disponible
        loading,
        signIn // Afegir la funció de signIn al context
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children} {/* Renderitzar els fills només quan l'estat d'autenticació s'hagi carregat */}
        </AuthContext.Provider>
    );
}
