import React, { useState, useEffect } from 'react';
import { getLocalDateString, formatDateDDMMYYYY } from '../../utils/dateHelpers.jsx';
import { getActiveFixedSchedule, calculateRecurringSessionMinutes } from '../../utils/scheduleHelpers.jsx';

const MonthlyReport = ({ programs, gyms, fixedSchedules, recurringSessions, scheduleOverrides, missedDays }) => {
  const [reportMonth, setReportMonth] = useState(getLocalDateString(new Date()).substring(0, 7)); // YYYY-MM
  const [reportData, setReportData] = useState([]);
  const [totalWorkingMinutes, setTotalWorkingMinutes] = useState(0);
  const [totalVacationDaysTaken, setTotalVacationDaysTaken] = useState(0);

  useEffect(() => {
    generateReport();
  }, [reportMonth, programs, gyms, fixedSchedules, recurringSessions, scheduleOverrides, missedDays]);

  const generateReport = () => {
    const [yearStr, monthStr] = reportMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;

    const numDays = new Date(year, month + 1, 0).getDate();
    let currentMonthData = [];
    let calculatedTotalMinutes = 0;
    let calculatedTotalVacationDays = 0;

    for (let day = 1; day <= numDays; day++) {
      const fullDate = new Date(year, month, day);
      const isoDate = getLocalDateString(fullDate);
      const dayName = fullDate.toLocaleDateString('ca-ES', { weekday: 'long' });

      const isWeekend = fullDate.getDay() === 0 || fullDate.getDay() === 6;

      const override = scheduleOverrides.find(so => so.date === isoDate);
      const missed = missedDays.find(md => md.date === isoDate);

      let dayType = 'Normal';
      let programInfo = 'No programat';
      let minutes = 0;
      let notes = '';

      if (missed) {
        dayType = 'DIA LLIURE';
        calculatedTotalVacationDays++;
      } else if (override) {
        dayType = 'Canvi Horari';
        programInfo = override.sessions.map(s => {
          const program = programs.find(p => p.id === s.programId);
          const gym = gyms.find(g => g.id === s.gymId);
          return `${program?.shortName || 'N/A'} (${gym?.name || 'N/A'})`;
        }).join(', ');
        minutes = override.sessions.length * 60;
        notes = override.notes || '';
        calculatedTotalMinutes += minutes;
      } else {
        const activeFixedSchedule = getActiveFixedSchedule(fullDate, fixedSchedules);
        const recurringSessionsToday = recurringSessions.filter(session => session.daysOfWeek.includes(dayName));

        if (activeFixedSchedule[dayName] && activeFixedSchedule[dayName].length > 0) {
          programInfo = activeFixedSchedule[dayName].map(s => {
            const program = programs.find(p => p.id === s.programId);
            const gym = gyms.find(g => g.id === s.gymId);
            return `${program?.shortName || 'N/A'} (${gym?.name || 'N/A'})`;
          }).join(', ');
          minutes = activeFixedSchedule[dayName].length * 60;
          calculatedTotalMinutes += minutes;
        } else if (recurringSessionsToday.length > 0) {
            programInfo = recurringSessionsToday.map(s => {
                const program = programs.find(p => p.id === s.programId);
                const gym = gyms.find(g => g.id === s.gymId);
                return `${program?.shortName || 'N/A'} (${gym?.name || 'N/A'})`;
            }).join(', ');
            minutes = recurringSessionsToday.length * 60;
            calculatedTotalMinutes += minutes;
        } else if (isWeekend) {
            dayType = 'Cap de Setmana';
            programInfo = 'No laborable';
        } else {
            programInfo = 'No programat';
        }
      }

      currentMonthData.push({
        date: isoDate,
        dayName: dayName,
        dayType: dayType,
        programInfo: programInfo,
        minutes: minutes,
        notes: notes,
      });
    }

    setReportData(currentMonthData);
    setTotalWorkingMinutes(calculatedTotalMinutes);
    setTotalVacationDaysTaken(calculatedTotalVacationDays);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Informe Mensual de Classes</h1>

      <div className="flex items-center space-x-4 mb-6 bg-white p-4 rounded-lg shadow-md">
        <label htmlFor="reportMonth" className="text-gray-700 font-semibold">Seleccionar Mes:</label>
        <input
          type="month"
          id="reportMonth"
          value={reportMonth}
          onChange={(e) => setReportMonth(e.target.value)}
          className="shadow border rounded-lg py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Resum del Mes</h2>
        <p className="text-gray-700 mb-2">Total de minuts de classes impartides: <span className="font-medium text-blue-700">{totalWorkingMinutes} minuts</span></p>
        <p className="text-gray-700 mb-2">Dies lliures/vacances preses: <span className="font-medium text-red-700">{totalVacationDaysTaken} dies</span></p>
        {gyms.map(gym => {
          const takenForGym = missedDays.filter(md => 
            md.date.startsWith(reportMonth) &&
            true
          ).length;
          return (
            <p key={gym.id} className="text-gray-700 mb-1 ml-4">
              Dies de vacances assignats a {gym.name}: <span className="font-medium">{gym.totalVacationDays} dies</span>
            </p>
          );
        })}
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
