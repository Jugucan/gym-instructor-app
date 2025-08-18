import React, { useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { formatDate } from '../../utils/dateHelpers.js';
import { getUserCollectionPath } from '../../utils/firebasePaths.js';
import { MessageModal } from '../common/MessageModal.jsx';


const GymsAndHolidays = ({ gyms, db, currentUserId, appId }) => {
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [selectedGymForHoliday, setSelectedGymForHoliday] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayNotes, setHolidayNotes] = useState('');

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  // Example public holidays for Spain (Catalonia specific might vary)
  const publicHolidays2025 = [
    { date: '2025-01-01', name: 'Any Nou' },
    { date: '2025-01-06', name: 'Reis' },
    { date: '2025-04-18', name: 'Divendres Sant' },
    { date: '2025-04-21', name: 'Dilluns de Pasqua' },
    { date: '2025-05-01', name: 'Dia del Treballador' },
    { date: '2025-06-24', name: 'Sant Joan' },
    { date: '2025-08-15', name: 'Assumpció' },
    { date: '2025-09-11', name: 'Diada Nacional de Catalunya' },
    { date: '2025-10-12', name: 'Festa Nacional d\'Espanya' },
    { date: '2025-11-01', name: 'Tots Sants' },
    { date: '2025-12-06', name: 'Dia de la Constitució' },
    { date: '2025-12-08', name: 'Immaculada Concepció' },
    { date: '2025-12-25', name: 'Nadal' },
    { date: '2025-12-26', name: 'Sant Esteve' },
  ];

  const handleAddHoliday = async () => {
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

    try {
      const gymsCollectionPath = getUserCollectionPath(appId, currentUserId, 'gyms');
      if (!gymsCollectionPath) return;

      const gymRef = doc(db, gymsCollectionPath, selectedGymForHoliday);
      const gymSnap = await getDoc(gymRef);
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
      console.error("Error adding holiday:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar les vacances: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleSuggestHolidays = async (year) => {
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
    const daysOfWeek = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

    gyms.forEach(gym => {
      let remainingDays = gym.totalVacationDays - gym.holidaysTaken.length;
      if (remainingDays <= 0) return;

      // Filter public holidays that fall on a workday for this gym
      const relevantPublicHolidays = publicHolidays2025.filter(ph => { // Using 2025 for now
        const phDate = new Date(ph.date);
        const dayName = daysOfWeek[phDate.getDay()];
        return gym.workDays.includes(dayName);
      });

      relevantPublicHolidays.forEach(ph => {
        if (remainingDays <= 0) return;

        const phDate = new Date(ph.date);
        const dayOfWeek = phDate.getDay(); // 0-6, Sunday-Saturday

        // Check for long weekends (especially prioritizing Friday/Thursday)
        // If holiday is Wednesday (3), suggest Thursday (4) and Friday (5) off
        if (dayOfWeek === 3 && remainingDays >= 2) {
          const thursday = new Date(phDate);
          thursday.setDate(phDate.getDate() + 1);
          const friday = new Date(phDate);
          friday.setDate(phDate.getDate() + 2);

          if (gym.workDays.includes(daysOfWeek[thursday.getDay()]) && gym.workDays.includes(daysOfWeek[friday.getDay()])) {
            suggestions.push({
              gym: gym.name,
              dates: [thursday.toISOString().split('T')[0], friday.toISOString().split('T')[0]],
              reason: `Pont de ${ph.name} (Dijous i Divendres)`
            });
            remainingDays -= 2;
          }
        }
        // If holiday is Thursday (4), suggest Friday (5) off
        else if (dayOfWeek === 4 && remainingDays >= 1) {
          const friday = new Date(phDate);
          friday.setDate(phDate.getDate() + 1);
          if (gym.workDays.includes(daysOfWeek[friday.getDay()])) {
            suggestions.push({
              gym: gym.name,
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
        `${s.gym}: ${s.reason} - ${s.dates.map(d => formatDate(d)).join(', ')}`
      ).join('\n\n') + "\n\nVols acceptar aquestes propostes i afegir-les?";

      setMessageModalContent({
        title: 'Suggeriments de Vacances',
        message: message,
        isConfirm: true,
        onConfirm: async () => {
          try {
            const gymsCollectionPath = getUserCollectionPath(appId, currentUserId, 'gyms');
            if (!gymsCollectionPath) return;

            for (const gym of gyms) {
              const gymSuggestions = suggestions.filter(s => s.gym === gym.name);
              const newHolidays = gymSuggestions.flatMap(s => s.dates);
              
              if (newHolidays.length > 0) {
                const gymRef = doc(db, gymsCollectionPath, gym.id);
                const gymSnap = await getDoc(gymRef);
                const currentHolidays = gymSnap.exists() ? gymSnap.data().holidaysTaken || [] : [];
                
                const uniqueNewHolidays = [...new Set([...currentHolidays, ...newHolidays])]; // Merge and make unique
                await updateDoc(gymRef, {
                  holidaysTaken: uniqueNewHolidays
                });
              }
            }
            setShowMessageModal(false);
            setMessageModalContent({
              title: 'Fet!',
              message: 'Vacances suggerides afegides!',
              isConfirm: false,
              onConfirm: () => setShowMessageModal(false),
            });
            setShowMessageModal(true);
          } catch (error) {
            console.error("Error adding suggested holidays:", error);
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
        message: 'No es van trobar suggeriments de vacances intel·ligents per a aquest any.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };


  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió de Vacances i Gimnasos</h1>

      {/* Gym Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Configuració de Gimnasos</h2>
        {gyms.length > 0 ? gyms.map(gym => (
          <div key={gym.id} className="p-4 rounded-lg bg-blue-50 border-l-4 border-blue-400 mb-4">
            <h3 className="text-lg font-medium text-gray-800">{gym.name}</h3>
            <p className="text-sm text-gray-600">Dies de feina: {gym.workDays.join(', ')}</p>
            <p className="text-sm text-gray-600">Total dies de vacances anuals: {gym.totalVacationDays}</p>
            <p className="text-sm text-gray-600">Dies de vacances restants: <span className="font-semibold text-blue-700">{gym.totalVacationDays - gym.holidaysTaken.length}</span></p>
          </div>
        )) : <p className="text-gray-500">Carregant configuració de gimnasos...</p>}
      </div>

      {/* Register Holidays */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Registrar Vacances</h2>
        <button
          onClick={() => setShowHolidayModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Afegir Dia de Vacances
        </button>

        {/* Holiday List */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Dies de Vacances Registrats</h3>
          {gyms.length > 0 ? gyms.map(gym => (
            <div key={gym.id} className="mb-4">
              <h4 className="font-medium text-gray-800">{gym.name}</h4>
              {gym.holidaysTaken.length > 0 ? (
                <ul className="list-disc list-inside text-gray-600 text-sm">
                  {gym.holidaysTaken.map((date, index) => (
                    <li key={index}>{formatDate(date)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No hi ha dies de vacances registrats per a aquest gimnàs.</p>
              )}
            </div>
          )) : <p className="text-gray-500">Carregant dies de vacances...</p>}
        </div>
      </div>

      {/* Holiday Suggestions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Suggeriments de Vacances Intel·ligents</h2>
        <p className="text-gray-600 text-sm mb-4">Genera propostes de vacances basades en festius i el teu horari de feina per a l'any 2025.</p>
        <button
          onClick={() => handleSuggestHolidays(2025)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Generar Suggeriments 2025
        </button>
      </div>

      {/* Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Registrar Dia de Vacances</h2>
            <div className="mb-4">
              <label htmlFor="gymSelectHoliday" className="block text-gray-700 text-sm font-bold mb-2">Gimnàs:</label>
              <select
                id="gymSelectHoliday"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedGymForHoliday}
                onChange={(e) => setSelectedGymForHoliday(e.target.value)}
              >
                <option value="">Selecciona un gimnàs</option>
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
              <label htmlFor="holidayNotes" className="block text-gray-700 text-sm font-bold mb-2">Notes (Opcional):</label>
              <textarea
                id="holidayNotes"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                value={holidayNotes}
                onChange={(e) => setHolidayNotes(e.target.value)}
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4">
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
                Guardar Vacances
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