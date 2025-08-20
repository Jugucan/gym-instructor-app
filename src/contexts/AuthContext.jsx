// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase.jsx'; // Importar des del fitxer centralitzat

// Crear el context
const AuthContext = createContext();

// Hook personalitzat per utilitzar el context d'autenticació
export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);

    // Funció per iniciar sessió anònimament o amb un token personalitzat
    const signIn = async () => {
        try {
            const initialAuthToken = import.meta.env.VITE_INITIAL_AUTH_TOKEN || null;
            console.log('Starting sign in process...');
            
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
                console.log('Signed in with custom token');
            } else {
                await signInAnonymously(auth);
                console.log('Signed in anonymously');
            }
        } catch (error) {
            console.error("Error during authentication:", error);
            throw error;
        }
    };

    useEffect(() => {
        console.log('Setting up auth state listener...');
        
        // Escolta els canvis en l'estat d'autenticació
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('Auth state changed:', user ? `User ID: ${user.uid}` : 'No user');
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
