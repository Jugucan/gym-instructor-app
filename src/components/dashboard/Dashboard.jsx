// src/components/dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, query, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase.jsx'; // Importar des del fitxer centralitzat
import { getLocalDateString, normalizeDateToStartOfDay, formatDate, parseDateString } from '../../utils/dateHelpers.jsx';
import { FaUserEdit, FaSave, FaTimesCircle, FaPlusCircle, FaTrashAlt } from 'react-icons/fa';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Obtenir appId des de variables d'entorn
const appId = import.meta.env.VITE_APP_ID || 'default-app-id';

const Dashboard = () => {
    const { currentUser, signIn, userId } = useAuth();
    const [userData, setUserData] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [clients, setClients] = useState([]);
    const [newClientName, setNewClientName] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        console.log('Dashboard useEffect - userId:', userId);
        
        // Si no hi ha userId, no fem res
        if (!userId) {
            setLoading(false);
            return;
        }

        const loadDashboardData = async () => {
            console.log('Loading dashboard data for user:', userId);
            setLoading(true);
            await fetchUserData(userId);
            const unsubscribeClients = await fetchClients(userId);
            setLoading(false);
            
            // Retornar funció de neteja
            return () => {
                if (unsubscribeClients) {
                    console.log('Cleaning up clients listener');
                    unsubscribeClients();
                }
            };
        };

        loadDashboardData();
    }, [userId]);

    const fetchUserData = async (currentUserId) => {
        try {
            console.log('Fetching user data for:', currentUserId);
            const userDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/profile`, 'myProfile');
            const docSnap = await getDoc(userDocRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('User data found:', data);
                setUserData(data);
                setFormData(data);
            } else {
                console.log("No user profile document found, creating empty profile");
                setUserData({});
                setFormData({});
            }
        } catch (err) {
            console.error("Error fetching user data:", err);
            setError("Error loading profile data.");
        }
    };

    const fetchClients = async (currentUserId) => {
        try {
            console.log('Setting up clients listener for:', currentUserId);
            const clientsCollectionRef = collection(db, `artifacts/${appId}/users/${currentUserId}/clients`);
            const q = query(clientsCollectionRef);
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const clientsList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log('Clients updated:', clientsList.length, 'clients');
                setClients(clientsList);
            }, (err) => {
                console.error("Error fetching clients in real-time:", err);
                setError("Error loading client data.");
            });

            return unsubscribe;
        } catch (err) {
            console.error("Error fetching clients:", err);
            setError("Error loading client data.");
            return () => {}; // Return a no-op function if there's an error
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        if (!userId) {
            setError("User not authenticated.");
            return;
        }
        try {
            console.log('Saving user profile:', formData);
            const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'myProfile');
            await setDoc(userDocRef, formData, { merge: true });
            setUserData(formData);
            setEditMode(false);
            setMessage("Profile updated successfully!");
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error("Error updating document:", err);
            setError("Error saving profile data.");
        }
    };

    const handleCancel = () => {
        setFormData(userData);
        setEditMode(false);
        setError('');
    };

    const handleAddClient = async () => {
        if (!userId) {
            setError("User not authenticated.");
            return;
        }
        if (newClientName.trim() === '') {
            setError("Client name cannot be empty.");
            return;
        }
        try {
            console.log('Adding new client:', newClientName.trim());
            const clientsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/clients`);
            await addDoc(clientsCollectionRef, { 
                name: newClientName.trim(), 
                createdAt: new Date() 
            });
            setNewClientName('');
            setMessage("Client added successfully!");
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error("Error adding client:", err);
            setError("Error adding client.");
        }
    };

    const handleDeleteClient = async (clientId) => {
        if (!userId) {
            setError("User not authenticated.");
            return;
        }
        try {
            console.log('Deleting client:', clientId);
            const clientDocRef = doc(db, `artifacts/${appId}/users/${userId}/clients`, clientId);
            await deleteDoc(clientDocRef);
            setMessage("Client deleted successfully!");
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error("Error deleting client:", err);
            setError("Error deleting client.");
        }
    };

    // Redirigir si no hi ha usuari un cop ha carregat
    if (!userId && !loading) {
        console.log('No user and not loading, redirecting to home');
        return <Navigate to="/" />;
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Carregant dades del panell...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8 flex flex-col items-center">
            <header className="w-full max-w-4xl bg-gray-800 p-4 rounded-lg shadow-lg mb-8 flex flex-col sm:flex-row justify-between items-center">
                <h1 className="text-3xl font-bold text-teal-400 mb-4 sm:mb-0">El teu Panell</h1>
                <nav className="flex space-x-4">
                    <Link to="/profile" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition duration-200">Perfil</Link>
                    <Link to="/clients" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition duration-200">Clients</Link>
                    <Link to="/routines" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition duration-200">Rutines</Link>
                </nav>
            </header>

            <main className="w-full max-w-4xl bg-gray-800 p-6 rounded-lg shadow-lg">
                {error && <p className="text-red-500 mb-4">{error}</p>}
                {message && <p className="text-green-500 mb-4">{message}</p>}

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-teal-300 mb-4 flex justify-between items-center">
                        Informació Personal
                        {!editMode ? (
                            <button
                                onClick={() => setEditMode(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition duration-200 flex items-center"
                            >
                                <FaUserEdit className="mr-2" /> Editar Perfil
                            </button>
                        ) : (
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition duration-200 flex items-center"
                                >
                                    <FaSave className="mr-2" /> Guardar
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition duration-200 flex items-center"
                                >
                                    <FaTimesCircle className="mr-2" /> Cancel·lar
                                </button>
                            </div>
                        )}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm font-bold mb-2">Nom:</label>
                            {editMode ? (
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name || ''}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 border-gray-600"
                                />
                            ) : (
                                <p className="text-lg">{userData?.name || 'N/A'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm font-bold mb-2">Email:</label>
                            {editMode ? (
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email || ''}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 border-gray-600"
                                />
                            ) : (
                                <p className="text-lg">{userData?.email || 'N/A'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm font-bold mb-2">Telèfon:</label>
                            {editMode ? (
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone || ''}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 border-gray-600"
                                />
                            ) : (
                                <p className="text-lg">{userData?.phone || 'N/A'}</p>
                            )}
                        </div>
                    </div>
                </section>

                <hr className="my-8 border-gray-700" />

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-teal-300 mb-4">Els teus Clients</h2>
                    <div className="flex mb-4">
                        <input
                            type="text"
                            placeholder="Nom del nou client"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2 bg-gray-700 border-gray-600"
                        />
                        <button
                            onClick={handleAddClient}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition duration-200 flex items-center"
                        >
                            <FaPlusCircle className="mr-2" /> Afegir Client
                        </button>
                    </div>
                    {clients.length === 0 ? (
                        <p className="text-gray-400">Encara no s'han afegit clients.</p>
                    ) : (
                        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {clients.map((client) => (
                                <li key={client.id} className="bg-gray-700 p-4 rounded-lg shadow-md flex justify-between items-center">
                                    <div>
                                        <p className="text-xl font-medium">{client.name}</p>
                                        <p className="text-sm text-gray-400">Afegit: {client.createdAt ? formatDate(client.createdAt.toDate(), 'DD/MM/YYYY') : 'N/A'}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteClient(client.id)}
                                        className="text-red-500 hover:text-red-700 transition duration-200"
                                    >
                                        <FaTrashAlt />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <hr className="my-8 border-gray-700" />

                <section>
                    <h2 className="text-2xl font-semibold text-teal-300 mb-4">Accions Ràpides</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <Link to="/clients" className="block p-4 bg-gray-700 hover:bg-gray-600 rounded-lg shadow-md text-center transition duration-200">
                            Gestionar Clients
                        </Link>
                        <Link to="/routines" className="block p-4 bg-gray-700 hover:bg-gray-600 rounded-lg shadow-md text-center transition duration-200">
                            Veure Rutines
                        </Link>
                        <Link to="/create-routine" className="block p-4 bg-gray-700 hover:bg-gray-600 rounded-lg shadow-md text-center transition duration-200">
                            Crear Nova Rutina
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Dashboard;
