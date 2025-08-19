import React, { useState, useEffect } from 'react';
import { getLocalDateString, normalizeDateToStartOfDay, formatDate } from '../../utils/dateHelpers.jsx';
import { getActiveFixedSchedule } from '../../utils/scheduleHelpers.jsx';
import { MessageModal } from '../common/MessageModal.jsx';
import { doc, setDoc, collection, getDoc, updateDoc, addDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx';

const Schedule = ({ programs, gyms, fixedSchedules, recurringSessions, scheduleOverrides, missedDays, db, currentUserId, appId }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionsForDay, setSessionsForDay] = useState([]);
  const [showMissedDayModal, setShowMissedDayModal] = useState(false);
  const [missedDaySelectedDate, setMissedDaySelectedDate] = useState('');
  const [missedDaySelectedGymId, setMissedDaySelectedGymId] = useState('');
  const [missedDayNotes, setMissedDayNotes] = useState('');

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const daysOfWeek = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];

  useEffect(() => {
    // Force re-render of calendar implicitly by changing a state if needed,
    // or rely on component re-render when props change.
    // In this case, renderCalendar is called directly in JSX, so it will re-run.
  }, [fixedSchedules, recurringSessions, scheduleOverrides, missedDays, programs, gyms, currentMonth]);


  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  
  // CORRECTED: Calculate the day of the week for the first day of the month
  // new Date(year, month, 1).getDay() returns 0 for Sunday, 1 for Monday... 6 for Saturday.
  // We want Monday to be the first day (index 0 for our display).
  const firstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    // Adjust to make Monday=0, Tuesday=1, ..., Sunday=6
    return (day === 0) ? 6 : day - 1; 
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const numDays = daysInMonth(year, month);
    const startingDay = firstDayOfMonth(year, month); // This will now correctly be 0 for Monday, 1 for Tuesday, etc.

    const calendarDays = [];
    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < startingDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="p-2 border border-gray-200 rounded-md bg-gray-100"></div>);
    }

    for (let day = 1; day <= numDays; day++) {
      const date = new Date(year, month, day);
      const dateString = getLocalDateString(date);
      const isToday = dateString === getLocalDateString(new Date());
      const missed = missedDays.find(md => md.date === dateString);
      const isHoliday = gyms.some(gym => gym.holidaysTaken.includes(dateString));

      let dayClasses = "p-2 border border-gray-200 rounded-md flex flex-col justify-between cursor-pointer transition-colors duration-200 ";
      if (isToday) dayClasses += "bg-blue-200 border-blue-500 ";
      else dayClasses += "bg-white hover:bg-gray-50 ";

      let sessionsForCalendarDay = [];
      const override = scheduleOverrides.find(so => so.date === dateString);

      if (missed) {
        sessionsForCalendarDay.push({ type: 'missed', label: 'LLIURE', color: '#EF4444' }); // Red for missed
      } else if (isHoliday) {
        sessionsForCalendarDay.push({ type: 'holiday', label: 'VACANCES', color: '#60A5FA' }); // Blue for holidays
      } else if (override) {
        sessionsForCalendarDay = override.sessions.map(s => {
          const program = programs.find(p => p.id === s.programId);
          return {
            type: 'program',
            label: program?.shortName || 'Sessió',
            color: program?.color || '#cccccc'
          };
        });
      } else {
        const dayNameForDate = date.toLocaleDateString('ca-ES', { weekday: 'long' });
        const activeFixedSchedule = getActiveFixedSchedule(date, fixedSchedules);
        
        if (activeFixedSchedule && activeFixedSchedule[dayNameForDate] && activeFixedSchedule[dayNameForDate].length > 0) {
          sessionsForCalendarDay = activeFixedSchedule[dayNameForDate].map(s => {
            const program = programs.find(p => p.id === s.programId);
            return {
              type: 'program',
              label: program?.shortName || 'Sessió',
              color: program?.color || '#cccccc'
            };
          });
        } else {
          const recurringSessionsToday = recurringSessions.filter(session => {
            const sessionStartDate = normalizeDateToStartOfDay(new Date(session.startDate));
            const sessionEndDate = session.endDate ? normalizeDateToStartOfDay(new Date(session.endDate)) : null;
            return session.daysOfWeek.includes(dayNameForDate) &&
                   date >= sessionStartDate &&
                   (!sessionEndDate || date <= sessionEndDate);
          });
          sessionsForCalendarDay = recurringSessionsToday.map(s => {
            const program = programs.find(p => p.id === s.programId);
            return {
              type: 'program',
              label: program?.shortName || 'Sessió',
              color: program?.color || '#cccccc'
            };
          });
        }
      }

      return (
        <div key={dateString} className={dayClasses} onClick={() => handleDayClick(date)}>
          <div className="font-semibold text-gray-800 text-right">{day}</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {sessionsForCalendarDay.map((session, idx) => (
              <span key={idx} className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: session.color }}>
                {session.label}
              </span>
            ))}
          </div>
        </div>
      );
    }
    return calendarDays;
  };

  const handleMonthChange = (direction) => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevDate);
      newMonth.setMonth(prevMonth.getMonth() + direction);
      return newMonth;
    });
  };

  const handleDayClick = (date) => {
    setSelectedDate(date);
    const dateString = getLocalDateString(date);
    const dayName = date.toLocaleDateString('ca-ES', { weekday: 'long' });
    
    // Check for an existing override for this date
    const existingOverride = scheduleOverrides.find(so => so.date === dateString);
    if (existingOverride) {
      setSessionsForDay(existingOverride.sessions.map((s, index) => ({ id: `${dateString}-${index}`, ...s })));
    } else {
      // If no override, populate with active fixed schedule or recurring sessions
      const activeFixedSchedule = getActiveFixedSchedule(date, fixedSchedules);
      let defaultSessions = [];

      if (activeFixedSchedule && activeFixedSchedule[dayName] && activeFixedSchedule[dayName].length > 0) {
        defaultSessions = activeFixedSchedule[dayName].map((s, index) => ({ id: `${dateString}-${index}`, ...s }));
      } else {
        const recurringSessionsForDay = recurringSessions.filter(session => {
          const sessionStartDate = normalizeDateToStartOfDay(new Date(session.startDate));
          const sessionEndDate = session.endDate ? normalizeDateToStartOfDay(new Date(session.endDate)) : null;
          return session.daysOfWeek.includes(dayName) &&
                 date >= sessionStartDate &&
                 (!sessionEndDate || date <= sessionEndDate);
        });
        defaultSessions = recurringSessionsForDay.map((s, index) => ({ id: `${dateString}-${index}`, programId: s.programId, time: s.time, gymId: s.gymId, notes: s.notes || '' }));
      }
      setSessionsForDay(defaultSessions);
    }
    setShowSessionModal(true);
  };

  const handleAddSessionToDay = () => {
    setSessionsForDay(prev => [...prev, { id: Date.now(), programId: '', time: '', gymId: '', notes: '' }]);
  };

  const handleUpdateSessionInDay = (id, field, value) => {
    setSessionsForDay(prev =>
      prev.map(session =>
        session.id === id ? { ...session, [field]: value } : session
      )
    );
  };

  const handleDeleteSessionFromDay = (id) => {
    setSessionsForDay(prev => prev.filter(session => session.id !== id));
  };

  const handleSaveDaySessions = async () => {
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

    if (!selectedDate) return;

    const dateNormalized = normalizeDateToStartOfDay(selectedDate);
    const dateStr = getLocalDateString(dateNormalized);
    const scheduleOverridesPath = getUserCollectionPath(appId, currentUserId, 'scheduleOverrides');
    const programsCollectionPath = getUserCollectionPath(appId, currentUserId, 'programs');
    
    if (!scheduleOverridesPath || !programsCollectionPath) return;


    // Validar sessions
    for (const session of sessionsForDay) {
      if (!session.programId || !session.time || !session.gymId) {
        setMessageModalContent({
          title: 'Error de Validació',
          message: 'Totes les sessions han de tenir un programa, hora i gimnàs seleccionats.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
        setShowMessageModal(true);
        return;
      }
    }

    try {
      const overrideRef = doc(db, scheduleOverridesPath, dateStr);

      if (sessionsForDay.length > 0) {
        const sessionsToSave = sessionsForDay.map(({ id, ...rest }) => rest); // Remove temporary 'id'
        await setDoc(overrideRef, { date: dateStr, sessions: sessionsToSave }, { merge: false });
        setMessageModalContent({
            title: 'Sessions Guardades',
            message: 'Les sessions del dia s\'han guardat correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
      } else {
        // If no sessions, delete the override if it exists
        const docSnap = await getDoc(overrideRef);
        if (docSnap.exists()) {
          await deleteDoc(overrideRef);
          setMessageModalContent({
            title: 'Sessions Eliminades',
            message: 'Totes les sessions del dia s\'han eliminat (override eliminat).',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
        } else {
            // No sessions to save, and no override to delete, so just close
            setShowSessionModal(false);
            return;
        }
      }

      // Update program history (sessions array in programs collection)
      const programsCollectionRef = collection(db, programsCollectionPath);
      const allProgramsSnapshot = await getDocs(programsCollectionRef);
      const currentProgramsData = allProgramsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      for (const p of currentProgramsData) {
        const programRef = doc(db, programsCollectionPath, p.id);
        // Filter out any existing sessions for this specific date
        const updatedSessions = p.sessions.filter(s => normalizeDateToStartOfDay(new Date(s.date)).getTime() !== dateNormalized.getTime());
        
        // Add new/updated sessions for this program and date
        sessionsForDay.forEach(session => {
          if (session.programId === p.id) {
            updatedSessions.push({ date: dateStr, notes: session.notes || '' });
          }
        });
        await updateDoc(programRef, { sessions: updatedSessions });
      }

      setShowSessionModal(false);

    } catch (error) {
      console.error("Error guardant sessions del dia o actualitzant historial del programa:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar les sessions del dia: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleOpenMissedDayModal = (date) => {
    setMissedDaySelectedDate(getLocalDateString(date));
    setMissedDaySelectedGymId('');
    setMissedDayNotes('');
    setShowMissedDayModal(true);
  };

  const handleAddMissedDay = async () => {
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
    if (!missedDaySelectedDate || !missedDaySelectedGymId) {
      setMessageModalContent({
        title: 'Error de Validació',
        message: 'Si us plau, selecciona una data i un gimnàs.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }

    const missedDaysPath = getUserCollectionPath(appId, currentUserId, 'missedDays');
    if (!missedDaysPath) return;

    try {
      await addDoc(collection(db, missedDaysPath), { 
        date: missedDaySelectedDate, 
        gymId: missedDaySelectedGymId, 
        notes: missedDayNotes 
      });
      setShowMissedDayModal(false);
      setMessageModalContent({
        title: 'Dia No Assistit Registrat',
        message: `El dia ${formatDate(missedDaySelectedDate)} ha estat marcat com a no assistit.`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    } catch (error) {
      console.error("Error afegint dia perdut:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al registrar el dia no assistit: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Calendari</h1>

      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => handleMonthChange(-1)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Anterior
        </button>
        <span className="text-2xl font-semibold text-gray-700">
          {currentMonth.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => handleMonthChange(1)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Següent
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-600 mb-4">
        {daysOfWeek.map(day => <div key={day} className="py-2">{day}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {renderCalendar()}
      </div>

      {/* Session Management Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Gestionar Sessions per al {getLocalDateString(selectedDate)}</h2>
            {sessionsForDay.length === 0 && (
              <p className="text-gray-600 mb-4">No hi ha sessions programades per defecte o anul·lades per a aquest dia.</p>
            )}
            <div className="space-y-4">
              {sessionsForDay.map(session => (
                <div key={session.id} className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg shadow-sm">
                  <select
                    className="shadow border rounded-lg py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                    value={session.programId}
                    onChange={(e) => handleUpdateSessionInDay(session.id, 'programId', e.target.value)}
                  >
                    <option value="">Selecciona Programa</option>
                    {programs.map(program => (
                      <option key={program.id} value={program.id}>{program.name}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    className="shadow border rounded-lg py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                    value={session.time}
                    onChange={(e) => handleUpdateSessionInDay(session.id, 'time', e.target.value)}
                  />
                  <select
                    className="shadow border rounded-lg py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                    value={session.gymId}
                    onChange={(e) => handleUpdateSessionInDay(session.id, 'gymId', e.target.value)}
                  >
                    <option value="">Selecciona Gimnàs</option>
                    {gyms.map(gym => (
                      <option key={gym.id} value={gym.id}>{gym.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="shadow border rounded-lg py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                    placeholder="Notes (opcional)"
                    value={session.notes || ''}
                    onChange={(e) => handleUpdateSessionInDay(session.id, 'notes', e.target.value)}
                  />
                  <button
                    onClick={() => handleDeleteSessionFromDay(session.id)}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold p-2 rounded-lg transition duration-300 ease-in-out text-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.17l2.12-2.12 1.41 1.41L13.41 13.5l2.12 2.12-1.41 1.41L12 14.83l-2.12 2.12-1.41-1.41L10.59 13.5l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleAddSessionToDay}
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
            >
              Afegir Sessió
            </button>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowSessionModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleSaveDaySessions}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Guardar Sessions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missed Day Modal */}
      {showMissedDayModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Marcar Dia com a No Assistit</h2>
            <div className="mb-4">
              <label htmlFor="missedDayDate" className="block text-gray-700 text-sm font-bold mb-2">Data:</label>
              <input
                type="date"
                id="missedDayDate"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={missedDaySelectedDate}
                onChange={(e) => setMissedDaySelectedDate(e.target.value)}
                readOnly
              />
            </div>
            <div className="mb-4">
              <label htmlFor="missedDayGym" className="block text-gray-700 text-sm font-bold mb-2">Gimnàs Afectat:</label>
              <select
                id="missedDayGym"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={missedDaySelectedGymId}
                onChange={(e) => setMissedDaySelectedGymId(e.target.value)}
              >
                <option value="">Selecciona un gimnàs</option>
                {gyms.map(gym => (
                  <option key={gym.id} value={gym.id}>{gym.name}</option>
                ))}
                <option value="all_gyms">Tots els gimnasos</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="missedDayNotes" className="block text-gray-700 text-sm font-bold mb-2">Notes (Motiu, opcional):</label>
              <textarea
                id="missedDayNotes"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={missedDayNotes}
                onChange={(e) => setMissedDayNotes(e.target.value)}
                rows="3"
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowMissedDayModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleAddMissedDay}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Marcar com a No Assistit
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
