import React, { useState, useEffect, useMemo } from 'react';
import { getLocalDateString, formatDateDDMMYYYY, formatDate, getReportMonthDates, normalizeDateToStartOfDay } from '../../utils/dateHelpers.jsx';
import { getActiveFixedSchedule, calculateRecurringSessionMinutes } from '../../utils/scheduleHelpers.jsx';

const MonthlyReport = ({ programs, gyms, fixedSchedules, recurringSessions, scheduleOverrides, missedDays }) => {
  // ReportMonth té el format YYYY-MM per al mes *final* del període (p.ex. '2024-09' per 26/08 a 25/09)
  const [reportMonth, setReportMonth] = useState(formatDate(new Date()).substring(0, 7)); // YYYY-MM

  const [reportData, setReportData] = useState([]);
  const [totalWorkingMinutes, setTotalWorkingMinutes] = useState(0);
  const [totalVacationDaysTaken, setTotalVacationDaysTaken] = useState(0);
  const [sessionsByGym, setSessionsByGym] = useState({});

  // Calcula el rang de dates basat en el mes seleccionat
  const dateRange = useMemo(() => getReportMonthDates(reportMonth), [reportMonth]);

  useEffect(() => {
    generateReport();
  }, [reportMonth, programs, gyms, fixedSchedules, recurringSessions, scheduleOverrides, missedDays, dateRange]);

  // Helper per obtenir sessions per a una data
  const getSessionsForDate = (fullDate) => {
    const dateNormalized = normalizeDateToStartOfDay(fullDate);
    const dateStr = formatDate(dateNormalized);
    const dayName = fullDate.toLocaleDateString('ca-ES', { weekday: 'long' });

    const override = scheduleOverrides.find(so => so.date === dateStr);
    if (override) {
      return override.sessions;
    } else {
      const activeFixedSchedule = getActiveFixedSchedule(dateNormalized, fixedSchedules);
      const fixedDaySessions = activeFixedSchedule[dayName] || [];

      const recurringSessionsForDay = recurringSessions.filter(rec => {
        const recStartDateNormalized = normalizeDateToStartOfDay(new Date(rec.startDate));
        const recEndDateNormalized = rec.endDate ? normalizeDateToStartOfDay(new Date(rec.endDate)) : null;
        return rec.daysOfWeek.includes(dayName) &&
             dateNormalized.getTime() >= recStartDateNormalized.getTime() &&
             (!recEndDateNormalized || dateNormalized.getTime() <= recEndDateNormalized.getTime());
      });
      
      // Combinar i eliminar duplicats de les sessions fixes i recurrents
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
      return uniqueSessions;
    }
  };

  const generateReport = () => {
    if (!dateRange) return;

    let currentReportData = [];
    let calculatedTotalMinutes = 0;
    let calculatedTotalVacationDays = 0;
    let calculatedSessionsByGym = {};

    // Inicialitzar el comptador de sessions per gimnàs
    gyms.forEach(gym => {
      calculatedSessionsByGym[gym.id] = { name: gym.name, count: 0 };
    });

    // Clonar la data d'inici per iterar
    const currentDate = dateRange.startDate;
    // Afegir 1 dia a la data final per incloure-la al loop (25 al 25)
    const endDatePlusOne = new Date(dateRange.endDate.getTime());
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);

    // Iterar sobre el rang de dates (del 26 del mes anterior al 25 del mes actual)
    for (let d = new Date(currentDate); d < endDatePlusOne; d.setDate(d.getDate() + 1)) {
      const fullDate = new Date(d); // Clonar per evitar mutar l'objecte del loop
      const isoDate = formatDate(fullDate); // YYYY-MM-DD
      const dayName = fullDate.toLocaleDateString('ca-ES', { weekday: 'long' });

      const isWeekend = fullDate.getDay() === 0 || fullDate.getDay() === 6;

      const sessionsToday = getSessionsForDate(fullDate);
      const missed = missedDays.find(md => formatDate(new Date(md.date)) === isoDate);
      const isOverride = scheduleOverrides.some(so => formatDate(new Date(so.date)) === isoDate);

      let dayType = 'Normal';
      let programInfo = 'No programat';
      let minutes = 0;
      let notes = '';

      if (missed) {
        dayType = 'DIA LLIURE';
        calculatedTotalVacationDays++;
        programInfo = `No assistit - ${gyms.find(g => g.id === missed.assignedGymId)?.name || 'Tots'}`;
        notes = missed.notes || '';
      } else if (sessionsToday.length > 0) {
        dayType = isOverride ? 'Canvi Horari' : 'Programat';
        
        programInfo = sessionsToday.map(s => {
          const program = programs.find(p => p.id === s.programId);
          const gym = gyms.find(g => g.id === s.gymId);
          
          // Comptar sessions per gimnàs
          if (s.gymId && calculatedSessionsByGym[s.gymId]) {
            calculatedSessionsByGym[s.gymId].count++;
          }
          
          return `${program?.shortName || 'N/A'} (${gym?.name || 'N/A'})`;
        }).join(', ');
        
        minutes = sessionsToday.length * 60; // Assumint 60 minuts per sessió
        calculatedTotalMinutes += minutes;
        notes = isOverride ? scheduleOverrides.find(so => formatDate(new Date(so.date)) === isoDate)?.notes || '' : '';

      } else if (isWeekend) {
        dayType = 'Cap de Setmana';
        programInfo = 'No programat';
      } else {
        dayType = 'Feiner sense programa';
      }

      currentReportData.push({
        date: isoDate,
        dayName: dayName,
        dayType: dayType,
        programInfo: programInfo,
        minutes: minutes,
        notes: notes,
      });
    }

    setReportData(currentReportData);
    setTotalWorkingMinutes(calculatedTotalMinutes);
    setTotalVacationDaysTaken(calculatedTotalVacationDays);
    setSessionsByGym(calculatedSessionsByGym);
  };

  // Ajustar el label de l'input al mes final (Setembre per 26/08-25/09)
  const monthLabel = new Date(dateRange?.endDate || new Date()).toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Informe Mensual de Classes</h1>

      <div className="flex items-center space-x-4 mb-6 bg-white p-4 rounded-lg shadow-md">
        <label htmlFor="reportMonth" className="text-gray-700 font-semibold">Seleccionar Mes de Report (Mes final del 26-25):</label>
        <input
          type="month"
          id="reportMonth"
          value={reportMonth}
          onChange={(e) => setReportMonth(e.target.value)}
          className="shadow border rounded-lg py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Resum del Període: <span className="text-blue-600">{dateRange?.label || 'Calculant...'}</span>
        </h2>
        <p className="text-gray-700 mb-2">Total de minuts de classes impartides: <span className="font-medium text-blue-700">{totalWorkingMinutes} minuts</span></p>
        <p className="text-gray-700 mb-4">Dies lliures/vacances preses: <span className="font-medium text-red-700">{totalVacationDaysTaken} dies</span></p>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">Sessions Impartides per Centre (26-25):</h3>
        <div className="flex flex-wrap gap-4">
          {Object.values(sessionsByGym).map((gymData, idx) => (
            <div key={idx} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-sm font-semibold text-gray-700">{gymData.name}</div>
              <div className="text-xl font-bold text-blue-600">{gymData.count} sessions</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Detall Diari</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-2 px-4 text-left text-gray-700 font-bold">Data</th>
                <th className="py-2 px-4 text-left text-gray-700 font-bold">Dia</th>
                <th className="py-2 px-4 text-left text-gray-700 font-bold">Tipus de Dia</th>
                <th className="py-2 px-4 text-left text-gray-700 font-bold">Programa(es) / Estat</th>
                <th className="py-2 px-4 text-left text-gray-700 font-bold">Minuts</th>
                <th className="py-2 px-4 text-left text-gray-700 font-bold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((day, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-2 px-4">{formatDateDDMMYYYY(day.date)}</td>
                  <td className="py-2 px-4">{day.dayName}</td>
                  <td className="py-2 px-4">{day.dayType}</td>
                  <td className="py-2 px-4">{day.programInfo}</td>
                  <td className="py-2 px-4">{day.minutes}</td>
                  <td className="py-2 px-4">{day.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReport;
