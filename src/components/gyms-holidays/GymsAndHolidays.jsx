import React, { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx'; // Confirmat: .jsx
import { formatDate } from '../../utils/dateHelpers.jsx'; // Confirmat: .jsx
import { MessageModal } from '../common/MessageModal.jsx'; // Confirmat: .jsx

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


const GymsAndHolidays = ({ gyms, db, currentUserId, appId }) => {
  const [showGymModal, setShowGymModal] = useState(false);
  const [editingGym, setEditingGym] = useState(null);
  const [gymName, setGymName] = useState('');
  const [gymWorkDays, setGymWorkDays] = useState([]);
  const [gymTotalVacationDays, setGymTotalVacationDays] = useState('');

  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [selectedGymForHoliday, setSelectedGymForHoliday] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayNotes, setHolidayNotes] = useState('');

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
      holidaysTaken: editingGym ? editingGym.holidaysTaken : [], // Preserve existing holidays if editing
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
      const gymSnap = await db.getDoc(gymRef); // Use db.getDoc directly
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
        message: `Vacances per al gimnàs ${gyms.find(g => g.id === selectedGymForHoliday)?.name} el ${formatDate(holidayDate)} s'han registrat correctament.`,
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
    
    const suggestions = [];
    const currentYear = new Date().getFullYear();

    gyms.forEach(gym => {
      let remainingDays = gym.totalVacationDays - gym.holidaysTaken.length;
      if (remainingDays <= 0) return;

      const relevantPublicHolidays = publicHolidays2025.filter(ph => {
        const phDate = new Date(ph.date);
        const dayName = daysOfWeek[phDate.getDay()];
        return gym.workDays.includes(dayName) && phDate.getFullYear() === currentYear;
      });

      relevantPublicHolidays.forEach(ph => {
        if (remainingDays <= 0) return;

        const phDate = new Date(ph.date);
        const dayOfWeek = phDate.getDay(); // 0 is Sunday, 1 is Monday

        // Suggest a "bridge" holiday for Thursday if public holiday is Wednesday
        if (dayOfWeek === 3 && remainingDays >= 2) { // Wednesday
          const thursday = new Date(phDate);
          thursday.setDate(phDate.getDate() + 1);
          const friday = new Date(phDate);
          friday.setDate(phDate.getDate() + 2);

          if (gym.workDays.includes(daysOfWeek[thursday.getDay()]) && gym.workDays.includes(daysOfWeek[friday.getDay()]) &&
              !gym.holidaysTaken.includes(thursday.toISOString().split('T')[0]) &&
              !gym.holidaysTaken.includes(friday.toISOString().split('T')[0])
            ) {
            suggestions.push({
              gymId: gym.id,
              gymName: gym.name,
              dates: [thursday.toISOString().split('T')[0], friday.toISOString().split('T')[0]],
              reason: `Pont de ${ph.name} (Dijous i Divendres)`
            });
            remainingDays -= 2;
          }
        }
        // Suggest a "bridge" holiday for Friday if public holiday is Thursday
        else if (dayOfWeek === 4 && remainingDays >= 1) { // Thursday
          const friday = new Date(phDate);
          friday.setDate(phDate.getDate() + 1);
          if (gym.workDays.includes(daysOfWeek[friday.getDay()]) &&
              !gym.holidaysTaken.includes(friday.toISOString().split('T')[0])
            ) {
            suggestions.push({
              gymId: gym.id,
              gymName: gym.name,
              dates: [friday.toISOString().split('T')[0]],
              reason: `Pont de ${ph.name} (Divendres)`
            });
            remainingDays -= 1;
          }
        }
      });
    });

    if (suggestions.length > 0) {
      const message = "Propostes de vacances:\n\n" + suggestions.map(s =>
        `${s.gymName}: ${s.reason} - ${s.dates.map(d => formatDate(d)).join(', ')}`
      ).join('\n\n') + "\n\nVols acceptar aquestes propostes i afegir-les?";

      setMessageModalContent({
        title: 'Suggeriments de Vacances',
        message: message,
        isConfirm: true,
        onConfirm: async () => {
          const gymsPath = getUserCollectionPath(appId, currentUserId, 'gyms');
          if (!gymsPath) return;
          try {
            for (const gym of gyms) {
              const gymSuggestions = suggestions.filter(s => s.gymId === gym.id);
              const newHolidays = gymSuggestions.flatMap(s => s.dates);
              
              if (newHolidays.length > 0) {
                const gymRef = doc(db, gymsPath, gym.id);
                const gymSnap = await db.getDoc(gymRef); // Use db.getDoc directly
                const currentHolidays = gymSnap.exists() ? gymSnap.data().holidaysTaken || [] : [];
                
                const uniqueNewHolidays = [...new Set([...currentHolidays, ...newHolidays])];
                await updateDoc(gymRef, {
                  holidaysTaken: uniqueNewHolidays
                });
              }
            }
            setShowMessageModal(false);
            setMessageModalContent({
              title: 'Fet!',
              message: 'Vacances suggerides afegides correctament!',
              isConfirm: false,
              onConfirm: () => setShowMessageModal(false),
            });
            setShowMessageModal(true);
          } catch (error) {
            console.error("Error afegint vacances suggerides:", error);
            setMessageModalContent({
              title: 'Error',
              message: `Hi ha hagut un error al afegir les vacances suggerides: ${error.message}`,
              isConfirm: false,
              onConfirm: () => setShowMessageModal(false),
            });
            setShowMessageModal(true);
          }
        },
        onCancel: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    } else {
      setMessageModalContent({
        title: 'Sense Suggeriments',
        message: 'No es van trobar suggeriments de vacances intel·ligents per a aquest any o ja s\'han pres totes les vacances.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
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
      message: `Estàs segur que vols eliminar les vacances del ${formatDate(dateToDelete)} per a aquest gimnàs?`,
      isConfirm: true,
      onConfirm: async () => {
        const gymsPath = getUserCollectionPath(appId, currentUserId, 'gyms');
        if (!gymsPath) return;
        try {
          const gymRef = doc(db, gymsPath, gymId);
          const gymSnap = await db.getDoc(gymRef);
          if (gymSnap.exists()) {
            const currentHolidays = gymSnap.data().holidaysTaken || [];
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

      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => { setShowGymModal(true); setEditingGym(null); setGymName(''); setGymWorkDays([]); setGymTotalVacationDays(''); }}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Afegir Nou Gimnàs
        </button>
        <button
          onClick={() => { setSelectedGymForHoliday(''); setHolidayDate(''); setHolidayNotes(''); setShowHolidayModal(true); }}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Registrar Vacances / Tancament
        </button>
        <button
          onClick={() => handleSuggestHolidays()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Suggerir Vacances Intel·ligents 2025
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
                    {formatDate(date)}
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

      {/* Gym Modal */}
      {showGymModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto"> {/* Added max-h and overflow */}
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
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto"> {/* Added max-h and overflow */}
            <h2 className="text-xl font-bold text-gray-800 mb-4">Registrar Vacances / Tancament</h2>
            <div className="mb-4">
              <label htmlFor="selectGymForHoliday" className="block text-gray-700 text-sm font-bold mb-2">Selecciona Gimnàs:</label>
              <select
                id="selectGymForHoliday"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedGymForHoliday}
                onChange={(e) => setSelectedGymForHoliday(e.target.value)}
              >
                <option value="">Tots els gimnasos</option>
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
