// src/components/common/MissedDayModal.jsx

import React, { useState, useEffect } from 'react';
import { formatDate, getLocalDateString } from '../../utils/dateHelpers.jsx';
import { MessageModal } from './MessageModal.jsx'; // Import the shared MessageModal

const MissedDayModal = ({ show, onClose, onSave, onUnmark, date, gyms, isAlreadyMissed, missedDayDocId, existingMissedGymId, existingMissedNotes }) => {
  const [selectedGymId, setSelectedGymId] = useState('');
  const [notes, setNotes] = useState('');

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  useEffect(() => {
    if (show) {
      if (isAlreadyMissed) {
        setSelectedGymId(existingMissedGymId || '');
        setNotes(existingMissedNotes || '');
      } else {
        setSelectedGymId('');
        setNotes('');
      }
    }
  }, [show, isAlreadyMissed, existingMissedGymId, existingMissedNotes]);

  const handleSubmit = () => {
    if (isAlreadyMissed) {
      // If already missed, we are unmarking it. No validation needed beyond confirmation.
      onUnmark(missedDayDocId);
    } else {
      // If not already missed, we are marking it as missed. Validate.
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
    }
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {isAlreadyMissed ? `Desmarcar ${formatDate(date)} com a No Assistit` : `Marcar ${formatDate(date)} com a No Assistit`}
        </h2>
        <div className="mb-4">
          <label htmlFor="missedGym" className="block text-gray-700 text-sm font-bold mb-2">Gimnàs:</label>
          <select
            id="missedGym"
            className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedGymId}
            onChange={(e) => setSelectedGymId(e.target.value)}
            disabled={isAlreadyMissed} // Disable if already marked, user must unmark first
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
            disabled={isAlreadyMissed} // Disable if already marked
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
            className={isAlreadyMissed ? "bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out" : "bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"}
          >
            {isAlreadyMissed ? 'Desmarcar' : 'Marcar com a No Assistit'}
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

export { MissedDayModal };
