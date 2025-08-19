// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/dashboard/Dashboard';
import ProfilePage from './components/profile/ProfilePage';
import ClientsPage from './components/clients/ClientsPage';
import RoutinesPage from './components/routines/RoutinesPage';
import CreateRoutinePage from './components/routines/CreateRoutinePage';
import ClientDetail from './components/clients/ClientDetail'; // Importa ClientDetail
import RoutineDetail from './components/routines/RoutineDetail'; // Importa RoutineDetail
import { AuthProvider, useAuth } from './contexts/AuthContext'; // <--- Importa AuthProvider i useAuth

// Layout del router amb comprovació d'autenticació
const AppRoutes = () => {
    const { currentUser, loading } = useAuth(); // Utilitza useAuth aquí

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Carregant autenticació...</div>;
    }

    return (
        <Routes>
            {/* Rutes públiques o sense autenticació */}
            <Route path="/" element={currentUser ? <Navigate to="/dashboard" /> : <LoginPrompt />} /> {/* Redirigeix si ja està autenticat */}

            {/* Rutes protegides (requereixen autenticació) */}
            {currentUser ? (
                <>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/clients" element={<ClientsPage />} />
                    <Route path="/clients/:clientId" element={<ClientDetail />} /> {/* Ruta per detalls del client */}
                    <Route path="/routines" element={<RoutinesPage />} />
                    <Route path="/routines/:routineId" element={<RoutineDetail />} /> {/* Ruta per detalls de la rutina */}
                    <Route path="/create-routine" element={<CreateRoutinePage />} />
                </>
            ) : (
                <Route path="*" element={<Navigate to="/" replace />} /> // Redirigeix a la pàgina d'inici si no està autenticat
            )}
        </Routes>
    );
};

// Component simple per mostrar un missatge d'inici de sessió
const LoginPrompt = () => {
    const { signIn } = useAuth(); // Obté la funció signIn del context
    const [error, setError] = React.useState('');

    const handleLogin = async () => {
        try {
            await signIn();
        } catch (e) {
            setError("No s'ha pogut iniciar sessió. Si us plau, torna-ho a provar.");
            console.error("Login error:", e);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
            <h1 className="text-4xl font-bold mb-6 text-teal-400">Benvingut a l'Aplicació d'Entrenament</h1>
            <p className="text-lg text-gray-300 mb-8 text-center">
                Aquesta aplicació requereix autenticació. Si us plau, fes clic al botó de sota per iniciar sessió.
            </p>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <button
                onClick={handleLogin}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg text-xl font-semibold transition duration-200"
            >
                Iniciar Sessió (Anònimament)
            </button>
            <p className="mt-8 text-gray-500 text-sm text-center">
                La teva informació de perfil es guardarà automàticament un cop iniciïs sessió.
            </p>
        </div>
    );
};


const App = () => {
    return (
        <Router>
            <AuthProvider> {/* Embolica tota l'aplicació amb AuthProvider */}
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
};

export default App;
