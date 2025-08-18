import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { formatDate } from '../../utils/dateHelpers.js';
import { getUserCollectionPath } from '../../utils/firebasePaths.js';
import { MessageModal } from '../common/MessageModal.jsx';


const ProgramDetail = ({ program, setCurrentPage, db, currentUserId, appId }) => {
  const [sessionDate, setSessionDate] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [tracks, setTracks] = useState(program ? program.tracks : []);

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  useEffect(() => {
    if (program) {
      setTracks(program.tracks);
    }
  }, [program]);

  if (!program) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <p className="text-gray-700">Programa no trobat.</p>
        <button
          onClick={() => setCurrentPage('programs')}
          className="mt-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Tornar a Programes
        </button>
      </div>
    );
  }

  const handleAddSession = async () => {
    if (!sessionDate) {
      setMessageModalContent({
        title: 'Error de Validació',
        message: 'Si us plau, selecciona una data per a la sessió.',
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

    const newSession = { date: sessionDate, notes: sessionNotes };
    const programsCollectionPath = getUserCollectionPath(appId, currentUserId, 'programs');
    if (!programsCollectionPath) return;

    try {
      const programRef = doc(db, programsCollectionPath, program.id);
      const programSnap = await getDoc(programRef);
      const currentSessions = programSnap.exists() ? programSnap.data().sessions || [] : [];
      await updateDoc(programRef, {
        sessions: [...currentSessions, newSession]
      });
      setSessionDate('');
      setSessionNotes('');
      setMessageModalContent({
        title: 'Sessió Afegida',
        message: 'Sessió registrada correctament!',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    } catch (error) {
      console.error("Error adding session:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al afegir la sessió: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleToggleFavorite = async (trackId, currentStatus) => {
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
    const programsCollectionPath = getUserCollectionPath(appId, currentUserId, 'programs');
    if (!programsCollectionPath) return;

    try {
      const programRef = doc(db, programsCollectionPath, program.id);
      const updatedTracks = tracks.map(track =>
        track.id === trackId ? { ...track, isFavorite: !currentStatus } : track
      );
      await updateDoc(programRef, { tracks: updatedTracks });
      setMessageModalContent({
        title: 'Track Actualitzat',
        message: 'Estat de favorit actualitzat correctament.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    } catch (error) {
      console.error("Error toggling favorite status:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al actualitzar el track: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };


  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <div className="flex items-center mb-6">
        <button
          onClick={() => setCurrentPage('programs')}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mr-4"
        >
          ← Tornar
        </button>
        <h1 className="text-3xl font-bold text-gray-800">{program.name} ({program.shortName})</h1>
      </div>

      {/* Program Details */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Detalls del Programa</h2>
        <p className="text-gray-600 text-sm">Color: <span className="inline-block w-4 h-4 rounded-full mr-2" style={{ backgroundColor: program.color }}></span>{program.color}</p>
        <p className="text-gray-600 text-sm">Data de Llançament: {formatDate(program.releaseDate)}</p>
      </div>

      {/* Tracks List */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Tracks</h2>
        {tracks.length > 0 ? (
          <ul className="space-y-3">
            {tracks.map(track => (
              <li key={track.id} className="flex items-center p-3 bg-gray-50 rounded-lg shadow-sm">
                <div className="flex-grow">
                  <p className="font-medium text-gray-800">{track.name} <span className="text-sm text-gray-500">({track.type})</span></p>
                  {track.notes && <p className="text-xs text-gray-600 italic">"{track.notes}"</p>}
                </div>
                <button
                  onClick={() => handleToggleFavorite(track.id, track.isFavorite)}
                  className={`ml-4 p-2 rounded-full ${track.isFavorite ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'} hover:bg-yellow-200 transition duration-200`}
                  title={track.isFavorite ? 'Eliminar de Favorits' : 'Afegir a Favorits'}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.817 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.817-2.034a1 1 0 00-1.176 0l-2.817 2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z"></path></svg>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No hi ha tracks definits per a aquest programa.</p>
        )}
      </div>

      {/* Register Session */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Registrar Sessió Realitzada</h2>
        <div className="mb-4">
          <label htmlFor="sessionDate" className="block text-gray-700 text-sm font-bold mb-2">Data de la Sessió:</label>
          <input
            type="date"
            id="sessionDate"
            className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="sessionNotes" className="block text-gray-700 text-sm font-bold mb-2">Notes de la Sessió (Opcional):</label>
          <textarea
            id="sessionNotes"
            className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
          ></textarea>
        </div>
        <button
          onClick={handleAddSession}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Registrar Sessió
        </button>
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

export default ProgramDetail;