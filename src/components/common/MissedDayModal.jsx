// src/components/common/MissedDayModal.jsx

import React, { useState, useEffect } from 'react';
import { getLocalDateString } from '../../utils/dateHelpers.jsx';

export const MissedDayModal = ({
  show,
  onClose,
  onSave,
  onUnmark,
  date,
  gyms,
  isAlreadyMissed,
  missedDayDocId,
  existingMissedGymId,
  existingMissedNotes
}) => {
  const [gymId, setGymId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (show) {
      setGymId(existingMissedGymId || '');
      setNotes(existingMissedNotes || '');
    }
  }, [show, existingMissedGymId, existingMissedNotes]);

  if (!show) return null;

  const handleSaveClick = () => {
    if (!gymId) {
      // You might want to add a message modal here if a gym is mandatory
      alert('Si us plau, selecciona un gimnàs.');
      return;
    }
    onSave({ date: getLocalDateString(date), gymId, notes });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center p-4 z-50 font-inter">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {isAlreadyMissed ? 'Editar Dia No Assistit' : 'Marcar Dia No Assistit'}
        </h2>
        <p className="text-gray-600 mb-4">
          Data: <span className="font-semibold">{date ? getLocalDateString(date) : ''}</span>
        </p>

        <div className="mb-4">
          <label htmlFor="gymSelect" className="block text-gray-700 text-sm font-bold mb-2">
            Gimnàs:
          </label>
          <select
            id="gymSelect"
            value={gymId}
            onChange={(e) => setGymId(e.target.value)}
            className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:shadow-outline bg-white"
          >
            <option value="">Selecciona un gimnàs</option>
            {gyms.map(gym => (
              <option key={gym.id} value={gym.id}>{gym.name}</option>
            ))}
            <option value="all">Tots els gimnasos (No assistit a cap)</option>
          </select>
        </div>

        <div className="mb-6">
          <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-2">
            Notes (Opcional):
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:shadow-outline bg-white"
            placeholder="Afegeix una nota sobre el dia no assistit..."
          ></textarea>
        </div>

        <div className="flex justify-end space-x-4">
          {isAlreadyMissed && (
            <button
              onClick={() => onUnmark(missedDayDocId)}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
            >
              Desmarcar Dia
            </button>
          )}
          <button
            onClick={handleSaveClick}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            {isAlreadyMissed ? 'Actualitzar' : 'Marcar com a No Assistit'}
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
