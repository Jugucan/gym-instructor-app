import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { formatDate, normalizeDateToStartOfDay, getLocalDateString, formatDateDDMMYYYY } from '../../utils/dateHelpers.jsx';
import { getActiveFixedSchedule } from '../../utils/scheduleHelpers.jsx';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx';
import { SessionModal } from '../common/SessionModal.jsx';
import { MissedDayModal } from '../common/MissedDayModal.jsx';
import { MessageModal } from '../common/MessageModal.jsx';

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
  const monthIndex = currentMonth.getMonth();
  const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, monthIndex, 1).getDay();

  const calendarDays = useMemo(() => {
    const days = [];
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentYear, monthIndex, i));
    }
    return days;
  }, [currentMonth, daysInMonth, firstDayOfMonth, currentYear, monthIndex]);

  const todayNormalized = normalizeDateToStartOfDay(new Date());

  // NOVA FUNCIONALITAT: Càlcul de sessions per centre (del 26 al 25)
  const calculateMonthlySessionsByGym = useMemo(() => {
    // Determinar el rang del mes: del 26 del mes anterior al 25 del mes actual
    const startDate = new Date(currentYear, monthIndex - 1, 26);
    const endDate = new Date(currentYear, monthIndex, 25);
    
    const sessionsByGym = {};
    
    gyms.forEach(gym => {
      sessionsByGym[gym.id] = {
        gymName: gym.name,
        count: 0
      };
    });

    // Iterar per cada dia del rang
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d);
      const sessions = getSessionsForDate(currentDate);
      
      sessions.forEach(session => {
        if (session.gymId && sessionsByGym[session.gymId]) {
          sessionsByGym[session.gymId].count++;
        }
      });
    }

    return sessionsByGym;
  }, [currentMonth, gyms, scheduleOverrides, fixedSchedules, recurringSessions]);

  // NOVA FUNCIONALITAT: Resum de dies especials del mes
  const specialDaysSummary = useMemo(() => {
    const summary = [];
    
    calendarDays.forEach(date => {
      if (!date) return;
      
      const dateNormalized = normalizeDateToStartOfDay(date);
      const dateStr = formatDate(dateNormalized);
      const dateStrDDMMYYYY = formatDateDDMMYYYY(dateNormalized);
      
      // Comprovar festius/tancaments
      const closure = gymClosures.find(gc => gc.date === dateStrDDMMYYYY);
      if (closure) {
        summary.push({
          date: dateStrDDMMYYYY,
          type: 'festiu',
          description: closure.reason || 'Festiu / Tancament',
          color: '#DC2626' // vermell fosc
        });
      }
      
      // Comprovar vacances
      const vacation = gyms.find(gym => gym.holidaysTaken && gym.holidaysTaken.includes(dateStr));
      if (vacation) {
        summary.push({
          date: dateStrDDMMYYYY,
          type: 'vacances',
          description: `Vacances ${vacation.name}`,
          color: '#F97316' // taronja
        });
      }
      
      // Comprovar dies no assistits
      const missedEntry = missedDays.find(md => md.date === dateStr);
      if (missedEntry) {
        const gym = gyms.find(g => g.id === missedEntry.assignedGymId);
        summary.push({
          date: dateStrDDMMYYYY,
          type: 'no_assistit',
          description: `No assistit${gym ? ` - ${gym.name}` : ''}${missedEntry.notes ? ` - ${missedEntry.notes}` : ''}`,
          color: '#FBBF24' // groc
        });
      }
    });
    
    return summary.sort((a, b) => {
      const [dayA, monthA, yearA] = a.date.split('-').map(Number);
      const [dayB, monthB, yearB] = b.date.split('-').map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateA - dateB;
    });
  }, [calendarDays, gymClosures, gyms, missedDays]);

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
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span className="text-white bg-red-600 px-1 rounded">Festius/Tancaments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-white bg-orange-500 px-1 rounded">Vacances Gimnàs</span>
            </div>
            <div className="flex items-center gap-2">
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
            const dateStrDDMMYYYY = formatDateDDMMYYYY(dateNormalized);

            const sessionsToDisplay = getSessionsForDate(date);

            const isToday = dateStr === formatDate(todayNormalized);
            const isGymClosure = gymClosures && Array.isArray(gymClosures) && gymClosures.some(gc => gc.date === dateStrDDMMYYYY);
            const isHoliday = gyms.some(gym => gym.holidaysTaken && gym.holidaysTaken.includes(dateStr));
            const currentMissedDayEntry = missedDays.find(md => md.date === dateStr);
            const isMissed = !!currentMissedDayEntry;

            let dayClasses = 'p-2 rounded-lg flex flex-col items-center justify-center text-xs relative min-h-[80px] cursor-pointer border-2 transition-all duration-200 hover:shadow-md';
            let textColor = 'text-gray-800';
            let badgeText = '';

            if (isGymClosure) {
              dayClasses += ' bg-red-600 border-red-800 text-white shadow-lg';
              textColor = 'text-white';
              badgeText = 'FESTIU';
            } else if (isHoliday) {
              dayClasses += ' bg-orange-500 border-orange-700 text-white shadow-md';
              textColor = 'text-white';
              badgeText = 'VACANCES';
            } else if (isMissed) {
              dayClasses += ' bg-yellow-400 border-yellow-600';
              badgeText = 'No assistit';
            } else if (isToday) {
              dayClasses += ' bg-blue-200 border-blue-500';
            } else {
              dayClasses += ' bg-gray-100 border-gray-300';
            }

            return (
              <div key={dateStr} className={dayClasses} onClick={() => handleDayClick(date)}>
                <span className={`font-bold text-lg ${textColor}`}>{date.getDate()}</span>
                
                {badgeText && (
                  <div className={`absolute top-1 left-1 right-1 text-center font-bold text-[9px] py-0.5 px-1 rounded ${
                    isGymClosure ? 'bg-red-800 text-white' :
                    isHoliday ? 'bg-orange-700 text-white' :
                    'bg-yellow-600 text-white'
                  }`}>
                    {badgeText}
                  </div>
                )}

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
                      <span className="text-[8px] text-gray-500">+{sessionsToDisplay.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* NOVA SECCIÓ: Resum de sessions per centre */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-md font-semibold text-blue-900 mb-3">
            Sessions del Mes (26/{monthIndex === 0 ? 12 : monthIndex}/{monthIndex === 0 ? currentYear - 1 : currentYear} - 25/{monthIndex + 1}/{currentYear})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.values(calculateMonthlySessionsByGym).map((gymData, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg shadow-sm">
                <div className="text-sm font-semibold text-gray-700">{gymData.gymName}</div>
                <div className="text-2xl font-bold text-blue-600">{gymData.count}</div>
                <div className="text-xs text-gray-500">sessions</div>
              </div>
            ))}
          </div>
        </div>

        {/* NOVA SECCIÓ: Resum de dies especials */}
        {specialDaysSummary.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Dies Especials del Mes</h3>
            <div className="space-y-2">
              {specialDaysSummary.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 bg-white rounded border-l-4" style={{ borderLeftColor: item.color }}>
                  <div className="font-bold text-sm text-gray-700 min-w-[80px]">{item.date}</div>
                  <div className="text-sm text-gray-600">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showSessionModal && (
        <SessionModal
          date={selectedDate}
          sessions={sessionsForDay}
          programs={programs}
          gyms={gyms}
          onClose={() => setShowSessionModal(false)}
          onSave={handleSaveDaySessions}
          onOpenMissedDayModal={() => {
            setShowSessionModal(false);
            handleOpenMissedDayModal(selectedDate);
          }}
        />
      )}

      {showMissedDayModal && (
        <MissedDayModal
          date={missedDayDate}
          gyms={gyms}
          isMissed={isMissedDayForModal}
          missedDayDocId={missedDayDocIdForModal}
          existingGymId={existingMissedGymId}
          existingNotes={existingMissedNotes}
          onClose={() => setShowMissedDayModal(false)}
          onSave={handleAddMissedDay}
          onRemove={handleRemoveMissedDay}
        />
      )}

      {showMessageModal && (
        <MessageModal
          title={messageModalContent.title}
          message={messageModalContent.message}
          isConfirm={messageModalContent.isConfirm}
          onConfirm={messageModalContent.onConfirm}
          onCancel={messageModalContent.onCancel}
        />
      )}
    </div>
  );
};

export default FullCalendar;
