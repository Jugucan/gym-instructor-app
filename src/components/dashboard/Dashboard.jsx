import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, deleteDoc, addDoc, getDocs, doc, where } from 'firebase/firestore';
import { getLocalDateString, normalizeDateToStartOfDay } from '../../utils/dateHelpers.jsx';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx';
import { MessageModal } from '../common/MessageModal.jsx'; // Import MessageModal
import { SessionModal } from '../common/SessionModal.jsx'; // Ensure SessionModal is imported
import { MissedDayModal } from '../common/MissedDayModal.jsx'; // Ensure MissedDayModal is imported

const Dashboard = ({ programs, users, gyms, scheduleOverrides, fixedSchedules, recurringSessions, missedDays, db, currentUserId, appId }) => {
  const today = new Date(); // Use actual current date
  const todayNormalized = normalizeDateToStartOfDay(today);
  const todayStr = getLocalDateString(todayNormalized); // Use getLocalDateString for consistent string format
  const daysOfWeekNames = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

  // State for calendar interactions within Dashboard
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [sessionsForDay, setSessionsForDay] = useState([]); // Sessions for the selected date
  const [showMissedDayModal, setShowMissedDayModal] = useState(false);
  const [missedDayDate, setMissedDayDate] = useState(null);
  const [missedDayDocId, setMissedDayDocId] = useState(null); // ID of the missed day document if editing
  const [existingMissedGymId, setExistingMissedGymId] = useState(''); // Existing gym for missed day
  const [existingMissedNotes, setExistingMissedNotes] = useState(''); // Existing notes for missed day


  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const getUserPath = (collectionName) => { // Renamed to avoid conflict with imported getUserCollectionPath
    if (!currentUserId || !appId) {
      console.error("currentUserId or appId is not available for collection path.");
      return null;
    }
    return getUserCollectionPath(appId, currentUserId, collectionName); // Use the imported helper
  };

  // Helper to get sessions for a specific date (combining fixed, recurring, and overrides)
  const getSessionsForDate = (date) => {
    const dateNormalized = normalizeDateToStartOfDay(date);
    const dayOfWeek = dateNormalized.getDay();
    const dayName = daysOfWeekNames[dayOfWeek];

    const activeFixedSchedule = fixedSchedules.find(fs => {
      const fsStartDateNormalized = normalizeDateToStartOfDay(new Date(fs.startDate));
      return fsStartDateNormalized.getTime() <= dateNormalized.getTime();
    });
    const fixedDaySessions = activeFixedSchedule ? (activeFixedSchedule.schedule[dayName] || []) : [];

    const recurringSessionsForDay = recurringSessions.filter(rec => {
      const recStartDateNormalized = normalizeDateToStartOfDay(new Date(rec.startDate));
      const recEndDateNormalized = rec.endDate ? normalizeDateToStartOfDay(new Date(rec.endDate)) : null;
      return rec.daysOfWeek.includes(dayName) &&
             dateNormalized.getTime() >= recStartDateNormalized.getTime() &&
             (!recEndDateNormalized || dateNormalized.getTime() <= recEndDateNormalized.getTime());
    });

    const override = scheduleOverrides.find(so => normalizeDateToStartOfDay(new Date(so.date)).getTime() === dateNormalized.getTime());

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
  
  const handleSaveDaySessions = async (updatedSessions) => { // Accepts updatedSessions directly from SessionModal
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

    // Validate sessions (programId, time, gymId must be present for valid sessions)
    const sessionsToSave = updatedSessions.filter(s => s.programId && s.time && s.gymId);

    const dateToSave = getLocalDateString(selectedDate);
    const scheduleOverridesCollectionPath = getUserPath('scheduleOverrides');
    if (!scheduleOverridesCollectionPath) return;

    try {
      const existingOverrideQuery = query(
        collection(db, scheduleOverridesCollectionPath),
        where('date', '==', dateToSave)
      );
      const querySnapshot = await getDocs(existingOverrideQuery);

      if (!querySnapshot.empty) {
        // Update existing override
        const overrideDocRef = doc(db, scheduleOverridesCollectionPath, querySnapshot.docs[0].id);
        if (sessionsToSave.length > 0) {
          await updateDoc(overrideDocRef, {
            sessions: sessionsToSave.map(({ id, isNew, isOverride, isFixedOrRecurring, ...rest }) => rest), // Remove temp IDs and flags
          });
        } else {
          await deleteDoc(overrideDocRef); // Delete override if no sessions left
        }
      } else {
        // Add new override only if there are sessions to save
        if (sessionsToSave.length > 0) {
          await addDoc(collection(db, scheduleOverridesCollectionPath), {
            date: dateToSave,
            sessions: sessionsToSave.map(({ id, isNew, isOverride, isFixedOrRecurring, ...rest }) => rest), // Remove temp IDs and flags
          });
        }
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
    const missedDayEntry = missedDays.find(md => normalizeDateToStartOfDay(new Date(md.date)).getTime() === normalizeDateToStartOfDay(date).getTime());
    if (missedDayEntry) {
      setMissedDayDocId(missedDayEntry.id);
      setExistingMissedGymId(missedDayEntry.gymId);
      setExistingMissedNotes(missedDayEntry.notes);
    } else {
      setMissedDayDocId(null);
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
      const missedDaysCollectionPath = getUserPath('missedDays');
      if (!missedDaysCollectionPath) return;

      const newMissedDay = { date, gymId, notes };

      if (missedDayDocId) {
        // Update existing missed day
        await updateDoc(doc(db, missedDaysCollectionPath, missedDayDocId), newMissedDay);
        setMessageModalContent({
          title: 'Dia No Assistit Actualitzat',
          message: `El dia ${formatDate(date)} s'ha actualitzat correctament.`,
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
      } else {
        // Add new missed day
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
        setMessageModalContent({
          title: 'Dia No Assistit Registrat',
          message: `El dia ${formatDate(date)} s'ha marcat com a no assistit correctament.`,
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
      }
      setShowMessageModal(true);
      setShowMissedDayModal(false);
    } catch (error) {
      console.error("Error adding/updating missed day:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al marcar el dia com a no assistit: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleUnmarkMissedDay = async (docId) => {
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
      title: 'Confirmar Desmarcar',
      message: 'Estàs segur que vols desmarcar aquest dia com a no assistit?',
      isConfirm: true,
      onConfirm: async () => {
        try {
          const missedDaysCollectionPath = getUserPath('missedDays');
          if (!missedDaysCollectionPath) return;

          await deleteDoc(doc(db, missedDaysCollectionPath, docId));
          setShowMessageModal(false); // Close confirm modal
          setMessageModalContent({
            title: 'Dia Desmarcat',
            message: 'El dia s\'ha desmarcat com a no assistit correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
          setShowMissedDayModal(false); // Close missed day modal after unmarking
        } catch (error) {
          console.error("Error unmarking missed day:", error);
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
    const userBirthday = normalizeDateToStartOfDay(new Date(user.birthday)); // Ensure date object

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
      const userBday = normalizeDateToStartOfDay(new Date(userBdayString));
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
    // Then Future birthdays (ascending by date)

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
  const currentMonth = todayNormalized; // Start calendar from the actual 'today' month
  const currentYear = todayNormalized.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth.getMonth(), 1).getDay(); // 0 for Sunday, 1 for Monday

  const calendarDays = [];
  for (let i = 0; i < (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); i++) { // Adjust for Monday start (0=Sunday, 1=Monday -> so if Sunday, need 6 blanks, if Monday 0, if Tue 1, etc.)
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(currentYear, currentMonth.getMonth(), i));
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
              const userBirthday = normalizeDateToStartOfDay(new Date(user.birthday)); // Ensure date object
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
              const isMissed = missedDays.some(md => normalizeDateToStartOfDay(new Date(md.date)).getTime() === dateNormalized.getTime());


              return (
                <div
                  key={dateStr}
                  className={`p-2 rounded-lg flex flex-col items-center justify-center text-xs relative min-h-[60px]
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
            })
          ) : (
            <p className="text-gray-500 col-span-7 text-center">Carregant horaris i gimnasos per al calendari...</p>
          )}
        </div>
      </div>

      {/* Session Modal */}
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
          onUnmark={handleUnmarkMissedDay}
          date={missedDayDate}
          gyms={gyms}
          isAlreadyMissed={!!missedDayDocId}
          missedDayDocId={missedDayDocId}
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

export default Dashboard;
