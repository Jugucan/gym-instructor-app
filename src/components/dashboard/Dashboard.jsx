import React, { useState, useEffect } from 'react';
import { getLocalDateString, normalizeDateToStartOfDay, formatDate } from '../../utils/dateHelpers.jsx';
import { getActiveFixedSchedule } from '../../utils/scheduleHelpers.jsx';
import { MessageModal } from '../common/MessageModal.jsx';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx';
import { doc, getDoc, updateDoc, collection, query, where, addDoc, getDocs } from 'firebase/firestore';

const Dashboard = ({ programs, users, gyms, scheduleOverrides, fixedSchedules, recurringSessions, missedDays, db, currentUserId, appId, setMissedDays }) => {
  const today = new Date(); // Use actual current date
  const todayNormalized = normalizeDateToStartOfDay(today);
  const todayStr = getLocalDateString(todayNormalized); // Use getLocalDateString for consistent string format
  const daysOfWeekNames = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

  // State for calendar interactions within Dashboard (MOVED HERE)
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [sessionsForDay, setSessionsForDay] = useState([]); // Sessions for the selected date
  const [showMissedDayModal, setShowMissedDayModal] = useState(false);
  const [missedDayDate, setMissedDayDate] = useState(null);

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const getUserCollectionPath = (collectionName) => {
    if (!currentUserId || !appId) {
      console.error("currentUserId or appId is not available for collection path.");
      return null;
    }
    return `artifacts/${appId}/users/${currentUserId}/${collectionName}`;
  };

  // Helper to get sessions for a specific date (combining fixed, recurring, and overrides)
  const getSessionsForDate = (date) => {
    const dateNormalized = normalizeDateToStartOfDay(date);
    const dayOfWeek = dateNormalized.getDay();
    const dayName = daysOfWeekNames[dayOfWeek];

    const activeFixedSchedule = getActiveFixedSchedule(dateNormalized, fixedSchedules);
    const fixedDaySessions = activeFixedSchedule[dayName] || [];

    const recurringSessionsForDay = recurringSessions.filter(rec => {
      const recStartDateNormalized = normalizeDateToStartOfDay(rec.startDate);
      const recEndDateNormalized = rec.endDate ? normalizeDateToStartOfDay(rec.endDate) : null;
      return rec.daysOfWeek.includes(dayName) &&
             dateNormalized >= recStartDateNormalized &&
             (!recEndDateNormalized || dateNormalized <= recEndDateNormalized);
    });

    const override = scheduleOverrides.find(so => normalizeDateToStartOfDay(so.date).getTime() === dateNormalized.getTime());

    if (override) {
      // Ensure sessions have a temporary ID for keying in React if they don't from Firestore
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

  const handleAddSessionToDay = () => {
    setSessionsForDay(prev => [...prev, { id: `temp_${Date.now()}_${Math.random()}`, programId: '', time: '', gymId: '', notes: '', isNew: true }]);
  };

  const handleUpdateSessionInDay = (sessionId, field, value) => {
    setSessionsForDay(prev =>
      prev.map(session =>
        session.id === sessionId ? { ...session, [field]: value } : session
      )
    );
  };

  const handleDeleteSessionInDay = (sessionId) => {
    setSessionsForDay(prev => prev.filter(session => session.id !== sessionId));
  };

  const handleSaveDaySessions = async () => {
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

    // Validar sessions
    for (const session of sessionsForDay) {
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

    const dateToSave = getLocalDateString(selectedDate);
    const scheduleOverridesCollectionPath = getUserCollectionPath('scheduleOverrides');
    if (!scheduleOverridesCollectionPath) return;

    try {
      const existingOverrideQuery = query(
        collection(db, scheduleOverridesCollectionPath),
        where('date', '==', dateToSave)
      );
      const querySnapshot = await getDocs(existingOverrideQuery);

      if (!querySnapshot.empty) {
        // Update existing override
        const overrideDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, scheduleOverridesCollectionPath, overrideDoc.id), {
          sessions: sessionsForDay.map(({ id, isNew, isOverride, isFixedOrRecurring, ...rest }) => rest), // Remove temp IDs and flags
        });
      } else {
        // Add new override
        await addDoc(collection(db, scheduleOverridesCollectionPath), {
          date: dateToSave,
          sessions: sessionsForDay.map(({ id, isNew, isOverride, isFixedOrRecurring, ...rest }) => rest), // Remove temp IDs and flags
        });
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
      const missedDaysCollectionPath = getUserCollectionPath('missedDays');
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


  // Calculate programs in current rotation
  const programsInRotation = programs.map(program => {
    const relevantSessions = scheduleOverrides.filter(so => so.sessions.some(s => s.programId === program.id))
                              .flatMap(so => so.sessions.map(s => ({ date: so.date, programId: s.programId })))
                              .concat(
                                fixedSchedules.flatMap(fs => 
                                  Object.values(fs.schedule).flat().map(s => ({ date: fs.startDate, programId: s.programId })) // Using fixed schedule start date as a proxy
                                )
                              )
                              .concat(
                                recurringSessions.flatMap(rs => 
                                  [{ date: rs.startDate, programId: rs.programId }] // Using recurring session start date as a proxy
                                )
                              )
                              .filter(s => s.programId === program.id);

    if (relevantSessions.length === 0) return null;

    const sortedSessions = [...relevantSessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastSessionDate = new Date(sortedSessions[0].date);

    // Find the start of the continuous usage period
    let startDate = lastSessionDate;
    for (let i = 0; i < sortedSessions.length - 1; i++) {
        const currentSessDate = new Date(sortedSessions[i].date);
        const nextSessDate = new Date(sortedSessions[i+1].date);
        const diffDays = Math.floor((currentSessDate - nextSessDate) / (1000 * 60 * 60 * 24));
        if (diffDays > 7) { // Assuming "continuous" means no more than 7 days gap
            break;
        }
        startDate = nextSessDate;
    }

    return {
      ...program,
      lastUsed: sortedSessions[0].date,
      currentRotationStartDate: startDate.toISOString().split('T')[0],
    };
  }).filter(Boolean).sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));

  // Helper to calculate age
  const calculateAge = (birthday) => {
    if (!birthday) return 'N/A';
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Upcoming and past birthdays (within a 7-day window)
  const relevantBirthdays = users.filter(user => {
    const userBirthday = normalizeDateToStartOfDay(user.birthday);
    
    // Calculate birthday date for the current year
    let bdayThisYear = new Date(todayNormalized.getFullYear(), userBirthday.getMonth(), userBirthday.getDate());
    bdayThisYear = normalizeDateToStartOfDay(bdayThisYear);

    // Calculate birthday date for the previous year
    let bdayLastYear = new Date(todayNormalized.getFullYear() - 1, userBirthday.getMonth(), userBirthday.getDate());
    bdayLastYear = normalizeDateToStartOfDay(bdayLastYear);

    // Calculate birthday date for the next year
    let bdayNextYear = new Date(todayNormalized.getFullYear() + 1, userBirthday.getMonth(), userBirthday.getDate());
    bdayNextYear = normalizeDateToStartOfDay(bdayNextYear);

    // Check if any of these fall within the -7 to +7 day window from today
    const diffThisYear = Math.ceil((bdayThisYear.getTime() - todayNormalized.getTime()) / (1000 * 60 * 60 * 24));
    const diffLastYear = Math.ceil((bdayLastYear.getTime() - todayNormalized.getTime()) / (1000 * 60 * 60 * 24));
    const diffNextYear = Math.ceil((bdayNextYear.getTime() - todayNormalized.getTime()) / (1000 * 60 * 60 * 24));

    return (diffThisYear >= -7 && diffThisYear <= 7) ||
           (diffLastYear >= -7 && diffLastYear <= 7) ||
           (diffNextYear >= -7 && diffNextYear <= 7);
  }).sort((a, b) => {
    const todayMillis = todayNormalized.getTime();

    // Function to get the closest birthday date in milliseconds
    const getClosestBirthdayMillis = (userBdayString) => {
      const userBday = normalizeDateToStartOfDay(userBdayString);
      const bdayThisYear = normalizeDateToStartOfDay(new Date(todayNormalized.getFullYear(), userBday.getMonth(), userBday.getDate()));
      const bdayNextYear = normalizeDateToStartOfDay(new Date(todayNormalized.getFullYear() + 1, userBday.getMonth(), userBday.getDate()));
      const bdayLastYear = normalizeDateToStartOfDay(new Date(todayNormalized.getFullYear() - 1, userBday.getMonth(), userBday.getDate()));

      const diffThis = Math.abs(bdayThisYear.getTime() - todayMillis);
      const diffNext = Math.abs(bdayNextYear.getTime() - todayMillis);
      const diffLast = Math.abs(bdayLastYear.getTime() - todayMillis);

      if (diffThis <= diffNext && diffThis <= diffLast) return bdayThisYear.getTime();
      if (diffNext <= diffThis && diffNext <= diffLast) return bdayNextYear.getTime();
      return bdayLastYear.getTime();
    };

    const aClosestMillis = getClosestBirthdayMillis(a.birthday);
    const bClosestMillis = getClosestBirthdayMillis(b.birthday);

    // Primary sort: Past birthdays first (descending by date, so more recent past is higher)
    // Then Today's birthdays
    // Then Future birthdays (soonest first)

    const aIsPast = aClosestMillis < todayMillis;
    const aIsToday = aClosestMillis === todayMillis;
    const bIsPast = bClosestMillis < todayMillis;
    const bIsToday = bClosestMillis === todayMillis;

    // Sort order: Past (most recent first) -> Today -> Future (soonest first)
    if (aIsPast && !bIsPast) return -1; // A is past, B is not -> A comes first
    if (!aIsPast && bIsPast) return 1;  // B is past, A is not -> B comes first

    if (aIsToday && !bIsToday) return -1; // A is today, B is not -> A comes first
    if (!aIsToday && bIsToday) return 1;  // B is today, A is not -> B comes first

    // If both are past, sort descending (more recent past first)
    if (aIsPast && bIsPast) {
      return bClosestMillis - aClosestMillis;
    }

    // If both are today, sort by name
    if (aIsToday && bIsToday) {
      return a.name.localeCompare(b.name);
    }

    // If both are future, sort ascending (soonest future first)
    if (!aIsPast && !aIsToday && !bIsPast && !bIsToday) {
      return aClosestMillis - bClosestMillis;
    }

    return 0; // Should not reach here if logic is exhaustive
  });


  // Holiday summary
  const gymVacationSummary = gyms.map(gym => ({
    name: gym.name,
    remaining: gym.totalVacationDays - gym.holidaysTaken.length,
  }));

  // Mini Calendar (showing current month, fixed schedule and overrides)
  const currentMonthForCalendar = todayNormalized; // Start calendar from the actual 'today' month
  const currentYearForCalendar = currentMonthForCalendar.getFullYear();
  const daysInMonthForCalendar = new Date(currentYearForCalendar, currentMonthForCalendar.getMonth() + 1, 0).getDate();
  
  // CORRECTED: Calculate the day of the week for the first day of the month for Dashboard calendar
  const firstDayOfMonthForCalendar = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    // Adjust to make Monday=0, Tuesday=1, ..., Sunday=6
    return (day === 0) ? 6 : day - 1; 
  };
  const startingDayForCalendar = firstDayOfMonthForCalendar(currentYearForCalendar, currentMonthForCalendar.getMonth());

  const calendarDays = [];
  for (let i = 0; i < startingDayForCalendar; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonthForCalendar; i++) {
    calendarDays.push(new Date(currentYearForCalendar, currentMonthForCalendar.getMonth(), i));
  }


  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
      <p className="text-gray-600 text-sm mb-4">Data d'avui: <span className="font-semibold">{todayNormalized.toLocaleDateString('ca-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>


      {/* Programs in Current Rotation */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Programes en Rotació Actual</h2>
        {programs.length > 0 ? ( // Changed from programsInRotation to programs to avoid initial empty state if data not loaded
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programsInRotation.length > 0 ? programsInRotation.map(program => (
              <div key={program.id} className="p-4 rounded-lg flex items-center shadow-sm" style={{ backgroundColor: program.color + '20', borderLeft: `4px solid ${program.color}` }}>
                <div className="flex-grow">
                  <p className="text-lg font-medium text-gray-800">{program.name}</p>
                  <p className="text-sm text-gray-600">En ús des del: {formatDate(program.currentRotationStartDate)}</p>
                  <p className="text-sm text-gray-600">Última sessió: {formatDate(program.lastUsed)}</p>
                </div>
              </div>
            )) : <p className="text-gray-500">Encara no hi ha programes en rotació. Registra algunes sessions!</p>}
          </div>
        ) : (
          <p className="text-gray-500">Carregant programes...</p> // Changed text for loading state
        )}
      </div>

      {/* Upcoming Birthdays */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Aniversaris Pròxims / Recents</h2>
        {users.length > 0 ? ( // Changed from relevantBirthdays to users
          <ul className="space-y-2">
            {relevantBirthdays.length > 0 ? relevantBirthdays.map(user => {
              const userBirthday = normalizeDateToStartOfDay(user.birthday);
              const isToday = userBirthday.getMonth() === todayNormalized.getMonth() && userBirthday.getDate() === todayNormalized.getDate();
              
              // Determine if it's a past birthday for display purposes within the relevant window
              let bdayThisYear = new Date(todayNormalized.getFullYear(), userBirthday.getMonth(), userBirthday.getDate());
              bdayThisYear = normalizeDateToStartOfDay(bdayThisYear);
              const isPast = bdayThisYear.getTime() < todayNormalized.getTime() && !isToday;

              return (
                <li
                  key={user.id}
                  className={`flex items-center text-gray-700 p-2 rounded-lg ${isToday ? 'bg-red-100 border border-red-400 font-bold text-red-800' : ''} ${isPast ? 'opacity-70' : ''}`}
                >
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover mr-3 flex-shrink-0"
                      onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/40x40/cccccc/333333?text=${user.name.charAt(0).toUpperCase()}`; }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-lg mr-3 flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-grow">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-gray-600">
                      Aniversari: {formatDate(user.birthday).replace(`, ${userBirthday.getFullYear()}`, '')} ({calculateAge(user.birthday)} anys)
                      {isToday && <span className="ml-2 text-red-600">🎉 AVUI!</span>}
                      {isPast && <span className="ml-2 text-gray-500">(Passat)</span>}
                    </p>
                    <p className="text-sm text-gray-600">Sol assistir a: {user.usualSessions.join(', ')} ({gyms.find(g => g.id === user.gymId)?.name})</p>
                  </div>
                </li>
              );
            }) : <p className="text-gray-500">No hi ha aniversaris pròxims o recents aquesta setmana.</p>}
          </ul>
        ) : (
          <p className="text-gray-500">Carregant usuaris...</p> // Changed text for loading state
        )}
      </div>

      {/* Holiday Summary */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Resum de Vacances</h2>
        {gyms.length > 0 ? ( // Changed from gymVacationSummary to gyms
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gymVacationSummary.length > 0 ? gymVacationSummary.map(summary => (
              <div key={summary.name} className="p-4 rounded-lg bg-blue-50 border-l-4 border-blue-400">
                <p className="text-lg font-medium text-gray-800">{summary.name}</p>
                <p className="text-sm text-gray-600">Dies restants: <span className="font-semibold text-blue-700">{summary.remaining}</span></p>
              </div>
            )) : <p className="text-gray-500">No hi ha informació de vacances disponible.</p>}
          </div>
        ) : (
          <p className="text-gray-500">Carregant gimnasos...</p> // Changed text for loading state
        )}
      </div>

      {/* Mini Calendar */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Calendari (Mes Actual)</h2>
        <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-600 mb-2">
          {['Dl', 'Dm', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'].map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {fixedSchedules.length > 0 && recurringSessions.length > 0 && gyms.length > 0 ? (
            calendarDays.map((date, index) => {
              if (!date) return <div key={index} className="p-2"></div>;

              const dateNormalized = normalizeDateToStartOfDay(date);
              const dateStr = getLocalDateString(dateNormalized); // Use getLocalDateString
              
              const sessionsToDisplay = getSessionsForDate(date); // Use the helper function here


              const isHoliday = gyms.some(gym => gym.holidaysTaken.includes(dateStr));
              const isGymClosure = false; // Not implemented yet
              const isMissed = missedDays.some(md => normalizeDateToStartOfDay(md.date).getTime() === dateNormalized.getTime());


              return (
                <div
                  key={dateStr}
                  className={`p-2 rounded-lg flex flex-col items-center justify-center text-xs relative min-h-[90px] md:min-h-[110px]
                    ${dateStr === getLocalDateString(normalizeDateToStartOfDay(new Date())) ? 'bg-blue-200 border border-blue-500' : 'bg-gray-100'}
                    ${isHoliday ? 'bg-red-200 border border-red-500' : ''}
                    ${isGymClosure ? 'bg-purple-200 border border-purple-500' : ''}
                    ${isMissed ? 'bg-red-100 border border-red-400' : ''}
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
                    <span className="absolute top-1 left-1 text-xs text-red-600" title="Dia no assistit">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                    </span>
                  )}
                  <div className="absolute bottom-1 right-1 flex space-x-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDayClick(date); }}
                      className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded-md text-[8px] leading-none"
                      title="Gestionar sessions"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-6.721 6.721A2 2 0 014 14.172V16h1.828l6.172-6.172-2.828-2.828L6.865 10.307zM2 18h16v2H2v-2z"></path></svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMissedDayDate(date); setShowMissedDayModal(true); }}
                      className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-md text-[8px] leading-none"
                      title="Marcar com a dia no assistit"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500 col-span-7 text-center">Carregant horaris i gimnasos per al calendari...</p>
          )}
        </div>
      </div>

      {/* Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Gestionar Sessions per {selectedDate ? formatDate(getLocalDateString(selectedDate)) : ''}</h2>

            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2">
              {sessionsForDay.length === 0 && <p className="text-gray-500">No hi ha sessions per a aquest dia. Afegeix-ne una!</p>}
              {sessionsForDay.map((session) => (
                <div key={session.id} className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg shadow-sm">
                  <div className="flex-grow grid grid-cols-3 gap-2">
                    <select
                      className="shadow border rounded-lg w-full py-2 px-1 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={session.programId}
                      onChange={(e) => handleUpdateSessionInDay(session.id, 'programId', e.target.value)}
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
                      onChange={(e) => handleUpdateSessionInDay(session.id, 'time', e.target.value)}
                    />
                    <select
                      className="shadow border rounded-lg w-full py-2 px-1 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={session.gymId}
                      onChange={(e) => handleUpdateSessionInDay(session.id, 'gymId', e.target.value)}
                    >
                      <option value="">Gimnàs</option>
                      {gyms.map(gym => (
                        <option key={gym.id} value={gym.id}>{gym.name}</option>
                      ))}
                    </select>
                    <textarea
                      className="shadow border rounded-lg w-full py-2 px-1 text-gray-700 text-sm col-span-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="1"
                      placeholder="Notes (opcional)"
                      value={session.notes || ''}
                      onChange={(e) => handleUpdateSessionInDay(session.id, 'notes', e.target.value)}
                    ></textarea>
                  </div>
                  <button
                    onClick={() => handleDeleteSessionInDay(session.id)}
                    className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition duration-200"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd"></path></svg>
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddSessionToDay}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded-lg shadow-sm transition duration-300 ease-in-out text-sm mb-4"
            >
              + Afegir Sessió
            </button>

            <div className="flex justify-end space-x-4">
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
      {showMissedDayModal && (
        <MissedDayModal
          show={showMissedDayModal}
          onClose={() => setShowMissedDayModal(false)}
          onSave={handleAddMissedDay}
          date={missedDayDate}
          gyms={gyms}
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

export default Dashboard;
