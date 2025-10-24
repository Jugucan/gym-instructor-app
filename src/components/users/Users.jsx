import React, { useState, useMemo } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
// 1. IMPORTAR LLIBRERIES D'EXPORTACIÓ
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver'; 

import { getUserCollectionPath } from '../../utils/firebasePaths.jsx'; 
import { formatDate, formatBirthdayWithAge, formatDateDDMMYYYY } from '../../utils/dateHelpers.jsx';
import { MessageModal } from '../common/MessageModal.jsx'; 

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
  
  // AFEGIT: Estat per al buscador
  const [searchTerm, setSearchTerm] = useState('');

  // AFEGIT: Ordenació alfabètica i filtrat dels usuaris
  const sortedAndFilteredUsers = useMemo(() => {
    let filteredUsers = users;
    
    // Filtrar segons el terme de cerca
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredUsers = users.filter(user => {
        const gymName = gyms.find(g => g.id === user.gymId)?.name || '';
        return (
          user.name.toLowerCase().includes(searchLower) ||
          gymName.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Ordenar alfabèticament
    return filteredUsers.sort((a, b) => {
      return a.name.localeCompare(b.name, 'ca', { sensitivity: 'base' });
    });
  }, [users, searchTerm, gyms]);

  // AFEGIT: Funció per obtenir els colors segons el gimnàs
  const getGymColors = (gymId) => {
    switch(gymId) {
      case 'sant_hilari':
        return {
          border: 'border-l-4 border-blue-500',
          background: 'bg-blue-50',
          badge: 'bg-blue-500 text-white',
          gymName: 'Sant Hilari'
        };
      case 'arbucies':
        return {
          border: 'border-l-4 border-green-500',
          background: 'bg-green-50',
          badge: 'bg-green-500 text-white',
          gymName: 'Arbúcies'
        };
      default:
        return {
          border: 'border-l-4 border-gray-400',
          background: 'bg-gray-50',
          badge: 'bg-gray-500 text-white',
          gymName: 'Desconegut'
        };
    }
  };

  // 2. NOVA FUNCIÓ D'EXPORTACIÓ A EXCEL (FINALMENT CORREGIDA)
  const exportToExcel = (data, fileName) => {
    // 2.1 Mapeig de dades: Preparem l'array d'usuaris amb les columnes que volem a l'Excel
    const dataForExport = data.map(user => {
      // Intentem trobar el nom del gimnàs
      const gymName = gyms.find(g => g.id === user.gymId)?.name || 'N/A';
      
      // >>>>> CORRECCIÓ CLAU: DEFINIR LA VARIABLE formattedDate AQUÍ <<<<<
      // Utilitzem formatDateDDMMYYYY i substituïm el guionet (-) per una barra (/)
      const formattedDate = user.birthday 
        ? formatDateDDMMYYYY(user.birthday).replace(/-/g, '/') 
        : 'N/A';
      
      return {
        'Nom Complet': user.name || 'N/A',
        'Gimnàs': gymName,
        'Data Aniversari': formattedDate, // Ara la variable existeix
        'Edat': user.birthday ? formatBirthdayWithAge(user.birthday).match(/\((\d+)\)/)?.[1] || 'N/A' : 'N/A', // Extreure només l'edat si és possible
        'Sessions Habituals': user.usualSessions && user.usualSessions.length > 0 ? user.usualSessions.join(', ') : '',
        'Telèfon': user.phone || '',
        'Email': user.email || '',
        'URL Foto Perfil': user.photoUrl || '',
        'Notes': user.notes || '',
        'ID (intern)': user.id, // ID intern per si el necessites
      };
    });

    // 2.2 Creació del Full de Càlcul
    const ws = XLSX.utils.json_to_sheet(dataForExport);
    
    // 2.3 Creació del Llibre de Treball i escriptura del fitxer
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuaris");
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    
    // 2.4 Desa el fitxer amb file-saver
    saveAs(dataBlob, fileName + '.xlsx');
  };    
  
  // --- MÈTODES EXISTENTS (handleSaveUser, handleDeleteUser, handleEditUser) ---
  
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
          message: 'La base de dades no està connectada. Si us plau, recarrega la pàgina or contacta amb el suport.',
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

      {/* AFEGIT: Buscador */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Buscar per nom, cognom o gimnàs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {/* AFEGIT: Mostrar nombre d'usuaris trobats */}
        <p className="text-sm text-gray-600 mt-2">
          {searchTerm ? 
            `${sortedAndFilteredUsers.length} usuari${sortedAndFilteredUsers.length !== 1 ? 's' : ''} trobar${sortedAndFilteredUsers.length !== 1 ? 's' : ''} de ${users.length}` : 
            `${users.length} usuari${users.length !== 1 ? 's' : ''} total${users.length !== 1 ? 's' : ''}`
          }
        </p>
      </div>

      {/* AFEGIT: Informació sobre els colors */}
      <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border-l-4 border-gray-400">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Llegenda de colors:</h3>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Sant Hilari</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Arbúcies</span>
          </div>
        </div>
      </div>
      
      {/* 3. BOTONS D'ACCIÓ */}
      <div className="flex justify-between mb-6">
        <button
          onClick={() => { setShowUserModal(true); setEditingUser(null); setUserName(''); setUserBirthday(''); setUserSessions(''); setUserNotes(''); setUserGymId(''); setUserPhone(''); setUserEmail(''); setUserPhotoUrl(''); }}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Afegir Nou Usuari
        </button>
        
        {/* NOU BOTÓ D'EXPORTAR */}
        <button
          onClick={() => exportToExcel(users, 'llista_usuaris')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Descarregar Usuaris a Excel 📥
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* MODIFICAT: Usar sortedAndFilteredUsers en lloc de sortedUsers */}
        {sortedAndFilteredUsers.length > 0 ? (
          sortedAndFilteredUsers.map(user => {
            const gymColors = getGymColors(user.gymId);
            return (
              <div key={user.id} className={`bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex items-start space-x-4 ${gymColors.border} ${gymColors.background}`}>
                <img
                  src={user.photoUrl || `https://placehold.co/50x50/aabbcc/ffffff?text=${user.name.charAt(0)}`}
                  alt={user.name}
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/50x50/aabbcc/ffffff?text=${user.name.charAt(0)}`; }}
                />
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-semibold text-gray-800">{user.name}</h2>
                    {/* AFEGIT: Badge per mostrar el gimnàs */}
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${gymColors.badge}`}>
                      {gymColors.gymName}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Aniversari: {formatBirthdayWithAge(user.birthday)}</p>
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
            );
          })
        ) : (
          // AFEGIT: Missatge quan no es troben usuaris
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No s'han trobat usuaris</h3>
            <p className="text-gray-500">
              {searchTerm ? 
                `No hi ha usuaris que coincideixin amb "${searchTerm}"` : 
                'No tens cap usuari encara'
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-blue-600 hover:text-blue-500 font-medium"
              >
                Esborrar cerca
              </button>
            )}
          </div>
        )}
      </div>

      {showUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto"> {/* Adjusted max-h */}
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





