import React, { useState, useMemo, useEffect } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';

// 1. LLIBRERIES D'EXPORTACIÓ:
// Hem eliminat les importacions de 'xlsx' i 'file-saver'
// perquè han de ser carregades globalment amb etiquetes <script> (CDN)
// i s'han d'accedir via window.XLSX i window.saveAs.

import { getUserCollectionPath } from '../../utils/firebasePaths.jsx'; 
import { formatDate, formatBirthdayWithAge, formatDateDDMMYYYY } from '../../utils/dateHelpers.jsx';
import { MessageModal } from '../common/MessageModal.jsx'; 

const Users = ({ users, gyms, db, currentUserId, appId }) => {
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [userBirthday, setUserBirthday] = useState('');
  const [userSessions, setUserSessions] = useState(''); // String separat per comes per a sessions habituals
  const [userNotes, setUserNotes] = useState('');
  const [userGymId, setUserGymId] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhotoUrl, setUserPhotoUrl] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  // Funció per obrir el modal d'afegir/editar
  const handleEditUser = (user = null) => {
    setEditingUser(user);
    if (user) {
      setUserName(user.name || '');
      setUserBirthday(user.birthday ? formatDate(user.birthday) : '');
      setUserSessions(user.usualSessions ? user.usualSessions.join(', ') : '');
      setUserNotes(user.notes || '');
      setUserGymId(user.gymId || (gyms.length > 0 ? gyms[0].id : ''));
      setUserPhone(user.phone || '');
      setUserEmail(user.email || '');
      setUserPhotoUrl(user.photoUrl || '');
    } else {
      setUserName('');
      setUserBirthday('');
      setUserSessions('');
      setUserNotes('');
      setUserGymId(gyms.length > 0 ? gyms[0].id : '');
      setUserPhone('');
      setUserEmail('');
      setUserPhotoUrl('');
    }
    setShowUserModal(true);
  };

  // Funció per guardar un usuari (nou o editat)
  const handleSaveUser = async () => {
    if (!userName || !userGymId) {
      setMessageModalContent({
        title: "Dades Faltants",
        message: "El nom de l'usuari i el gimnàs són camps obligatoris.",
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
        onCancel: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }

    try {
      const userSessionsArray = userSessions.split(',').map(s => s.trim()).filter(s => s);
      const userData = {
        name: userName,
        birthday: userBirthday || null,
        usualSessions: userSessionsArray,
        notes: userNotes,
        gymId: userGymId,
        phone: userPhone,
        email: userEmail,
        photoUrl: userPhotoUrl,
        // Altres camps que puguis necessitar
        lastUpdated: new Date().toISOString(),
      };

      const path = getUserCollectionPath(appId, currentUserId, 'users');
      if (!path) throw new Error("Ruta de col·lecció invàlida.");

      if (editingUser) {
        // Editar usuari existent
        const docRef = doc(db, path, editingUser.id);
        await updateDoc(docRef, userData);
        setMessageModalContent({
          title: "Èxit",
          message: `Usuari '${userName}' actualitzat correctament.`,
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
          onCancel: () => setShowMessageModal(false),
        });
      } else {
        // Afegir nou usuari
        await addDoc(collection(db, path), {
          ...userData,
          createdAt: new Date().toISOString(),
        });
        setMessageModalContent({
          title: "Èxit",
          message: `Nou usuari '${userName}' afegit correctament.`,
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
          onCancel: () => setShowMessageModal(false),
        });
      }
      setShowMessageModal(true);
      setShowUserModal(false);
    } catch (error) {
      console.error("Error al guardar l'usuari:", error);
      setMessageModalContent({
        title: "Error",
        message: `No s'ha pogut guardar l'usuari: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
        onCancel: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  // Funció per confirmar l'eliminació d'un usuari
  const handleDeleteConfirm = (userId, userName) => {
    setMessageModalContent({
      title: "Confirmar Eliminació",
      message: `Estàs segur que vols eliminar l'usuari '${userName}'? Aquesta acció és irreversible.`,
      isConfirm: true,
      onConfirm: () => {
        handleDeleteUser(userId);
        setShowMessageModal(false);
      },
      onCancel: () => setShowMessageModal(false),
    });
    setShowMessageModal(true);
  };

  // Funció per eliminar un usuari
  const handleDeleteUser = async (userId) => {
    try {
      const path = getUserCollectionPath(appId, currentUserId, 'users');
      if (!path) throw new Error("Ruta de col·lecció invàlida.");
      
      await deleteDoc(doc(db, path, userId));
      
      setMessageModalContent({
        title: "Èxit",
        message: "Usuari eliminat correctament.",
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
        onCancel: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    } catch (error) {
      console.error("Error al eliminar l'usuari:", error);
      setMessageModalContent({
        title: "Error",
        message: `No s'ha pogut eliminar l'usuari: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
        onCancel: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  // Funció d'exportació de dades
  const handleExportUsers = () => {
    // 2. COMPROVACIÓ DE LLIBRERIES GLOBALS
    if (typeof window.XLSX === 'undefined' || typeof window.saveAs === 'undefined') {
      setMessageModalContent({
        title: "Error de Llibreria (XLSX)",
        message: "La llibreria d'exportació (XLSX) o la de desar fitxers (FileSaver) no s'ha carregat correctament. Assegura't que els scripts de CDN estan inclosos al teu fitxer principal i recarrega la pàgina.",
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
        onCancel: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }
    
    try {
        const dataForExport = sortedUsers.map(user => {
            const gym = gyms.find(g => g.id === user.gymId);
            return {
                'ID Intern': user.id,
                'Nom Complet': user.name,
                'Data de Naixement': user.birthday ? formatDateDDMMYYYY(user.birthday) : '',
                'Edat': user.birthday ? formatBirthdayWithAge(user.birthday).match(/\((\d+)/)?.[1] || '' : '',
                'Sessions Habituals': user.usualSessions ? user.usualSessions.join(', ') : '',
                'Gimnàs Assignat': gym ? gym.name : 'Desconegut',
                'Telèfon': user.phone || '',
                'Email': user.email || '',
                'Notes': user.notes || '',
                'Creat a': user.createdAt ? formatDateDDMMYYYY(user.createdAt) : '',
                'Última Actualització': user.lastUpdated ? formatDateDDMMYYYY(user.lastUpdated) : '',
            };
        });

        const worksheet = window.XLSX.utils.json_to_sheet(dataForExport);
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, "Usuaris");
        
        const excelBuffer = window.XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
        
        window.saveAs(data, `llista_usuaris_${formatDateDDMMYYYY(new Date().toISOString())}.xlsx`);

    } catch (error) {
        console.error("Error durant l'exportació:", error);
        setMessageModalContent({
            title: "Error d'Exportació",
            message: `No s'ha pogut exportar el fitxer: ${error.message}`,
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
            onCancel: () => setShowMessageModal(false),
        });
        setShowMessageModal(true);
    }
  };


  // --- LÒGICA DE FILTRATGE I ORDENACIÓ ---

  const getGymName = (gymId) => {
    const gym = gyms.find(g => g.id === gymId);
    return gym ? gym.name : 'Desconegut';
  };

  const sortedUsers = useMemo(() => {
    let sortableItems = [...users];

    // 1. Filtrar
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      sortableItems = sortableItems.filter(user => 
        (user.name && user.name.toLowerCase().includes(lowerCaseQuery)) ||
        (user.phone && user.phone.includes(searchQuery)) ||
        (user.email && user.email.toLowerCase().includes(lowerCaseQuery)) ||
        (user.notes && user.notes.toLowerCase().includes(lowerCaseQuery)) ||
        (user.gymId && getGymName(user.gymId).toLowerCase().includes(lowerCaseQuery))
      );
    }

    // 2. Ordenar
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key] || '';
        let bValue = b[sortConfig.key] || '';

        // Tractament especial per a l'ordenació per nom de gimnàs
        if (sortConfig.key === 'gymId') {
            aValue = getGymName(a.gymId);
            bValue = getGymName(b.gymId);
        }
        
        // Ordre alfabètic per a la majoria de camps
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [users, searchQuery, sortConfig, gyms]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
    }
    if (sortConfig.direction === 'ascending') {
      return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
    }
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
  };


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b-4 border-blue-500 pb-2">Gestió d'Usuaris ({users.length})</h1>
      
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
        <input
          type="text"
          placeholder="Cercar per nom, telèfon, email o gimnàs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-1/2 p-3 border-2 border-gray-300 rounded-xl shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150"
        />
        
        <div className="flex space-x-4 w-full sm:w-auto">
            <button
            onClick={handleExportUsers}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-[1.02] transition duration-200 flex items-center justify-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                Exportar (XLSX)
            </button>
            <button
            onClick={() => handleEditUser(null)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-[1.02] transition duration-200 flex items-center justify-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                Nou Usuari
            </button>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="text-center p-10 bg-white rounded-xl shadow-md">
          <p className="text-xl text-gray-500">Encara no hi ha usuaris afegits.</p>
          <p className="text-md text-gray-400 mt-2">Fes clic a "Nou Usuari" per començar.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow-2xl">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-blue-100"
                  onClick={() => requestSort('name')}
                >
                  <div className="flex items-center">Nom {getSortIcon('name')}</div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-blue-100"
                  onClick={() => requestSort('gymId')}
                >
                  <div className="flex items-center">Gimnàs {getSortIcon('gymId')}</div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Edat / Aniversari
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Sessions Habituals
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Contacte
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Accions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.photoUrl ? (
                            <img className="h-10 w-10 rounded-full object-cover" src={user.photoUrl} alt={`Foto de ${user.name}`} onError={(e) => e.target.style.display = 'none'} />
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">{user.name[0]}</div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">ID: {user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                        {getGymName(user.gymId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.birthday ? formatBirthdayWithAge(user.birthday) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.usualSessions && user.usualSessions.length > 0 ? user.usualSessions.join(', ') : 'Cap assignada'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.phone && <div className="text-gray-800 font-semibold">{user.phone}</div>}
                    {user.email && <div className="text-gray-500 text-xs">{user.email}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="text-blue-600 hover:text-blue-900 mr-4 p-2 rounded-full hover:bg-blue-50 transition duration-150"
                      title="Editar Usuari"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-5.696 5.696l-3.355 3.355a1.5 1.5 0 00-.404 1.258l.613 2.76a.75.75 0 00.994.75l2.76.613a1.5 1.5 0 001.258-.404l3.355-3.355-2.828-2.828-3.355 3.355z" /></svg>
                    </button>
                    <button
                      onClick={() => handleDeleteConfirm(user.id, user.name)}
                      className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition duration-150"
                      title="Eliminar Usuari"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedUsers.length === 0 && searchQuery && (
             <div className="text-center p-6 text-gray-500">No s'han trobat usuaris que coincideixin amb la cerca.</div>
          )}
        </div>
      )}

      {/* Modal per Afegir/Editar Usuari */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowUserModal(false)}>
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg transition-transform transform scale-100" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">
              {editingUser ? 'Editar Usuari' : 'Afegir Nou Usuari'}
            </h2>
            
            {/* Formular d'Usuari */}
            <div className="space-y-4">
              {/* Nom */}
              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">Nom Complet <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  id="userName"
                  className="shadow-sm border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
              </div>

              {/* Gimnàs */}
              <div>
                <label htmlFor="userGymId" className="block text-sm font-medium text-gray-700 mb-1">Gimnàs <span className="text-red-500">*</span></label>
                <select
                  id="userGymId"
                  className="shadow-sm border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={userGymId}
                  onChange={(e) => setUserGymId(e.target.value)}
                  required
                >
                  <option value="" disabled>Selecciona un gimnàs</option>
                  {gyms.map(gym => (
                    <option key={gym.id} value={gym.id}>{gym.name}</option>
                  ))}
                </select>
              </div>

              {/* Data de Naixement */}
              <div>
                <label htmlFor="userBirthday" className="block text-sm font-medium text-gray-700 mb-1">Data de Naixement</label>
                <input
                  type="date"
                  id="userBirthday"
                  className="shadow-sm border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={userBirthday}
                  onChange={(e) => setUserBirthday(e.target.value)}
                />
              </div>

              {/* Telèfon i Email */}
              <div className="flex space-x-4">
                <div className="w-1/2">
                  <label htmlFor="userPhone" className="block text-sm font-medium text-gray-700 mb-1">Telèfon</label>
                  <input
                    type="tel"
                    id="userPhone"
                    className="shadow-sm border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                  />
                </div>
                <div className="w-1/2">
                  <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    id="userEmail"
                    className="shadow-sm border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Sessions Habituals */}
              <div>
                <label htmlFor="userSessions" className="block text-sm font-medium text-gray-700 mb-1">Sessions Habituals (separades per coma)</label>
                <input
                  type="text"
                  id="userSessions"
                  className="shadow-sm border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Dilluns 18:00, Dimarts 19:30"
                  value={userSessions}
                  onChange={(e) => setUserSessions(e.target.value)}
                />
              </div>
              
              {/* URL de la Foto */}
              <div>
                <label htmlFor="userPhotoUrl" className="block text-sm font-medium text-gray-700 mb-1">URL de la Foto de Perfil (Opcional)</label>
                <input
                  type="url"
                  id="userPhotoUrl"
                  className="shadow-sm border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userPhotoUrl}
                  onChange={(e) => setUserPhotoUrl(e.target.value)}
                />
              </div>


              {/* Notes */}
              <div>
                <label htmlFor="userNotes" className="block text-sm font-medium text-gray-700 mb-1">Notes Internes</label>
                <textarea
                  id="userNotes"
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  rows="3"
                ></textarea>
              </div>
            </div>

            {/* Botons d'acció */}
            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => setShowUserModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-xl shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleSaveUser}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition duration-300 ease-in-out"
              >
                {editingUser ? 'Guardar Canvis' : 'Afegir Usuari'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Missatge/Confirmació */}
      <MessageModal
          show={showMessageModal}
          title={messageModalContent.title}
          message={messageModalContent.message}
          onConfirm={messageModalContent.onConfirm}
          onCancel={messageModalContent.onCancel}
          isConfirm={messageModalContent.isConfirm}
      />
    </div>
  );
};

export default Users;
