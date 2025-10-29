import React, { useState, useMemo } from 'react';
// Només necessitem importar les funcions de firestore, ja que les utilitats s'han inlinat.
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore'; 

// 1. IMPORTAR LLIBRERIES D'EXPORTACIÓ (Deixem, assumint que es resolen en l'entorn d'execució)
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver'; 

// --- UTILITATS INLINE: Funció per construir rutes de Firestore (Anteriorment de firebasePaths.jsx) ---
const getUserCollectionPath = (appId, userId, collectionName) => {
    if (!appId || !userId || !collectionName) {
        console.error("getUserCollectionPath: Missing appId, userId, or collectionName.");
        return '';
    }
    return `artifacts/${appId}/users/${userId}/${collectionName}`;
};

const getAppCollectionPath = (appId, collectionName) => {
    if (!appId || !collectionName) {
        console.error("getAppCollectionPath: Missing appId or collectionName.");
        return '';
    }
    return `artifacts/${appId}/public/data/${collectionName}`;
};

// --- UTILITATS INLINE: Funcions d'ajuda de dates (Anteriorment de dateHelpers.jsx) ---
const formatDateDDMMYYYY = (dateString) => {
    if (!dateString) return 'N/A';
    // Format: DD/MM/YYYY
    const date = new Date(dateString);
    return date.toLocaleDateString('ca-ES', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    });
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    // Format: DD/MM/YYYY HH:MM:SS
    const date = new Date(dateString);
    return date.toLocaleDateString('ca-ES', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
};

const formatBirthdayWithAge = (dateString) => {
    if (!dateString) return 'N/A';
    const birthDate = new Date(dateString);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    // Format: DD/MM/YYYY (AGE)
    return `${formatDateDDMMYYYY(dateString)} (${age})`;
};


// --- COMPONENT INLINE: Modal de Missatges (Anteriorment de MessageModal.jsx) ---
const MessageModal = ({ show, title, message, onConfirm, onCancel, isConfirm = false }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96">
        <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          {isConfirm && (
            <button
              onClick={onCancel}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
            >
              Cancel·lar
            </button>
          )}
          <button
            onClick={onConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            {isConfirm ? 'Confirmar' : 'Acceptar'}
          </button>
        </div>
      </div>
    </div>
  );
};
// --- Fi de components i funcions inlines ---


// Obtenim 'db' i '__app_id' de l'àmbit global o context (assumit en entorn Canvas)
const db = typeof window.db !== 'undefined' ? window.db : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

/**
 * Analitza el text CSV i el converteix en un array d'objectes d'usuari.
 * S'espera que la primera columna sigui el Nom i la segona l'Email.
 * @param {string} text - Contingut complet del fitxer CSV.
 * @returns {{success: boolean, users: Array}}
 */
const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { success: false, users: [] }; 

    // Intentem detectar el separador (coma o punt i coma) utilitzant la primera línia de dades
    const firstDataLine = lines[1];
    let delimiter = firstDataLine.includes(';') ? ';' : ',';

    const usersToImport = [];

    // Iterem des de la segona línia (índex 1), ja que la primera és la capçalera
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; 

        // Dividim la línia utilitzant el separador detectat
        const values = line.split(delimiter).map(v => v.trim().replace(/"/g, '')); 

        // S'esperen almenys dos valors (Nom i Email)
        if (values.length < 2 || !values[0] || !values[1]) continue;

        const name = values[0];
        const email = values[1].toLowerCase(); 

        usersToImport.push({
            name: name,
            email: email,
            // Afegim dades d'inicialització estàndard
            status: 'active',
            roles: ['client'], 
            createdAt: new Date().toISOString(),
            // La resta de camps (birthday, sessions, notes, etc.) es deixen a valors per defecte o nuls
            // ja que el CSV només proporciona Nom i Email
        });
    }

    return { success: usersToImport.length > 0, users: usersToImport };
};

/**
 * Desa un array d'usuaris a la col·lecció pública de Firestore.
 * @param {Array<Object>} users - Llista d'objectes d'usuari a desar.
 * @param {Function} showMessage - Funció per mostrar missatges a l'usuari.
 * @param {Function} setIsImporting - Funció per gestionar l'estat de càrrega.
 */
const saveUsersToFirestore = async (users, showMessage, setIsImporting) => {
    if (!db || !appId) {
        showMessage('Error de Configuració', 'La connexió a la base de dades no està disponible.', 'error');
        setIsImporting(false);
        return;
    }

    let successfulImports = 0;
    let failedImports = 0;

    // Utilitzem getAppCollectionPath per a les dades d'usuaris públiques
    const usersCollectionPath = getAppCollectionPath(appId, 'users');
    if (!usersCollectionPath) {
        showMessage('Error de Configuració', 'No s\'ha pogut construir la ruta de la col·lecció d\'usuaris.', 'error');
        setIsImporting(false);
        return;
    }
    
    const usersCollectionRef = collection(db, usersCollectionPath);

    for (const user of users) {
        try {
            await addDoc(usersCollectionRef, user);
            successfulImports++;
        } catch (error) {
            console.error("Error saving user:", user, error);
            failedImports++;
        }
    }

    setIsImporting(false); 

    showMessage(
        'Importació Finalitzada',
        `Total d'usuaris processats: ${users.length}. Importats amb èxit: ${successfulImports}. Errors: ${failedImports}. Per veure els canvis, caldrà recarregar la llista.`,
        failedImports === 0 ? 'success' : 'warning'
    );
};
// --- Fi de Funcions d'Importació CSV ---


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
  
  // NOU ESTAT PER LA IMPORTACIÓ CSV
  const [isImporting, setIsImporting] = useState(false);

  // Dades de la taula
  const tableHeaders = ['Nom', 'Aniversari (Edat)', 'Email', 'Telèfon', 'Gimnàs', 'Sessions Habituals', 'Notes', 'Accions'];

  // Funció per mostrar modal
  const showMessage = (title, message, type = 'info', onConfirm = () => setShowMessageModal(false), onCancel = () => setShowMessageModal(false)) => {
    setMessageModalContent({ title, message, isConfirm: type === 'confirm', onConfirm, onCancel });
    setShowMessageModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserName(user.name || '');
    setUserBirthday(user.birthday || '');
    setUserSessions(user.sessions ? user.sessions.join(', ') : '');
    setUserNotes(user.notes || '');
    setUserGymId(user.gymId || '');
    setUserPhone(user.phone || '');
    setUserEmail(user.email || '');
    setUserPhotoUrl(user.photoUrl || '');
    setShowUserModal(true);
  };

  const handleDeleteUser = (user) => {
    showMessage(
      'Confirmar Eliminació',
      `Estàs segur que vols eliminar l'usuari/ària ${user.name}?`,
      'confirm',
      () => {
        confirmDeleteUser(user);
      },
      () => setShowMessageModal(false)
    );
  };

  const confirmDeleteUser = async (user) => {
    setShowMessageModal(false);
    try {
      const collectionPath = getAppCollectionPath(appId, 'users');
      if (!collectionPath) throw new Error("Ruta de col·lecció invàlida.");
      
      await deleteDoc(doc(db, collectionPath, user.id));
      showMessage('Usuari/ària eliminat', `L'usuari/ària ${user.name} ha estat eliminat/da amb èxit.`, 'success');
    } catch (error) {
      console.error("Error deleting user:", error);
      showMessage('Error d\'eliminació', 'Hi ha hagut un error en eliminar l\'usuari/ària. Consulta la consola.', 'error');
    }
  };


  const handleSaveUser = async () => {
    if (!userName || !userEmail) {
      showMessage('Camps requerits', 'El Nom i l\'Email són camps obligatoris.', 'warning');
      return;
    }

    try {
      const collectionPath = getAppCollectionPath(appId, 'users');
      if (!collectionPath) throw new Error("Ruta de col·lecció invàlida.");

      const userData = {
        name: userName,
        birthday: userBirthday || null,
        sessions: userSessions.split(',').map(s => s.trim()).filter(s => s),
        notes: userNotes,
        gymId: userGymId,
        phone: userPhone,
        email: userEmail,
        photoUrl: userPhotoUrl,
        updatedAt: new Date().toISOString(),
        // Mantenir el rol i l'estat si ja existeixen
        roles: editingUser ? editingUser.roles : ['client'],
        status: editingUser ? editingUser.status : 'active',
      };

      if (editingUser) {
        // Actualitzar usuari existent
        const userRef = doc(db, collectionPath, editingUser.id);
        await updateDoc(userRef, userData);
        showMessage('Usuari/ària Actualitzat', `L'usuari/ària ${userName} s'ha actualitzat amb èxit.`, 'success');
      } else {
        // Afegir nou usuari
        userData.createdAt = new Date().toISOString();
        await addDoc(collection(db, collectionPath), userData);
        showMessage('Usuari/ària Afegit', `L'usuari/ària ${userName} s'ha afegit amb èxit.`, 'success');
      }

      setShowUserModal(false);
      resetForm();

    } catch (error) {
      console.error("Error saving user:", error);
      showMessage('Error de Desat', 'Hi ha hagut un error en desar l\'usuari/ària. Consulta la consola.', 'error');
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setUserName('');
    setUserBirthday('');
    setUserSessions('');
    setUserNotes('');
    setUserGymId('');
    setUserPhone('');
    setUserEmail('');
    setUserPhotoUrl('');
  };

  // --- Funció per Exportar ---
  const handleExportUsers = () => {
    if (!users || users.length === 0) {
      showMessage('No hi ha dades', 'No hi ha dades d\'usuaris per exportar.', 'warning');
      return;
    }

    const dataToExport = users.map(user => ({
      'ID Usuari': user.id,
      'Nom Complet': user.name,
      'Email': user.email,
      'Telèfon': user.phone || '',
      'Data Naixement': user.birthday ? formatDateDDMMYYYY(user.birthday) : '',
      'Edat': user.birthday ? formatBirthdayWithAge(user.birthday).match(/\((\d+)/)[1] : '',
      'Gimnàs': gyms.find(gym => gym.id === user.gymId)?.name || 'Sense assignar',
      'Sessions Habituals': user.sessions?.join(', ') || '',
      'Notes': user.notes || '',
      'Estat': user.status || 'actiu',
      'Data de Creació': user.createdAt ? formatDate(user.createdAt) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuaris");

    // Generar fitxer binari
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // Desa el fitxer utilitzant file-saver
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `Usuaris_Export_${formatDateDDMMYYYY(new Date().toISOString())}.xlsx`);
    
    showMessage('Exportació OK', `S'han exportat ${users.length} usuaris/àries a Excel.`, 'success');
  };

  // --- Funcions de Control d'Importació CSV ---

  /**
   * Controlador principal de l'arxiu pujat.
   * @param {Event} event - Esdeveniment de canvi de l'input de fitxer.
   */
  const handleImportUsers = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
        showMessage('Format no vàlid', 'Si us plau, puja un fitxer amb l\'extensió .csv.', 'error');
        return;
    }

    setIsImporting(true);
    
    const reader = new FileReader();

    reader.onload = async (e) => {
        const csvText = e.target.result;
        const { success, users: usersToSave } = parseCSV(csvText);

        if (success) {
            await saveUsersToFirestore(usersToSave, showMessage, setIsImporting);
        } else {
            setIsImporting(false);
            showMessage(
                'Error de format CSV',
                'El fitxer no conté dades d\'usuari vàlides. Assegura\'t que tens les columnes "Nom" i "Email" i que està delimitat per coma (,) o punt i coma (;).',
                'error'
            );
        }
    };

    reader.onerror = () => {
        setIsImporting(false);
        showMessage('Error de lectura', 'No s\'ha pogut llegir el fitxer.', 'error');
    };

    reader.readAsText(file, 'UTF-8');
  };

  // Funció per netejar l'input de fitxer (necessari per tornar a pujar el mateix arxiu)
  const clearFileInput = () => {
      const fileInput = document.getElementById('csv-file-input');
      if (fileInput) {
          fileInput.value = '';
      }
  };

  // Filtrar i ordenar usuaris
  const sortedUsers = useMemo(() => {
    // Ordenació per nom (A-Z)
    return [...users].sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);


  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió d'Usuaris</h1>

      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => {
            resetForm();
            setShowUserModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          + Afegir Nou Usuari
        </button>
      </div>
      
      {/* Secció d'Importació i Exportació */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-green-200">
          <h2 className="text-xl font-semibold text-green-700 mb-4">Eines de Dades</h2>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
              
              {/* Grup d'Importació CSV */}
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <input
                      type="file"
                      accept=".csv"
                      onChange={handleImportUsers}
                      onClick={clearFileInput} 
                      disabled={isImporting}
                      className="hidden"
                      id="csv-file-input"
                  />
                  <label
                      htmlFor="csv-file-input"
                      className={`px-6 py-3 text-white rounded-lg shadow-md transition duration-150 cursor-pointer text-sm font-medium flex items-center justify-center min-w-[150px] ${
                          isImporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                      }`}
                  >
                      {isImporting ? (
                          <div className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Important...
                          </div>
                      ) : 'Importar CSV'}
                  </label>
                  <span className="text-xs text-gray-500 hidden sm:block">Nom (col. 1), Email (col. 2)</span>
              </div>

              {/* Botó d'Exportació XLSX */}
              <button 
                  onClick={handleExportUsers}
                  className="px-6 py-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm text-gray-700 bg-gray-50 hover:bg-gray-100 transition duration-150 w-full sm:w-auto"
              >
                  Exportar a Excel (.xlsx)
              </button>
          </div>
      </div>
      {/* FI: Secció d'Importació i Exportació */}


      {/* Taula d'Usuaris */}
      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {tableHeaders.map((header) => (
                <th
                  key={header}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.birthday ? formatBirthdayWithAge(user.birthday) : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phone || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {gyms.find(gym => gym.id === user.gymId)?.name || 'Sense assignar'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                  {user.sessions?.join(', ') || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                  {user.notes || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                    title="Editar usuari"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user)}
                    className="text-red-600 hover:text-red-900"
                    title="Eliminar usuari"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {sortedUsers.length === 0 && (
              <tr>
                <td colSpan={tableHeaders.length} className="px-6 py-4 text-center text-gray-500 italic">
                  No hi ha usuaris registrats.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal d'Usuaris */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingUser ? 'Editar Usuari/ària' : 'Afegir Nou Usuari/ària'}
            </h2>

            <div className="space-y-4">
              {/* Nom */}
              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-gray-700">Nom Complet*</label>
                <input
                  type="text"
                  id="userName"
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700">Email*</label>
                <input
                  type="email"
                  id="userEmail"
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                />
              </div>

              {/* Telèfon */}
              <div>
                <label htmlFor="userPhone" className="block text-sm font-medium text-gray-700">Telèfon</label>
                <input
                  type="tel"
                  id="userPhone"
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                />
              </div>

              {/* Data de Naixement */}
              <div>
                <label htmlFor="userBirthday" className="block text-sm font-medium text-gray-700">Data de Naixement</label>
                <input
                  type="date"
                  id="userBirthday"
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userBirthday} // El format 'YYYY-MM-DD' de l'input date coincideix amb el format ISO
                  onChange={(e) => setUserBirthday(e.target.value)}
                />
              </div>

              {/* Gimnàs */}
              <div>
                <label htmlFor="userGymId" className="block text-sm font-medium text-gray-700">Gimnàs Assignat</label>
                <select
                  id="userGymId"
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userGymId}
                  onChange={(e) => setUserGymId(e.target.value)}
                >
                  <option value="">-- Selecciona Gimnàs --</option>
                  {gyms.map(gym => (
                    <option key={gym.id} value={gym.id}>{gym.name}</option>
                  ))}
                </select>
              </div>

              {/* Sessions Habituals */}
              <div>
                <label htmlFor="userSessions" className="block text-sm font-medium text-gray-700">Sessions Habituals (separades per coma)</label>
                <input
                  type="text"
                  id="userSessions"
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Dilluns, Dimecres, Tarda, Matí"
                  value={userSessions}
                  onChange={(e) => setUserSessions(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="userNotes" className="block text-sm font-medium text-gray-700">Notes Internes</label>
                <textarea
                  id="userNotes"
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  rows="3"
                ></textarea>
              </div>
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
      
      {/* Modal de Missatges */}
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
