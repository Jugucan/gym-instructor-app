import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { formatDate, normalizeDateToStartOfDay, getLocalDateString, formatDateDDMMYYYY } from '../../utils/dateHelpers.jsx';
import { getActiveFixedSchedule } from '../../utils/scheduleHelpers.jsx';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx';
import { SessionModal } from '../common/SessionModal.jsx';
import { MissedDayModal } from '../common/MissedDayModal.jsx';
import { MessageModal } from '../common/MessageModal.jsx';

// CANVI IMPORTANT: Afegit gymClosures com a propietat obligatòria
const FullCalendar = ({ programs, users, gyms, scheduleOverrides, fixedSchedules, recurringSessions, missedDays, gymClosures = [], db, currentUserId, appId }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [sessionsForDay, setSessionsForDay] = useState([]);

  const [showMissedDayModal, setShowMissedDayModal] = useState(false);
  const [missedDayDate, setMissedDayDate] = useState(null);
  const [isMissedDayForModal, setIsMissedDayForModal] = useState(false);
  const [missedDayDocIdForModal, setMissedDayDocIdForModal] = useState(null);
  const [existingMissedGymId, setExistingMissedGymId] = useState('');
  const [existingMissedNotes, setExistingMissedNotes] = useState('');

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const daysOfWeekNames = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

  // Helper to get sessions for a specific date
  const getSessionsForDate = (date) => {
    const dateNormalized = normalizeDateToStartOfDay(date);
    const dateStr = formatDate(dateNormalized);
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

    const override = scheduleOverrides.find(so => so.date === dateStr);

    if (override) {
      return override.sessions.map(s => ({ ...s, id: s.id || `override_${Date.now()}_${Math.random()}`, isOverride: true }));
    } else {
      const combinedSessions = [...fixedDaySessions, ...recurringSessionsForDay];
      const uniqueSessions = [];
      const seen = new Set();
      combinedSessions.forEach(session => {
        const key = `${session.programId}-${session.time}-${session.gymId}`;
        if (!seen.has(key)) {
          uniqueSessions.push({ ...session, id: session.id || `fixed_rec_${Date.now()}_${Math.random()}` });
          seen.add(key);
        }
      });
      return uniqueSessions.map(s => ({ ...s, isFixedOrRecurring: true }));
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

    const dateToSave = formatDate(selectedDate);
    const scheduleOverridesCollectionPath = getUserCollectionPath(appId, currentUserId, 'scheduleOverrides');
    if (!scheduleOverridesCollectionPath) return;

    try {
      const overrideDocRef = doc(db, scheduleOverridesCollectionPath, dateToSave);

      if (sessionsToSave.length > 0) {
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
        await setDoc(overrideDocRef, {
          date: dateToSave,
          sessions: sessionsToSave.map(({ id, isNew, isOverride, isFixedOrRecurring, ...rest }) => rest),
        });
      } else {
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
    const dateStr = formatDate(date);
    const existingMissedEntry = missedDays.find(md => md.date === dateStr);
    
    if (existingMissedEntry) {
      setIsMissedDayForModal(true);
      setMissedDayDocIdForModal(existingMissedEntry.id);
      setExistingMissedGymId(existingMissedEntry.assignedGymId);
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

      const dateToSave = formatDate(date);
      const newMissedDay = { date: dateToSave, assignedGymId: gymId, notes };

      const existingMissedDayQuery = query(
        collection(db, missedDaysCollectionPath),
        where('date', '==', dateToSave),
        where('assignedGymId', '==', gymId)
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
        message: `El dia ${formatDateDDMMYYYY(dateToSave)} s'ha marcat com a no assistit correctament.`,
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
          setShowMessageModal(false);
          setShowMissedDayModal(false);
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
  const firstDayOfMonth = new Date(currentYear, currentMonth.getMonth(), 1).getDay();

  const calendarDays = useMemo(() => {
    const days = [];
    // Ajustar l'inici del calendari per a que la setmana comenci en dilluns
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

        {/* Llegenda de colors */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Llegenda:</h3>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-200 border border-blue-500 rounded"></div>
              <span>Avui</span>
            </div>
            <div className="flex items-center gap-2">
              {/*  */}
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span className="text-white bg-red-600 px-1 rounded">Festius/Tancaments</span>
            </div>
            <div className="flex items-center gap-2">
              {/*  */}
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-white bg-orange-500 px-1 rounded">Vacances Gimnàs</span>
            </div>
            <div className="flex items-center gap-2">
              {/*  */}
              <div className="w-4 h-4 bg-yellow-400 border border-yellow-600 rounded"></div>
              <span>No Assistit</span>
            </div>
          </div>
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
            const dateStr = formatDate(dateNormalized);
            const dateStrDDMMYYYY = formatDateDDMMYYYY(dateNormalized); // <--- NOU: Format DD-MM-YYYY

            const sessionsToDisplay = getSessionsForDate(date);

            // Detectar tipus de dia
            const isToday = dateStr === formatDate(todayNormalized);
            // CANVI IMPORTANT: Utilitzem el format DD-MM-YYYY per comprovar els festius
            const isGymClosure = gymClosures && Array.isArray(gymClosures) && gymClosures.some(gc => gc.date === dateStrDDMMYYYY);
            const isHoliday = gyms.some(gym => gym.holidaysTaken && gym.holidaysTaken.includes(dateStr));
            const currentMissedDayEntry = missedDays.find(md => md.date === dateStr);
            const isMissed = !!currentMissedDayEntry;

            // Decidir colors (prioritat: festius > vacances > no assistit > avui)
            let dayClasses = 'p-2 rounded-lg flex flex-col items-center justify-center text-xs relative min-h-[80px] cursor-pointer border-2 transition-all duration-200 hover:shadow-md';
            let textColor = 'text-gray-800';
            let badgeText = '';

            if (isGymClosure) {
              // VERMELL FOSC per festius/tancaments - MÉS VISUAL
              dayClasses += ' bg-red-600 border-red-800 text-white shadow-lg';
              textColor = 'text-white';
              badgeText = 'FESTIU';
            } else if (isHoliday) {
              // TARONJA per vacances del gimnàs - MÉS VISUAL
              dayClasses += ' bg-orange-500 border-orange-700 text-white shadow-md';
              textColor = 'text-white';
              badgeText = 'VACANCES';
            } else if (isMissed) {
              // GROC per no assistit
              dayClasses += ' bg-yellow-400 border-yellow-600';
              badgeText = 'No assistit';
            } else if (isToday) {
              // BLAU per avui
              dayClasses += ' bg-blue-200 border-blue-500';
            } else {
              // BLANC/GRIS per dies normals
              dayClasses += ' bg-gray-100 border-gray-300';
            }

            return (
              <div key={dateStr} className={dayClasses}>
                <span className={`font-bold text-lg ${textColor}`}>{date.getDate()}</span>
                
                {/* Badge amb text més gran i visual */}
                {badgeText && (
                  <div className={`absolute top-1 left-1 right-1 text-center font-bold text-[9px] py-0.5 px-1 rounded ${
                    isGymClosure ? 'bg-red-800 text-white' :
                    isHoliday ? 'bg-orange-700 text-white' :
                    'bg-yellow-600 text-white'
                  }`}>
                    {badgeText}
                  </div>
                )}

                {/* Sessions (només si no és festiu o vacances) */}
                {sessionsToDisplay.length > 0 && !isGymClosure && !isHoliday && (
                  <div className="flex flex-wrap justify-center mt-1">
                    {sessionsToDisplay.slice(0, 2).map((session, sIdx) => {
                      const program = programs.find(p => p.id === session.programId);
                      return program ? (
                        <span 
                          key={sIdx} 
                          className="text-[9px] font-semibold mx-0.5 px-1 rounded shadow-sm" 
                          style={{ backgroundColor: program.color + '90', color: 'white' }}
                        >
                          {program.shortName}
                        </span>
                      ) : null;
                    })}
                    {sessionsToDisplay.length > 2 && (
                      <span className="text-[9px] font-semibold mx-0.5 px-1 rounded bg-gray-600 text-white shadow-sm">
                        +{sessionsToDisplay.length - 2}
                      </span>
                    )}
                  </div>
                )}

                {/* Botons d'acció */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-center space-x-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDayClick(date); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-md text-[8px] leading-none shadow-md"
                    title="Gestionar sessions"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-6.721 6.721A2 2 0 014 14.172V16h1.828l6.172-6.172-2.828-2.828L6.865 10.307zM2 18h16v2H2v-2z"></path>
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenMissedDayModal(date); }}
                    className="bg-red-600 hover:bg-red-700 text-white p-1 rounded-md text-[8px] leading-none shadow-md"
                    title="Marcar com a dia no assistit"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                    </svg>
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
