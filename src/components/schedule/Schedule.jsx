import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore'; // Added addDoc
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx'; // Changed .js to .jsx
import { formatDate, getLocalDateString, normalizeDateToStartOfDay } from '../../utils/dateHelpers.jsx'; // Changed .js to .jsx
import { getActiveFixedSchedule, calculateRecurringSessionMinutes } from '../../utils/scheduleHelpers.jsx'; // Changed .js to .jsx
import { MessageModal } from '../common/MessageModal.jsx';

const Schedule = ({ programs, scheduleOverrides, fixedSchedules, users, gyms, recurringSessions, missedDays, db, currentUserId, appId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedDaySchedule, setSelectedDaySchedule] = useState(null);
  const [selectedDateForOverride, setSelectedDateForOverride] = useState('');
  const [overrideProgramId, setOverrideProgramId] = useState('');
  const [overrideGymId, setOverrideGymId] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [isMissedDay, setIsMissedDay] = useState(false);

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });


  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday

  const getDayName = (date) => {
    const options = { weekday: 'long' };
    return new Date(date).toLocaleDateString('ca-ES', options);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getCells = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const numDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month); // 0 (Sun) - 6 (Sat)
    const startingDay = firstDay === 0 ? 6 : firstDay - 1; // Adjust to Monday = 0, Sunday = 6

    const cells = [];

    // Empty cells for the start of the month
    for (let i = 0; i < startingDay; i++) {
      cells.push(<div key={`empty-${i}`} className="p-2 text-center text-gray-400 bg-gray-50 rounded-lg"></div>);
    }

    // Days of the month
    for (let day = 1; day <= numDays; day++) {
      const fullDate = new Date(year, month, day);
      const isoDate = getLocalDateString(fullDate);
      const todayIso = getLocalDateString(new Date());

      const isCurrentDay = isoDate === todayIso;
      const dayName = getDayName(fullDate);
      const isWeekend = fullDate.getDay() === 0 || fullDate.getDay() === 6; // Sunday=0, Saturday=6

      // Determine schedule for the day
      const activeFixedSchedule = getActiveFixedSchedule(fullDate, fixedSchedules);
      const recurringSessionsToday = recurringSessions.filter(session => session.daysOfWeek.includes(dayName));

      // Check for schedule overrides for this specific date
      const override = scheduleOverrides.find(so => so.date === isoDate);
      const missed = missedDays.find(md => md.date === isoDate);

      let daySchedule = { type: 'fixed', sessions: [] };

      if (missed) {
        daySchedule.type = 'missed';
      } else if (override) {
        daySchedule.type = 'override';
        daySchedule.sessions = override.sessions; // Sessions defined in the override
        daySchedule.notes = override.notes;
      } else if (activeFixedSchedule[dayName]) {
        daySchedule.type = 'fixed';
        daySchedule.sessions = activeFixedSchedule[dayName];
      } else if (recurringSessionsToday.length > 0) {
        // If no fixed schedule, but there are recurring sessions for this day of week
        daySchedule.type = 'recurring';
        daySchedule.sessions = recurringSessionsToday.map(rs => ({
            programId: rs.programId,
            gymId: rs.gymId,
            time: rs.time
        }));
      }


      let bgColorClass = 'bg-white';
      let textColorClass = 'text-gray-800';
      if (isCurrentDay) {
        bgColorClass = 'bg-blue-200';
      } else if (isWeekend) {
        bgColorClass = 'bg-gray-100 text-gray-500';
      }

      if (missed) {
        bgColorClass = 'bg-red-200';
        textColorClass = 'text-red-800';
      } else if (override) {
        bgColorClass = 'bg-yellow-200';
        textColorClass = 'text-yellow-800';
      }
      
      cells.push(
        <div
          key={day}
          className={`p-2 text-center rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow duration-200 ${bgColorClass} ${textColorClass}`}
          onClick={() => handleDayClick(fullDate, daySchedule, override)}
        >
          <span className={`font-semibold ${isCurrentDay ? 'text-blue-700' : ''}`}>{day}</span>
          {daySchedule.type === 'missed' && (
            <div className="text-sm font-medium">DIA LLIURE</div>
          )}
          {daySchedule.type !== 'missed' && daySchedule.sessions && daySchedule.sessions.length > 0 && (
            <div className="mt-1 text-left">
              {daySchedule.sessions.map((session, index) => {
                const program = programs.find(p => p.id === session.programId);
                const gym = gyms.find(g => g.id === session.gymId);
                return (
                  <div key={index} className="text-xs flex items-center mb-0.5">
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: program?.color || '#ccc' }}></span>
                    <span>{session.time} {program?.shortName || 'N/A'} ({gym?.name || 'N/A'})</span>
                  </div>
                );
              })}
              {daySchedule.notes && <div className="text-xs text-gray-500 mt-1">Notes: {daySchedule.notes}</div>}
            </div>
          )}
        </div>
      );
    }
    return cells;
  };

  const handleDayClick = (date, daySchedule, override) => {
    setSelectedDateForOverride(getLocalDateString(date));
    setIsMissedDay(daySchedule.type === 'missed');
    
    // Set default values for the override modal
    if (daySchedule.type === 'override' && override) {
      setOverrideProgramId(override.sessions[0]?.programId || ''); // Assuming one session override for now
      setOverrideGymId(override.sessions[0]?.gymId || '');
      setOverrideNotes(override.notes || '');
    } else if (daySchedule.type === 'fixed' && daySchedule.sessions.length > 0) {
      setOverrideProgramId(daySchedule.sessions[0]?.programId || '');
      setOverrideGymId(daySchedule.sessions[0]?.gymId || '');
      setOverrideNotes(''); // No notes for fixed schedule
    } else if (daySchedule.type === 'recurring' && daySchedule.sessions.length > 0) {
        setOverrideProgramId(daySchedule.sessions[0]?.programId || '');
        setOverrideGymId(daySchedule.sessions[0]?.gymId || '');
        setOverrideNotes(''); // No notes for recurring schedule
    }
    else {
      setOverrideProgramId('');
      setOverrideGymId('');
      setOverrideNotes('');
    }
    
    setShowOverrideModal(true);
  };

  const handleSaveOverride = async () => {
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

    const overridesPath = getUserCollectionPath(appId, currentUserId, 'scheduleOverrides');
    const missedDaysPath = getUserCollectionPath(appId, currentUserId, 'missedDays');

    if (!overridesPath || !missedDaysPath) return;

    try {
      if (isMissedDay) {
        // Handle marking as missed day
        const missedDayDocRef = doc(db, missedDaysPath, selectedDateForOverride);
        if (missedDays.find(md => md.date === selectedDateForOverride)) {
          await deleteDoc(missedDayDocRef); // Unmark as missed if already marked
          setMissedDays(prev => prev.filter(md => md.date !== selectedDateForOverride)); // Optimistic update
        } else {
          await setDoc(missedDayDocRef, { date: selectedDateForOverride });
          setMissedDays(prev => [...prev, { date: selectedDateForOverride }]); // Optimistic update
        }

        // Remove any existing override for this day if it's now a missed day
        const existingOverride = scheduleOverrides.find(so => so.date === selectedDateForOverride);
        if (existingOverride) {
          await deleteDoc(doc(db, overridesPath, existingOverride.id));
        }

      } else {
        // Handle saving or updating an override
        if (!overrideProgramId || !overrideGymId) {
          setMessageModalContent({
            title: 'Error de Validació',
            message: 'Si us plau, selecciona un programa i un gimnàs per a la sessió.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
          return;
        }

        const overrideData = {
          date: selectedDateForOverride,
          sessions: [{
            programId: overrideProgramId,
            gymId: overrideGymId,
            time: 'N/A' // Time is not handled in this basic override
          }],
          notes: overrideNotes,
        };

        const existingOverride = scheduleOverrides.find(so => so.date === selectedDateForOverride);

        if (existingOverride) {
          const overrideRef = doc(db, overridesPath, existingOverride.id);
          await setDoc(overrideRef, overrideData); // Use setDoc to overwrite
        } else {
          // Add a new override document with the date as its ID
          await setDoc(doc(db, overridesPath, selectedDateForOverride), overrideData);
        }

        // Remove from missed days if it was previously marked
        const existingMissedDay = missedDays.find(md => md.date === selectedDateForOverride);
        if (existingMissedDay) {
          await deleteDoc(doc(db, missedDaysPath, selectedDateForOverride));
        }
      }
      
      setShowOverrideModal(false);
      setMessageModalContent({
        title: 'Canvis Guardats',
        message: 'L\'horari del dia s\'ha actualitzat correctament.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);

    } catch (error) {
      console.error("Error saving override:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar els canvis: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleDeleteOverride = async () => {
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
        message: 'Estàs segur que vols eliminar aquest canvi d\'horari o dia lliure per a la data seleccionada?',
        isConfirm: true,
        onConfirm: async () => {
            const overridesPath = getUserCollectionPath(appId, currentUserId, 'scheduleOverrides');
            const missedDaysPath = getUserCollectionPath(appId, currentUserId, 'missedDays');
            if (!overridesPath || !missedDaysPath) return;

            try {
                // Try to delete from schedule overrides
                const overrideRef = doc(db, overridesPath, selectedDateForOverride);
                await deleteDoc(overrideRef);
                
                // Try to delete from missed days
                const missedDayRef = doc(db, missedDaysPath, selectedDateForOverride);
                await deleteDoc(missedDayRef);

                setShowOverrideModal(false);
                setShowMessageModal(true);
                setMessageModalContent({
                    title: 'Eliminat',
                    message: 'Canvi d\'horari/dia lliure eliminat correctament.',
                    isConfirm: false,
                    onConfirm: () => setShowMessageModal(false),
                });
            } catch (error) {
                console.error("Error deleting override/missed day:", error);
                setShowMessageModal(true);
                setMessageModalContent({
                    title: 'Error',
                    message: `Hi ha hagut un error al eliminar el canvi: ${error.message}`,
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
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Calendari de Classes</h1>

      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-md">
        <button
          onClick={goToPreviousMonth}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Mes Anterior
        </button>
        <h2 className="text-xl font-semibold text-gray-700">
          {currentDate.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })}
        </h2>
        <button
          onClick={goToNextMonth}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Mes Següent
        </button>
      </div>

      <div className="grid grid-cols-7 gap-4 text-center font-bold text-gray-700 mb-4">
        <div>Dilluns</div>
        <div>Dimarts</div>
        <div>Dimecres</div>
        <div>Dijous</div>
        <div>Divendres</div>
        <div className="text-red-500">Dissabte</div>
        <div className="text-red-500">Diumenge</div>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {getCells()}
      </div>

      {showOverrideModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Gestionar Dia: {formatDate(selectedDateForOverride)}</h2>
            
            <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                    <input
                        type="checkbox"
                        className="mr-2 leading-tight"
                        checked={isMissedDay}
                        onChange={(e) => setIsMissedDay(e.target.checked)}
                    />
                    <span className="text-lg">Marcar com a Dia Lliure / Sense Classes</span>
                </label>
            </div>

            {!isMissedDay && (
              <>
                <div className="mb-4">
                  <label htmlFor="overrideProgram" className="block text-gray-700 text-sm font-bold mb-2">Programa:</label>
                  <select
                    id="overrideProgram"
                    className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={overrideProgramId}
                    onChange={(e) => setOverrideProgramId(e.target.value)}
                  >
                    <option value="">Selecciona un programa</option>
                    {programs.map(program => (
                      <option key={program.id} value={program.id}>{program.name} ({program.shortName})</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="overrideGym" className="block text-gray-700 text-sm font-bold mb-2">Gimnàs:</label>
                  <select
                    id="overrideGym"
                    className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={overrideGymId}
                    onChange={(e) => setOverrideGymId(e.target.value)}
                  >
                    <option value="">Selecciona un gimnàs</option>
                    {gyms.map(gym => (
                      <option key={gym.id} value={gym.id}>{gym.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="overrideNotes" className="block text-gray-700 text-sm font-bold mb-2">Notes:</label>
                  <textarea
                    id="overrideNotes"
                    className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={overrideNotes}
                    onChange={(e) => setOverrideNotes(e.target.value)}
                    rows="3"
                  ></textarea>
                </div>
              </>
            )}

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleDeleteOverride}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Eliminar Canvi
              </button>
              <button
                onClick={handleSaveOverride}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Guardar Canvis
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

export default Schedule;
