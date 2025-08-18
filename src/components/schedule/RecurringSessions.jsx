import React, { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx'; // Confirmat: .jsx
import { formatDate } from '../../utils/dateHelpers.jsx'; // Confirmat: .jsx
import { MessageModal } from '../common/MessageModal.jsx'; // Confirmat: .jsx

const RecurringSessions = ({ recurringSessions, programs, gyms, db, currentUserId, appId }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [programId, setProgramId] = useState('');
  const [time, setTime] = useState('');
  const [gymId, setGymId] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const allDaysOfWeek = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];

  const handleDayToggle = (day) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSaveSession = async () => {
    if (!db || !currentUserId || !appId) {
        setMessageModalContent({
          title: 'Error de Connexió',
          message: 'La base de dades no està connectada. Si us plau, recarrega la pàgina o contacta amb el suport.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
        setShowMessageModal(true);
        return;
      }

    if (!programId || !time || !gymId || daysOfWeek.length === 0 || !startDate) {
      setMessageModalContent({
        title: 'Camps Obligatoris',
        message: 'Si us plau, omple tots els camps obligatoris (Programa, Hora, Gimnàs, Dies de la Setmana, Data d\'Inici).',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }

    const newSessionData = {
      programId,
      time,
      gymId,
      daysOfWeek,
      startDate,
      endDate: endDate || null, // Allow endDate to be null
      notes,
    };

    const recurringSessionsPath = getUserCollectionPath(appId, currentUserId, 'recurringSessions');
    if (!recurringSessionsPath) return;

    try {
      if (editingSession) {
        const sessionRef = doc(db, recurringSessionsPath, editingSession.id);
        await updateDoc(sessionRef, newSessionData);
        setMessageModalContent({
          title: 'Sessió Actualitzada',
          message: 'La sessió recurrent s\'ha actualitzat correctament.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
      } else {
        await addDoc(collection(db, recurringSessionsPath), newSessionData);
        setMessageModalContent({
          title: 'Sessió Afegida',
          message: 'La nova sessió recurrent s\'ha afegit correctament.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
      }
      setShowMessageModal(true);
      setShowModal(false);
      setProgramId('');
      setTime('');
      setGymId('');
      setDaysOfWeek([]);
      setStartDate('');
      setEndDate('');
      setNotes('');
      setEditingSession(null);
    } catch (error) {
      console.error("Error saving recurring session:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar la sessió recurrent: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleDeleteSession = (sessionId) => {
    if (!db || !currentUserId || !appId) {
        setMessageModalContent({
          title: 'Error de Connexió',
          message: 'La base de dades no està connectada. Si us plau, recarrega la pàgina o contacta amb el suport.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
        setShowMessageModal(true);
        return;
      }

    setMessageModalContent({
      title: 'Confirmar Eliminació',
      message: 'Estàs segur que vols eliminar aquesta sessió recurrent? Aquesta acció és irreversible.',
      isConfirm: true,
      onConfirm: async () => {
        const recurringSessionsPath = getUserCollectionPath(appId, currentUserId, 'recurringSessions');
        if (!recurringSessionsPath) return;
        try {
          await deleteDoc(doc(db, recurringSessionsPath, sessionId));
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Eliminat',
            message: 'Sessió recurrent eliminada correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        } catch (error) {
          console.error("Error deleting recurring session:", error);
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar la sessió recurrent: ${error.message}`,
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        }
      },
      onCancel: () => setShowMessageModal(false),
    });
    setShowMessageModal(true);
  };

  const handleEditSession = (session) => {
    setEditingSession(session);
    setProgramId(session.programId);
    setTime(session.time);
    setGymId(session.gymId);
    setDaysOfWeek(session.daysOfWeek || []);
    setStartDate(session.startDate);
    setEndDate(session.endDate || '');
    setNotes(session.notes || '');
    setShowModal(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió de Sessions Recurrents</h1>

      <button
        onClick={() => { setShowModal(true); setEditingSession(null); setProgramId(''); setTime(''); setGymId(''); setDaysOfWeek([]); setStartDate(''); setEndDate(''); setNotes(''); }}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-6"
      >
        Afegir Nova Sessió Recurrent
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recurringSessions.map(session => (
          <div key={session.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {programs.find(p => p.id === session.programId)?.name || 'N/A'} - {session.time}
            </h2>
            <p className="text-sm text-gray-600 mb-1">Gimnàs: {gyms.find(g => g.id === session.gymId)?.name || 'N/A'}</p>
            <p className="text-sm text-gray-600 mb-1">Dies: {session.daysOfWeek.join(', ')}</p>
            <p className="text-sm text-gray-600 mb-1">
              Des de: {formatDate(session.startDate)}{session.endDate ? ` fins a: ${formatDate(session.endDate)}` : ''}
            </p>
            {session.notes && <p className="text-sm text-gray-600 mb-3">Notes: {session.notes}</p>}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => handleEditSession(session)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
              >
                Editar
              </button>
              <button
                onClick={() => handleDeleteSession(session.id)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingSession ? 'Editar Sessió Recurrent' : 'Afegir Nova Sessió Recurrent'}</h2>
            <div className="mb-4">
              <label htmlFor="program" className="block text-gray-700 text-sm font-bold mb-2">Programa:</label>
              <select
                id="program"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
              >
                <option value="">Selecciona un programa</option>
                {programs.map(program => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="time" className="block text-gray-700 text-sm font-bold mb-2">Hora:</label>
              <input
                type="time"
                id="time"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="gym" className="block text-gray-700 text-sm font-bold mb-2">Gimnàs:</label>
              <select
                id="gym"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={gymId}
                onChange={(e) => setGymId(e.target.value)}
              >
                <option value="">Selecciona un gimnàs</option>
                {gyms.map(gym => (
                  <option key={gym.id} value={gym.id}>{gym.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Dies de la Setmana:</label>
              <div className="grid grid-cols-3 gap-2">
                {allDaysOfWeek.map(day => (
                  <label key={day} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox text-blue-600 rounded"
                      value={day}
                      checked={daysOfWeek.includes(day)}
                      onChange={() => handleDayToggle(day)}
                    />
                    <span className="ml-2 text-gray-700">{day}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="startDate" className="block text-gray-700 text-sm font-bold mb-2">Data d'Inici:</label>
              <input
                type="date"
                id="startDate"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="endDate" className="block text-gray-700 text-sm font-bold mb-2">Data de Fi (Opcional):</label>
              <input
                type="date"
                id="endDate"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-2">Notes (Opcional):</label>
              <textarea
                id="notes"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="3"
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleSaveSession}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                {editingSession ? 'Guardar Canvis' : 'Afegir Sessió'}
              </button>
            </div>
          </div>
        </div>
      )}
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

export default RecurringSessions;
