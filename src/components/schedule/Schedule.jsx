// src/components/schedule/Schedule.jsx

import React, { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import FullCalendar from '../calendar/FullCalendar.jsx';
import { formatDateDDMMYYYY } from '../../utils/dateHelpers.jsx';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx';
import { MessageModal } from '../common/MessageModal.jsx';

const Schedule = ({ programs, scheduleOverrides, fixedSchedules, users, gyms, recurringSessions, missedDays, db, currentUserId, appId }) => {
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  // Funcions per eliminar elements
  const handleDeleteFixedSchedule = (scheduleId) => {
    setMessageModalContent({
      title: 'Confirmar Eliminació',
      message: 'Estàs segur que vols eliminar aquest horari fix? Aquesta acció és irreversible.',
      isConfirm: true,
      onConfirm: async () => {
        try {
          const fixedSchedulesPath = getUserCollectionPath(appId, currentUserId, 'fixedSchedules');
          await deleteDoc(doc(db, fixedSchedulesPath, scheduleId));
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

  const handleDeleteRecurringSession = (sessionId) => {
    setMessageModalContent({
      title: 'Confirmar Eliminació',
      message: 'Estàs segur que vols eliminar aquesta sessió recurrent? Aquesta acció és irreversible.',
      isConfirm: true,
      onConfirm: async () => {
        try {
          const recurringSessionsPath = getUserCollectionPath(appId, currentUserId, 'recurringSessions');
          await deleteDoc(doc(db, recurringSessionsPath, sessionId));
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

  const handleDeleteScheduleOverride = (overrideId) => {
    setMessageModalContent({
      title: 'Confirmar Eliminació',
      message: 'Estàs segur que vols eliminar aquesta substitució programada? Aquesta acció és irreversible.',
      isConfirm: true,
      onConfirm: async () => {
        try {
          const scheduleOverridesPath = getUserCollectionPath(appId, currentUserId, 'scheduleOverrides');
          await deleteDoc(doc(db, scheduleOverridesPath, overrideId));
          setShowMessageModal(false);
          setMessageModalContent({
            title: 'Eliminat',
            message: 'Substitució programada eliminada correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
        } catch (error) {
          console.error("Error deleting schedule override:", error);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar la substitució programada: ${error.message}`,
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

  const handleDeleteMissedDay = (missedDayId) => {
    setMessageModalContent({
      title: 'Confirmar Eliminació',
      message: 'Estàs segur que vols eliminar aquest dia no assistit? Aquesta acció és irreversible.',
      isConfirm: true,
      onConfirm: async () => {
        try {
          const missedDaysPath = getUserCollectionPath(appId, currentUserId, 'missedDays');
          await deleteDoc(doc(db, missedDaysPath, missedDayId));
          setShowMessageModal(false);
          setMessageModalContent({
            title: 'Eliminat',
            message: 'Dia no assistit eliminat correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
        } catch (error) {
          console.error("Error deleting missed day:", error);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar el dia no assistit: ${error.message}`,
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Calendari de Sessions</h1>
      
      {/* Full Interactive Calendar */}
      <FullCalendar
        programs={programs}
        users={users}
        gyms={gyms}
        scheduleOverrides={scheduleOverrides}
        fixedSchedules={fixedSchedules}
        recurringSessions={recurringSessions}
        missedDays={missedDays}
        db={db}
        currentUserId={currentUserId}
        appId={appId}
      />

      {/* Horaris Fixos Actius */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Horaris Fixos Actius</h2>
        {fixedSchedules.length > 0 ? (
          <div className="space-y-3">
            {fixedSchedules.map(fs => (
              <div key={fs.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">
                  <strong>Actiu des del {formatDateDDMMYYYY(fs.startDate)}</strong>: {Object.keys(fs.schedule).filter(day => fs.schedule[day] && fs.schedule[day].length > 0).join(', ')}
                </span>
                <button
                  onClick={() => handleDeleteFixedSchedule(fs.id)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No hi ha horaris fixos definits. Ves a Configuració &gt; Gestió d'Horaris Fixos per afegir-ne.</p>
        )}
      </div>

      {/* Sessions Recurrents Actives */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Sessions Recurrents Actives</h2>
        {recurringSessions.length > 0 ? (
          <div className="space-y-3">
            {recurringSessions.map(rs => {
              const program = programs.find(p => p.id === rs.programId);
              const gym = gyms.find(g => g.id === rs.gymId);
              return (
                <div key={rs.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">
                    <strong>{program?.shortName || 'N/A'}</strong> a les {rs.time} ({gym?.name || 'N/A'}) els {rs.daysOfWeek.join(', ')} (des del {formatDateDDMMYYYY(rs.startDate)}{rs.endDate && ` fins al ${formatDateDDMMYYYY(rs.endDate)}`})
                  </span>
                  <button
                    onClick={() => handleDeleteRecurringSession(rs.id)}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">No hi ha sessions recurrents definides. Ves a Configuració &gt; Sessions Recurrents per afegir-ne.</p>
        )}
      </div>

      {/* Substitucions Programades (Overrides) */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Substitucions Programades (Overrides)</h2>
        {scheduleOverrides.length > 0 ? (
          <div className="space-y-3">
            {scheduleOverrides.map(so => (
              <div key={so.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">
                  <strong>{formatDateDDMMYYYY(so.date)}</strong>: {so.sessions.map(s => `${programs.find(p => p.id === s.programId)?.shortName || 'N/A'} (${s.time} a ${gyms.find(g => g.id === s.gymId)?.name || 'N/A'})`).join(', ')}
                </span>
                <button
                  onClick={() => handleDeleteScheduleOverride(so.id)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No hi ha substitucions programades. Pots afegir-les des del Calendari (fent clic a un dia).</p>
        )}
      </div>

      {/* Dies No Assistits */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Dies No Assistits</h2>
        {missedDays.length > 0 ? (
          <div className="space-y-3">
            {missedDays.map(md => {
              const gym = gyms.find(g => g.id === md.gymId || g.id === md.assignedGymId);
              return (
                <div key={md.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">
                    <strong>{formatDateDDMMYYYY(md.date)}</strong>: Gimnàs: {gym?.name || 'Tots els gimnasos'} {md.notes && `(${md.notes})`}
                  </span>
                  <button
                    onClick={() => handleDeleteMissedDay(md.id)}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">No hi ha dies no assistits registrats. Pots afegir-los des del Calendari (fent clic a un dia).</p>
        )}
      </div>

      {/* Message Modal */}
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

export default Schedule;
