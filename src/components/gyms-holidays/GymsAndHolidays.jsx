// src/components/gyms-holidays/GymsAndHolidays.jsx

import React, { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx';
// CANVI AQUÍ: Hem eliminat l'import de 'formatDate' perquè ja no el necessitem aquí.
// Mantenim només les que utilitzes.
import { formatDateDDMMYYYY } from '../../utils/dateHelpers.jsx'; 
import { MessageModal } from '../common/MessageModal.jsx';

const publicHolidays2025 = [
  { date: '2025-01-01', name: 'Any Nou', type: 'national' },
  { date: '2025-01-06', name: 'Reis', type: 'national' },
  { date: '2025-04-18', name: 'Divendres Sant', type: 'national' },
  { date: '2025-04-21', name: 'Dilluns de Pasqua', type: 'regional' }, // Catalunya
  { date: '2025-05-01', name: 'Dia del Treball', type: 'national' },
  { date: '2025-06-24', name: 'Sant Joan', type: 'regional' }, // Catalunya
  { date: '2025-08-15', name: 'Assumpció', type: 'national' },
  { date: '2025-09-11', name: 'Diada Nacional de Catalunya', type: 'regional' }, // Catalunya
  { date: '2025-10-12', name: 'Festa Nacional d\'Espanya', type: 'national' },
  { date: '2025-11-01', name: 'Tots Sants', type: 'national' },
  { date: '2025-12-06', name: 'Dia de la Constitució', type: 'national' },
  { date: '2025-12-08', name: 'Immaculada Concepció', type: 'national' },
  { date: '2025-12-25', name: 'Nadal', type: 'national' },
  { date: '2025-12-26', name: 'Sant Esteve', type: 'regional' }, // Catalunya
];

// Hem afegit 'gymClosures' a les propietats que rep el component
const GymsAndHolidays = ({ gyms, gymClosures, db, currentUserId, appId }) => {
  const [showGymModal, setShowGymModal] = useState(false);
  const [editingGym, setEditingGym] = useState(null);
  const [gymName, setGymName] = useState('');
  const [gymWorkDays, setGymWorkDays] = useState([]);
  const [gymTotalVacationDays, setGymTotalVacationDays] = useState('');

  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [selectedGymForHoliday, setSelectedGymForHoliday] = useState('');
  // CANVI AQUÍ: La data de vacances es guarda en format YYYY-MM-DD
  const [holidayDate, setHolidayDate] = useState(''); 
  const [holidayNotes, setHolidayNotes] = useState('');

  // NOU: Estats per al modal de Tancaments de Gimnàs
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureDate, setClosureDate] = useState('');
  const [closureNotes, setClosureNotes] = useState('');

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const daysOfWeek = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];

  const handleDayToggle = (day) => {
    setGymWorkDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSaveGym = async () => {
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

    if (!gymName || gymWorkDays.length === 0 || gymTotalVacationDays === '') {
      setMessageModalContent({
        title: 'Camps Obligatoris',
        message: 'El nom del gimnàs, els dies laborables i el total de dies de vacances són obligatoris.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }

    const newGymData = {
      name: gymName,
      workDays: gymWorkDays,
      totalVacationDays: parseInt(gymTotalVacationDays, 10),
      holidaysTaken: editingGym ? editingGym.holidaysTaken : [],
    };

    const gymsPath = getUserCollectionPath(appId, currentUserId, 'gyms');
    if (!gymsPath) return;

    try {
      if (editingGym) {
        const gymRef = doc(db, gymsPath, editingGym.id);
        await updateDoc(gymRef, newGymData);
        setMessageModalContent({
          title: 'Gimnàs Actualitzat',
          message: 'El gimnàs s\'ha actualitzat correctament.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
      } else {
        await addDoc(collection(db, gymsPath), newGymData);
        setMessageModalContent({
          title: 'Gimnàs Afegit',
          message: 'El nou gimnàs s\'ha afegit correctament.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
      }
      setShowMessageModal(true);
      setShowGymModal(false);
      setGymName('');
      setGymWorkDays([]);
      setGymTotalVacationDays('');
      setEditingGym(null);
    } catch (error) {
      console.error("Error saving gym:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar el gimnàs: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleDeleteGym = (gymId) => {
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
      message: 'Estàs segur que vols eliminar aquest gimnàs? Aquesta acció és irreversible.',
      isConfirm: true,
      onConfirm: async () => {
        const gymsPath = getUserCollectionPath(appId, currentUserId, 'gyms');
        if (!gymsPath) return;
        try {
          await deleteDoc(doc(db, gymsPath, gymId));
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Eliminat',
            message: 'Gimnàs eliminat correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        } catch (error) {
          console.error("Error deleting gym:", error);
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar el gimnàs: ${error.message}`,
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        }
      },
      onCancel: () => setShowMessageModal(false),
    });
    setShowMessageModal(true);
  };

  const handleEditGym = (gym) => {
    setEditingGym(gym);
    setGymName(gym.name);
    setGymWorkDays(gym.workDays || []);
    setGymTotalVacationDays(gym.totalVacationDays.toString());
    setShowGymModal(true);
  };

  const handleAddHoliday = async () => {
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

    if (!selectedGymForHoliday || !holidayDate) {
      setMessageModalContent({
        title: 'Error de Validació',
        message: 'Si us plau, selecciona un gimnàs i una data.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }

    const gymsPath = getUserCollectionPath(appId, currentUserId, 'gyms');
    if (!gymsPath) return;

    try {
      const gymRef = doc(db, gymsPath, selectedGymForHoliday);
      const gymSnap = await getDoc(gymRef);
      // CANVI AQUÍ: La comparació de dates ha de ser amb el format correcte
      const currentHolidays = gymSnap.exists() ? gymSnap.data().holidaysTaken || [] : [];
      
      if (currentHolidays.includes(holidayDate)) {
        setMessageModalContent({
          title: 'Error',
          message: 'Aquesta data ja està marcada com a vacances per a aquest gimnàs.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
        setShowMessageModal(true);
        return;
      }

      await updateDoc(gymRef, {
        holidaysTaken: [...currentHolidays, holidayDate]
      });

      setShowHolidayModal(false);
      setHolidayDate('');
      setHolidayNotes('');
      setMessageModalContent({
        title: 'Vacances Registrades',
        message: `Vacances per al gimnàs ${gyms.find(g => g.id === selectedGymForHoliday)?.name} el ${formatDateDDMMYYYY(new Date(holidayDate))} s'han registrat correctament.`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    } catch (error) {
      console.error("Error afegint vacances:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar les vacances: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  // NOU: Lògica per afegir un Tancament de Gimnàs (Festiu)
  const handleAddGymClosure = async () => {
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

    if (!closureDate) {
      setMessageModalContent({
        title: 'Error de Validació',
        message: 'Si us plau, selecciona una data.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }

    const closuresPath = getUserCollectionPath(appId, currentUserId, 'gymClosures');
    if (!closuresPath) return;

    try {
      await addDoc(collection(db, closuresPath), {
        date: closureDate,
        notes: closureNotes || '',
      });

      setShowClosureModal(false);
      setClosureDate('');
      setClosureNotes('');
      setMessageModalContent({
        title: 'Tancament Registrat',
        message: `El tancament per al dia ${formatDateDDMMYYYY(new Date(closureDate))} s'ha registrat correctament.`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    } catch (error) {
      console.error("Error afegint tancament:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar el tancament: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  // NOU: Lògica per eliminar un Tancament de Gimnàs
  const handleDeleteGymClosure = async (closureId) => {
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
      message: 'Estàs segur que vols eliminar aquest tancament de gimnàs?',
      isConfirm: true,
      onConfirm: async () => {
        const closuresPath = getUserCollectionPath(appId, currentUserId, 'gymClosures');
        if (!closuresPath) return;

        try {
          await deleteDoc(doc(db, closuresPath, closureId));
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Eliminat',
            message: 'Tancament de gimnàs eliminat correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        } catch (error) {
          console.error("Error eliminant tancament:", error);
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar el tancament: ${error.message}`,
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        }
      },
      onCancel: () => setShowMessageModal(false),
    });
    setShowMessageModal(true);
  };

  const handleSuggestHolidays = async () => {
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
    
    // NOU: Ara aquesta funció afegirà els festius de 2025 com a tancaments
    setMessageModalContent({
      title: 'Suggerir Festius de 2025',
      message: 'Vols afegir tots els festius públics de Catalunya de 2025 a la llista de tancaments de gimnàs?',
      isConfirm: true,
      onConfirm: async () => {
        const closuresPath = getUserCollectionPath(appId, currentUserId, 'gymClosures');
        if (!closuresPath) return;

        try {
          const addedDates = [];
          for (const ph of publicHolidays2025) {
            // Check if it's not a duplicate
            const isDuplicate = gymClosures.some(gc => gc.date === ph.date);
            if (!isDuplicate) {
              await addDoc(collection(db, closuresPath), {
                date: ph.date,
                notes: `Festiu: ${ph.name}`,
              });
              addedDates.push(ph.date);
            }
          }

          if (addedDates.length > 0) {
            setShowMessageModal(false);
            setMessageModalContent({
              title: 'Festius Afegits!',
              message: `S'han afegit ${addedDates.length} festius de 2025 com a tancaments de gimnàs.`,
              isConfirm: false,
              onConfirm: () => setShowMessageModal(false),
            });
            setShowMessageModal(true);
          } else {
            setShowMessageModal(false);
            setMessageModalContent({
              title: 'No hi ha festius nous',
              message: 'Tots els festius de 2025 ja estan registrats.',
              isConfirm: false,
              onConfirm: () => setShowMessageModal(false),
            });
            setShowMessageModal(true);
          }
        } catch (error) {
          console.error("Error afegint festius suggerits:", error);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al afegir els festius suggerits: ${error.message}`,
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

  const handleDeleteHoliday = (gymId, dateToDelete) => {
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
      message: `Estàs segur que vols eliminar les vacances del ${formatDateDDMMYYYY(new Date(dateToDelete))} per a aquest gimnàs?`,
      isConfirm: true,
      onConfirm: async () => {
        const gymsPath = getUserCollectionPath(appId, currentUserId, 'gyms');
        if (!gymsPath) return;
        try {
          const gymRef = doc(db, gymsPath, gymId);
          const gymSnap = await getDoc(gymRef);
          if (gymSnap.exists()) {
            const currentHolidays = gymSnap.data().holidaysTaken || [];
            // CANVI AQUÍ: La comparació és amb el format YYYY-MM-DD
            const updatedHolidays = currentHolidays.filter(h => h !== dateToDelete); 
            await updateDoc(gymRef, { holidaysTaken: updatedHolidays });
            setShowMessageModal(true);
            setMessageModalContent({
              title: 'Eliminat',
              message: 'Vacances eliminades correctament.',
              isConfirm: false,
              onConfirm: () => setShowMessageModal(false),
            });
          }
        } catch (error) {
          console.error("Error eliminant vacances:", error);
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar les vacances: ${error.message}`,
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        }
      },
      onCancel: () => setShowMessageModal(false),
    });
    setShowMessageModal(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió de Gimnasos i Vacances</h1>

      <div className="flex justify-between items-center mb-6 space-x-2">
        <button
          onClick={() => { setShowGymModal(true); setEditingGym(null); setGymName(''); setGymWorkDays([]); setGymTotalVacationDays(''); }}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
        >
          Afegir Nou Gimnàs
        </button>
        <button
          onClick={() => { setSelectedGymForHoliday(''); setHolidayDate(''); setHolidayNotes(''); setShowHolidayModal(true); }}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
        >
          Registrar Vacances
        </button>
        {/* NOU: Botó per registrar un Tancament (Festiu) */}
        <button
          onClick={() => { setClosureDate(''); setClosureNotes(''); setShowClosureModal(true); }}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
        >
          Registrar Tancament
        </button>
        <button
          onClick={() => handleSuggestHolidays()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
        >
          Afegir Festius 2025
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gyms.map(gym => (
          <div key={gym.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{gym.name}</h2>
            <p className="text-sm text-gray-600 mb-1">Dies Laborables: {gym.workDays.join(', ')}</p>
            <p className="text-sm text-gray-600 mb-1">Total Vacances Anuals: {gym.totalVacationDays} dies</p>
            <p className="text-sm text-gray-600 mb-3">Vacances Preses: {gym.holidaysTaken.length} / {gym.totalVacationDays} dies</p>

            <h3 className="text-md font-semibold text-gray-700 mb-2">Dates de Vacances Registrades:</h3>
            {gym.holidaysTaken && gym.holidaysTaken.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-gray-600 mb-4">
                {gym.holidaysTaken.sort().map((date, index) => (
                  <li key={index} className="flex justify-between items-center py-0.5">
                    {formatDateDDMMYYYY(new Date(date))}
                    <button
                      onClick={() => handleDeleteHoliday(gym.id, date)}
                      className="text-red-500 hover:text-red-700 transition-colors duration-200 ml-2"
                      title="Eliminar Vacances"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.17l2.12-2.12 1.41 1.41L13.41 13.5l2.12 2.12-1.41 1.41L12 14.83l-2.12 2.12-1.41-1.41L10.59 13.5l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 mb-4">No hi ha vacances registrades per a aquest gimnàs.</p>
            )}

            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => handleEditGym(gym)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
              >
                Editar
              </button>
              <button
                onClick={() => handleDeleteGym(gym.id)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* NOU: Secció per als tancaments de gimnàs (Festius) */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Tancaments Generals (Festius)</h2>
        {gymClosures.length > 0 ? (
          <ul className="space-y-2">
            {gymClosures.sort((a, b) => new Date(a.date) - new Date(b.date)).map(closure => (
              <li key={closure.id} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                <div className="flex-grow">
                  <p className="font-semibold text-gray-800">{formatDateDDMMYYYY(new Date(closure.date))}</p>
                  {closure.notes && <p className="text-sm text-gray-600 italic">Motiu: {closure.notes}</p>}
                </div>
                <button
                  onClick={() => handleDeleteGymClosure(closure.id)}
                  className="text-red-500 hover:text-red-700 transition-colors duration-200"
                  title="Eliminar Tancament"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.17l2.12-2.12 1.41 1.41L13.41 13.5l2.12 2.12-1.41 1.41L12 14.83l-2.12 2.12-1.41-1.41L10.59 13.5l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No hi ha tancaments de gimnàs registrats. Pots afegir-ne manualment o utilitzar el botó "Afegir Festius 2025".</p>
        )}
      </div>

      {/* Gym Modal */}
      {showGymModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingGym ? 'Editar Gimnàs' : 'Afegir Nou Gimnàs'}</h2>
            <div className="mb-4">
              <label htmlFor="gymName" className="block text-gray-700 text-sm font-bold mb-2">Nom del Gimnàs:</label>
              <input
                type="text"
                id="gymName"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Dies Laborables:</label>
              <div className="grid grid-cols-3 gap-2">
                {daysOfWeek.map(day => (
                  <label key={day} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox text-blue-600 rounded"
                      value={day}
                      checked={gymWorkDays.includes(day)}
                      onChange={() => handleDayToggle(day)}
                    />
                    <span className="ml-2 text-gray-700">{day}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="totalVacationDays" className="block text-gray-700 text-sm font-bold mb-2">Total Dies Vacances Anuals:</label>
              <input
                type="number"
                id="totalVacationDays"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={gymTotalVacationDays}
                onChange={(e) => setGymTotalVacationDays(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowGymModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleSaveGym}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                {editingGym ? 'Guardar Canvis' : 'Afegir Gimnàs'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Registrar Vacances</h2>
            <div className="mb-4">
              <label htmlFor="selectGymForHoliday" className="block text-gray-700 text-sm font-bold mb-2">Selecciona Gimnàs:</label>
              <select
                id="selectGymForHoliday"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedGymForHoliday}
                onChange={(e) => setSelectedGymForHoliday(e.target.value)}
              >
                <option value="">Selecciona un gimnàs...</option>
                {gyms.map(gym => (
                  <option key={gym.id} value={gym.id}>{gym.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="holidayDate" className="block text-gray-700 text-sm font-bold mb-2">Data:</label>
              <input
                type="date"
                id="holidayDate"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="holidayNotes" className="block text-gray-700 text-sm font-bold mb-2">Notes (Motiu, opcional):</label>
              <textarea
                id="holidayNotes"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={holidayNotes}
                onChange={(e) => setHolidayNotes(e.target.value)}
                rows="3"
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowHolidayModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleAddHoliday}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Registrar Vacances
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOU: Modal per als tancaments de gimnàs */}
      {showClosureModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Registrar Tancament General</h2>
            <div className="mb-4">
              <label htmlFor="closureDate" className="block text-gray-700 text-sm font-bold mb-2">Data del Tancament:</label>
              <input
                type="date"
                id="closureDate"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={closureDate}
                onChange={(e) => setClosureDate(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="closureNotes" className="block text-gray-700 text-sm font-bold mb-2">Notes (Motiu, opcional):</label>
              <textarea
                id="closureNotes"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
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
