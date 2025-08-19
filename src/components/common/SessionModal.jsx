// src/components/common/SessionModal.jsx

import React, { useState, useEffect } from 'react';
import { getLocalDateString } from '../../utils/dateHelpers.jsx';

export const SessionModal = ({ show, onClose, onSave, selectedDate, sessionsForDay, programs, gyms }) => {
  const [currentSessions, setCurrentSessions] = useState([]);
  const defaultSessionEntry = { programId: '', time: '', gymId: '' };

  useEffect(() => {
    if (show) {
      // Create a deep copy of sessionsForDay to ensure we don't modify the original prop state directly
      // Also add a unique temporary ID for new sessions for list rendering
      const sessionsWithTempIds = sessionsForDay.map(session => ({
        ...session,
        id: session.id || `temp_${Date.now()}_${Math.random()}`,
        isNew: false, // Flag existing sessions as not new
      }));
      setCurrentSessions(sessionsWithTempIds);
    }
  }, [show, sessionsForDay]);


  if (!show) return null;

  const handleInputChange = (index, field, value) => {
    const updatedSessions = [...currentSessions];
    updatedSessions[index] = { ...updatedSessions[index], [field]: value };
    setCurrentSessions(updatedSessions);
  };

  const addSession = () => {
    setCurrentSessions([...currentSessions, { ...defaultSessionEntry, id: `temp_${Date.now()}_${Math.random()}`, isNew: true }]);
  };

  const removeSession = (indexToRemove) => {
    setCurrentSessions(currentSessions.filter((_, index) => index !== indexToRemove));
  };

  const handleSaveClick = () => {
    // Filter out any completely empty sessions before saving
    const sessionsToSave = currentSessions.filter(s => s.programId || s.time || s.gymId);
    onSave(sessionsToSave);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center p-4 z-50 font-inter">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto"> {/* Added max-h and overflow */}
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Gestionar Sessions per a {selectedDate ? getLocalDateString(selectedDate) : ''}
        </h2>
        <div className="max-h-96 overflow-y-auto mb-4 p-2 border rounded-lg bg-gray-50">
          {currentSessions.length === 0 && <p className="text-gray-600">No hi ha sessions programades per a aquest dia.</p>}
          {currentSessions.map((session, index) => (
            <div key={session.id || index} className="flex flex-wrap items-center gap-2 mb-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
              <select
                value={session.programId}
                onChange={(e) => handleInputChange(index, 'programId', e.target.value)}
                className="shadow border rounded-lg py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:shadow-outline flex-grow bg-white"
              >
                <option value="">Programa</option>
                {programs.map(program => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
              <input
                type="time"
                value={session.time}
                onChange={(e) => handleInputChange(index, 'time', e.target.value)}
                className="shadow appearance-none border rounded-lg py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:shadow-outline w-auto bg-white"
              />
              <select
                value={session.gymId}
                onChange={(e) => handleInputChange(index, 'gymId', e.target.value)}
                className="shadow border rounded-lg py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:shadow-outline flex-grow bg-white"
              >
                <option value="">Gimnàs</option>
                {gyms.map(gym => (
                  <option key={gym.id} value={gym.id}>{gym.name}</option>
                ))}
              </select>
              <button
                onClick={() => removeSession(index)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addSession}
          className="mb-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out w-full"
        >
          Afegir Nova Sessió
        </button>
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleSaveClick}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Guardar Sessions
          </button>
          <button
            onClick={onClose}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Cancel·lar
          </button>
        </div>
      </div>
    </div>
  );
};
