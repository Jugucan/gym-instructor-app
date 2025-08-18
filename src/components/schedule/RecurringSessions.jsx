import React, { useState } from 'react';
import { collection, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { formatDate } from '../../utils/dateHelpers.js';
import { getUserCollectionPath } from '../../utils/firebasePaths.js';
import { MessageModal } from '../common/MessageModal.jsx';


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

  const handleAddSession = () => {
    setEditingSession(null);
    setProgramId('');
    setTime('');
    setGymId('');
    setDaysOfWeek([]);
    setStartDate('');
    setEndDate('');
    setNotes('');
    setShowModal(true);
  };

  const handleEditSession = (session) => {
    setEditingSession(session);
    setProgramId(session.programId);
    setTime(session.time);
    setGymId(session.gymId);
    setDaysOfWeek(session.daysOfWeek);
    setStartDate(session.startDate);
    setEndDate(session.endDate || '');
    setNotes(session.notes || '');
    setShowModal(true);
  };

  const handleSaveSession = async () => {
    if (!programId || !time || !gymId || daysOfWeek.length === 0 || !startDate) {
      setMessageModalContent({
        title: 'Error de Validació',
        message: 'Si us plau, omple tots els camps obligatoris (Programa, Hora, Gimnàs, Dies de la Setmana, Data d\'Inici).',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }

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

    const newSessionData = {
      programId,
      time,
      gymId,
      daysOfWeek,
      startDate,
      endDate: endDate || null,
      notes,
    };

    try {
      const recurringSessionsCollectionPath = getUserCollectionPath(appId, currentUserId, 'recurringSessions');
      if (!recurringSessionsCollectionPath) return;

      if (editingSession) {
        const sessionRef = doc(db, recurringSessionsCollectionPath, editingSession.id);
        await updateDoc(sessionRef, newSessionData);
      } else {
        await addDoc(collection(db, recurringSessionsCollectionPath), newSessionData);
      }
      setShowModal(false);
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
      message: 'Estàs segur que vols eliminar aquesta sessió recurrent?',
      isConfirm: true,
      onConfirm: async () => {
        try {
          const recurringSessionsCollectionPath = getUserCollectionPath(appId, currentUserId, 'recurringSessions');
          if (!recurringSessionsCollectionPath) return;

          await deleteDoc(doc(db, recurringSessionsCollectionPath, sessionId));
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

  const handleToggleDay = (day) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió de Sessions Recurrents</h1>
      <button
        onClick={handleAddSession}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-6"
      >
        Afegir Nova Sessió Recurrent
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recurringSessions.length === 0 && <p className="text-gray-500">No hi ha sessions recurrents definides.</p>}
        {recurringSessions.map(session => {
          const program = programs.find(p => p.id === session.programId);
          const gym = gyms.find(g => g.id === session.gymId);
          return (
            <div
              key={session.id}
              className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between hover:shadow-lg transition duration-300 ease-in-out"
              style={{ borderLeft: `8px solid ${program?.color || '#9CA3AF'}` }}
            >
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {program?.name || 'Programa Desconegut'} ({session.time})
                </h2>
                <p className="text-gray-600 text-sm">Gimnàs: <span className="font-medium">{gym?.name || 'N/A'}</span></p>
                <p className="text-gray-600 text-sm">Dies: <span className="font-medium">{session.daysOfWeek.join(', ')}</span></p>
                <p className="text-gray-600 text-sm">Inici: <span className="font-medium">{formatDate(session.startDate)}</span></p>
                {session.endDate && <p className="text-gray-600 text-sm">Fi: <span className="font-medium">{formatDate(session.endDate)}</span></p>}
                {session.notes && <p className="text-gray-600 text-sm italic mt-2">"{session.notes}"</p>}
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => handleEditSession(session)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 text-sm rounded-lg shadow-md transition duration-300 ease-in-out"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteSession(session.id)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 text-sm rounded-lg shadow-md transition duration-300 ease-in-out"
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingSession ? 'Editar Sessió Recurrent' : 'Afegir Nova Sessió Recurrent'}</h2>
            <div className="mb-4">
              <label htmlFor="programId" className="block text-gray-700 text-sm font-bold mb-2">Programa:</label>
              <select
                id="programId"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
              >
                <option value="">Selecciona un programa</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
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
              <label htmlFor="gymId" className="block text-gray-700 text-sm font-bold mb-2">Gimnàs:</label>
              <select
                id="gymId"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={gymId}
                onChange={(e) => setGymId(e.target.value)}
              >
                <option value="">Selecciona un gimnàs</option>
                {gyms.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Dies de la Setmana:</label>
              <div className="flex flex-wrap gap-2">
                {allDaysOfWeek.map(day => (
                  <button
                    key={day}
                    onClick={() => handleToggleDay(day)}
                    className={`py-2 px-4 rounded-lg text-sm font-medium transition duration-200 ease-in-out
                      ${daysOfWeek.includes(day) ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                    `}
                  >
                    {day}
                  </button>
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
              <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-2">Notes:</label>
              <textarea
                id="notes"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4">
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
                Guardar Sessió
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