// src/components/common/SessionModal.jsx

import React, { useState, useEffect } from 'react';
import { formatDate } from '../../utils/dateHelpers.jsx';
import { MessageModal } from './MessageModal.jsx'; // Import the shared MessageModal

const SessionModal = ({ show, onClose, onSave, selectedDate, sessionsForDay, programs, gyms }) => {
  const [currentSessions, setCurrentSessions] = useState([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  useEffect(() => {
    if (show) {
      // Ensure sessions have a temporary unique ID for React list keying if they don't already
      setCurrentSessions(sessionsForDay.map(s => ({ ...s, id: s.id || `temp_${Date.now()}_${Math.random()}` })));
    }
  }, [show, sessionsForDay]);

  const handleAddSessionToDay = () => {
    setCurrentSessions(prev => [...prev, { id: `temp_${Date.now()}_${Math.random()}`, programId: '', time: '', gymId: '', notes: '', isNew: true }]);
  };

  const handleUpdateSessionInDay = (sessionId, field, value) => {
    setCurrentSessions(prev =>
      prev.map(session =>
        session.id === sessionId ? { ...session, [field]: value } : session
      )
    );
  };

  const handleDeleteSessionInDay = (sessionId) => {
    setCurrentSessions(prev => prev.filter(session => session.id !== sessionId));
  };

  const handleSaveAndClose = () => {
    // Validate sessions before saving
    for (const session of currentSessions) {
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
    onSave(currentSessions);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Gestionar Sessions per {selectedDate ? formatDate(selectedDate) : ''}</h2>

        <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2">
          {currentSessions.length === 0 && <p className="text-gray-500">No hi ha sessions per a aquest dia. Afegeix-ne una!</p>}
          {currentSessions.map((session) => (
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
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Cancel·lar
          </button>
          <button
            onClick={handleSaveAndClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Guardar Sessions
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

export { SessionModal };
