import React, { useState, useEffect } from 'react';
import { formatDate, normalizeDateToStartOfDay, getLocalDateString } from '../../utils/dateHelpers.js';
import { getActiveFixedSchedule } from '../../utils/scheduleHelpers.js';

const MonthlyReport = ({ programs, gyms, fixedSchedules, recurringSessions, scheduleOverrides, missedDays }) => {
  const [reportMonth, setReportMonth] = useState(new Date());
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

export default MonthlyReport;