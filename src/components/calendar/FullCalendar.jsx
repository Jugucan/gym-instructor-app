import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { formatDate, normalizeDateToStartOfDay, getLocalDateString, formatDateDDMMYYYY, getReportMonthDates } from '../../utils/dateHelpers.jsx';
import { getActiveFixedSchedule, normalizeGymClosures } from '../../utils/scheduleHelpers.jsx'; // <--- Importació Correcta
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx';
import { SessionModal } from '../common/SessionModal.jsx';
import { MissedDayModal } from '../common/MissedDayModal.jsx';
import { MessageModal } from '../common/MessageModal.jsx';

// Definició dels colors segons el Dashboard.jsx
// Utilitzem classes de Tailwind (bg/text-COLOR-100/700) per a la consistència
const COLOR_FESTIU_BG = 'bg-red-100'; // Vermell clar per a tancaments
const COLOR_FESTIU_TEXT = 'text-red-700';
const COLOR_FESTIU_BORDER = 'border-red-700'; // Utilitzem el color de text per la vora

const COLOR_VACANCES_BG = 'bg-blue-100'; // Blau clar per a vacances
const COLOR_VACANCES_TEXT = 'text-blue-700';
const COLOR_VACANCES_BORDER = 'border-blue-700';

const COLOR_NO_ASSISTIT_BG = 'bg-yellow-100'; // Groc clar per a dies no assistits
const COLOR_NO_ASSISTIT_TEXT = 'text-yellow-700';
const COLOR_NO_ASSISTIT_BORDER = 'border-yellow-700';

// ---------------------------------------------------------------------------
// Funció robusta per normalitzar closures (afegeixo això sense tocar la resta)
// Accepta: { date: "YYYY-MM-DD", notes: "..." }, Date, o Firestore Timestamp (seconds)
// Si ja s'havia normalitzat per scheduleHelpers.normalizeGymClosures, ens assegurem que
// hi hagi la propietat normalizedDate; si no, la calculem des del camp `date`.
// ---------------------------------------------------------------------------
const normalizeClosures = (closures = []) => {
  return (closures || []).map((gc) => {
    // Si ja té normalizedDate, la preservem
    if (gc && gc.normalizedDate) return gc;

    let normalizedDate = '';
    // Si la data és una string "YYYY-MM-DD" o "YYYY-MM-DDT..." -> agafem els 10 primers caràcters
    if (gc && typeof gc.date === 'string') {
      normalizedDate = gc.date.slice(0, 10);
    } else if (gc && gc.date && typeof gc.date.seconds === 'number') {
      // Firestore Timestamp
      normalizedDate = new Date(gc.date.seconds * 1000).toISOString().slice(0, 10);
    } else if (gc && gc.date instanceof Date) {
      normalizedDate = gc.date.toISOString().slice(0, 10);
    } else {
      normalizedDate = '';
    }
    return { ...gc, normalizedDate };
  });
};

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

  // Normalitzem les dates de tancament. Ara, fem-ho robust:
  // - Intentem usar la funció importada normalizeGymClosures (si existeix)
  // - Després assegurem que cada element té `normalizedDate` (YYYY-MM-DD)
  const normalizedGymClosures = useMemo(() => {
  console.log("DEBUG gymClosures:", gymClosures);

  try {
    const base = typeof normalizeGymClosures === 'function'
      ? normalizeGymClosures(gymClosures || [])
      : (gymClosures || []);
    return normalizeClosures(base);
  } catch (e) {
    return normalizeClosures(gymClosures || []);
  }
}, [gymClosures]);

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
    
    // Si és un dia marcat com a no assistit, obrim el modal de no assistit directament
    const isMissed = missedDays.find(md => formatDate(new Date(md.date)) === formatDate(date));
    if (isMissed) {
         handleOpenMissedDayModal(date);
         return;
    }

    setShowSessionModal(true);
  };

  const handleSaveDaySessions = async (sessionsToSave) => {
    if (!selectedDate || !db || !currentUserId || !appId) {
      // ... (Error de connexió)
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
            // ... (Error de validació)
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
      // Sense missatge de confirmació per no trencar el flux
    } catch (error) {
      console.error("Error saving day sessions:", error);
      // ... (Missatge d'error)
    }
  };

  const handleOpenMissedDayModal = (date) => {
    setMissedDayDate(date);
    const dateStr = formatDate(date);
    const existingMissedEntry = missedDays.find(md => formatDate(new Date(md.date)) === dateStr);
    
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
      // ... (Error de connexió)
      return;
    }
    try {
      const missedDaysCollectionPath = getUserCollectionPath(appId, currentUserId, 'missedDays');
      if (!missedDaysCollectionPath) return;

      const dateToSave = formatDate(date);
      const newMissedDay = { date: dateToSave, assignedGymId: gymId, notes };

      const existingMissedDayQuery = query(
        collection(db, missedDaysCollectionPath),
        where('date', '==', dateToSave)
      );
      const querySnapshot = await getDocs(existingMissedDayQuery);

      if (!querySnapshot.empty) {
        // ... (Missatge d'error 'ja marcat')
        return;
      }

      await addDoc(collection(db, missedDaysCollectionPath), newMissedDay);
      setShowMissedDayModal(false);
      // Sense missatge de confirmació
    } catch (error) {
      console.error("Error adding missed day:", error);
      // ... (Missatge d'error)
    }
  };

  const handleRemoveMissedDay = async (docId) => {
    if (!db || !currentUserId || !appId) {
      // ... (Error de connexió)
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
        } catch (error) {
          console.error("Error removing missed day:", error);
          // ... (Missatge d'error)
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
    // Ajust per començar el calendari en dilluns (0=Dg, 1=Dl... 6=Ds)
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(normalizeDateToStartOfDay(new Date(currentYear, monthIndex, i)));
    }
    return days;
  }, [currentMonth, daysInMonth, firstDayOfMonth, currentYear, monthIndex]);

  const todayNormalized = normalizeDateToStartOfDay(new Date());

  // Rang de report 26-25 per al mes actual (pel resum)
  const currentMonthReportStr = formatDate(currentMonth).substring(0, 7); // YYYY-MM
  const dateRange = useMemo(() => getReportMonthDates(currentMonthReportStr), [currentMonthReportStr]);
  const sessionsPeriodLabel = dateRange?.label || '';


  // Càlcul de sessions per centre (del 26 al 25) - CORREGIT PER EXCLOURE DIES LLIURES
  const calculateMonthlySessionsByGym = useMemo(() => {
    if (!dateRange) return {};
    
    const sessionsByGym = {};
    
    gyms.forEach(gym => {
      sessionsByGym[gym.id] = {
        gymName: gym.name,
        count: 0
      };
    });

    // Iterar per cada dia del rang (Inclou la data final del 25)
    for (let d = new Date(dateRange.startDate); d <= dateRange.endDate; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d);
      const dateStr = formatDate(currentDate);
      
      // Utilitzem normalizedGymClosures i la seva propietat normalizedDate (en format AAAA-MM-DD)
      const isGymClosure = normalizedGymClosures.some(gc => gc.normalizedDate === dateStr);
      const isHoliday = gyms.some(gym => gym.holidaysTaken && gym.holidaysTaken.includes(dateStr));
      const isMissed = missedDays.some(md => formatDate(new Date(md.date)) === dateStr);

      if (isGymClosure || isHoliday || isMissed) continue; 
      
      const sessions = getSessionsForDate(currentDate); 
      
      sessions.forEach(session => {
        if (session.gymId && sessionsByGym[session.gymId]) {
          sessionsByGym[session.gymId].count++;
        }
      });
    }

    return sessionsByGym;
  }, [dateRange, gyms, scheduleOverrides, fixedSchedules, recurringSessions, missedDays, normalizedGymClosures]); // <--- Dependència de normalizedGymClosures


  // Resum de dies especials del mes (Usat al resum inferior)
  const specialDaysSummary = useMemo(() => {
    const summary = [];
    
    calendarDays.forEach(date => {
      if (!date) return;
      
      const dateNormalized = normalizeDateToStartOfDay(date);
      const dateStr = formatDate(dateNormalized);
      // Utilitzem formatDateDDMMYYYY només per mostrar a l'usuari (DD-MM-YYYY)
      const dateStrDDMMYYYY = formatDateDDMMYYYY(dateNormalized); 
      
      // PRIORITAT 1: Festiu / Tancaments
      // Utilitzem normalizedGymClosures i la seva propietat normalizedDate
      const closure = normalizedGymClosures.find(gc => gc.normalizedDate === dateStr);
      if (closure) {
        summary.push({
          // Mostrem la data en format DD-MM-YYYY a l'usuari
          date: dateStrDDMMYYYY, 
          type: 'FESTIU / TANCAMENT',
          description: closure.reason || closure.notes || 'Festiu / Tancament',
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
          borderColor: 'border-red-700'
        });
        return; 
      }
      
      // PRIORITAT 2: Vacances Gimnàs
      const vacation = gyms.find(gym => gym.holidaysTaken && gym.holidaysTaken.includes(dateStr));
      if (vacation) {
        summary.push({
          date: dateStrDDMMYYYY,
          type: 'VACANCES GIMNÀS',
          description: `Vacances ${vacation.name}`,
          bgColor: 'bg-blue-100', 
          textColor: 'text-blue-700',
          borderColor: 'border-blue-700'
        });
        return;
      }
      
      // PRIORITAT 3: Dies no assistits
      const missedEntry = missedDays.find(md => formatDate(new Date(md.date)) === dateStr);
      if (missedEntry) {
        const gym = gyms.find(g => g.id === missedEntry.assignedGymId);
        summary.push({
          date: dateStrDDMMYYYY,
          type: 'NO ASSISTIT',
          description: `No assistit${gym ? ` - ${gym.name}` : ''}${missedEntry.notes ? ` - ${missedEntry.notes}` : ''}`,
          bgColor: 'bg-yellow-100', 
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-700'
        });
        return;
      }
    });
    
    // Ordenar per data (utilitzant el format DD-MM-YYYY de 'date')
    return summary.sort((a, b) => {
      // Conversió de DD-MM-YYYY a objecte Date per a la comparació
      const dateA = new Date(a.date.split('-').reverse().join('-'));
      const dateB = new Date(b.date.split('-').reverse().join('-'));
      return dateA - dateB;
    });
  }, [calendarDays, normalizedGymClosures, gyms, missedDays]); // <--- Dependència de normalizedGymClosures

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

        {/* Llegenda de colors - COPIA DEL DASHBOARD */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Llegenda:</h3>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Avui</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-sm border ${COLOR_FESTIU_BG} ${COLOR_FESTIU_BORDER}`}></div>
              <span className={`px-1 rounded-sm font-semibold ${COLOR_FESTIU_BG} ${COLOR_FESTIU_TEXT} border border-transparent`}>Festius/Tancaments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-sm border ${COLOR_VACANCES_BG} ${COLOR_VACANCES_BORDER}`}></div>
              <span className={`px-1 rounded-sm font-semibold ${COLOR_VACANCES_BG} ${COLOR_VACANCES_TEXT} border border-transparent`}>Vacances Gimnàs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-sm border ${COLOR_NO_ASSISTIT_BG} ${COLOR_NO_ASSISTIT_BORDER}`}></div>
              <span className={`px-1 rounded-sm font-semibold ${COLOR_NO_ASSISTIT_BG} ${COLOR_NO_ASSISTIT_TEXT} border border-transparent`}>No Assistit</span>
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
            
            const sessionsToDisplay = getSessionsForDate(date);

            const isToday = dateStr === formatDate(todayNormalized);
            
            // PRIORITAT: 1. Festiu/Tancament, 2. Vacances Gimnàs, 3. No Assistit
            // Utilitzem normalizedDate (en format AAAA-MM-DD) per a la comparació
            const isGymClosure = normalizedGymClosures.some(gc => gc.normalizedDate === dateStr);
            const isHoliday = gyms.some(gym => gym.holidaysTaken && gym.holidaysTaken.includes(dateStr));
            const currentMissedDayEntry = missedDays.find(md => formatDate(new Date(md.date)) === dateStr);
            const isMissed = !!currentMissedDayEntry;

            let dayClasses = 'p-2 rounded-lg flex flex-col items-center justify-center text-xs relative min-h-[80px] cursor-pointer border border-gray-200 transition-all duration-200 hover:shadow-md hover:bg-gray-50';
            let customBgClass = 'bg-white';
            let customTextColorClass = 'text-gray-800';
            let customBorderClass = 'border-gray-200';
            let badgeText = '';

            if (isGymClosure) {
              customBgClass = COLOR_FESTIU_BG;
              customTextColorClass = COLOR_FESTIU_TEXT;
              customBorderClass = COLOR_FESTIU_BORDER;
              // Ara usem notes o reason si existeix
              const closure = normalizedGymClosures.find(gc => gc.normalizedDate === dateStr);
              badgeText = closure?.notes || closure?.reason || 'FESTIU/TANCAMENT';
            } else if (isHoliday) {
              customBgClass = COLOR_VACANCES_BG;
              customTextColorClass = COLOR_VACANCES_TEXT;
              customBorderClass = COLOR_VACANCES_BORDER;
              badgeText = 'VACANCES';
            } else if (isMissed) {
              customBgClass = COLOR_NO_ASSISTIT_BG;
              customTextColorClass = COLOR_NO_ASSISTIT_TEXT;
              customBorderClass = COLOR_NO_ASSISTIT_BORDER;
              badgeText = 'NO ASSISTIT';
            }

            // Aplicar Avui
            if (isToday) {
              if (customBgClass === 'bg-white') {
                  customBgClass = 'bg-blue-100'; // Utilitzar blau clar només si no té color d'estat
                  customBorderClass = 'border-blue-500'; // Borda blava per Avui
              }
              dayClasses += ' font-bold';
            }

            // Eliminar classes genèriques per aplicar les personalitzades
            dayClasses = dayClasses.replace(/bg-[\w-]+/g, '').replace(/border-[\w-]+/g, '').replace(/text-[\w-]+/g, '');


            return (
              <div 
                key={dateStr} 
                className={`${dayClasses} ${customBgClass} ${customTextColorClass} ${customBorderClass}`} 
                onClick={() => handleDayClick(date)}
                style={{ borderWidth: '1px' }}
              >
                <span className={`font-bold text-lg`}>{date.getDate()}</span>
                
                {badgeText && (
                  <div 
                    className={`absolute top-1 left-1 right-1 text-center font-bold text-[9px] py-0.5 px-1 rounded-sm border ${customBgClass} ${customTextColorClass} ${customBorderClass}`}
                    style={{ borderWidth: '1px' }}
                  >
                    {badgeText}
                  </div>
                )}

                {sessionsToDisplay.length > 0 && !isGymClosure && !isHoliday && !isMissed && (
                  <div className="flex flex-wrap justify-center mt-1">
                    {sessionsToDisplay.slice(0, 2).map((session, sIdx) => {
                      const program = programs.find(p => p.id === session.programId);
                      // S'utilitza el color del programa
                      return program ? (
                        <span 
                          key={sIdx} 
                          className="text-[9px] font-semibold mx-0.5 px-1 rounded shadow-sm text-white" 
                          style={{ backgroundColor: program.color }}
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
        
        {/* Resum de sessions per centre (Usa la lògica 26-25) */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-md font-semibold text-blue-900 mb-3">
            Sessions del Mes de Report: <span className="text-blue-600">{sessionsPeriodLabel}</span>
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

        {/* Resum de dies especials */}
        {specialDaysSummary.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Dies Especials del Mes</h3>
            <div className="space-y-2">
              {specialDaysSummary.map((item, idx) => (
                // La lògica de l'ordenació ja utilitza DD-MM-YYYY, aquí només mostrem el que ha passat
                <div key={idx} className={`flex items-start gap-3 p-2 rounded border-l-4 border-l-4 ${item.bgColor}`}>
                  <div className={`font-bold text-sm min-w-[80px] ${item.textColor}`}>{item.date}</div>
                  <div className={`text-sm ${item.textColor}`}>{item.description}</div>
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


