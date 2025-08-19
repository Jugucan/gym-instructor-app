import React, { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx'; // Confirmat: .jsx
import { getLocalDateString } from '../../utils/dateHelpers.jsx'; // Confirmat: .jsx
import { MessageModal } from '../common/MessageModal.jsx'; // Confirmat: .jsx

const FixedScheduleManagement = ({ fixedSchedules, programs, gyms, db, currentUserId, appId }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingScheduleEntry, setEditingScheduleEntry] = useState(null);
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [currentEditingSchedule, setCurrentEditingSchedule] = useState({}); // Stores sessions for each day

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const daysOfWeekNames = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];

  const handleAddSessionToDay = (day) => {
    setCurrentEditingSchedule(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), { programId: '', time: '', gymId: '' }]
    }));
  };

  const handleUpdateSessionInDay = (day, index, field, value) => {
    setCurrentEditingSchedule(prev => {
      const updatedDaySessions = [...prev[day]];
      updatedDaySessions[index] = { ...updatedDaySessions[index], [field]: value };
      return { ...prev, [day]: updatedDaySessions };
    });
  };

  const handleDeleteSessionFromDay = (day, index) => {
    setCurrentEditingSchedule(prev => {
      const updatedDaySessions = prev[day].filter((_, i) => i !== index);
      if (updatedDaySessions.length === 0) {
        const { [day]: removedDay, ...rest } = prev;
        return rest;
      }
      return { ...prev, [day]: updatedDaySessions };
    });
  };

  const handleSaveFixedSchedule = async () => {
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

    if (!scheduleStartDate) {
      setMessageModalContent({
        title: 'Camps Obligatoris',
        message: 'Si us plau, selecciona una data d\'inici per a l\'horari.',
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

    const fixedSchedulesPath = getUserCollectionPath(appId, currentUserId, 'fixedSchedules');
    if (!fixedSchedulesPath) return;

    try {
      if (editingScheduleEntry) {
        const scheduleRef = doc(db, fixedSchedulesPath, editingScheduleEntry.id);
        await updateDoc(scheduleRef, newScheduleEntryData);
        setMessageModalContent({
          title: 'Horari Actualitzat',
          message: 'L\'horari fix s\'ha actualitzat correctament.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
      } else {
        // Prevent adding a new schedule with a start date earlier than the latest existing one
        const latestExistingSchedule = fixedSchedules.length > 0
          ? fixedSchedules.sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
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

        await addDoc(collection(db, fixedSchedulesPath), newScheduleEntryData);
        setMessageModalContent({
          title: 'Horari Afegit',
          message: 'El nou horari fix s\'ha afegit correctament.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
      }
      setShowMessageModal(true);
      setShowModal(false);
      setScheduleStartDate('');
      setCurrentEditingSchedule({});
      setEditingScheduleEntry(null);
    } catch (error) {
      console.error("Error saving fixed schedule:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar l'horari fix: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
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
      message: 'Estàs segur que vols eliminar aquest horari fix? Aquesta acció és irreversible.',
      isConfirm: true,
      onConfirm: async () => {
        const fixedSchedulesPath = getUserCollectionPath(appId, currentUserId, 'fixedSchedules');
        if (!fixedSchedulesPath) return;
        try {
          await deleteDoc(doc(db, fixedSchedulesPath, id));
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Eliminat',
            message: 'Horari fix eliminat correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        } catch (error) {
          console.error("Error deleting fixed schedule:", error);
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar l'horari fix: ${error.message}`,
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        }
      },
      onCancel: () => setShowMessageModal(false),
    });
    setShowMessageModal(true);
  };

  const handleEditSchedule = (scheduleEntry) => {
    setEditingScheduleEntry(scheduleEntry);
    setScheduleStartDate(scheduleEntry.startDate);
    setCurrentEditingSchedule(scheduleEntry.schedule);
    setShowModal(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió d'Horaris Fixos</h1>

      <button
        onClick={() => { setShowModal(true); setEditingScheduleEntry(null); setScheduleStartDate(''); setCurrentEditingSchedule({}); }}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-6"
      >
        Afegir Nou Horari Fix
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fixedSchedules.map(scheduleEntry => (
          <div key={scheduleEntry.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Horari des de: {getLocalDateString(new Date(scheduleEntry.startDate))}</h2>
            <div className="mb-4">
              {daysOfWeekNames.map(day => (
                scheduleEntry.schedule[day] && scheduleEntry.schedule[day].length > 0 && (
                  <div key={day} className="mb-2">
                    <h3 className="text-md font-medium text-gray-700">{day}:</h3>
                    <ul className="list-disc list-inside text-sm text-gray-600 ml-4">
                      {scheduleEntry.schedule[day].map((session, index) => (
                        <li key={index}>
                          {session.time} - {programs.find(p => p.id === session.programId)?.shortName || 'N/A'} (
                          {gyms.find(g => g.id === session.gymId)?.name || 'N/A'})
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              ))}
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => handleEditSchedule(scheduleEntry)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
              >
                Editar
              </button>
              <button
                onClick={() => handleDeleteSchedule(scheduleEntry.id)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"> {/* Adjusted max-h */}
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingScheduleEntry ? 'Editar Horari Fix' : 'Afegir Nou Horari Fix'}</h2>
            <div className="mb-4">
              <label htmlFor="scheduleStartDate" className="block text-gray-700 text-sm font-bold mb-2">Data d'Inici de Validesa:</label>
              <input
                type="date"
                id="scheduleStartDate"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={scheduleStartDate}
                onChange={(e) => setScheduleStartDate(e.target.value)}
              />
            </div>

            {daysOfWeekNames.map(day => (
              <div key={day} className="mb-6 border-b border-gray-200 pb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{day}</h3>
                {currentEditingSchedule[day] && currentEditingSchedule[day].length > 0 ? (
                  currentEditingSchedule[day].map((session, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2 bg-gray-50 p-3 rounded-lg">
                      <select
                        className="shadow border rounded-lg py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                        value={session.programId}
                        onChange={(e) => handleUpdateSessionInDay(day, index, 'programId', e.target.value)}
                      >
                        <option value="">Programa</option>
                        {programs.map(program => (
                          <option key={program.id} value={program.id}>{program.name}</option>
                        ))}
                      </select>
                      <input
                        type="time"
                        className="shadow border rounded-lg py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                        value={session.time}
                        onChange={(e) => handleUpdateSessionInDay(day, index, 'time', e.target.value)}
                      />
                      <select
                        className="shadow border rounded-lg py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                        value={session.gymId}
                        onChange={(e) => handleUpdateSessionInDay(day, index, 'gymId', e.target.value)}
                      >
                        <option value="">Gimnàs</option>
                        {gyms.map(gym => (
                          <option key={gym.id} value={gym.id}>{gym.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleDeleteSessionFromDay(day, index)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold p-2 rounded-lg transition duration-300 ease-in-out text-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.17l2.12-2.12 1.41 1.41L13.41 13.5l2.12 2.12-1.41 1.41L12 14.83l-2.12 2.12-1.41-1.41L10.59 13.5l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm mb-2">No hi ha sessions programades per a {day}.</p>
                )}
                <button
                  onClick={() => handleAddSessionToDay(day)}
                  className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
                >
                  Afegir Sessió
                </button>
              </div>
            ))}

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
                {editingScheduleEntry ? 'Guardar Canvis' : 'Afegir Horari'}
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
