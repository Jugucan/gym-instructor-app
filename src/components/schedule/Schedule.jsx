import React from 'react';
import { formatDate } from '../../utils/dateHelpers.js';

const Schedule = ({ programs, scheduleOverrides, fixedSchedules, users, gyms, recurringSessions, missedDays, db, currentUserId, appId }) => {
  // This component will primarily be for managing schedule data, not the interactive calendar
  // The interactive calendar is now in Dashboard for a quick overview.
  // We can add components here for direct management of overrides if needed.
  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió del Calendari (Horaris i Substitucions)</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Horaris Fixos Actius</h2>
        {fixedSchedules.length > 0 ? (
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            {fixedSchedules.map(fs => (
              <li key={fs.id}>**Actiu des del {formatDate(fs.startDate)}**: {Object.keys(fs.schedule).filter(day => fs.schedule[day].length > 0).join(', ')}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No hi ha horaris fixos definits. Ves a Configuració &gt; Gestió d'Horaris Fixos per afegir-ne.</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Sessions Recurrents Actives</h2>
        {recurringSessions.length > 0 ? (
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            {recurringSessions.map(rs => {
              const program = programs.find(p => p.id === rs.programId);
              const gym = gyms.find(g => g.id === rs.gymId);
              return (
                <li key={rs.id}>**{program?.shortName || 'N/A'}** a les {rs.time} ({gym?.name || 'N/A'}) els {rs.daysOfWeek.join(', ')} (des del {formatDate(rs.startDate)}{rs.endDate && ` fins al ${formatDate(rs.endDate)}`})</li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500">No hi ha sessions recurrents definides. Ves a Configuració &gt; Sessions Recurrents per afegir-ne.</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Substitucions Programades (Overrides)</h2>
        {scheduleOverrides.length > 0 ? (
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            {scheduleOverrides.map(so => (
              <li key={so.id}>**{formatDate(so.date)}**: {so.sessions.map(s => `${programs.find(p => p.id === s.programId)?.shortName || 'N/A'} (${s.time} a ${gyms.find(g => g.id === s.gymId)?.name || 'N/A'})`).join(', ')}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No hi ha substitucions programades. Pots afegir-les des del Dashboard (calendari) fent clic a un dia.</p>
        )}
      </div>

       <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Dies No Assistits</h2>
        {missedDays.length > 0 ? (
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            {missedDays.map(md => {
              const gym = gyms.find(g => g.id === md.gymId);
              return (
                <li key={md.id}>**{formatDate(md.date)}**: Gimnàs: {gym?.name || 'Tots els gimnasos'} {md.notes && `(${md.notes})`}</li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500">No hi ha dies no assistits registrats. Pots afegir-los des del Dashboard (calendari) fent clic a un dia.</p>
        )}
      </div>

      <p className="mt-6 text-gray-600">Per interactuar amb el calendari dia a dia i gestionar sessions o marcar dies com a no assistits, torna al **Dashboard**.</p>
    </div>
  );
};

export default Schedule;