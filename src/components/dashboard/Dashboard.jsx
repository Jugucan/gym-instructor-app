// Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getLocalDateString, normalizeDateToStartOfDay, formatDate, parseDateString } from '../../utils/dateHelpers.jsx'; // <--- LÍNIA CLAU ACTUALITZADA
import { FaUserEdit, FaSave, FaTimesCircle, FaPlusCircle, FaTrashAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom'; // Assuming react-router-dom is used for navigation
import { useAuth } from '../AuthContext'; // Assuming you have an AuthContext

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const Dashboard = () => {
    const { currentUser, signIn } = useAuth(); // Use useAuth hook for current user and signIn function
    const [userId, setUserId] = useState(null);
    const [userData, setUserData] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [clients, setClients] = useState([]);
    const [newClientName, setNewClientName] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                setUserId(user.uid);
                await fetchUserData(user.uid);
                await fetchClients(user.uid);
            } else {
                // If not authenticated, try to sign in anonymously
                try {
                    await signIn(); // Call signIn from AuthContext
                } catch (anonError) {
                    console.error("Error signing in anonymously:", anonError);
                    setError("Could not sign in. Please try again later.");
                    setLoading(false);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [signIn]); // Depend on signIn from useAuth

    const fetchUserData = async (currentUserId) => {
        try {
            const userDocRef = doc(db, `artifacts/${appId}/users/${currentUserId}/profile`, 'myProfile');
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                setUserData(docSnap.data());
                setFormData(docSnap.data());
            } else {
                console.log("No such document!");
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
            const clientsCollectionRef = collection(db, `artifacts/${appId}/users/${currentUserId}/clients`);
            const q = query(clientsCollectionRef);
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const clientsList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setClients(clientsList);
            }, (err) => {
                console.error("Error fetching clients in real-time:", err);
                setError("Error loading client data.");
            });

            return unsubscribe; // Return the unsubscribe function for cleanup
        } catch (err) {
            console.error("Error fetching clients:", err);
            setError("Error loading client data.");
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
            const clientsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/clients`);
            await addDoc(clientsCollectionRef, { name: newClientName.trim(), createdAt: new Date() });
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
            const clientDocRef = doc(db, `artifacts/${appId}/users/${userId}/clients`, clientId);
            await deleteDoc(clientDocRef);
            setMessage("Client deleted successfully!");
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error("Error deleting client:", err);
            setError("Error deleting client.");
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8 flex flex-col items-center">
            <header className="w-full max-w-4xl bg-gray-800 p-4 rounded-lg shadow-lg mb-8 flex flex-col sm:flex-row justify-between items-center">
                <h1 className="text-3xl font-bold text-teal-400 mb-4 sm:mb-0">Your Dashboard</h1>
                <nav className="flex space-x-4">
                    <Link to="/profile" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition duration-200">Profile</Link>
                    <Link to="/clients" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition duration-200">Clients</Link>
                    <Link to="/routines" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition duration-200">Routines</Link>
                </nav>
            </header>

            <main className="w-full max-w-4xl bg-gray-800 p-6 rounded-lg shadow-lg">
                {error && <p className="text-red-500 mb-4">{error}</p>}
                {message && <p className="text-green-500 mb-4">{message}</p>}

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-teal-300 mb-4 flex justify-between items-center">
                        Personal Information
                        {!editMode ? (
                            <button
                                onClick={() => setEditMode(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition duration-200 flex items-center"
                            >
                                <FaUserEdit className="mr-2" /> Edit Profile
                            </button>
                        ) : (
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition duration-200 flex items-center"
                                >
                                    <FaSave className="mr-2" /> Save
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition duration-200 flex items-center"
                                >
                                    <FaTimesCircle className="mr-2" /> Cancel
                                </button>
                            </div>
                        )}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm font-bold mb-2">Name:</label>
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
                            <label className="block text-gray-400 text-sm font-bold mb-2">Phone:</label>
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
                    <h2 className="text-2xl font-semibold text-teal-300 mb-4">Your Clients</h2>
                    <div className="flex mb-4">
                        <input
                            type="text"
                            placeholder="New client name"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2 bg-gray-700 border-gray-600"
                        />
                        <button
                            onClick={handleAddClient}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition duration-200 flex items-center"
                        >
                            <FaPlusCircle className="mr-2" /> Add Client
                        </button>
                    </div>
                    {clients.length === 0 ? (
                        <p className="text-gray-400">No clients added yet.</p>
                    ) : (
                        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {clients.map((client) => (
                                <li key={client.id} className="bg-gray-700 p-4 rounded-lg shadow-md flex justify-between items-center">
                                    <div>
                                        <p className="text-xl font-medium">{client.name}</p>
                                        {/* Using formatDate here is essential */}
                                        <p className="text-sm text-gray-400">Added: {client.createdAt ? formatDate(client.createdAt.toDate(), 'DD/MM/YYYY') : 'N/A'}</p>
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
                    <h2 className="text-2xl font-semibold text-teal-300 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <Link to="/clients" className="block p-4 bg-gray-700 hover:bg-gray-600 rounded-lg shadow-md text-center transition duration-200">
                            Manage Clients
                        </Link>
                        <Link to="/routines" className="block p-4 bg-gray-700 hover:bg-gray-600 rounded-lg shadow-md text-center transition duration-200">
                            View Routines
                        </Link>
                        <Link to="/create-routine" className="block p-4 bg-gray-700 hover:bg-gray-600 rounded-lg shadow-md text-center transition duration-200">
                            Create New Routine
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Dashboard;
