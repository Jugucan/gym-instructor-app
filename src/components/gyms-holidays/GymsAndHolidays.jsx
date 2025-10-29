import React, { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx';
// Importem les funcions d'escriptura (addDocument, deleteDocument)
import { addDocument, deleteDocument } from '../../hooks/useFirestoreData'; // <<< NOU IMPORT
// Importem la funció d'ajuda, però la utilitzarem de manera diferent
import { formatDateDDMMYYYY } from '../../utils/dateHelpers.jsx'; 
import { MessageModal } from '../common/MessageModal.jsx';

// [El teu array publicHolidays2025 es manté intacte]
const publicHolidays2025 = [
  // Aquestes dades es mantenen en DD-MM-YYYY perquè només són informatives
  { date: '11-09-2025', name: 'Diada Nacional de Catalunya', type: 'regional' },
  { date: '01-01-2025', name: 'Any Nou', type: 'national' },
  { date: '06-01-2025', name: 'Reis', type: 'national' },
  { date: '18-04-2025', name: 'Divendres Sant', type: 'national' },
  { date: '21-04-2025', name: 'Dilluns de Pasqua', type: 'regional' },
  { date: '01-05-2025', name: 'Dia del Treball', type: 'national' },
  { date: '24-06-2025', name: 'Sant Joan', type: 'regional' },
  { date: '15-08-2025', name: 'Assumpció', type: 'national' },
  { date: '12-10-2025', name: 'Festa Nacional d\'Espanya', type: 'national' },
  { date: '01-11-2025', name: 'Tots Sants', type: 'national' },
  { date: '06-12-2025', name: 'Dia de la Constitució', type: 'national' },
  { date: '08-12-2025', name: 'Immaculada Concepció', type: 'national' },
  { date: '25-12-2025', name: 'Nadal', type: 'national' },
  { date: '26-12-2025', name: 'Sant Esteve', type: 'regional' },
];

const GymsAndHolidays = ({ gyms, gymClosures, db, currentUserId, appId, onGymsUpdate, onGymClosuresUpdate }) => {
  const [selectedGym, setSelectedGym] = useState(gyms.length > 0 ? gyms[0].id : '');
  const [newHolidayStart, setNewHolidayStart] = useState('');
  const [newHolidayEnd, setNewHolidayEnd] = useState('');
  const [newHolidayReason, setNewHolidayReason] = useState('');
  const [newGymName, setNewGymName] = useState(''); // <<< NOU: Estat per afegir gimnàs
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureDate, setClosureDate] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', onConfirm: () => {}, onCancel: () => {}, isConfirm: false });


  const currentGym = gyms.find(g => g.id === selectedGym);

  const handleSelectGym = (e) => {
    setSelectedGym(e.target.value);
    setNewHolidayStart('');
    setNewHolidayEnd('');
    setNewHolidayReason('');
  };
  
  // -------------------------------------------------------------------
  // --- NOU: Lògica d'AFEGIR Centre ---
  // -------------------------------------------------------------------
  const handleAddGym = async (e) => {
      e.preventDefault();
      if (!newGymName.trim()) {
          setMessageModalContent({
              title: 'Error de Validació',
              message: 'El nom del centre no pot estar buit.',
              onConfirm: () => setShowMessageModal(false),
              isConfirm: false
          });
          setShowMessageModal(true);
          return;
      }
      if (!db || !currentUserId || !appId) {
        setMessageModalContent({
            title: 'Error de Connexió',
            message: 'No s\'ha pogut connectar amb la base de dades.',
            onConfirm: () => setShowMessageModal(false),
            isConfirm: false
        });
        setShowMessageModal(true);
        return;
      }

      // Preparem les dades inicials del nou gimnàs
      const gymData = {
          name: newGymName.trim(),
          workDays: ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres'], // Dades inicials per defecte
          totalVacationDays: 0, 
          holidaysTaken: [],
          createdAt: new Date().toISOString(),
      };

      try {
          const result = await addDocument(db, appId, currentUserId, 'gyms', gymData);
          
          if (result.success) {
              setMessageModalContent({
                  title: 'Centre Afegit ✅',
                  message: `El centre '${newGymName.trim()}' s'ha afegit correctament.`,
                  onConfirm: () => setShowMessageModal(false),
                  isConfirm: false
              });
              setShowMessageModal(true);
              setNewGymName(''); // Neteja l'input
              // No cal cridar onGymsUpdate ja que onSnapshot del hook ja actualitzarà 'gyms'
          }
      } catch (error) {
          console.error("Error afegint centre:", error);
          setMessageModalContent({
              title: 'Error ❌',
              message: `Hi ha hagut un error al registrar el centre: ${error.message}`,
              onConfirm: () => setShowMessageModal(false),
              isConfirm: false
          });
          setShowMessageModal(true);
      }
  };

  // -------------------------------------------------------------------
  // --- NOU: Lògica d'ELIMINAR Centre ---
  // -------------------------------------------------------------------
  const handleDeleteGym = (gymId, gymName) => {
      if (!db || !currentUserId || !appId) return;

      setMessageModalContent({
          title: 'Confirmar Eliminació',
          message: `ATENCIÓ: Estàs segur que vols eliminar el centre '${gymName}'? Aquesta acció és irreversible i ELIMINARÀ TOTES LES SESSIONS I DADES RELACIONADES amb aquest centre.`,
          isConfirm: true,
          onConfirm: async () => {
              try {
                  const result = await deleteDocument(db, appId, currentUserId, 'gyms', gymId);

                  if (result.success) {
                      setMessageModalContent({
                          title: 'Centre Eliminat ✔️',
                          message: `El centre '${gymName}' ha estat eliminat correctament.`,
                          onConfirm: () => setShowMessageModal(false),
                          isConfirm: false
                      });
                      // Si el gimnàs eliminat era el seleccionat, netejem el selector
                      if (selectedGym === gymId) {
                          setSelectedGym('');
                      }
                  }
              } catch (error) {
                  console.error("Error eliminant centre:", error);
                  setMessageModalContent({
                      title: 'Error ❌',
                      message: `No s'ha pogut eliminar el centre. Detalls: ${error.message}`,
                      onConfirm: () => setShowMessageModal(false),
                      isConfirm: false
                  });
              }
              setShowMessageModal(true); // Mostra el modal de resultat
          },
          onCancel: () => setShowMessageModal(false)
      });
      setShowMessageModal(true);
  };
  
  // [La teva funció handleAddHoliday es manté intacta]
  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!currentGym || !newHolidayStart || !newHolidayEnd) {
      setMessageModalContent({
        title: 'Error de Validació',
        message: 'Has de seleccionar un centre i introduir una data d\'inici i de fi.',
        onConfirm: () => setShowMessageModal(false),
        isConfirm: false
      });
      setShowMessageModal(true);
      return;
    }

    if (new Date(newHolidayStart) > new Date(newHolidayEnd)) {
      setMessageModalContent({
        title: 'Error de Data',
        message: 'La data d\'inici de les vacances no pot ser posterior a la data de fi.',
        onConfirm: () => setShowMessageModal(false),
        isConfirm: false
      });
      setShowMessageModal(true);
      return;
    }

    if (!db || !currentUserId || !appId) {
      setMessageModalContent({
        title: 'Error de Connexió',
        message: 'No s\'ha pogut connectar amb la base de dades. Prova-ho més tard.',
        onConfirm: () => setShowMessageModal(false),
        isConfirm: false
      });
      setShowMessageModal(true);
      return;
    }

    try {
      const gymPath = getUserCollectionPath(appId, currentUserId, 'gyms');
      const gymDocRef = doc(db, gymPath, currentGym.id);
      
      const newHolidays = [];
      let currentDate = new Date(newHolidayStart);
      const endDate = new Date(newHolidayEnd);

      // Generar totes les dates entre l'inici i el final
      while (currentDate <= endDate) {
        // Guardem sempre en AAAA-MM-DD per la compatibilitat amb FullCalendar/formatDate
        newHolidays.push(currentDate.toISOString().split('T')[0]); 
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const existingHolidays = currentGym.holidaysTaken || [];
      const updatedHolidays = Array.from(new Set([...existingHolidays, ...newHolidays]));

      await updateDoc(gymDocRef, { 
        holidaysTaken: updatedHolidays,
        holidayReason: newHolidayReason || '',
      });

      // Notificar al pare la actualització de gimnasos
      if (onGymsUpdate) onGymsUpdate();

      setMessageModalContent({
        title: 'Vacances Registrades',
        message: `Les vacances per a ${currentGym.name} s'han registrat correctament.`,
        onConfirm: () => setShowMessageModal(false),
        isConfirm: false
      });
      setShowMessageModal(true);
      
      setNewHolidayStart('');
      setNewHolidayEnd('');
      setNewHolidayReason('');

    } catch (error) {
      console.error("Error adding holiday:", error);
      setMessageModalContent({
        title: 'Error en afegir Vacances',
        message: `Hi ha hagut un error al registrar les vacances: ${error.message}`,
        onConfirm: () => setShowMessageModal(false),
        isConfirm: false
      });
      setShowMessageModal(true);
    }
  };

  // [La teva funció handleRemoveHoliday es manté intacta]
  const handleRemoveHoliday = async (date) => {
    if (!currentGym || !db || !currentUserId || !appId) return;

    setMessageModalContent({
      title: 'Confirmar Eliminació',
      message: `Estàs segur que vols eliminar el dia festiu ${date} de ${currentGym.name}?`,
      isConfirm: true,
      onConfirm: async () => {
        try {
          const gymPath = getUserCollectionPath(appId, currentUserId, 'gyms');
          const gymDocRef = doc(db, gymPath, currentGym.id);

          const updatedHolidays = (currentGym.holidaysTaken || []).filter(h => h !== date);

          await updateDoc(gymDocRef, { holidaysTaken: updatedHolidays });

          // Notificar al pare la actualització de gimnasos
          if (onGymsUpdate) onGymsUpdate();
          setShowMessageModal(false);
        } catch (error) {
          console.error("Error removing holiday:", error);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error: ${error.message}`,
            onConfirm: () => setShowMessageModal(false),
            isConfirm: false
          });
          setShowMessageModal(true);
        }
      },
      onCancel: () => setShowMessageModal(false)
    });
    setShowMessageModal(true);
  };
  
  // [La teva funció parseDateForSorting es manté intacta]
  // Aquesta funció converteix AAAA-MM-DD a un objecte Date per a poder ordenar-les.
  // Assumim que a la BD tenim AAAA-MM-DD
  const parseDateForSorting = (dateStr) => {
    if (!dateStr || dateStr.length !== 10) return new Date(0);
    // Parsejant AAAA-MM-DD directament
    return new Date(dateStr); 
  };


  // [La teva funció handleAddGymClosure es manté intacta]
  const handleAddGymClosure = async () => {
    if (!closureDate || !db || !currentUserId || !appId) {
      // ... (missatge d'error)
      return;
    }
    
    // CANVI CLAU: Guardem la data de l'input (que és AAAA-MM-DD) directament.
    const dateToSave = closureDate; 

    try {
      const closuresCollectionPath = getUserCollectionPath(appId, currentUserId, 'gymClosures');
      
      // La teva lògica anterior no verificava si ja existia. Podem simplificar i afegir-la:
      await addDoc(collection(db, closuresCollectionPath), {
        date: dateToSave, // Guardem la data en format AAAA-MM-DD (consistent amb la BD)
        reason: closureNotes,
      });

      // Notificar al pare la actualització de tancaments
      if (onGymClosuresUpdate) onGymClosuresUpdate();
      
      setShowClosureModal(false);
      setClosureDate('');
      setClosureNotes('');
      
    } catch (error) {
      console.error("Error adding gym closure:", error);
      // ... (Missatge d'error)
    }
  };

  // [La teva funció handleDeleteGymClosure es manté intacta]
  const handleDeleteGymClosure = async (closureId) => {
    if (!db || !currentUserId || !appId) return;

    setMessageModalContent({
      title: 'Confirmar Eliminació',
      message: 'Estàs segur que vols eliminar aquest tancament general?',
      isConfirm: true,
      onConfirm: async () => {
        try {
          const closuresCollectionPath = getUserCollectionPath(appId, currentUserId, 'gymClosures');
          await deleteDoc(doc(db, closuresCollectionPath, closureId));

          if (onGymClosuresUpdate) onGymClosuresUpdate();
          setShowMessageModal(false);
        } catch (error) {
          console.error("Error deleting gym closure:", error);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error: ${error.message}`,
            onConfirm: () => setShowMessageModal(false),
            isConfirm: false
          });
          setShowMessageModal(true);
        }
      },
      onCancel: () => setShowMessageModal(false)
    });
    setShowMessageModal(true);
  };
  

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Gestió de Centres i Dies Festius</h1>

      {/* ------------------------------------------------------------------- */}
      {/* --- NOU: Secció de Gestió de Centres --- */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Administrar Centres/Gimnasos 🏋️</h2>
        
        {/* Formulari per Afegir Centre */}
        <form onSubmit={handleAddGym} className="flex flex-col sm:flex-row gap-3 mb-6 p-4 border rounded-lg bg-blue-50">
            <input
                type="text"
                placeholder="Nom del nou centre (Ex: Gimnàs Poble Nou)"
                value={newGymName}
                onChange={(e) => setNewGymName(e.target.value)}
                className="flex-grow shadow-sm sm:text-sm border-gray-300 rounded-md p-2"
                required
            />
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out w-full sm:w-auto">
                Afegir Centre
            </button>
        </form>

        {/* Llista de Centres Existents */}
        <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-3">Centres Existents ({gyms.length})</h3>
        {gyms && gyms.length > 0 ? (
            <ul className="space-y-2">
                {/* L'ordenació per nom ja la fa el hook useFirestoreData */}
                {gyms.map(gym => (
                    <li key={gym.id} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg border-l-4 border-blue-500">
                        <span className="font-semibold text-gray-800">{gym.name}</span>
                        <button
                            onClick={() => handleDeleteGym(gym.id, gym.name)}
                            className="text-red-500 hover:text-red-700 transition-colors duration-200 ml-4"
                            title={`Eliminar el centre ${gym.name}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.72-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 10-2 0v6a1 1 0 102 0V8z" clipRule="evenodd"/></svg>
                        </button>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-gray-500 italic">No hi ha centres registrats. Afegiu el primer centre a dalt.</p>
        )}
      </div>

      {/* Secció Tancaments Generals (Festius) */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Tancaments Generals (Festius)</h2>
        
        <button
          onClick={() => setShowClosureModal(true)}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-4"
        >
          Afegir Nou Tancament/Festiu
        </button>
        
        {/* Llista de Tancaments Manuals */}
        {gymClosures && gymClosures.length > 0 ? (
          <ul className="space-y-2">
            {/* Ordena utilitzant la funció de conversió per data AAAA-MM-DD */}
            {gymClosures.sort((a, b) => parseDateForSorting(a.date) - parseDateForSorting(b.date)).map(closure => (
              <li key={closure.id} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                <div className="flex-grow">
                  {/* CANVI CLAU: Mostrar la data en DD/MM/AAAA per a l'usuari */}
                  <p className="font-semibold text-gray-800">{closure.date.split('-').reverse().join('/')}</p> 
                  {closure.reason && <p className="text-sm text-gray-600 italic">Motiu: {closure.reason}</p>}
                </div>
                <button
                  onClick={() => handleDeleteGymClosure(closure.id)}
                  className="text-red-500 hover:text-red-700 transition-colors duration-200"
                  title="Eliminar Tancament"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.17l2.12-2.12 1.41 1.41L13.41 13.5l2.12 2.12-1.41 1.41L12 14.83l-2.12 2.12-1.41-1.41L10.59 13.5l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic">No hi ha tancaments generals registrats.</p>
        )}
        
        {/* Llista de Festius Públics (Només informació, no editables) */}
        <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Festius Públics Nacionals i Regionals (2025)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* NOTA: parseDDMMYYYY ja no existeix. Com que són fixes, no cal ordenar */}
                {publicHolidays2025.map((holiday, index) => (
                    <div key={index} className="bg-blue-50 p-3 rounded-lg shadow-sm text-sm">
                        <p className="font-bold text-blue-800">{holiday.date}</p>
                        <p className="text-gray-700">{holiday.name}</p>
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${holiday.type === 'national' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                            {holiday.type === 'national' ? 'Nacional' : 'Regional'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Secció Vacances per Centre */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Vacances per Centre</h2>
        
        {/* Selector de Centre */}
        <div className="mb-4">
          <label htmlFor="selectGym" className="block text-sm font-medium text-gray-700 mb-1">Selecciona Centre:</label>
          <select
            id="selectGym"
            value={selectedGym}
            onChange={handleSelectGym}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
          >
            <option value="" disabled>Selecciona un gimnàs</option>
            {gyms.map(gym => (
              <option key={gym.id} value={gym.id}>{gym.name}</option>
            ))}
          </select>
        </div>

        {currentGym && (
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Registrar Noves Vacances per {currentGym.name}</h3>
            <form onSubmit={handleAddHoliday} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="holidayStart" className="block text-sm font-medium text-gray-700">Data Inici:</label>
                <input
                  type="date"
                  id="holidayStart"
                  value={newHolidayStart}
                  onChange={(e) => setNewHolidayStart(e.target.value)}
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label htmlFor="holidayEnd" className="block text-sm font-medium text-gray-700">Data Fi:</label>
                <input
                  type="date"
                  id="holidayEnd"
                  value={newHolidayEnd}
                  onChange={(e) => setNewHolidayEnd(e.target.value)}
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label htmlFor="holidayReason" className="block text-sm font-medium text-gray-700">Motiu (Opcional):</label>
                <input
                  type="text"
                  id="holidayReason"
                  value={newHolidayReason}
                  onChange={(e) => setNewHolidayReason(e.target.value)}
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
                >
                  Afegir Vacances
                </button>
              </div>
            </form>

            <h3 className="text-lg font-semibold text-gray-700 mt-6 mb-3">Dies de Vacances Actuals</h3>
            {currentGym.holidaysTaken && currentGym.holidaysTaken.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {currentGym.holidaysTaken
                  // Sort them to display in order (they are AAAA-MM-DD, so string sort works)
                  .sort() 
                  .map(date => (
                    <div 
                      key={date} 
                      className="flex items-center bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full shadow-sm"
                    >
                      {/* Les vacances es guarden com AAAA-MM-DD, les mostrem com DD/MM/AAAA per a l'usuari */}
                      {date.split('-').reverse().join('/')} 
                      <button 
                        onClick={() => handleRemoveHoliday(date)} 
                        className="ml-2 text-red-500 hover:text-red-700"
                        title="Eliminar aquest dia"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No hi ha dies de vacances registrats per a {currentGym.name}.</p>
            )}
          </div>
        )}
      </div>

      {/* Modal per afegir Tancament General (Festiu) */}
      {showClosureModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Afegir Tancament General</h3>
            <p className="text-sm text-gray-600 mb-4">Aquesta data es marcarà com a festiu o tancament per a tots els centres.</p>
            
            <div className="mb-4">
              <label htmlFor="closureDate" className="block text-sm font-medium text-gray-700 mb-1">Data de Tancament:</label>
              <input
                type="date"
                id="closureDate"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500"
                value={closureDate}
                onChange={(e) => setClosureDate(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="closureNotes" className="block text-sm font-medium text-gray-700 mb-1">Motiu/Notes (Opcional):</label>
              <textarea
                id="closureNotes"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500"
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                rows="3"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowClosureModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleAddGymClosure}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Registrar Tancament
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

export default GymsAndHolidays;
