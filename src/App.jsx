import React, { useState, useEffect } from 'react';
// Importa les funcions de Firebase
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, onSnapshot, updateDoc, deleteDoc, addDoc, getDocs } from 'firebase/firestore'; // Added getDocs

// Helper to format dates
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('ca-ES', options);
};

// Helper to normalize a date to the start of the day (local time)
const normalizeDateToStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper to get local date string (YYYY-MM-DD)
const getLocalDateString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Function to get the active fixed schedule for a given date
const getActiveFixedSchedule = (date, fixedSchedules) => {
  const dateNormalizedTime = normalizeDateToStartOfDay(date).getTime(); // Get timestamp for comparison
  let activeSchedule = null;
  // Sort schedules by startDate to ensure correct selection
  const sortedSchedules = [...fixedSchedules].sort((a, b) => a.startDate.localeCompare(b.startDate));

  for (const scheduleEntry of sortedSchedules) {
    const entryStartDateNormalized = normalizeDateToStartOfDay(new Date(scheduleEntry.startDate)).getTime();
    if (entryStartDateNormalized <= dateNormalizedTime) {
      activeSchedule = scheduleEntry.schedule;
    } else {
      break; // Schedules are sorted by startDate, so we can stop
    }
  }
  return activeSchedule || {}; // Return empty object if no schedule found
};

// --- Components ---

// New component: MessageModal
const MessageModal = ({ show, title, message, onConfirm, onCancel, isConfirm = false }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96">
        <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          {isConfirm && (
            <button
              onClick={onCancel}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
            >
              Cancel·lar
            </button>
          )}
          <button
            onClick={onConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            {isConfirm ? 'Confirmar' : 'Acceptar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// New component for adding a missed day
const MissedDayModal = ({ show, onClose, onSave, date, gyms }) => {
  const [selectedGymId, setSelectedGymId] = useState('');
  const [notes, setNotes] = useState('');

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  useEffect(() => {
    if (show) {
      setSelectedGymId('');
      setNotes('');
    }
  }, [show]);

  const handleSubmit = () => {
    if (!selectedGymId) {
      setMessageModalContent({
        title: 'Error de Validació',
        message: 'Si us plau, selecciona un gimnàs.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }
    onSave({ date: getLocalDateString(date), gymId: selectedGymId, notes });
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Marcar {formatDate(date)} com a No Assistit</h2>
        <div className="mb-4">
          <label htmlFor="missedGym" className="block text-gray-700 text-sm font-bold mb-2">Gimnàs:</label>
          <select
            id="missedGym"
            className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedGymId}
            onChange={(e) => setSelectedGymId(e.target.value)}
          >
            <option value="">Selecciona un gimnàs</option>
            <option value="all_gyms">Tots els gimnasos</option> {/* New option */}
            {gyms.map(gym => (
              <option key={gym.id} value={gym.id}>{gym.name}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label htmlFor="missedNotes" className="block text-gray-700 text-sm font-bold mb-2">Motiu (Opcional):</label>
          <textarea
            id="missedNotes"
            className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          ></textarea>
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Cancel·lar
          </button>
          <button
            onClick={handleSubmit}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Marcar com a No Assistit
          </button>
        </div>
      </div>
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


const Dashboard = ({ programs, users, gyms, scheduleOverrides, fixedSchedules, recurringSessions, missedDays }) => {
  const today = new Date(); // Use actual current date
  const todayNormalized = normalizeDateToStartOfDay(today);
  const todayStr = getLocalDateString(todayNormalized); // Use getLocalDateString for consistent string format
  const daysOfWeekNames = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

  // Calculate programs in current rotation
  const programsInRotation = programs.map(program => {
    const sortedSessions = [...program.sessions].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (!sortedSessions) return null; // Check if sortedSessions is not empty

    let lastSessionDate = new Date(sortedSessions.date);
    let startDate = lastSessionDate;

    // Find the start of the continuous usage period
    for (let i = 1; i < program.sessions.length; i++) { // Iterate through all sessions, not just sorted ones
      const currentSessionDate = new Date(program.sessions[i].date);
      const diffDays = Math.floor((lastSessionDate - currentSessionDate) / (1000 * 60 * 60 * 24));
      // Assuming "continuous" means no more than 7 days gap between sessions of the same program
      if (diffDays > 7) {
        break;
      }
      startDate = currentSessionDate;
      lastSessionDate = currentSessionDate;
    }
    return {
      ...program,
      lastUsed: sortedSessions.date,
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


  // Determine actual sessions for today
  const currentDayName = daysOfWeekNames[todayNormalized.getDay()];
  const activeFixedScheduleToday = getActiveFixedSchedule(todayNormalized, fixedSchedules);
  const fixedSessionsToday = activeFixedScheduleToday[currentDayName] || [];

  const recurringSessionsToday = recurringSessions.filter(rec => {
    const recStartDateNormalized = normalizeDateToStartOfDay(rec.startDate);
    const recEndDateNormalized = rec.endDate ? normalizeDateToStartOfDay(rec.endDate) : null;
    
    return rec.daysOfWeek.includes(currentDayName) &&
           todayNormalized >= recStartDateNormalized &&
           (!recEndDateNormalized || todayNormalized <= recEndDateNormalized);
  });

  const overrideToday = scheduleOverrides.find(so => normalizeDateToStartOfDay(so.date).getTime() === todayNormalized.getTime());
  const actualSessionsToday = overrideToday ? overrideToday.sessions : [...fixedSessionsToday, ...recurringSessionsToday];


  const isBirthdayRelevantToday = (user) => {
    const userBirthday = normalizeDateToStartOfDay(user.birthday);
    const isTodayBirthday = userBirthday.getMonth() === todayNormalized.getMonth() && userBirthday.getDate() === todayNormalized.getDate();

    if (!isTodayBirthday) return false;

    // Check if user's gym has a session today and if user usually attends that program
    const userGym = gyms.find(g => g.id === user.gymId);
    if (!userGym) return false;

    return actualSessionsToday.some(session => {
      const program = programs.find(p => p.id === session.programId);
      // Check if the session's gym matches the user's gym
      // And if the user's usual sessions include the short name of the program
      return session.gymId === user.gymId && user.usualSessions.some(us => us === program?.shortName);
    });
  };


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
  for (let i = 0; i < firstDayOfMonth - 1; i++) { // Adjust for Monday start
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
              const dayOfWeek = date.getDay(); // 0 for Sunday, 1 for Monday
              const dayName = daysOfWeekNames[dayOfWeek];

              // Get active fixed schedule for this date
              const activeFixedSchedule = getActiveFixedSchedule(dateNormalized, fixedSchedules);
              const fixedDaySessions = activeFixedSchedule[dayName] || [];

              // Get recurring sessions for this date
              const recurringSessionsForDay = recurringSessions.filter(rec => {
                const recStartDateNormalized = normalizeDateToStartOfDay(rec.startDate);
                const recEndDateNormalized = rec.endDate ? normalizeDateToStartOfDay(rec.endDate) : null;
                const dateToCheckNormalized = normalizeDateToStartOfDay(date);

                return rec.daysOfWeek.includes(dayName) &&
                       dateToCheckNormalized >= recStartDateNormalized &&
                       (!recEndDateNormalized || dateToCheckNormalized <= recEndDateNormalized);
              });

              // Check for overrides for this specific date
              const override = scheduleOverrides.find(so => normalizeDateToStartOfDay(so.date).getTime() === dateToCheckNormalized.getTime());
              let sessionsToDisplay = [];
              if (override) {
                sessionsToDisplay = override.sessions;
              } else {
                // Combine fixed and recurring, remove duplicates if any (by programId, time, gymId)
                const combinedSessions = [...fixedDaySessions, ...recurringSessionsForDay];
                const uniqueSessions = [];
                const seen = new Set();
                combinedSessions.forEach(session => {
                  const key = `${session.programId}-${session.time}-${session.gymId}`;
                  if (!seen.has(key)) {
                    uniqueSessions.push(session);
                    seen.add(key);
                  }
                });
                sessionsToDisplay = uniqueSessions;
              }


              const isHoliday = gyms.some(gym => gym.holidaysTaken.includes(dateStr));
              const isGymClosure = false; // Not implemented yet
              const isMissed = missedDays.some(md => normalizeDateToStartOfDay(md.date).getTime() === dateNormalized.getTime());


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
              {sessionsForDay.map((session) => ( // Removed index, rely on session.id
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

const Users = ({ users, setUsers, gyms, db, currentUserId, appId }) => { // Pass db, currentUserId, appId
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [userBirthday, setUserBirthday] = useState('');
  const [userSessions, setUserSessions] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [userGymId, setUserGymId] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhotoUrl, setUserPhotoUrl] = useState('');
  // const [userProfileUrl, setUserProfileUrl] = useState(''); // Removed: For display/explanation only

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const getUserCollectionPath = (collectionName) => {
    if (!currentUserId || !appId) {
      console.error("currentUserId or appId is not available for collection path.");
      return null;
    }
    return `artifacts/${appId}/users/${currentUserId}/${collectionName}`;
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setUserName('');
    setUserBirthday('');
    setUserSessions('');
    setUserNotes('');
    setUserGymId('');
    setUserPhone('');
    setUserEmail('');
    setUserPhotoUrl('');
    // setUserProfileUrl(''); // Removed
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserBirthday(user.birthday);
    setUserSessions(user.usualSessions.join(', '));
    setUserNotes(user.notes);
    setUserGymId(user.gymId || '');
    setUserPhone(user.phone || '');
    setUserEmail(user.email || '');
    setUserPhotoUrl(user.photoUrl || '');
    // setUserProfileUrl(''); // Removed: Clear this when editing, as it's not stored
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!userName || !userBirthday || !userGymId) {
      setMessageModalContent({
        title: 'Error de Validació',
        message: 'El nom, la data d\'aniversari i el gimnàs són obligatoris.',
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

    const newUser = {
      name: userName,
      birthday: userBirthday,
      usualSessions: userSessions.split(',').map(s => s.trim()).filter(Boolean),
      notes: userNotes,
      gymId: userGymId,
      phone: userPhone,
      email: userEmail,
      photoUrl: userPhotoUrl,
    };

    try {
      const usersCollectionPath = getUserCollectionPath('users');
      if (!usersCollectionPath) return;

      if (editingUser) {
        const userRef = doc(db, usersCollectionPath, editingUser.id);
        await updateDoc(userRef, newUser);
      } else {
        await addDoc(collection(db, usersCollectionPath), newUser);
      }
      setShowUserModal(false);
    } catch (error) {
      console.error("Error saving user:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar l'usuari: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleDeleteUser = (userId) => {
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
      message: 'Estàs segur que vols eliminar aquest usuari?',
      isConfirm: true,
      onConfirm: async () => {
        try {
          const usersCollectionPath = getUserCollectionPath('users');
          if (!usersCollectionPath) return;

          await deleteDoc(doc(db, usersCollectionPath, userId));
          setShowMessageModal(false); // Close confirm modal
          setMessageModalContent({ // Show success alert
            title: 'Eliminat',
            message: 'Usuari eliminat correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
        } catch (error) {
          console.error("Error deleting user:", error);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar l'usuari: ${error.message}`,
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


  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió d'Usuaris</h1>
      <button
        onClick={handleAddUser}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-6"
      >
        Afegir Nou Usuari
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.length > 0 ? users.map(user => (
          <div
            key={user.id}
            className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between hover:shadow-lg transition duration-300 ease-in-out"
          >
            <div className="flex items-start">
              <div className="flex-grow">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{user.name}</h2>
                <p className="text-gray-600 text-sm">Aniversari: <span className="font-medium">{formatDate(user.birthday)}</span> (<span className="font-medium">{calculateAge(user.birthday)} anys</span>)</p>
                <p className="text-gray-600 text-sm">Gimnàs: <span className="font-medium">{gyms.find(g => g.id === user.gymId)?.name || 'N/A'}</span></p>
                {user.usualSessions.length > 0 && (
                  <p className="text-gray-600 text-sm">Sessions habituals: <span className="font-medium">{user.usualSessions.join(', ')}</span></p>
                )}
                {user.phone && <p className="text-gray-600 text-sm">Telèfon: <span className="font-medium">{user.phone}</span></p>}
                {user.email && <p className="text-gray-600 text-sm">Correu: <span className="font-medium">{user.email}</span></p>}
                {user.notes && <p className="text-gray-600 text-sm italic mt-2">"{user.notes}"</p>}
              </div>
              {user.photoUrl && (
                <img
                  src={user.photoUrl}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover ml-4 flex-shrink-0"
                  onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/50x50/cccccc/333333?text=${user.name.charAt(0).toUpperCase()}`; }}
                />
              )}
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => handleEditUser(user)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 text-sm rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Editar
              </button>
              <button
                onClick={() => handleDeleteUser(user.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 text-sm rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Eliminar
              </button>
            </div>
          </div>
        )) : <p className="text-gray-500">No hi ha usuaris definits. Afegeix el primer!</p>}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"> {/* Added max-h-[90vh] and overflow-y-auto */}
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingUser ? 'Editar Usuari' : 'Afegir Nou Usuari'}</h2>
            <div className="mb-4">
              <label htmlFor="userName" className="block text-gray-700 text-sm font-bold mb-2">Nom:</label>
              <input
                type="text"
                id="userName"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="userBirthday" className="block text-gray-700 text-sm font-bold mb-2">Data d'Aniversari:</label>
              <input
                type="date"
                id="userBirthday"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userBirthday}
                onChange={(e) => setUserBirthday(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="userGym" className="block text-gray-700 text-sm font-bold mb-2">Gimnàs:</label>
              <select
                id="userGym"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userGymId}
                onChange={(e) => setUserGymId(e.target.value)}
              >
                <option value="">Selecciona un gimnàs</option>
                {gyms.map(gym => (
                  <option key={gym.id} value={gym.id}>{gym.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="userSessions" className="block text-gray-700 text-sm font-bold mb-2">Sessions Habituals (separades per coma, ex: BP, SB):</label>
              <input
                type="text"
                id="userSessions"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userSessions}
                onChange={(e) => setUserSessions(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="userPhone" className="block text-gray-700 text-sm font-bold mb-2">Telèfon (Opcional):</label>
              <input
                type="tel"
                id="userPhone"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="userEmail" className="block text-gray-700 text-sm font-bold mb-2">Correu Electrònic (Opcional):</label>
              <input
                type="email"
                id="userEmail"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="userPhotoUrl" className="block text-gray-700 text-sm font-bold mb-2">URL Foto (Opcional):</label>
              <input
                type="url"
                id="userPhotoUrl"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={userPhotoUrl}
                onChange={(e) => setUserPhotoUrl(e.target.value)}
              />
            </div>
            {/* Removed URL Perfil Gimnàs section */}
            <div className="mb-4">
              <label htmlFor="userNotes" className="block text-gray-700 text-sm font-bold mb-2">Notes:</label>
              <textarea
                id="userNotes"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowUserModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleSaveUser}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Guardar Usuari
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

const FixedScheduleManagement = ({ fixedSchedules, setFixedSchedules, programs, gyms, db, currentUserId, appId }) => { // Pass db, currentUserId, appId
  const [showModal, setShowModal] = useState(false);
  const [editingScheduleEntry, setEditingScheduleEntry] = useState(null);
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [currentEditingSchedule, setCurrentEditingSchedule] = useState({}); // { 'Dilluns': [{programId, time, gymId}] }
  const daysOfWeekNames = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const getUserCollectionPath = (collectionName) => {
    if (!currentUserId || !appId) {
      console.error("currentUserId or appId is not available for collection path.");
      return null;
    }
    return `artifacts/${appId}/users/${currentUserId}/${collectionName}`;
  };

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
      id: `fixed_${Date.now()}`, // New unique ID for the schedule entry itself
      startDate: '', // Clear start date to force user to pick a new one
      schedule: Object.fromEntries(
        Object.entries(entry.schedule).map(([day, sessions]) => [
          day,
          sessions.map(session => ({ ...session, id: `session_${Date.now()}_${Math.random()}` })) // Generate new unique IDs for each session within the copied schedule
        ])
      )
    };
    setEditingScheduleEntry(newCopiedEntry);
    setCurrentEditingSchedule(newCopiedEntry.schedule); // Use the newly ID'd schedule
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
          const fixedSchedulesCollectionPath = getUserCollectionPath('fixedSchedules');
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
      const fixedSchedulesCollectionPath = getUserCollectionPath('fixedSchedules');
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
      setShowModal(true);
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
                    {(currentEditingSchedule[dayName] || []).map((session) => ( // Removed index, rely on session.id
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


const GymsAndHolidays = ({ gyms, setGyms, db, currentUserId, appId }) => { // Pass db, currentUserId, appId
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [selectedGymForHoliday, setSelectedGymForHoliday] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayNotes, setHolidayNotes] = useState('');

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const getUserCollectionPath = (collectionName) => {
    if (!currentUserId || !appId) {
      console.error("currentUserId or appId is not available for collection path.");
      return null;
    }
    return `artifacts/${appId}/users/${currentUserId}/${collectionName}`;
  };

  // Example public holidays for Spain (Catalonia specific might vary)
  // For a real app, this would come from an from an API or a more comprehensive list.
  const publicHolidays2025 = [
    { date: '2025-01-01', name: 'Any Nou' },
    { date: '2025-01-06', name: 'Reis' },
    { date: '2025-04-18', name: 'Divendres Sant' },
    { date: '2025-04-21', name: 'Dilluns de Pasqua' },
    { date: '2025-05-01', name: 'Dia del Treballador' },
    { date: '2025-06-24', name: 'Sant Joan' },
    { date: '2025-08-15', name: 'Assumpció' },
    { date: '2025-09-11', name: 'Diada Nacional de Catalunya' },
    { date: '2025-10-12', name: 'Festa Nacional d\'Espanya' },
    { date: '2025-11-01', name: 'Tots Sants' },
    { date: '2025-12-06', name: 'Dia de la Constitució' },
    { date: '2025-12-08', name: 'Immaculada Concepció' },
    { date: '2025-12-25', name: 'Nadal' },
    { date: '2025-12-26', name: 'Sant Esteve' },
  ];

  const handleAddHoliday = async () => {
    if (!selectedGymForHoliday || !holidayDate) {
      setMessageModalContent({
        title: 'Error de Validació',
        message: 'Si us plau, selecciona un gimnàs i una data.',
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

    try {
      const gymsCollectionPath = getUserCollectionPath('gyms');
      if (!gymsCollectionPath) return;

      const gymRef = doc(db, gymsCollectionPath, selectedGymForHoliday);
      // Get current holidaysTaken array to append to it
      const gymSnap = await getDoc(gymRef);
      const currentHolidays = gymSnap.exists() ? gymSnap.data().holidaysTaken || [] : [];
      
      if (currentHolidays.includes(holidayDate)) {
        setMessageModalContent({
          title: 'Error',
          message: 'Aquesta data ja està marcada com a vacances per a aquest gimnàs.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
        setShowMessageModal(true);
        return;
      }

      await updateDoc(gymRef, {
        holidaysTaken: [...currentHolidays, holidayDate]
      });

      setShowHolidayModal(false);
      setHolidayDate('');
      setHolidayNotes('');
      setMessageModalContent({
        title: 'Vacances Registrades',
        message: `Vacances per al gimnàs ${gyms.find(g => g.id === selectedGymForHoliday)?.name} el ${formatDate(holidayDate)} s'han registrat correctament.`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    } catch (error) {
      console.error("Error adding holiday:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar les vacances: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleSuggestHolidays = async (year) => {
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
    const suggestions = [];
    const daysOfWeek = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

    gyms.forEach(gym => {
      let remainingDays = gym.totalVacationDays - gym.holidaysTaken.length;
      if (remainingDays <= 0) return;

      // Filter public holidays that fall on a workday for this gym
      const relevantPublicHolidays = publicHolidays2025.filter(ph => { // Using 2025 for now
        const phDate = new Date(ph.date);
        const dayName = daysOfWeek[phDate.getDay()];
        return gym.workDays.includes(dayName);
      });

      relevantPublicHolidays.forEach(ph => {
        if (remainingDays <= 0) return;

        const phDate = new Date(ph.date);
        const dayOfWeek = phDate.getDay(); // 0-6, Sunday-Saturday

        // Check for long weekends (especially prioritizing Friday/Thursday)
        // If holiday is Wednesday (3), suggest Thursday (4) and Friday (5) off
        if (dayOfWeek === 3 && remainingDays >= 2) {
          const thursday = new Date(phDate);
          thursday.setDate(phDate.getDate() + 1);
          const friday = new Date(phDate);
          friday.setDate(phDate.getDate() + 2);

          if (gym.workDays.includes(daysOfWeek[thursday.getDay()]) && gym.workDays.includes(daysOfWeek[friday.getDay()])) {
            suggestions.push({
              gym: gym.name,
              dates: [thursday.toISOString().split('T')[0], friday.toISOString().split('T')[0]],
              reason: `Pont de ${ph.name} (Dijous i Divendres)`
            });
            remainingDays -= 2;
          }
        }
        // If holiday is Thursday (4), suggest Friday (5) off
        else if (dayOfWeek === 4 && remainingDays >= 1) {
          const friday = new Date(phDate);
          friday.setDate(phDate.getDate() + 1);
          if (gym.workDays.includes(daysOfWeek[friday.getDay()])) {
            suggestions.push({
              gym: gym.name,
              dates: [friday.toISOString().split('T')[0]],
              reason: `Pont de ${ph.name} (Divendres)`
            });
            remainingDays -= 1;
          }
        }
      });
    });

    if (suggestions.length > 0) {
      const message = "Propostes de vacances:\n\n" + suggestions.map(s =>
        `${s.gym}: ${s.reason} - ${s.dates.map(d => formatDate(d)).join(', ')}`
      ).join('\n\n') + "\n\nVols acceptar aquestes propostes i afegir-les?";

      setMessageModalContent({
        title: 'Suggeriments de Vacances',
        message: message,
        isConfirm: true,
        onConfirm: async () => {
          try {
            const gymsCollectionPath = getUserCollectionPath('gyms');
            if (!gymsCollectionPath) return;

            for (const gym of gyms) {
              const gymSuggestions = suggestions.filter(s => s.gym === gym.name);
              const newHolidays = gymSuggestions.flatMap(s => s.dates);
              
              if (newHolidays.length > 0) {
                const gymRef = doc(db, gymsCollectionPath, gym.id);
                const gymSnap = await getDoc(gymRef);
                const currentHolidays = gymSnap.exists() ? gymSnap.data().holidaysTaken || [] : [];
                
                const uniqueNewHolidays = [...new Set([...currentHolidays, ...newHolidays])]; // Merge and make unique
                await updateDoc(gymRef, {
                  holidaysTaken: uniqueNewHolidays
                });
              }
            }
            setShowMessageModal(false);
            setMessageModalContent({
              title: 'Fet!',
              message: 'Vacances suggerides afegides!',
              isConfirm: false,
              onConfirm: () => setShowMessageModal(false),
            });
            setShowMessageModal(true);
          } catch (error) {
            console.error("Error adding suggested holidays:", error);
            setMessageModalContent({
              title: 'Error',
              message: `Hi ha hagut un error al afegir les vacances suggerides: ${error.message}`,
              isConfirm: false,
              onConfirm: () => setShowMessageModal(false),
            });
            setShowMessageModal(true);
          }
        },
        onCancel: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    } else {
      setMessageModalContent({
        title: 'Sense Suggeriments',
        message: 'No es van trobar suggeriments de vacances intel·ligents per a aquest any.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };


  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió de Vacances i Gimnasos</h1>

      {/* Gym Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Configuració de Gimnasos</h2>
        {gyms.length > 0 ? gyms.map(gym => (
          <div key={gym.id} className="p-4 rounded-lg bg-blue-50 border-l-4 border-blue-400 mb-4">
            <h3 className="text-lg font-medium text-gray-800">{gym.name}</h3>
            <p className="text-sm text-gray-600">Dies de feina: {gym.workDays.join(', ')}</p>
            <p className="text-sm text-gray-600">Total dies de vacances anuals: {gym.totalVacationDays}</p>
            <p className="text-sm text-gray-600">Dies de vacances restants: <span className="font-semibold text-blue-700">{gym.totalVacationDays - gym.holidaysTaken.length}</span></p>
          </div>
        )) : <p className="text-gray-500">Carregant configuració de gimnasos...</p>}
      </div>

      {/* Register Holidays */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Registrar Vacances</h2>
        <button
          onClick={() => setShowHolidayModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Afegir Dia de Vacances
        </button>

        {/* Holiday List */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Dies de Vacances Registrats</h3>
          {gyms.length > 0 ? gyms.map(gym => (
            <div key={gym.id} className="mb-4">
              <h4 className="font-medium text-gray-800">{gym.name}</h4>
              {gym.holidaysTaken.length > 0 ? (
                <ul className="list-disc list-inside text-gray-600 text-sm">
                  {gym.holidaysTaken.map((date, index) => (
                    <li key={index}>{formatDate(date)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No hi ha dies de vacances registrats per a aquest gimnàs.</p>
              )}
            </div>
          )) : <p className="text-gray-500">Carregant dies de vacances...</p>}
        </div>
      </div>

      {/* Holiday Suggestions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Suggeriments de Vacances Intel·ligents</h2>
        <p className="text-gray-600 text-sm mb-4">Genera propostes de vacances basades en festius i el teu horari de feina per a l'any 2025.</p>
        <button
          onClick={() => handleSuggestHolidays(2025)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Generar Suggeriments 2025
        </button>
      </div>

      {/* Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Registrar Dia de Vacances</h2>
            <div className="mb-4">
              <label htmlFor="gymSelectHoliday" className="block text-gray-700 text-sm font-bold mb-2">Gimnàs:</label>
              <select
                id="gymSelectHoliday"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedGymForHoliday}
                onChange={(e) => setSelectedGymForHoliday(e.target.value)}
              >
                <option value="">Selecciona un gimnàs</option>
                {gyms.map(gym => (
                  <option key={gym.id} value={gym.id}>{gym.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="holidayDate" className="block text-gray-700 text-sm font-bold mb-2">Data:</label>
              <input
                type="date"
                id="holidayDate"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="holidayNotes" className="block text-gray-700 text-sm font-bold mb-2">Notes (Opcional):</label>
              <textarea
                id="holidayNotes"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                value={holidayNotes}
                onChange={(e) => setHolidayNotes(e.target.value)}
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowHolidayModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleAddHoliday}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Guardar Vacances
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

const Mixes = ({ programs }) => {
  const favoriteTracks = programs.flatMap(program =>
    program.tracks.filter(track => track.isFavorite).map(track => ({
      ...track,
      programName: program.name,
      programColor: program.color,
      programShortName: program.shortName,
    }))
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Secció de Mixos / Tracks Preferits</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Els meus Tracks Preferits</h2>
        {programs.length > 0 ? ( // Check if programs are loaded
          favoriteTracks.length > 0 ? (
            <ul className="space-y-3">
              {favoriteTracks.map(track => (
                <li key={track.id} className="flex items-center p-3 bg-gray-50 rounded-lg shadow-sm" style={{ borderLeft: `4px solid ${track.programColor}` }}>
                  <div className="flex-grow">
                    <p className="font-medium text-gray-800">{track.name} <span className="text-sm text-gray-500">({track.type})</span></p>
                    <p className="text-xs text-gray-600 mt-1">De: {track.programName} ({track.programShortName})</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Marca alguns tracks com a favorits a la secció de Programes per veure'ls aquí.</p>
          )
        ) : (
          <p className="text-gray-500">Carregant programes...</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Creació de Mixos (Pròximament)</h2>
        <p className="text-gray-500">Aquesta funcionalitat et permetrà crear i guardar les teves pròpies seqüències de mix amb els tracks preferits.</p>
      </div>
    </div>
  );
};

const RecurringSessions = ({ recurringSessions, setRecurringSessions, programs, gyms, db, currentUserId, appId }) => { // Pass db, currentUserId, appId
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [programId, setProgramId] = useState('');
  const [time, setTime] = useState('');
  const [gymId, setGymId] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });


  const allDaysOfWeek = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];

  const getUserCollectionPath = (collectionName) => {
    if (!currentUserId || !appId) {
      console.error("currentUserId or appId is not available for collection path.");
      return null;
    }
    return `artifacts/${appId}/users/${currentUserId}/${collectionName}`;
  };

  const handleAddSession = () => {
    setEditingSession(null);
    setProgramId('');
    setTime('');
    setGymId('');
    setDaysOfWeek([]);
    setStartDate('');
    setEndDate('');
    setNotes('');
    setShowModal(true);
  };

  const handleEditSession = (session) => {
    setEditingSession(session);
    setProgramId(session.programId);
    setTime(session.time);
    setGymId(session.gymId);
    setDaysOfWeek(session.daysOfWeek);
    setStartDate(session.startDate);
    setEndDate(session.endDate || '');
    setNotes(session.notes || '');
    setShowModal(true);
  };

  const handleSaveSession = async () => {
    if (!programId || !time || !gymId || daysOfWeek.length === 0 || !startDate) {
      setMessageModalContent({
        title: 'Error de Validació',
        message: 'Si us plau, omple tots els camps obligatoris (Programa, Hora, Gimnàs, Dies de la Setmana, Data d\'Inici).',
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

    const newSessionData = {
      programId,
      time,
      gymId,
      daysOfWeek,
      startDate,
      endDate: endDate || null,
      notes,
    };

    try {
      const recurringSessionsCollectionPath = getUserCollectionPath('recurringSessions');
      if (!recurringSessionsCollectionPath) return;

      if (editingSession) {
        const sessionRef = doc(db, recurringSessionsCollectionPath, editingSession.id);
        await updateDoc(sessionRef, newSessionData);
      } else {
        await addDoc(collection(db, recurringSessionsCollectionPath), newSessionData);
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error saving recurring session:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar la sessió recurrent: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleDeleteSession = (sessionId) => {
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
      message: 'Estàs segur que vols eliminar aquesta sessió recurrent?',
      isConfirm: true,
      onConfirm: async () => {
        try {
          const recurringSessionsCollectionPath = getUserCollectionPath('recurringSessions');
          if (!recurringSessionsCollectionPath) return;

          await deleteDoc(doc(db, recurringSessionsCollectionPath, sessionId));
          setShowMessageModal(false);
          setMessageModalContent({
            title: 'Eliminat',
            message: 'Sessió recurrent eliminada correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
        } catch (error) {
          console.error("Error deleting recurring session:", error);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar la sessió recurrent: ${error.message}`,
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

  const handleToggleDay = (day) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió de Sessions Recurrents</h1>
      <button
        onClick={handleAddSession}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-6"
      >
        Afegir Nova Sessió Recurrent
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recurringSessions.length === 0 && <p className="text-gray-500">No hi ha sessions recurrents definides.</p>}
        {recurringSessions.map(session => {
          const program = programs.find(p => p.id === session.programId);
          const gym = gyms.find(g => g.id === session.gymId);
          return (
            <div
              key={session.id}
              className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between hover:shadow-lg transition duration-300 ease-in-out"
              style={{ borderLeft: `8px solid ${program?.color || '#9CA3AF'}` }}
            >
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {program?.name || 'Programa Desconegut'} ({session.time})
                </h2>
                <p className="text-gray-600 text-sm">Gimnàs: <span className="font-medium">{gym?.name || 'N/A'}</span></p>
                <p className="text-gray-600 text-sm">Dies: <span className="font-medium">{session.daysOfWeek.join(', ')}</span></p>
                <p className="text-gray-600 text-sm">Inici: <span className="font-medium">{formatDate(session.startDate)}</span></p>
                {session.endDate && <p className="text-gray-600 text-sm">Fi: <span className="font-medium">{formatDate(session.endDate)}</span></p>}
                {session.notes && <p className="text-gray-600 text-sm italic mt-2">"{session.notes}"</p>}
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => handleEditSession(session)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 text-sm rounded-lg shadow-md transition duration-300 ease-in-out"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteSession(session.id)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 text-sm rounded-lg shadow-md transition duration-300 ease-in-out"
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingSession ? 'Editar Sessió Recurrent' : 'Afegir Nova Sessió Recurrent'}</h2>
            <div className="mb-4">
              <label htmlFor="programId" className="block text-gray-700 text-sm font-bold mb-2">Programa:</label>
              <select
                id="programId"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
              >
                <option value="">Selecciona un programa</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="time" className="block text-gray-700 text-sm font-bold mb-2">Hora:</label>
              <input
                type="time"
                id="time"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="gymId" className="block text-gray-700 text-sm font-bold mb-2">Gimnàs:</label>
              <select
                id="gymId"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={gymId}
                onChange={(e) => setGymId(e.target.value)}
              >
                <option value="">Selecciona un gimnàs</option>
                {gyms.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Dies de la Setmana:</label>
              <div className="flex flex-wrap gap-2">
                {allDaysOfWeek.map(day => (
                  <button
                    key={day}
                    onClick={() => handleToggleDay(day)}
                    className={`py-2 px-4 rounded-lg text-sm font-medium transition duration-200 ease-in-out
                      ${daysOfWeek.includes(day) ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                    `}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="startDate" className="block text-gray-700 text-sm font-bold mb-2">Data d'Inici:</label>
              <input
                type="date"
                id="startDate"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="endDate" className="block text-gray-700 text-sm font-bold mb-2">Data de Fi (Opcional):</label>
              <input
                type="date"
                id="endDate"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-2">Notes:</label>
              <textarea
                id="notes"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleSaveSession}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Guardar Sessió
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


const Settings = ({ setCurrentPage }) => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Configuració</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          onClick={() => setCurrentPage('programs')}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition duration-300 ease-in-out"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Gestió de Programes</h2>
          <p className="text-gray-600 text-sm">Afegeix, edita o elimina programes i els seus tracks.</p>
        </div>
        <div
          onClick={() => setCurrentPage('users')}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition duration-300 ease-in-out"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Gestió d'Usuaris</h2>
          <p className="text-gray-600 text-sm">Gestiona la informació dels teus alumnes i els seus aniversaris.</p>
        </div>
        <div
          onClick={() => setCurrentPage('gymsAndHolidays')}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition duration-300 ease-in-out"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Gestió de Vacances i Gimnasos</h2>
          <p className="text-gray-600 text-sm">Configura gimnasos, registra vacances i tancaments.</p>
        </div>
        <div
          onClick={() => setCurrentPage('fixedScheduleManagement')}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition duration-300 ease-in-out"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Gestió d'Horaris Fixos</h2>
          <p className="text-gray-600 text-sm">Defineix i modifica el teu horari de classes setmanal.</p>
        </div>
        <div
          onClick={() => setCurrentPage('recurringSessions')}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition duration-300 ease-in-out"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Sessions Recurrents</h2>
          <p className="text-gray-600 text-sm">Gestiona sessions que es repeteixen regularment.</p>
        </div>
      </div>
    </div>
  );
};


const MonthlyReport = ({ programs, gyms, fixedSchedules, recurringSessions, scheduleOverrides, missedDays }) => {
  const [reportMonth, setReportMonth] = useState(new Date()); // Month to display report for
  const [monthlySummary, setMonthlySummary] = useState({});
  const [loading, setLoading] = useState(false);

  const daysOfWeekNames = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

  // Calculate the billing period (26th to 25th) for the given month
  const getBillingPeriod = (dateInMonth) => {
    const year = dateInMonth.getFullYear();
    const month = dateInMonth.getMonth(); // 0-11

    let startDate, endDate;

    // If the 26th of the current month is before or on the given date
    if (dateInMonth.getDate() >= 26) {
      startDate = new Date(year, month, 26);
      endDate = new Date(year, month + 1, 25);
    } else {
      // If the given date is before the 26th, the period started last month
      startDate = new Date(year, month - 1, 26);
      endDate = new Date(year, month, 25);
    }
    return { startDate: normalizeDateToStartOfDay(startDate), endDate: normalizeDateToStartOfDay(endDate) };
  };

  useEffect(() => {
    setLoading(true);
    const calculateReport = () => {
      const { startDate, endDate } = getBillingPeriod(reportMonth);
      const summary = {}; // { gymId: { actualSessions: count, missedSessions: count, expectedSessions: count } }

      gyms.forEach(gym => {
        summary[gym.id] = {
          actualSessions: 0,
          missedSessions: 0,
          expectedSessions: 0,
          name: gym.name
        };
      });

      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateNormalized = normalizeDateToStartOfDay(currentDate);
        const dateStr = getLocalDateString(dateNormalized);
        const dayOfWeek = dateNormalized.getDay();
        const dayName = daysOfWeekNames[dayOfWeek];

        // Get expected sessions for this day
        const activeFixedSchedule = getActiveFixedSchedule(dateNormalized, fixedSchedules);
        const fixedDaySessions = activeFixedSchedule[dayName] || [];

        const recurringSessionsForDay = recurringSessions.filter(rec => {
          const recStartDateNormalized = normalizeDateToStartOfDay(rec.startDate);
          const recEndDateNormalized = rec.endDate ? normalizeDateToStartOfDay(rec.endDate) : null;
          return rec.daysOfWeek.includes(dayName) &&
                 dateNormalized >= recStartDateNormalized &&
                 (!recEndDateNormalized || dateNormalized <= recEndDateNormalized);
        });

        // Check for overrides
        const override = scheduleOverrides.find(so => normalizeDateToStartOfDay(so.date).getTime() === dateNormalized.getTime());
        let scheduledSessionsForDay = [];
        if (override) {
          scheduledSessionsForDay = override.sessions;
        } else {
          const combinedSessions = [...fixedDaySessions, ...recurringSessionsForDay];
          const uniqueSessions = [];
          const seen = new Set();
          combinedSessions.forEach(session => {
            const key = `${session.programId}-${session.time}-${session.gymId}`;
            if (!seen.has(key)) {
              uniqueSessions.push(session);
              seen.add(key);
            }
          });
          scheduledSessionsForDay = uniqueSessions;
        }

        // Check for missed days relevant to this specific session or 'all_gyms'
        scheduledSessionsForDay.forEach(session => {
          const isSessionMissed = missedDays.some(md =>
            normalizeDateToStartOfDay(md.date).getTime() === dateNormalized.getTime() &&
            (md.gymId === 'all_gyms' || md.gymId === session.gymId)
          );

          if (summary[session.gymId]) {
            summary[session.gymId].expectedSessions++;
            if (isSessionMissed) {
              summary[session.gymId].missedSessions++;
            } else {
              summary[session.gymId].actualSessions++;
            }
          }
        });

        currentDate.setDate(currentDate.getDate() + 1); // Move to next day
      }
      setMonthlySummary(summary);
      setLoading(false);
    };

    // Ensure all necessary data for report calculation is loaded
    if (programs.length > 0 && gyms.length > 0 && fixedSchedules.length > 0 && recurringSessions.length > 0 && scheduleOverrides.length > 0 && missedDays.length > 0) {
      calculateReport();
    } else {
      setLoading(true); // Keep loading if data is not ready
    }
  }, [reportMonth, programs, gyms, fixedSchedules, recurringSessions, scheduleOverrides, missedDays]);

  const goToPreviousMonth = () => {
    setReportMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setReportMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const { startDate, endDate } = getBillingPeriod(reportMonth);

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Informe Mensual de Sessions</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <button onClick={goToPreviousMonth} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">
            Mes Anterior
          </button>
          <h2 className="text-xl font-semibold text-gray-700">
            Període: {formatDate(startDate)} - {formatDate(endDate)}
          </h2>
          <button onClick={goToNextMonth} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out">
            Mes Següent
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Calculant informe...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(monthlySummary).length > 0 ? Object.values(monthlySummary).map(gymSummary => (
              <div key={gymSummary.name} className="p-4 rounded-lg bg-green-50 border-l-4 border-green-400">
                <h3 className="text-lg font-medium text-gray-800">{gymSummary.name}</h3>
                <p className="text-sm text-gray-600">Sessions Realitzades: <span className="font-semibold text-green-700">{gymSummary.actualSessions}</span></p>
                <p className="text-sm text-gray-600">Sessions No Assistides: <span className="font-semibold text-red-700">{gymSummary.missedSessions}</span></p>
                <p className="text-sm text-gray-600">Sessions Programades: <span className="font-semibold text-gray-700">{gymSummary.expectedSessions}</span></p>
              </div>
            )) : <p className="text-gray-500">No hi ha dades suficients per generar l'informe.</p>}
          </div>
        )}
      </div>

      {/* List of Missed Days */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Dies No Assistits Registrats</h2>
        {missedDays.length > 0 ? (
          <ul className="space-y-2">
            {missedDays.sort((a,b) => new Date(b.date) - new Date(a.date)).map((md, index) => (
              <li key={index} className="text-gray-700 text-sm p-2 bg-gray-50 rounded-lg">
                <span className="font-medium">{formatDate(md.date)}</span> - Gimnàs: {gyms.find(g => g.id === md.gymId)?.name || 'Tots els gimnasos'} {md.notes && `(${md.notes})`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No hi ha dies no assistits registrats.</p>
        )}
      </div>
    </div>
  );
};


function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [programs, setPrograms] = useState([]);
  const [users, setUsers] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [fixedSchedules, setFixedSchedules] = useState([]);
  const [recurringSessions, setRecurringSessions] = useState([]);
  const [scheduleOverrides, setScheduleOverrides] = useState([]);
  const [missedDays, setMissedDays] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Carregant dades...');
  
  // Use state for db, auth, and currentUserId
  const [dbInstance, setDbInstance] = useState(null);
  const [authInstance, setAuthInstance] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [appId, setAppId] = useState(null); // Store appId from env vars


  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  // Dummy initial data for local development when Firebase is not configured
  // (These are defined locally in the code and used if Firebase config is not found)
  const initialPrograms = [
    { id: 'bp120', name: 'BodyPump 120', shortName: 'BP', color: '#EF4444', releaseDate: '2024-09-01', tracks: [
      { id: 'bp120_t1', name: 'Warm-up', type: 'Warm-up', isFavorite: false, notes: '' },
      { id: 'bp120_t2', name: 'Squats', type: 'Squats', isFavorite: true, notes: 'Molta energia!' },
      { id: 'bp120_t3', name: 'Chest', type: 'Chest', isFavorite: false, notes: '' },
      { id: 'bp120_t4', name: 'Back', type: 'Back', isFavorite: false, notes: '' },
      { id: 'bp120_t5', name: 'Triceps', type: 'Triceps', isFavorite: false, notes: '' },
      { id: 'bp120_t6', name: 'Biceps', type: 'Biceps', isFavorite: false, notes: '' },
      { id: 'bp120_t7', name: 'Lunges', type: 'Lunges', isFavorite: false, notes: '' },
      { id: 'bp120_t8', name: 'Shoulders', type: 'Shoulders', isFavorite: false, notes: '' },
      { id: 'bp120_t9', name: 'Core', type: 'Core', isFavorite: true, notes: 'Bon track de core.' },
      { id: 'bp120_t10', name: 'Cool-down', type: 'Cool-down', isFavorite: false, notes: '' },
    ], sessions: [
      { date: '2025-07-01', notes: 'Primera sessió' },
      { date: '2025-07-03', notes: '' },
      { date: '2025-07-07', notes: '' },
      { date: '2025-07-09', notes: 'Grup amb molta energia' },
      { date: '2025-07-14', notes: '' },
      { date: '2025-07-16', notes: '' },
      { date: '2025-07-21', notes: 'Última sessió' },
    ] },
    { id: 'bc95', name: 'BodyCombat 95', shortName: 'BC', color: '#FCD34D', releaseDate: '2024-10-01', tracks: [
      { id: 'bc95_t1', name: 'Warm-up', type: 'Warm-up', isFavorite: false, notes: '' },
      { id: 'bc95_t2', name: 'Combat 1', type: 'Combat', isFavorite: true, notes: 'Ritme ràpid.' },
      { id: 'bc95_t3', name: 'Power 1', type: 'Power', isFavorite: false, notes: '' },
      { id: 'bc95_t4', name: 'Combat 2', type: 'Combat', isFavorite: false, notes: '' },
      { id: 'bc95_t5', name: 'Power 2', type: 'Power', isFavorite: false, notes: '' },
      { id: 'bc95_t6', name: 'Combat 3', type: 'Combat', isFavorite: false, notes: '' },
      { id: 'bc95_t7', name: 'Muay Thai', type: 'Muay Thai', isFavorite: false, notes: '' },
      { id: 'bc95_t8', type: 'Power 3', isFavorite: false, notes: '' },
      { id: 'bc95_t9', type: 'Core', isFavorite: false, notes: '' },
      { id: 'bc95_t10', name: 'Cool-down', type: 'Cool-down', isFavorite: false, notes: '' },
    ], sessions: [] },
    { id: 'sb60', name: 'Sh\'Bam 60', shortName: 'SB', color: '#EC4899', releaseDate: '2024-09-15', tracks: [
      { id: 'sb60_t1', name: 'Warm-up', type: 'Warm-up', isFavorite: false, notes: '' },
      { id: 'sb60_t2', name: 'Track 2', type: 'Dance', isFavorite: true, notes: 'Molt divertida!' },
      { id: 'sb60_t3', name: 'Track 3', type: 'Dance', isFavorite: false, notes: '' },
      { id: 'sb60_t4', type: 'Dance', isFavorite: false, notes: '' },
      { id: 'sb60_t5', type: 'Dance', isFavorite: false, notes: '' },
      { id: 'sb60_t6', type: 'Dance', isFavorite: false, notes: '' },
      { id: 'sb60_t7', type: 'Dance', isFavorite: false, notes: '' },
      { id: 'sb60_t8', type: 'Dance', isFavorite: false, notes: '' },
      { id: 'sb60_t9', type: 'Core', isFavorite: false, notes: '' },
      { id: 'sb60_t10', name: 'Cool-down', type: 'Cool-down', isFavorite: false, notes: '' },
    ], sessions: [
      { date: '2025-06-10', notes: '' },
      { date: '2025-06-17', notes: '' },
      { date: '2025-07-02', notes: '' },
    ] },
  ];

  const initialUsers = [
    { id: 'user1', name: 'Maria Garcia', birthday: '1990-08-07', usualSessions: ['BP', 'SB'], notes: 'Li agrada la música llatina.', gymId: 'gym_arbucies', phone: '600112233', email: 'maria.g@example.com', photoUrl: 'https://placehold.co/50x50/aabbcc/ffffff?text=MG' },
    { id: 'user2', name: 'Joan Pons', birthday: '1985-08-08', usualSessions: ['BC', 'BP'], notes: '', gymId: 'gym_arbucies', phone: '600445566', email: 'joan.p@example.com', photoUrl: 'https://placehold.co/50x50/ccddeeff/ffffff?text=JP' },
    { id: 'user3', name: 'Anna Soler', birthday: '1992-08-10', usualSessions: ['SB'], notes: '', gymId: 'gym_santhilari', phone: '600778899', email: 'anna.s@example.com', photoUrl: 'https://placehold.co/50x50/eeffcc/ffffff?text=AS' },
    { id: 'user4', name: 'Test Aniversari', birthday: '2000-08-06', usualSessions: ['BP'], notes: 'Usuari de prova per aniversaris.', gymId: 'gym_santhilari', phone: '600000000', email: 'test.a@example.com', photoUrl: 'https://placehold.co/50x50/ffccaa/ffffff?text=TA' },
  ];

  const initialGyms = [
    { id: 'gym_arbucies', name: 'Gimnàs Arbúcies', workDays: ['Dilluns', 'Dimarts', 'Dijous'], totalVacationDays: 13, holidaysTaken: [] },
    { id: 'gym_santhilari', name: 'Gimnàs Sant Hilari', workDays: ['Dimecres', 'Divendres'], totalVacationDays: 9, holidaysTaken: [] },
  ];

  const initialFixedSchedules = [
    {
      id: 'fixed_1',
      startDate: '2024-01-01',
      schedule: {
        'Dilluns': [
          { id: 'ses_d1_1', programId: 'sb60', time: '17:00', gymId: 'gym_arbucies' },
          { id: 'ses_d1_2', programId: 'bp120', time: '18:00', gymId: 'gym_arbucies' },
          { id: 'ses_d1_3', programId: 'bp120', time: '19:00', gymId: 'gym_arbucies' },
        ],
        'Dimarts': [
          { id: 'ses_d2_1', programId: 'bc95', time: '18:00', gymId: 'gym_arbucies' },
        ],
        'Dimecres': [
          { id: 'ses_d3_1', programId: 'bp120', time: '19:00', gymId: 'gym_santhilari' },
        ],
        'Dijous': [
          { id: 'ses_d4_1', programId: 'sb60', time: '17:00', gymId: 'gym_arbucies' },
          { id: 'ses_d4_2', programId: 'bp120', time: '18:00', gymId: 'gym_arbucies' },
        ],
        'Divendres': [
          { id: 'ses_d5_1', programId: 'sb60', time: '10:00', gymId: 'gym_santhilari' },
          { id: 'ses_d5_2', programId: 'bc95', time: '11:00', gymId: 'gym_santhilari' },
          { id: 'ses_d5_3', programId: 'bp120', time: '12:00', gymId: 'gym_santhilari' },
        ],
        'Dissabte': [],
        'Diumenge': [],
      }
    },
  ];

  const initialRecurringSessions = [
    { id: 'rec_1', programId: 'bp120', time: '17:00', gymId: 'gym_santhilari', daysOfWeek: ['Divendres'], startDate: '2025-09-19', endDate: '2025-12-31', notes: 'Sessió de prova recurrent' }
  ];

  const initialMissedDays = [
    { id: 'md1', date: '2025-08-05', gymId: 'gym_arbucies', notes: 'Malalt' },
    { id: 'md2', date: '2025-07-28', gymId: 'gym_santhilari', notes: 'Viatge' },
  ];

  // Initialize Firebase and set up authentication and data listeners
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        // Log environment variable to console for debugging on Netlify
        // *** IMPORTANT: Change from process.env to import.meta.env for Vite projects ***
        console.log("VITE_FIREBASE_CONFIG:", import.meta.env.VITE_FIREBASE_CONFIG);
        console.log("VITE_APP_ID:", import.meta.env.VITE_APP_ID);


        const rawFirebaseConfig = import.meta.env.VITE_FIREBASE_CONFIG; // Changed from process.env
        const envAppId = import.meta.env.VITE_APP_ID || 'default-app-id'; // Changed from process.env
        setAppId(envAppId); // Store appId in state

        let firebaseConfig = {};
        if (rawFirebaseConfig) {
          try {
            firebaseConfig = JSON.parse(rawFirebaseConfig);
          } catch (e) {
            console.error("Error parsing VITE_FIREBASE_CONFIG:", e); // Changed variable name in log
            setMessageModalContent({
              title: 'Error de Configuració',
              message: `Hi ha un problema amb la configuració de Firebase. Assegura't que VITE_FIREBASE_CONFIG és un JSON vàlid. Detalls: ${e.message}`, // Changed variable name in message
              isConfirm: false,
              onConfirm: () => setShowMessageModal(false),
            });
            setShowMessageModal(true);
            setIsFirebaseReady(true);
            setLoadingMessage('Error de configuració de Firebase.');
            return;
          }
        }
        
        // If firebaseConfig is still empty after parsing, it means no valid config was provided
        if (Object.keys(firebaseConfig).length === 0 || !firebaseConfig.projectId) {
          console.warn("Firebase config not found or invalid. Using dummy data for local development.");
          // Fallback to dummy data if no valid Firebase config is provided
          setPrograms(initialPrograms);
          setUsers(initialUsers);
          setGyms(initialGyms);
          setFixedSchedules(initialFixedSchedules);
          setRecurringSessions(initialRecurringSessions);
          setMissedDays(initialMissedDays);
          setIsFirebaseReady(true);
          setLoadingMessage('Dades locals carregades (sense connexió a Firebase).');
          return; // Exit if using dummy data
        }

        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app); // Assign to local variable first
        const firebaseAuth = getAuth(app); // Assign to local variable first

        setDbInstance(firestoreDb); // Set db instance in state
        setAuthInstance(firebaseAuth); // Set auth instance in state

        // Sign in anonymously if no custom token is provided (e.g., in Netlify deployments)
        // *** IMPORTANT: If using a custom token, ensure it's passed via VITE_INITIAL_AUTH_TOKEN if from env ***
        const initialAuthToken = import.meta.env.VITE_INITIAL_AUTH_TOKEN || null; // Changed from process.env

        if (initialAuthToken) {
          await signInWithCustomToken(firebaseAuth, initialAuthToken);
        } else {
          await signInAnonymously(firebaseAuth);
        }

        onAuthStateChanged(firebaseAuth, async (user) => {
          if (user) {
            setCurrentUserId(user.uid); // Set the user ID once authenticated
            setLoadingMessage('Carregant dades del núvol...');
            
            // Path for user-specific collections, using the appId from env vars
            const getUserCollectionPath = (collectionName) => {
              return `artifacts/${envAppId}/users/${user.uid}/${collectionName}`;
            };

            // Setup real-time listeners for all collections
            onSnapshot(collection(firestoreDb, getUserCollectionPath('programs')), (snapshot) => {
              setPrograms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (error) => console.error("Error fetching programs:", error));

            onSnapshot(collection(firestoreDb, getUserCollectionPath('users')), (snapshot) => {
              setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (error) => console.error("Error fetching users:", error));

            onSnapshot(collection(firestoreDb, getUserCollectionPath('gyms')), (snapshot) => {
              setGyms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (error) => console.error("Error fetching gyms:", error));

            onSnapshot(collection(firestoreDb, getUserCollectionPath('fixedSchedules')), (snapshot) => {
              setFixedSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.startDate.localeCompare(b.startDate)));
            }, (error) => console.error("Error fetching fixed schedules:", error));

            onSnapshot(collection(firestoreDb, getUserCollectionPath('recurringSessions')), (snapshot) => {
              setRecurringSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (error) => console.error("Error fetching recurring sessions:", error));

            onSnapshot(collection(firestoreDb, getUserCollectionPath('scheduleOverrides')), (snapshot) => {
              setScheduleOverrides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (error) => console.error("Error fetching schedule overrides:", error));

            onSnapshot(collection(firestoreDb, getUserCollectionPath('missedDays')), (snapshot) => {
              setMissedDays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (error) => console.error("Error fetching missed days:", error));

            setIsFirebaseReady(true);
            setLoadingMessage('Dades carregades amb èxit!');

            // Initial data seeding if collections are empty (first run)
            const checkAndSeedData = async () => {
              const programsCollectionRef = collection(firestoreDb, getUserCollectionPath('programs'));
              const programsSnap = await getDocs(programsCollectionRef); // Use getDocs for a collection check

              if (programsSnap.empty) { // Check if programs collection is empty
                setLoadingMessage('Inicialitzant dades per primera vegada...');
                try {
                  // Seed initialPrograms
                  for (const p of initialPrograms) {
                    await setDoc(doc(firestoreDb, getUserCollectionPath('programs'), p.id), p);
                  }
                  // Seed initialUsers
                  for (const u of initialUsers) {
                    await setDoc(doc(firestoreDb, getUserCollectionPath('users'), u.id), u);
                  }
                  // Seed initialGyms
                  for (const g of initialGyms) {
                    await setDoc(doc(firestoreDb, getUserCollectionPath('gyms'), g.id), g);
                  }
                  // Seed initialFixedSchedules
                  for (const fs of initialFixedSchedules) {
                    await setDoc(doc(firestoreDb, getUserCollectionPath('fixedSchedules'), fs.id), fs);
                  }
                  // Seed initialRecurringSessions
                  for (const rs of initialRecurringSessions) {
                    await setDoc(doc(firestoreDb, getUserCollectionPath('recurringSessions'), rs.id), rs);
                  }
                  // Seed initialMissedDays
                  for (const md of initialMissedDays) {
                    await setDoc(doc(firestoreDb, getUserCollectionPath('missedDays'), md.id), md); // Use predefined ID
                  }
                  setLoadingMessage('Dades inicials creades!');
                } catch (seedError) {
                  console.error("Error seeding initial data:", seedError);
                  setMessageModalContent({
                    title: 'Error d\'Inicialització',
                    message: `Hi ha hagut un error al crear les dades inicials: ${seedError.message}`,
                    isConfirm: false,
                    onConfirm: () => setShowMessageModal(false),
                  });
                  setShowMessageModal(true);
                }
              }
            };
            checkAndSeedData();

          } else {
            console.log("No user signed in. Data will not be loaded from Firestore.");
            setLoadingMessage('No s\'ha pogut autenticar. Les dades no es desaran.');
            setIsFirebaseReady(true); // Still ready to render with empty data
          }
        });

      } catch (error) {
        console.error("Firebase initialization or auth error:", error);
        setLoadingMessage(`Error de càrrega: ${error.message}`);
        setIsFirebaseReady(true); // Indicate ready even if error, to show message
      }
    };

    initializeFirebase();
  }, []); // Run once on component mount

  const renderPage = () => {
    if (!isFirebaseReady) {
      return (
        <div className="flex justify-center items-center min-h-[calc(100vh-100px)]">
          <p className="text-xl text-gray-700">{loadingMessage}</p>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard programs={programs} users={users} gyms={gyms} scheduleOverrides={scheduleOverrides} fixedSchedules={fixedSchedules} recurringSessions={recurringSessions} missedDays={missedDays} />;
      case 'programs':
        return <Programs programs={programs} setPrograms={setPrograms} setCurrentPage={setCurrentPage} setSelectedProgramId={setSelectedProgramId} db={dbInstance} currentUserId={currentUserId} appId={appId} />;
      case 'programDetail':
        const program = programs.find(p => p.id === selectedProgramId);
        return <ProgramDetail program={program} setPrograms={setPrograms} setCurrentPage={setCurrentPage} db={dbInstance} currentUserId={currentUserId} appId={appId} />;
      case 'schedule':
        return <Schedule programs={programs} scheduleOverrides={scheduleOverrides} setScheduleOverrides={setScheduleOverrides} fixedSchedules={fixedSchedules} users={users} setPrograms={setPrograms} gyms={gyms} recurringSessions={recurringSessions} missedDays={missedDays} setMissedDays={setMissedDays} db={dbInstance} currentUserId={currentUserId} appId={appId} />;
      case 'users':
        return <Users users={users} setUsers={setUsers} gyms={gyms} db={dbInstance} currentUserId={currentUserId} appId={appId} />;
      case 'gymsAndHolidays':
        return <GymsAndHolidays gyms={gyms} setGyms={setGyms} db={dbInstance} currentUserId={currentUserId} appId={appId} />;
      case 'mixes':
        return <Mixes programs={programs} />;
      case 'settings':
        return <Settings setCurrentPage={setCurrentPage} />;
      case 'fixedScheduleManagement':
        return <FixedScheduleManagement fixedSchedules={fixedSchedules} setFixedSchedules={setFixedSchedules} programs={programs} gyms={gyms} db={dbInstance} currentUserId={currentUserId} appId={appId} />;
      case 'recurringSessions':
        return <RecurringSessions recurringSessions={recurringSessions} setRecurringSessions={setRecurringSessions} programs={programs} gyms={gyms} db={dbInstance} currentUserId={currentUserId} appId={appId} />;
      case 'monthlyReport':
        return <MonthlyReport programs={programs} gyms={gyms} fixedSchedules={fixedSchedules} recurringSessions={recurringSessions} scheduleOverrides={scheduleOverrides} missedDays={missedDays} />;
      default:
        return <Dashboard programs={programs} users={users} gyms={gyms} scheduleOverrides={scheduleOverrides} fixedSchedules={fixedSchedules} recurringSessions={recurringSessions} missedDays={missedDays} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-inter">
      {/* Inter Font (redundant if already in index.html, but harmless) */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Navigation */}
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-white text-2xl font-bold">Gym Instructor</h1> {/* Changed app name */}
          {currentUserId && (
            <div className="text-white text-sm">
              ID d'usuari: <span className="font-mono text-blue-200">{currentUserId}</span>
            </div>
          )}
          <div className="space-x-4">
            <button onClick={() => setCurrentPage('dashboard')} className="text-white hover:text-blue-200 transition-colors duration-200 font-medium">Dashboard</button>
            <button onClick={() => setCurrentPage('programs')} className="text-white hover:text-blue-200 transition-colors duration-200 font-medium">Programes</button>
            <button onClick={() => setCurrentPage('schedule')} className="text-white hover:text-blue-200 transition-colors duration-200 font-medium">Calendari</button>
            <button onClick={() => setCurrentPage('users')} className="text-white hover:text-blue-200 transition-colors duration-200 font-medium">Usuaris</button>
            <button onClick={() => setCurrentPage('mixes')} className="text-white hover:text-blue-200 transition-colors duration-200 font-medium">Mixos</button>
            <button onClick={() => setCurrentPage('gymsAndHolidays')} className="text-white hover:text-blue-200 transition-colors duration-200 font-medium">Vacances</button>
            <button onClick={() => setCurrentPage('monthlyReport')} className="text-white hover:text-blue-200 transition-colors duration-200 font-medium">Informe Mensual</button>
            <button onClick={() => setCurrentPage('settings')} className="text-white hover:text-blue-200 transition-colors duration-200 font-medium">Configuració</button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        {renderPage()}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center text-sm">
        <div className="container mx-auto">
          © 2025 Gym Instructor App. Tots els drets reservats.
        </div>
      </footer>

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
}

export default App;
