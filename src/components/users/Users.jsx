import React, { useState } from 'react';
import { doc, getDoc, setDoc, collection, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { formatDate } from '../../utils/dateHelpers.jsx'; // Helper for formatting dates (Corrected to .jsx)
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx'; // Helper for Firebase paths (Corrected to .jsx)
import { MessageModal } from '../common/MessageModal.jsx'; // Corrected syntax: from instead of =>


const Users = ({ users, gyms, db, currentUserId, appId }) => {
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [userBirthDay, setUserBirthDay] = useState(''); // New state for day
  const [userBirthMonth, setUserBirthMonth] = useState(''); // New state for month
  const [userAge, setUserAge] = useState(''); // New state for age
  const [userSessions, setUserSessions] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [userGymId, setUserGymId] = useState('');
  const [userPhone, setUserPhone] = '';
  const [userEmail, setUserEmail] = '';
  const [userPhotoUrl, setUserPhotoUrl] = '';

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  // Helper function to calculate age (needed for displaying existing user's age)
  const calculateAge = (birthday) => {
    if (!birthday) return 'N/A';
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setUserName('');
    setUserBirthDay('');
    setUserBirthMonth('');
    setUserAge('');
    setUserSessions('');
    setUserNotes('');
    setUserGymId('');
    setUserPhone('');
    setUserEmail('');
    setUserPhotoUrl('');
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserName(user.name);
    // Parse existing birthday for the new fields
    const birthDate = new Date(user.birthday);
    setUserBirthDay(birthDate.getDate());
    setUserBirthMonth(birthDate.getMonth() + 1); // Months are 0-indexed in JS Date
    setUserAge(calculateAge(user.birthday)); // Calculate age from stored birthday

    setUserSessions(user.usualSessions.join(', '));
    setUserNotes(user.notes);
    setUserGymId(user.gymId || '');
    setUserPhone(user.phone || '');
    setUserEmail(user.email || '');
    setUserPhotoUrl(user.photoUrl || '');
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!userName || !userBirthDay || !userBirthMonth || !userAge || !userGymId) {
      setMessageModalContent({
        title: 'Error de Validació',
        message: 'El nom, el dia, el mes, l\'edat i el gimnàs són obligatoris.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }

    // Calculate full birthday from day, month, and age
    const today = new Date();
    const currentYear = today.getFullYear();
    let birthYear = currentYear - userAge;

    // Check if the birthday has already passed this year to adjust the birthYear
    const birthDateThisYear = new Date(currentYear, userBirthMonth - 1, userBirthDay);
    if (birthDateThisYear > today) {
      birthYear--; // Birthday hasn't happened yet this year, so the person is one year younger based on previous year's birthday
    }

    // Format the calculated birthday as YYYY-MM-DD
    const calculatedBirthday = `${birthYear.toString()}-${String(userBirthMonth).padStart(2, '0')}-${String(userBirthDay).padStart(2, '0')}`;

    if (!db || !currentUserId || !appId) {
      setMessageModalContent({
        title: 'Error de Connexió',
        message: 'La base de dades no està connectada. Si us plau, recarrega la pàgina o contacta amb el suport.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }

    const newUser = {
      name: userName,
      birthday: calculatedBirthday, // Use the calculated birthday
      usualSessions: userSessions.split(',').map(s => s.trim()).filter(Boolean),
      notes: userNotes,
      gymId: userGymId,
      phone: userPhone,
      email: userEmail,
      photoUrl: userPhotoUrl,
    };

    try {
      const usersCollectionPath = getUserCollectionPath(appId, currentUserId, 'users');
      if (!usersCollectionPath) return;

      if (editingUser) {
        const userRef = doc(db, usersCollectionPath, editingUser.id);
        await updateDoc(userRef, newUser);
      } else {
        await addDoc(collection(db, usersCollectionPath), newUser);
      }
      setShowUserModal(false);
      setMessageModalContent({
        title: 'Usuari Guardat',
        message: 'L\'usuari s\'ha guardat correctament!',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    } catch (error) {
      console.error("Error saving user:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar l'usuari: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleDeleteUser = (userId) => {
    if (!db || !currentUserId || !appId) {
      setMessageModalContent({
        title: 'Error de Connexió',
        message: 'La base de dades no està connectada. Si us plau, recarrega la pàgina o contacta amb el suport.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }
    setMessageModalContent({
      title: 'Confirmar Eliminació',
      message: 'Estàs segur que vols eliminar aquest usuari?',
      isConfirm: true,
      onConfirm: async () => {
        try {
          const usersCollectionPath = getUserCollectionPath(appId, currentUserId, 'users');
          if (!usersCollectionPath) return;

          await deleteDoc(doc(db, usersCollectionPath, userId));
          setShowMessageModal(false); // Close confirm modal
          setMessageModalContent({ // Show success alert
            title: 'Eliminat',
            message: 'Usuari eliminat correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
        } catch (error) {
          console.error("Error deleting user:", error);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar l'usuari: ${error.message}`,
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
        }
      },
      onCancel: () => setShowMessageModal(false),
    });
    setShowMessageModal(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió d'Usuaris</h1>
      <button
        onClick={handleAddUser}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-6"
      >
        Afegir Nou Usuari
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.length > 0 ? users.map(user => (
          <div
            key={user.id}
            className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between hover:shadow-lg transition duration-300 ease-in-out"
          >
            <div className="flex items-start">
              <div className="flex-grow">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{user.name}</h2>
                <p className="text-gray-600 text-sm">Aniversari: <span className="font-medium">{formatDate(user.birthday)}</span> (<span className="font-medium">{calculateAge(user.birthday)} anys</span>)</p>
                <p className="text-gray-600 text-sm">Gimnàs: <span className="font-medium">{gyms.find(g => g.id === user.gymId)?.name || 'N/A'}</span></p>
                {user.usualSessions.length > 0 && (
                  <p className="text-gray-600 text-sm">Sessions habituals: <span className="font-medium">{user.usualSessions.join(', ')}</span></p>
                )}
                {user.phone && <p className="text-gray-600 text-sm">Telèfon: <span className="font-medium">{user.phone}</span></p>}
                {user.email && <p className="text-gray-600 text-sm">Correu: <span className="font-medium">{user.email}</span></p>}
                {user.notes && <p className="text-gray-600 text-sm italic mt-2">"{user.notes}"</p>}
              </div>
              {user.photoUrl && (
                <img
                  src={user.photoUrl}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover ml-4 flex-shrink-0"
                  onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/50x50/cccccc/333333?text=${user.name.charAt(0).toUpperCase()}`; }}
                />
              )}
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => handleEditUser(user)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 text-sm rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Editar
              </button>
              <button
                onClick={() => handleDeleteUser(user.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 text-sm rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Eliminar
              </button>
            </div>
          </div>
        )) : <p className="text-gray-500">No hi ha usuaris definits. Afegeix el primer!</p>}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingUser ? 'Editar Usuari' : 'Afegir Nou Usuari'}</h2>
            <div className="mb-4">
              <label htmlFor="userName" className="block text-gray-700 text-sm font-bold mb-2">Nom:</label>
              <input
                type="text"
                id="userName"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </div>
            {/* New birthday inputs */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="userBirthDay" className="block text-gray-700 text-sm font-bold mb-2">Dia:</label>
                <input
                  type="number"
                  id="userBirthDay"
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userBirthDay}
                  onChange={(e) => setUserBirthDay(parseInt(e.target.value) || '')}
                  min="1"
                  max="31"
                  required
                />
              </div>
              <div>
                <label htmlFor="userBirthMonth" className="block text-gray-700 text-sm font-bold mb-2">Mes:</label>
                <select
                  id="userBirthMonth"
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userBirthMonth}
                  onChange={(e) => setUserBirthMonth(parseInt(e.target.value) || '')}
                  required
                >
                  <option value="">Selecciona</option>
                  <option value="1">Gener</option>
                  <option value="2">Febrer</option>
                  <option value="3">Març</option>
                  <option value="4">Abril</option>
                  <option value="5">Maig</option>
                  <option value="6">Juny</option>
                  <option value="7">Juliol</option>
                  <option value="8">Agost</option>
                  <option value="9">Setembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Novembre</option>
                  <option value="12">Desembre</option>
                </select>
              </div>
              <div>
                <label htmlFor="userAge" className="block text-gray-700 text-sm font-bold mb-2">Edat:</label>
                <input
                  type="number"
                  id="userAge"
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userAge}
                  onChange={(e) => setUserAge(parseInt(e.target.value) || '')}
                  min="0"
                  required
                />
              </div>
            </div>
            {/* End new birthday inputs */}
            <div className="mb-4">
              <label htmlFor="userGym" className="block text-gray-700 text-sm font-bold mb-2">Gimnàs:</label>
              <select
                id="userGym"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userGymId}
                onChange={(e) => setUserGymId(e.target.value)}
                required
              >
                <option value="">Selecciona un gimnàs</option>
                {gyms.map(gym => (
                  <option key={gym.id} value={gym.id}>{gym.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="userSessions" className="block text-gray-700 text-sm font-bold mb-2">Sessions Habituals (separades per coma, ex: BP, SB):</label>
              <input
                type="text"
                id="userSessions"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userSessions}
                onChange={(e) => setUserSessions(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="userPhone" className="block text-gray-700 text-sm font-bold mb-2">Telèfon (Opcional):</label>
              <input
                type="tel"
                id="userPhone"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="userEmail" className="block text-gray-700 text-sm font-bold mb-2">Correu Electrònic (Opcional):</label>
              <input
                type="email"
                id="userEmail"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="userPhotoUrl" className="block text-gray-700 text-sm font-bold mb-2">URL Foto (Opcional):</label>
              <input
                type="url"
                id="userPhotoUrl"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userPhotoUrl}
                onChange={(e) => setUserPhotoUrl(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="userNotes" className="block text-gray-700 text-sm font-bold mb-2">Notes:</label>
              <textarea
                id="userNotes"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowUserModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleSaveUser}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Guardar Usuari
              </button>
            </div>
          </div>
        </div>
      )}
      {showMessageModal && (
        <MessageModal
          show={showMessageModal}
          title={messageModalContent.title}
          message={messageModalContent.message}
          onConfirm={messageModalContent.onConfirm}
          onCancel={messageModalContent.onCancel}
          isConfirm={messageModalContent.isConfirm}
        />
      )}
    </div>
  );
};

export default Users;
