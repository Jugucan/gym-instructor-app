import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { formatDate } from '../../utils/dateHelpers.js';
import { getUserCollectionPath } from '../../utils/firebasePaths.js';
import { MessageModal } from '../common/MessageModal.jsx';


const FixedScheduleManagement = ({ fixedSchedules, programs, gyms, db, currentUserId, appId }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingScheduleEntry, setEditingScheduleEntry] = useState(null);
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [currentEditingSchedule, setCurrentEditingSchedule] = useState({});
  const daysOfWeekNames = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  // Initialize form when editingScheduleEntry changes
  useEffect(() => {
    if (editingScheduleEntry) {
      setScheduleStartDate(editingScheduleEntry.startDate);
      setCurrentEditingSchedule(editingScheduleEntry.schedule);
    } else {
      setScheduleStartDate('');
      setCurrentEditingSchedule({});
    }
  }, [editingScheduleEntry]);

  const handleAddSchedule = () => {
    setEditingScheduleEntry(null);
    setShowModal(true);
  };

  const handleEditSchedule = (entry) => {
    setEditingScheduleEntry(entry);
    setShowModal(true);
  };

  const handleCopySchedule = (entry) => {
    const newCopiedEntry = {
      ...entry,
      id: `fixed_${Date.now()}`,
      startDate: '',
      schedule: Object.fromEntries(
        Object.entries(entry.schedule).map(([day, sessions]) => [
          day,
          sessions.map(session => ({ ...session, id: `session_${Date.now()}_${Math.random()}` }))
        ])
      )
    };
    setEditingScheduleEntry(newCopiedEntry);
    setCurrentEditingSchedule(newCopiedEntry.schedule);
    setShowModal(true);
  };

  const handleDeleteSchedule = (id) => {
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
      message: 'Estàs segur que vols eliminar aquest horari fix?',
      isConfirm: true,
      onConfirm: async () => {
        try {
          const fixedSchedulesCollectionPath = getUserCollectionPath(appId, currentUserId, 'fixedSchedules');
          if (!fixedSchedulesCollectionPath) return;

          await deleteDoc(doc(db, fixedSchedulesCollectionPath, id));
          setShowMessageModal(false);
          setMessageModalContent({
            title: 'Eliminat',
            message: 'Horari fix eliminat correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
        } catch (error) {
          console.error("Error deleting fixed schedule:", error);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar l'horari fix: ${error.message}`,
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

  const handleAddSessionToDay = (dayName) => {
    setCurrentEditingSchedule(prev => ({
      ...prev,
      [dayName]: [...(prev[dayName] || []), { id: `temp_${Date.now()}`, programId: '', time: '', gymId: '' }]
    }));
  };

  const handleUpdateSessionInDay = (dayName, sessionId, field, value) => {
    setCurrentEditingSchedule(prev => ({
      ...prev,
      [dayName]: prev[dayName].map(session =>
        session.id === sessionId ? { ...session, [field]: value } : session
      )
    }));
  };

  const handleDeleteSessionInDay = (dayName, sessionId) => {
    setCurrentEditingSchedule(prev => ({
      ...prev,
      [dayName]: prev[dayName].filter(session => session.id !== sessionId)
    }));
  };

  const handleSaveFixedSchedule = async () => {
    if (!scheduleStartDate) {
      setMessageModalContent({
        title: 'Error de Validació',
        message: 'Si us plau, selecciona una data d\'inici per a l\'horari.',
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

    // Validate sessions within the schedule
    for (const day of daysOfWeekNames) {
      if (currentEditingSchedule[day]) {
        for (const session of currentEditingSchedule[day]) {
          if (!session.programId || !session.time || !session.gymId) {
            setMessageModalContent({
              title: 'Error de Validació',
              message: `Si us plau, assegura't que totes les sessions del ${day} tenen un programa, hora i gimnàs seleccionats.`,
              isConfirm: false,
              onConfirm: () => setShowMessageModal(false),
            });
            setShowMessageModal(true);
            return;
          }
        }
      }
    }

    const newScheduleEntryData = {
      startDate: scheduleStartDate,
      schedule: currentEditingSchedule,
    };

    try {
      const fixedSchedulesCollectionPath = getUserCollectionPath(appId, currentUserId, 'fixedSchedules');
      if (!fixedSchedulesCollectionPath) return;

      if (editingScheduleEntry && fixedSchedules.some(s => s.id === editingScheduleEntry.id)) {
        const scheduleRef = doc(db, fixedSchedulesCollectionPath, editingScheduleEntry.id);
        await updateDoc(scheduleRef, newScheduleEntryData);
      } else {
        // Handle new entry or copied entry
        const latestExistingSchedule = fixedSchedules.length > 0
          ? fixedSchedules.sort((a,b) => b.startDate.localeCompare(a.startDate))[0]
          : null;

        if (latestExistingSchedule && newScheduleEntryData.startDate <= latestExistingSchedule.startDate) {
          setMessageModalContent({
            title: 'Error de Data',
            message: `La data d'inici del nou horari (${newScheduleEntryData.startDate}) ha de ser posterior a l'últim horari existent (${latestExistingSchedule.startDate}).`,
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
          return;
        }
        await addDoc(collection(db, fixedSchedulesCollectionPath), newScheduleEntryData);
      }
      setShowModal(false);
      setMessageModalContent({
        title: 'Guardat!',
        message: 'Horari fix guardat correctament!',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    } catch (error) {
      console.error("Error saving fixed schedule:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar l'horari fix: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowModal(true);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió d'Horaris Fixos</h1>

      <button
        onClick={handleAddSchedule}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-6"
      >
        Afegir Nou Horari Fix
      </button>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Horaris Fixos Actuals</h2>
        {fixedSchedules.length > 0 ? (
          <ul className="space-y-3">
            {fixedSchedules.map((entry) => (
              <li key={entry.id} className="p-3 bg-gray-50 rounded-lg shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-medium text-gray-800">Actiu des del: {formatDate(entry.startDate)}</p>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleEditSchedule(entry)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 text-sm rounded-lg shadow-md transition duration-300 ease-in-out"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleCopySchedule(entry)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 text-sm rounded-lg shadow-md transition duration-300 ease-in-out"
                    >
                      Copiar
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(entry.id)}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 text-sm rounded-lg shadow-md transition duration-300 ease-in-out"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <details className="text-sm text-gray-600 mt-1">
                  <summary>Veure detalls de l'horari</summary>
                  <div className="mt-2 space-y-1">
                    {daysOfWeekNames.map(day => (
                      <div key={day}>
                        <span className="font-semibold">{day}:</span>
                        {entry.schedule[day] && entry.schedule[day].length > 0 ? (
                          <ul className="list-disc list-inside ml-4">
                            {entry.schedule[day].map((session, sIdx) => {
                              const program = programs.find(p => p.id === session.programId);
                              const gym = gyms.find(g => g.id === session.gymId);
                              return (
                                <li key={sIdx}>{program?.shortName || 'N/A'} ({session.time}) a {gym?.name || 'N/A'}</li>
                              );
                              })}
                          </ul>
                        ) : ' Sense sessions'}
                      </div>
                    ))}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No hi ha horaris fixos definits.</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingScheduleEntry ? 'Editar Horari Fix' : 'Afegir Nou Horari Fix'}</h2>
            <div className="mb-4">
              <label htmlFor="scheduleStartDate" className="block text-gray-700 text-sm font-bold mb-2">Data d'inici de l'horari:</label>
              <input
                type="date"
                id="scheduleStartDate"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={scheduleStartDate}
                onChange={(e) => setScheduleStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-6 max-h-80 overflow-y-auto pr-2">
              {daysOfWeekNames.map(dayName => (
                <div key={dayName} className="border p-4 rounded-lg bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">{dayName}</h3>
                  <div className="space-y-3">
                    {(currentEditingSchedule[dayName] || []).map((session) => (
                      <div key={session.id} className="flex items-center space-x-2">
                        <div className="flex-grow grid grid-cols-3 gap-2">
                          <select
                            className="shadow border rounded-lg w-full py-2 px-1 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={session.programId}
                            onChange={(e) => handleUpdateSessionInDay(dayName, session.id, 'programId', e.target.value)}
                          >
                            <option value="">Programa</option>
                            {programs.map(program => (
                              <option key={program.id} value={program.id}>{program.name}</option>
                            ))}
                          </select>
                          <input
                            type="time"
                            className="shadow border rounded-lg w-full py-2 px-1 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={session.time}
                            onChange={(e) => handleUpdateSessionInDay(dayName, session.id, 'time', e.target.value)}
                          />
                          <select
                            className="shadow border rounded-lg w-full py-2 px-1 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={session.gymId}
                            onChange={(e) => handleUpdateSessionInDay(dayName, session.id, 'gymId', e.target.value)}
                          >
                            <option value="">Gimnàs</option>
                            {gyms.map(gym => (
                              <option key={gym.id} value={gym.id}>{gym.name}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => handleDeleteSessionInDay(dayName, session.id)}
                          className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition duration-200"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd"></path></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleAddSessionToDay(dayName)}
                    className="mt-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded-lg shadow-sm transition duration-300 ease-in-out text-sm"
                  >
                    + Afegir Sessió al {dayName}
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleSaveFixedSchedule}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Guardar Horari Fix
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

export default FixedScheduleManagement;