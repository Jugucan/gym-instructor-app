// src/components/calendar/FullCalendar.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, setDoc } from 'firebase/firestore'; // Added setDoc
import { formatDate, normalizeDateToStartOfDay, getLocalDateString } from '../../utils/dateHelpers.jsx';
import { getActiveFixedSchedule } from '../../utils/scheduleHelpers.jsx';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx';
import { SessionModal } from '../common/SessionModal.jsx';
import { MissedDayModal } from '../common/MissedDayModal.jsx';
import { MessageModal } from '../common/MessageModal.jsx'; // Ensure MessageModal is imported


const FullCalendar = ({ programs, users, gyms, scheduleOverrides, fixedSchedules, recurringSessions, missedDays, db, currentUserId, appId }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [sessionsForDay, setSessionsForDay] = useState([]); // Sessions for the selected date

  const [showMissedDayModal, setShowMissedDayModal] = useState(false);
  const [missedDayDate, setMissedDayDate] = useState(null);
  const [isMissedDayForModal, setIsMissedDayForModal] = useState(false);
  const [missedDayDocIdForModal, setMissedDayDocIdForModal] = useState(null);
  const [existingMissedGymId, setExistingMissedGymId] = useState('');
  const [existingMissedNotes, setExistingMissedNotes] = useState('');


  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const daysOfWeekNames = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

  // Helper to get sessions for a specific date (combining fixed, recurring, and overrides)
  const getSessionsForDate = (date) => {
    const dateNormalized = normalizeDateToStartOfDay(date);
    const dayOfWeek = dateNormalized.getDay();
    const dayName = daysOfWeekNames[dayOfWeek];

    const activeFixedSchedule = getActiveFixedSchedule(dateNormalized, fixedSchedules);
    const fixedDaySessions = activeFixedSchedule[dayName] || [];

    const recurringSessionsForDay = recurringSessions.filter(rec => {
      const recStartDateNormalized = normalizeDateToStartOfDay(new Date(rec.startDate));
      const recEndDateNormalized = rec.endDate ? normalizeDateToStartOfDay(new Date(rec.endDate)) : null;
      return rec.daysOfWeek.includes(dayName) &&
             dateNormalized.getTime() >= recStartDateNormalized.getTime() &&
             (!recEndDateNormalized || dateNormalized.getTime() <= recEndDateNormalized.getTime());
    });

    const override = scheduleOverrides.find(so => normalizeDateToStartOfDay(new Date(so.date)).getTime() === dateNormalized.getTime());

    if (override) {
      // Ensure sessions have a temporary unique ID for React list keying if they don't from Firestore
      return override.sessions.map(s => ({ ...s, id: s.id || `override_${Date.now()}_${Math.random()}`, isOverride: true }));
    } else {
      const combinedSessions = [...fixedDaySessions, ...recurringSessionsForDay];
      const uniqueSessions = [];
      const seen = new Set();
      combinedSessions.forEach(session => {
        const key = `${session.programId}-${session.time}-${session.gymId}`;
        if (!seen.has(key)) {
          // Ensure session has an ID for keying in React if it doesn't from Firestore
          uniqueSessions.push({ ...session, id: session.id || `fixed_rec_${Date.now()}_${Math.random()}` });
          seen.add(key);
        }
      });
      return uniqueSessions.map(s => ({ ...s, isFixedOrRecurring: true })); // Mark type
    }
  };


  const handleDayClick = (date) => {
    setSelectedDate(date);
    const sessions = getSessionsForDate(date);
    setSessionsForDay(sessions);
    setShowSessionModal(true);
  };

  const handleSaveDaySessions = async (sessionsToSave) => {
    if (!selectedDate || !db || !currentUserId || !appId) {
      setMessageModalContent({
        title: 'Error de Connexió',
        message: 'La base de dades no està connectada. Si us plau, recarrega la pàgina o contacta amb el suport.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }

    const dateToSave = getLocalDateString(selectedDate);
    const scheduleOverridesCollectionPath = getUserCollectionPath(appId, currentUserId, 'scheduleOverrides');
    if (!scheduleOverridesCollectionPath) return;

    try {
      const overrideDocRef = doc(db, scheduleOverridesCollectionPath, dateToSave); // Use date as document ID

      if (sessionsToSave.length > 0) {
        // Validate sessions before saving
        for (const session of sessionsToSave) {
          if (!session.programId || !session.time || !session.gymId) {
            setMessageModalContent({
              title: 'Error de Validació',
              message: 'Si us plau, assegura\'t que totes les sessions tenen un programa, hora i gimnàs seleccionats.',
              isConfirm: false,
              onConfirm: () => setShowMessageModal(false),
            });
            setShowMessageModal(true);
            return;
          }
        }
        // Use setDoc to create or overwrite the document with date as ID
        await setDoc(overrideDocRef, {
          date: dateToSave,
          sessions: sessionsToSave.map(({ id, isNew, isOverride, isFixedOrRecurring, ...rest }) => rest), // Remove temp IDs and flags
        });
      } else {
        // If sessionsToSave is empty, delete the override document for this date
        await deleteDoc(overrideDocRef);
      }

      setShowSessionModal(false);
      setMessageModalContent({
        title: 'Sessions Guardades',
        message: 'Les sessions per a aquest dia s\'han guardat correctament!',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    } catch (error) {
      console.error("Error saving day sessions:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar les sessions: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleOpenMissedDayModal = (date) => {
    setMissedDayDate(date);
    const dateNormalized = normalizeDateToStartOfDay(date);
    const existingMissedEntry = missedDays.find(md => normalizeDateToStartOfDay(new Date(md.date)).getTime() === dateNormalized.getTime());
    
    if (existingMissedEntry) {
      setIsMissedDayForModal(true);
      setMissedDayDocIdForModal(existingMissedEntry.id);
      setExistingMissedGymId(existingMissedEntry.gymId);
      setExistingMissedNotes(existingMissedEntry.notes);
    } else {
      setIsMissedDayForModal(false);
      setMissedDayDocIdForModal(null);
      setExistingMissedGymId('');
      setExistingMissedNotes('');
    }
    setShowMissedDayModal(true);
  };

  const handleAddMissedDay = async ({ date, gymId, notes }) => {
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
      const missedDaysCollectionPath = getUserCollectionPath(appId, currentUserId, 'missedDays');
      if (!missedDaysCollectionPath) return;

      const newMissedDay = { date, gymId, notes };

      // Check if this date and gymId combo already exists to prevent duplicates
      const existingMissedDayQuery = query(
        collection(db, missedDaysCollectionPath),
        where('date', '==', date),
        where('gymId', '==', gymId)
      );
      const querySnapshot = await getDocs(existingMissedDayQuery);

      if (!querySnapshot.empty) {
        setMessageModalContent({
          title: 'Error',
          message: 'Aquest dia ja està marcat com a no assistit per a aquest gimnàs (o tots els gimnasos si és el cas).',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
        setShowMessageModal(true);
        return;
      }

      await addDoc(collection(db, missedDaysCollectionPath), newMissedDay);
      setShowMissedDayModal(false);
      setMessageModalContent({
        title: 'Dia No Assistit Registrat',
        message: `El dia ${formatDate(date)} s'ha marcat com a no assistit correctament.`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    } catch (error) {
      console.error("Error adding missed day:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al marcar el dia com a no assistit: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleRemoveMissedDay = async (docId) => {
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
      title: 'Confirmar Desmarcar Dia',
      message: 'Estàs segur que vols desmarcar aquest dia com a no assistit?',
      isConfirm: true,
      onConfirm: async () => {
        try {
          const missedDaysCollectionPath = getUserCollectionPath(appId, currentUserId, 'missedDays');
          if (!missedDaysCollectionPath) return;

          await deleteDoc(doc(db, missedDaysCollectionPath, docId));
          setShowMessageModal(false); // Close confirm modal
          setShowMissedDayModal(false); // Close the original modal
          setMessageModalContent({
            title: 'Dia Desmarcat',
            message: 'El dia s\'ha desmarcat com a no assistit correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
        } catch (error) {
          console.error("Error removing missed day:", error);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al desmarcar el dia: ${error.message}`,
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


  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const currentYear = currentMonth.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth.getMonth(), 1).getDay(); // 0 for Sunday, 1 for Monday

  const calendarDays = useMemo(() => {
    const days = [];
    // Adjust for Monday start (0=Sunday, 1=Monday -> so if Sunday, need 6 blanks, if Monday 0, if Tue 1, etc.)
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentYear, currentMonth.getMonth(), i));
    }
    return days;
  }, [currentMonth, daysInMonth, firstDayOfMonth, currentYear]);


  const todayNormalized = normalizeDateToStartOfDay(new Date());

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={goToPreviousMonth}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Mes Anterior
          </button>
          <h2 className="text-xl font-semibold text-gray-700">
            {currentMonth.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={goToNextMonth}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Mes Següent
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-600 mb-2">
          {['Dl', 'Dm', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'].map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date, index) => {
            if (!date) return <div key={index} className="p-2"></div>;

            const dateNormalized = normalizeDateToStartOfDay(date);
            const dateStr = getLocalDateString(dateNormalized);

            const sessionsToDisplay = getSessionsForDate(date);

            const isHoliday = gyms.some(gym => gym.holidaysTaken.includes(dateStr));
            const isGymClosure = false; // Not implemented yet
            const currentMissedDayEntry = missedDays.find(md => normalizeDateToStartOfDay(new Date(md.date)).getTime() === dateNormalized.getTime());
            const isMissed = !!currentMissedDayEntry;


            return (
              <div
                key={dateStr}
                className={`p-2 rounded-lg flex flex-col items-center justify-center text-xs relative min-h-[80px] cursor-pointer
                  ${dateStr === getLocalDateString(todayNormalized) ? 'bg-blue-200 border border-blue-500' : 'bg-gray-100'}
                  ${isHoliday ? 'bg-red-200 border border-red-500' : ''}
                  ${isGymClosure ? 'bg-purple-200 border border-purple-500' : ''}
                  ${isMissed ? 'bg-orange-100 border border-orange-400' : ''}
                `}
              >
                <span className="font-bold">{date.getDate()}</span>
                {sessionsToDisplay.length > 0 && (
                  <div className="flex flex-wrap justify-center mt-1">
                    {sessionsToDisplay.slice(0, 2).map((session, sIdx) => { // Show up to 2 sessions
                      const program = programs.find(p => p.id === session.programId);
                      return program ? (
                        <span key={sIdx} className="text-[9px] font-semibold mx-0.5 px-1 rounded" style={{ backgroundColor: program.color + '30', color: program.color }}>
                          {program.shortName}
                        </span>
                      ) : null;
                    })}
                    {sessionsToDisplay.length > 2 && (
                      <span className="text-[9px] font-semibold mx-0.5 px-1 rounded bg-gray-300 text-gray-700">+{sessionsToDisplay.length - 2}</span>
                    )}
                  </div>
                )}
                {isHoliday && <span className="text-[10px] text-red-700 mt-1">Vacances</span>}
                {isGymClosure && <span className="text-[10px] text-purple-700 mt-1">Tancat</span>}
                {isMissed && (
                  <span className="absolute top-1 left-1 text-xs text-orange-600" title="Dia no assistit">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                  </span>
                )}
                <div className="absolute bottom-1 left-0 right-0 flex justify-center space-x-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDayClick(date); }}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded-md text-[8px] leading-none"
                    title="Gestionar sessions"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-6.721 6.721A2 2 0 014 14.172V16h1.828l6.172-6.172-2.828-2.828L6.865 10.307zM2 18h16v2H2v-2z"></path></svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenMissedDayModal(date); }}
                    className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-md text-[8px] leading-none"
                    title="Marcar com a dia no assistit"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {showSessionModal && (
        <SessionModal
          show={showSessionModal}
          onClose={() => setShowSessionModal(false)}
          onSave={handleSaveDaySessions}
          selectedDate={selectedDate}
          sessionsForDay={sessionsForDay}
          programs={programs}
          gyms={gyms}
        />
      )}
      {showMissedDayModal && (
        <MissedDayModal
          show={showMissedDayModal}
          onClose={() => setShowMissedDayModal(false)}
          onSave={handleAddMissedDay}
          onUnmark={handleRemoveMissedDay}
          date={missedDayDate}
          gyms={gyms}
          isAlreadyMissed={isMissedDayForModal}
          missedDayDocId={missedDayDocIdForModal}
          existingMissedGymId={existingMissedGymId}
          existingMissedNotes={existingMissedNotes}
        />
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

export default FullCalendar;
