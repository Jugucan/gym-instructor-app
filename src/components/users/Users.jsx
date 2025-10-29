import React, { useState, useMemo } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx'; // ✅ Importació nativa (ja no depenem de scripts externs)
import { saveAs } from 'file-saver'; // ✅ Per exportar correctament

// --- CONFIGURACIÓ FIREBASE ---
const db = typeof window.db !== 'undefined' ? window.db : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- UTILITATS DE RUTES ---
const getAppCollectionPath = (appId, collectionName) => {
  if (!appId || !collectionName) {
    console.error("getAppCollectionPath: Missing appId or collectionName.");
    return '';
  }
  return `artifacts/${appId}/public/data/${collectionName}`;
};

// --- FORMATEIG DATES ---
const formatDateDDMMYYYY = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('ca-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
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
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return `${formatDateDDMMYYYY(dateString)} (${age})`;
};

// --- MODAL MISSATGES ---
const MessageModal = ({ show, title, message, onConfirm, onCancel, isConfirm = false }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
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

// --- PARSEJAR EXCEL ---
const parseExcel = (jsonData) => {
  if (!jsonData || jsonData.length < 1) return { success: false, users: [] };

  const usersToImport = [];
  const keys = Object.keys(jsonData[0]);

  const nameKey = keys.find(k => k.toLowerCase().includes('nom') || k.toLowerCase().includes('name'));
  const emailKey = keys.find(k => k.toLowerCase().includes('email'));

  if (!nameKey || !emailKey) return { success: false, users: [] };

  for (const row of jsonData) {
    const name = row[nameKey]?.toString().trim();
    const email = row[emailKey]?.toString().toLowerCase().trim();
    if (!name || !email) continue;
    usersToImport.push({
      name,
      email,
      status: 'active',
      roles: ['client'],
      createdAt: new Date().toISOString()
    });
  }
  return { success: usersToImport.length > 0, users: usersToImport };
};

// --- DESAR A FIRESTORE ---
const saveUsersToFirestore = async (users, showMessage, setIsImporting) => {
  if (!db || !appId) {
    showMessage('Error de Configuració', 'La connexió a la base de dades no està disponible.', 'error');
    setIsImporting(false);
    return;
  }

  const usersCollectionPath = getAppCollectionPath(appId, 'users');
  const usersCollectionRef = collection(db, usersCollectionPath);

  let successCount = 0;
  let failCount = 0;

  for (const user of users) {
    try {
      await addDoc(usersCollectionRef, user);
      successCount++;
    } catch (error) {
      console.error("Error saving user:", user, error);
      failCount++;
    }
  }

  setIsImporting(false);
  showMessage(
    'Importació Finalitzada',
    `S'han processat ${users.length} usuaris/àries. Importats amb èxit: ${successCount}. Errors: ${failCount}.`,
    failCount === 0 ? 'success' : 'warning'
  );
};

// --- COMPONENT PRINCIPAL ---
const Users = ({ users, gyms, db, currentUserId, appId }) => {
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [userBirthday, setUserBirthday] = useState('');
  const [userSessions, setUserSessions] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [userGymId, setUserGymId] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhotoUrl, setUserPhotoUrl] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });
  const [isImporting, setIsImporting] = useState(false);

  const showMessage = (title, message, type = 'info', onConfirm = () => setShowMessageModal(false), onCancel = () => setShowMessageModal(false)) => {
    setMessageModalContent({ title, message, isConfirm: type === 'confirm', onConfirm, onCancel });
    setShowMessageModal(true);
  };

  // --- FUNCIONS PRINCIPALS ---

  const handleImportUsers = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      showMessage('Format no vàlid', 'Si us plau, selecciona un fitxer Excel o CSV vàlid.', 'error');
      return;
    }

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        const result = parseExcel(jsonData);

        if (!result.success) {
          setIsImporting(false);
          showMessage('Error de format', 'L’arxiu no conté columnes “Nom” i “Email” o està buit.', 'error');
          return;
        }

        await saveUsersToFirestore(result.users, showMessage, setIsImporting);
      } catch (error) {
        console.error(error);
        setIsImporting(false);
        showMessage('Error', 'No s’ha pogut processar el fitxer. Comprova que sigui correcte.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const clearFileInput = () => {
    const fileInput = document.getElementById('excel-file-input');
    if (fileInput) fileInput.value = '';
  };

  const sortedUsers = useMemo(() => [...users].sort((a, b) => a.name.localeCompare(b.name)), [users]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió d'Usuaris</h1>

      {/* Eines Import/Export */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-green-200">
        <h2 className="text-xl font-semibold text-green-700 mb-4">Eines de Dades</h2>
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">

          {/* Importació */}
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleImportUsers}
              onClick={clearFileInput}
              disabled={isImporting}
              className="hidden"
              id="excel-file-input"
            />
            <label
              htmlFor="excel-file-input"
              className={`px-6 py-3 text-white rounded-lg shadow-md transition duration-150 cursor-pointer text-sm font-medium flex items-center justify-center min-w-[150px] ${
                isImporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isImporting ? 'Important...' : 'Importar Excel/CSV'}
            </label>
            <span className="text-xs text-gray-500 hidden sm:block">Fitxer: .xlsx, .xls, .csv (Nom i Email obligatoris)</span>
          </div>

          {/* Exportació */}
          <button
            onClick={() => {
              if (!users.length) {
                showMessage('No hi ha dades', 'No hi ha dades per exportar.', 'warning');
                return;
              }
              const dataToExport = users.map(user => ({
                'Nom': user.name,
                'Email': user.email,
                'Telèfon': user.phone || '',
                'Gimnàs': gyms.find(g => g.id === user.gymId)?.name || 'Sense assignar',
                'Notes': user.notes || ''
              }));
              const ws = XLSX.utils.json_to_sheet(dataToExport);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Usuaris');
              const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
              saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'Usuaris.xlsx');
              showMessage('Exportació OK', `S'han exportat ${users.length} usuaris.`, 'success');
            }}
            className="px-6 py-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm text-gray-700 bg-gray-50 hover:bg-gray-100 transition duration-150 w-full sm:w-auto"
          >
            Exportar a Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Aquí vindria la teva taula (sense canvis) */}
      {/* ... */}
    </div>
  );
};

export default Users;
