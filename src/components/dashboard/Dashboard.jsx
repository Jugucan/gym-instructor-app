import React, { useState, useEffect } from 'react';
import { getLocalDateString, normalizeDateToStartOfDay } from '../../utils/dateHelpers.jsx'; // Confirmat: .jsx
import { getActiveFixedSchedule } from '../../utils/scheduleHelpers.jsx'; // Confirmat: .jsx
import { MessageModal } from '../common/MessageModal.jsx'; // Confirmat: .jsx
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx'; // Confirmat: .jsx
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const Dashboard = ({ programs, users, gyms, fixedSchedules, recurringSessions, scheduleOverrides, missedDays, db, currentUserId, appId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentDaySessions, setCurrentDaySessions] = useState([]);
  const [programsInRotation, setProgramsInRotation] = useState([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const daysOfWeek = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];

  useEffect(() => {
    // Determine current day's schedule
    const today = normalizeDateToStartOfDay(currentDate);
    const todayString = getLocalDateString(today);
    const dayName = currentDate.toLocaleDateString('ca-ES', { weekday: 'long' });

    const override = scheduleOverrides.find(so => so.date === todayString);

    if (override) {
      // Use override schedule
      const sessions = override.sessions.map(s => {
        const program = programs.find(p => p.id === s.programId);
        const gym = gyms.find(g => g.id === s.gymId);
        return {
          programName: program?.name || 'N/A',
          programShortName: program?.shortName || 'N/A',
          programColor: program?.color || '#cccccc',
          time: s.time,
          gymName: gym?.name || 'N/A',
          type: 'override',
          notes: s.notes || ''
        };
      });
      setCurrentDaySessions(sessions);
    } else {
      // Use fixed or recurring schedule
      const activeFixedSchedule = getActiveFixedSchedule(currentDate, fixedSchedules);
      const recurringSessionsToday = recurringSessions.filter(session => {
        const sessionStartDate = normalizeDateToStartOfDay(new Date(session.startDate));
        const sessionEndDate = session.endDate ? normalizeDateToStartOfDay(new Date(session.endDate)) : null;
        return session.daysOfWeek.includes(dayName) &&
               today >= sessionStartDate &&
               (!sessionEndDate || today <= sessionEndDate);
      });

      let sessions = [];
      if (activeFixedSchedule[dayName] && activeFixedSchedule[dayName].length > 0) {
        sessions = activeFixedSchedule[dayName].map(s => {
          const program = programs.find(p => p.id === s.programId);
          const gym = gyms.find(g => g.id === s.gymId);
          return {
            programName: program?.name || 'N/A',
            programShortName: program?.shortName || 'N/A',
            programColor: program?.color || '#cccccc',
            time: s.time,
            gymName: gym?.name || 'N/A',
            type: 'fixed',
            notes: ''
          };
        });
      } else if (recurringSessionsToday.length > 0) {
        sessions = recurringSessionsToday.map(s => {
          const program = programs.find(p => p.id === s.programId);
          const gym = gyms.find(g => g.id === s.gymId);
          return {
            programName: program?.name || 'N/A',
            programShortName: program?.shortName || 'N/A',
            programColor: program?.color || '#cccccc',
            time: s.time,
            gymName: gym?.name || 'N/A',
            type: 'recurring',
            notes: s.notes || ''
          };
        });
      }
      setCurrentDaySessions(sessions);
    }
    
    // Calculate programs in rotation
    calculateProgramsInRotation();

    // Calculate upcoming birthdays
    calculateUpcomingBirthdays();

  }, [currentDate, programs, fixedSchedules, recurringSessions, scheduleOverrides, users, gyms]);

  const calculateProgramsInRotation = () => {
    const rotationPrograms = [];
    const sevenDaysAgo = new Date(currentDate);
    sevenDaysAgo.setDate(currentDate.getDate() - 7);
    const sevenDaysAgoString = getLocalDateString(sevenDaysAgo);

    programs.forEach(program => {
      // Sort sessions by date descending to find the latest session quickly
      const sortedSessions = [...program.sessions].sort((a, b) => b.date.localeCompare(a.date));
      if (sortedSessions.length > 0) {
        const latestSessionDate = sortedSessions[0].date;
        // Check if the latest session was within the last 7 days
        if (latestSessionDate >= sevenDaysAgoString) {
          // Find the continuous usage start date
          let usageStartDate = latestSessionDate;
          for (let i = 0; i < sortedSessions.length; i++) {
            const sessionDate = new Date(sortedSessions[i].date);
            const prevSessionDate = i + 1 < sortedSessions.length ? new Date(sortedSessions[i+1].date) : null;

            if (prevSessionDate) {
              const diffTime = Math.abs(sessionDate - prevSessionDate);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays > 7) { // If there's a gap of more than 7 days, the continuous period ends
                break;
              }
            }
            usageStartDate = sortedSessions[i].date;
          }
          rotationPrograms.push({
            id: program.id,
            name: program.name,
            shortName: program.shortName,
            color: program.color,
            usageStartDate: usageStartDate,
            lastSessionDate: latestSessionDate
          });
        }
      }
    });
    setProgramsInRotation(rotationPrograms);
  };

  const calculateUpcomingBirthdays = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    const upcoming = [];

    users.forEach(user => {
      if (user.birthday) {
        const [year, month, day] = user.birthday.split('-').map(Number);
        const userBirthdayMonth = month - 1; // Month is 0-indexed
        const userBirthdayDay = day;

        // Check for birthdays in the next 7 days or past 7 days
        for (let i = -7; i <= 7; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() + i);
          
          if (checkDate.getMonth() === userBirthdayMonth && checkDate.getDate() === userBirthdayDay) {
            const age = checkDate.getFullYear() - year;
            upcoming.push({
              id: user.id,
              name: user.name,
              birthday: user.birthday,
              age: age,
              gymName: gyms.find(g => g.id === user.gymId)?.name || 'N/A',
              usualSessions: user.usualSessions,
              isToday: i === 0,
              daysAway: i, // +ve for future, -ve for past
            });
            break; // Found the birthday, no need to check other days for this user
          }
        }
      }
    });
    // Sort upcoming birthdays: today's first, then upcoming, then past (closer to today first)
    upcoming.sort((a, b) => {
      if (a.isToday && !b.isToday) return -1;
      if (!a.isToday && b.isToday) return 1;
      return a.daysAway - b.daysAway;
    });
    setUpcomingBirthdays(upcoming);
  };

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const numDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month); // 0 (Sunday) to 6 (Saturday)
    const startingDay = (firstDay === 0 ? 6 : firstDay - 1); // Adjust for Monday-first calendar (0 = Monday, ..., 6 = Sunday)

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
        sessionsForCalendarDay.push({ type: 'missed', label: 'DIA LLIURE', color: '#EF4444' }); // Red for missed
      } else if (isHoliday) {
        sessionsForCalendarDay.push({ type: 'holiday', label: 'VACANCES', color: '#60A5FA' }); // Blue for holidays
      } else if (override) {
        // Show specific program info from override
        sessionsForCalendarDay = override.sessions.map(s => {
          const program = programs.find(p => p.id === s.programId);
          return {
            type: 'program',
            label: program?.shortName || 'Sessió',
            color: program?.color || '#cccccc'
          };
        });
      } else {
        // Check fixed and recurring schedules for the calendar day
        const dayNameForDate = date.toLocaleDateString('ca-ES', { weekday: 'long' });
        const activeFixedSchedule = getActiveFixedSchedule(date, fixedSchedules);
        const recurringSessionsToday = recurringSessions.filter(session => {
          const sessionStartDate = normalizeDateToStartOfDay(new Date(session.startDate));
          const sessionEndDate = session.endDate ? normalizeDateToStartOfDay(new Date(session.endDate)) : null;
          return session.daysOfWeek.includes(dayNameForDate) &&
                 date >= sessionStartDate &&
                 (!sessionEndDate || date <= sessionEndDate);
        });

        if (activeFixedSchedule[dayNameForDate] && activeFixedSchedule[dayNameForDate].length > 0) {
          sessionsForCalendarDay = activeFixedSchedule[dayNameForDate].map(s => {
            const program = programs.find(p => p.id === s.programId);
            return {
              type: 'program',
              label: program?.shortName || 'Sessió',
              color: program?.color || '#cccccc'
            };
          });
        } else if (recurringSessionsToday.length > 0) {
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

      calendarDays.push(
        <div key={dateString} className={dayClasses}>
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
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() + direction);
      return newDate;
    });
  };

  const totalGymVacationDays = gyms.reduce((acc, gym) => acc + gym.totalVacationDays, 0);
  const totalGymHolidaysTaken = gyms.reduce((acc, gym) => acc + (gym.holidaysTaken ? gym.holidaysTaken.length : 0), 0);

  const totalUserMissedDays = missedDays.length; // Assuming all missed days count towards instructor's total for reporting

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Resum Avui */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Avui: {currentDate.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
        {currentDaySessions.length > 0 ? (
          <ul className="space-y-2">
            {currentDaySessions.map((session, index) => (
              <li key={index} className="flex items-center space-x-3">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: session.programColor }}></span>
                <p className="text-gray-700">
                  <span className="font-semibold">{session.time}</span> - {session.programName} ({session.gymName})
                  {session.type === 'override' && <span className="ml-2 text-sm text-blue-500">(Canvi d'horari)</span>}
                  {session.notes && <span className="ml-2 text-sm text-gray-500">({session.notes})</span>}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">No hi ha sessions programades per avui.</p>
        )}
      </div>

      {/* Programes en Rotació Actual */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Programes en Rotació Actual</h2>
        {programsInRotation.length > 0 ? (
          <ul className="space-y-2">
            {programsInRotation.map(program => (
              <li key={program.id} className="flex items-center space-x-3">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: program.color }}></span>
                <p className="text-gray-700">
                  <span className="font-semibold">{program.name}</span>: En ús des del {getLocalDateString(new Date(program.usageStartDate))} (Última sessió: {getLocalDateString(new Date(program.lastSessionDate))})
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">Cap programa en rotació actualment.</p>
        )}
      </div>

      {/* Aniversaris Pròxims / Avui */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Aniversaris Pròxims / Recents (7 dies)</h2>
        {upcomingBirthdays.length > 0 ? (
          <ul className="space-y-2">
            {upcomingBirthdays.map(user => (
              <li key={user.id} className="text-gray-700">
                <span className="font-semibold">{user.name}</span> ({user.age} anys) - Aniversari: {getLocalDateString(new Date(user.birthday))}
                {user.isToday && <span className="ml-2 px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium">🎉 Avui!</span>}
                {!user.isToday && user.daysAway > 0 && <span className="ml-2 text-sm text-gray-500">({user.daysAway} dies)</span>}
                {!user.isToday && user.daysAway < 0 && <span className="ml-2 text-sm text-gray-500">({Math.abs(user.daysAway)} dies fa)</span>}
                <span className="block text-sm text-gray-500">Gimnàs: {user.gymName} | Sessions: {user.usualSessions.join(', ')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">No hi ha aniversaris pròxims o recents.</p>
        )}
      </div>

      {/* Resum de Vacances */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Resum de Vacances</h2>
        <p className="text-gray-700">Total de dies de vacances assignats a tots els gimnasos: <span className="font-medium text-blue-700">{totalGymVacationDays} dies</span></p>
        <p className="text-gray-700">Total de dies de vacances preses: <span className="font-medium text-red-700">{totalGymHolidaysTaken} dies</span></p>
        <p className="text-gray-700">Total de dies no assistits per l'instructor: <span className="font-medium text-red-700">{totalUserMissedDays} dies</span></p>
        {gyms.map(gym => (
          <p key={gym.id} className="text-gray-700 mb-1 ml-4">
            {gym.name}: <span className="font-medium">{gym.holidaysTaken.length} / {gym.totalVacationDays} dies preses</span>
          </p>
        ))}
      </div>

      {/* Mini Calendari */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Calendari Mensual</h2>
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => handleMonthChange(-1)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg shadow-md"
          >
            Anterior
          </button>
          <span className="text-lg font-semibold text-gray-700">
            {currentDate.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => handleMonthChange(1)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg shadow-md"
          >
            Següent
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-600 mb-2">
          {daysOfWeek.map(day => <div key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {renderCalendar()}
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

export default Dashboard;
