import React, { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx'; // Confirmat: .jsx
import { formatDate } from '../../utils/dateHelpers.jsx'; // Confirmat: .jsx
import { MessageModal } from '../common/MessageModal.jsx'; // Confirmat: .jsx

const Users = ({ users, gyms, db, currentUserId, appId }) => {
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [userBirthday, setUserBirthday] = useState('');
  const [userSessions, setUserSessions] = useState(''); // Comma-separated string for usual sessions
  const [userNotes, setUserNotes] = useState('');
  const [userGymId, setUserGymId] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhotoUrl, setUserPhotoUrl] = useState('');

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const handleSaveUser = async () => {
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

    if (!userName || !userBirthday || !userGymId) {
      setMessageModalContent({
        title: 'Camps Obligatoris',
        message: 'El nom, la data d\'aniversari i el gimnàs són obligatoris.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }

    const newUser = {
      name: userName,
      birthday: userBirthday,
      usualSessions: userSessions.split(',').map(s => s.trim()).filter(Boolean),
      notes: userNotes,
      gymId: userGymId,
      phone: userPhone,
      email: userEmail,
      photoUrl: userPhotoUrl,
    };

    const usersPath = getUserCollectionPath(appId, currentUserId, 'users');
    if (!usersPath) return;

    try {
      if (editingUser) {
        const userRef = doc(db, usersPath, editingUser.id);
        await updateDoc(userRef, newUser);
        setMessageModalContent({
          title: 'Usuari Actualitzat',
          message: 'L\'usuari s\'ha actualitzat correctament.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
      } else {
        await addDoc(collection(db, usersPath), newUser);
        setMessageModalContent({
          title: 'Usuari Afegit',
          message: 'El nou usuari s\'ha afegit correctament.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
      }
      setShowMessageModal(true);
      setShowUserModal(false);
      setUserName('');
      setUserBirthday('');
      setUserSessions('');
      setUserNotes('');
      setUserGymId('');
      setUserPhone('');
      setUserEmail('');
      setUserPhotoUrl('');
      setEditingUser(null);
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
      message: 'Estàs segur que vols eliminar aquest usuari? Aquesta acció és irreversible.',
      isConfirm: true,
      onConfirm: async () => {
        const usersPath = getUserCollectionPath(appId, currentUserId, 'users');
        if (!usersPath) return;
        try {
          await deleteDoc(doc(db, usersPath, userId));
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Eliminat',
            message: 'Usuari eliminat correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        } catch (error) {
          console.error("Error deleting user:", error);
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar l'usuari: ${error.message}`,
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        }
      },
      onCancel: () => setShowMessageModal(false),
    });
    setShowMessageModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserBirthday(user.birthday);
    setUserSessions(user.usualSessions ? user.usualSessions.join(', ') : '');
    setUserNotes(user.notes || '');
    setUserGymId(user.gymId || '');
    setUserPhone(user.phone || '');
    setUserEmail(user.email || '');
    setUserPhotoUrl(user.photoUrl || '');
    setShowUserModal(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió d'Usuaris</h1>

      <button
        onClick={() => { setShowUserModal(true); setEditingUser(null); setUserName(''); setUserBirthday(''); setUserSessions(''); setUserNotes(''); setUserGymId(''); setUserPhone(''); setUserEmail(''); setUserPhotoUrl(''); }}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-6"
      >
        Afegir Nou Usuari
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(user => (
          <div key={user.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex items-center space-x-4">
            <img
              src={user.photoUrl || `https://placehold.co/50x50/aabbcc/ffffff?text=${user.name.charAt(0)}`}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/50x50/aabbcc/ffffff?text=${user.name.charAt(0)}`; }}
            />
            <div className="flex-grow">
              <h2 className="text-xl font-semibold text-gray-800">{user.name}</h2>
              <p className="text-sm text-gray-600">Aniversari: {formatDate(user.birthday)}</p>
              <p className="text-sm text-gray-600">Gimnàs: {gyms.find(g => g.id === user.gymId)?.name || 'N/A'}</p>
              {user.usualSessions && user.usualSessions.length > 0 && (
                <p className="text-sm text-gray-600">Sessions habituals: {user.usualSessions.join(', ')}</p>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleEditUser(user)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
              >
                Editar
              </button>
              <button
                onClick={() => handleDeleteUser(user.id)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {showUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingUser ? 'Editar Usuari' : 'Afegir Nou Usuari'}</h2>
            <div className="mb-4">
              <label htmlFor="userName" className="block text-gray-700 text-sm font-bold mb-2">Nom de l'Usuari:</label>
              <input
                type="text"
                id="userName"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="userBirthday" className="block text-gray-700 text-sm font-bold mb-2">Data d'Aniversari:</label>
              <input
                type="date"
                id="userBirthday"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userBirthday}
                onChange={(e) => setUserBirthday(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="userGym" className="block text-gray-700 text-sm font-bold mb-2">Gimnàs Principal:</label>
              <select
                id="userGym"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userGymId}
                onChange={(e) => setUserGymId(e.target.value)}
              >
                <option value="">Selecciona un gimnàs</option>
                {gyms.map(gym => (
                  <option key={gym.id} value={gym.id}>{gym.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="userSessions" className="block text-gray-700 text-sm font-bold mb-2">Sessions Habituals (separades per comes):</label>
              <input
                type="text"
                id="userSessions"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userSessions}
                onChange={(e) => setUserSessions(e.target.value)}
                placeholder="Ex: BP, BC, SB"
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
              <label htmlFor="userEmail" className="block text-gray-700 text-sm font-bold mb-2">Email (Opcional):</label>
              <input
                type="email"
                id="userEmail"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="userPhotoUrl" className="block text-gray-700 text-sm font-bold mb-2">URL Foto de Perfil (Opcional):</label>
              <input
                type="text"
                id="userPhotoUrl"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userPhotoUrl}
                onChange={(e) => setUserPhotoUrl(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="userNotes" className="block text-gray-700 text-sm font-bold mb-2">Notes (Opcional):</label>
              <textarea
                id="userNotes"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                rows="3"
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
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
                {editingUser ? 'Guardar Canvis' : 'Afegir Usuari'}
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
