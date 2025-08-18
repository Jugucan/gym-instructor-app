import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx'; // Confirmat: .jsx
import { formatDate } from '../../utils/dateHelpers.jsx'; // Confirmat: .jsx
import { MessageModal } from '../common/MessageModal.jsx'; // Confirmat: .jsx

const ProgramDetail = ({ program, setCurrentPage, db, currentUserId, appId }) => {
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackType, setNewTrackType] = useState('');
  const [newTrackNotes, setNewTrackNotes] = useState('');
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null); // State for track being edited

  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionNotes, setNewSessionNotes] = useState('');
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });


  if (!program) {
    return (
      <div className="p-6 text-center text-gray-700">
        <h1 className="text-3xl font-bold mb-4">Programa no trobat</h1>
        <p className="mb-4">El programa que busques no existeix o no s'ha pogut carregar.</p>
        <button
          onClick={() => setCurrentPage('programs')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Tornar a Programes
        </button>
      </div>
    );
  }

  const programsPath = getUserCollectionPath(appId, currentUserId, 'programs');
  if (!programsPath) {
    console.error("Programs path not available.");
    return null;
  }
  const programDocRef = doc(db, programsPath, program.id);

  const handleAddTrack = async () => {
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

    if (!newTrackName || !newTrackType) {
        setMessageModalContent({
            title: 'Camps Obligatoris',
            message: 'Si us plau, omple el nom i el tipus del track.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
        });
        setShowMessageModal(true);
        return;
    }

    const trackId = editingTrack ? editingTrack.id : Date.now().toString(); // Simple ID generation
    const trackData = {
        id: trackId,
        name: newTrackName,
        type: newTrackType,
        notes: newTrackNotes,
        isFavorite: editingTrack ? editingTrack.isFavorite : false, // Preserve favorite status
    };

    try {
        if (editingTrack) {
            // Remove old version of the track, then add updated version
            await updateDoc(programDocRef, {
                tracks: arrayRemove(editingTrack)
            });
            await updateDoc(programDocRef, {
                tracks: arrayUnion(trackData)
            });
            setMessageModalContent({
                title: 'Track Actualitzat',
                message: 'El track s\'ha actualitzat correctament.',
                isConfirm: false,
                onConfirm: () => setShowMessageModal(false),
            });
        } else {
            // Add new track
            await updateDoc(programDocRef, {
                tracks: arrayUnion(trackData)
            });
            setMessageModalContent({
                title: 'Track Afegit',
                message: 'El nou track s\'ha afegit correctament.',
                isConfirm: false,
                onConfirm: () => setShowMessageModal(false),
            });
        }
        setShowMessageModal(true);
        setShowAddTrackModal(false);
        setNewTrackName('');
        setNewTrackType('');
        setNewTrackNotes('');
        setEditingTrack(null); // Clear editing state
    } catch (error) {
        console.error("Error adding/updating track:", error);
        setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al guardar el track: ${error.message}`,
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
        });
        setShowMessageModal(true);
    }
  };


  const handleEditTrack = (track) => {
    setEditingTrack(track);
    setNewTrackName(track.name);
    setNewTrackType(track.type);
    setNewTrackNotes(track.notes || '');
    setShowAddTrackModal(true);
  };

  const handleDeleteTrack = async (trackToDelete) => {
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
      message: `Estàs segur que vols eliminar el track "${trackToDelete.name}"?`,
      isConfirm: true,
      onConfirm: async () => {
        try {
          await updateDoc(programDocRef, {
            tracks: arrayRemove(trackToDelete)
          });
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Track Eliminat',
            message: 'El track s\'ha eliminat correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        } catch (error) {
          console.error("Error deleting track:", error);
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar el track: ${error.message}`,
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        }
      },
      onCancel: () => setShowMessageModal(false),
    });
    setShowMessageModal(true);
  };

  const handleToggleFavorite = async (trackToToggle) => {
    if (!db || !currentUserId || !appId) {
        setMessageModalContent({
          title: 'Error de Connexió',
          message: 'La base de dades no està connectada. Si us plau, recarrega la pàgina o contacta con el suport.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
        setShowMessageModal(true);
        return;
      }
    try {
      const updatedTrack = { ...trackToToggle, isFavorite: !trackToToggle.isFavorite };
      // Atomically remove old track and add updated track
      await updateDoc(programDocRef, {
        tracks: arrayRemove(trackToToggle)
      });
      await updateDoc(programDocRef, {
        tracks: arrayUnion(updatedTrack)
      });
      setShowMessageModal(true);
      setMessageModalContent({
        title: 'Favorit Actualitzat',
        message: 'L\'estat de favorit del track s\'ha actualitzat.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
    } catch (error) {
      console.error("Error toggling favorite status:", error);
      setShowMessageModal(true);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al actualitzar el favorit: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
    }
  };

  const handleAddSession = async () => {
    if (!db || !currentUserId || !appId) {
        setMessageModalContent({
          title: 'Error de Connexió',
          message: 'La base de dades no està connectada. Si us plau, recarrega la pàgina o contacta con el suport.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
        setShowMessageModal(true);
        return;
      }

    if (!newSessionDate) {
      setMessageModalContent({
        title: 'Data Obligatòria',
        message: 'Si us plau, selecciona la data de la sessió.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }

    const sessionData = {
      date: newSessionDate,
      notes: newSessionNotes,
    };

    try {
      await updateDoc(programDocRef, {
        sessions: arrayUnion(sessionData)
      });
      setShowMessageModal(true);
      setMessageModalContent({
        title: 'Sessió Afegida',
        message: 'La sessió s\'ha registrat correctament.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowAddSessionModal(false);
      setNewSessionDate('');
      setNewSessionNotes('');
    } catch (error) {
      console.error("Error adding session:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al registrar la sessió: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  // Sort sessions by date descending
  const sortedSessions = program.sessions
    ? [...program.sessions].sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  // Calculate stats
  const firstSessionDate = sortedSessions.length > 0 ? sortedSessions[sortedSessions.length - 1].date : 'N/A';
  const lastSessionDate = sortedSessions.length > 0 ? sortedSessions[0].date : 'N/A';
  const totalSessions = program.sessions ? program.sessions.length : 0;

  const daysSinceLastSession = lastSessionDate !== 'N/A'
    ? Math.floor((new Date() - new Date(lastSessionDate)) / (1000 * 60 * 60 * 24))
    : 'N/A';

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <button
        onClick={() => setCurrentPage('programs')}
        className="mb-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
      >
        &larr; Tornar a Programes
      </button>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6" style={{ borderLeft: `8px solid ${program.color}` }}>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{program.name} ({program.shortName})</h1>
        <p className="text-gray-600 mb-1">Data de Llançament: {formatDate(program.releaseDate)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Estadístiques d'Ús</h2>
          <p className="text-gray-700 mb-2">Primera Sessió Registrada: <span className="font-medium">{formatDate(firstSessionDate)}</span></p>
          <p className="text-gray-700 mb-2">Última Sessió Registrada: <span className="font-medium">{formatDate(lastSessionDate)}</span></p>
          <p className="text-gray-700 mb-2">Total de Sessions Impartides: <span className="font-medium">{totalSessions}</span></p>
          <p className="text-gray-700 mb-2">Dies des de l'Última Sessió: <span className="font-medium">{daysSinceLastSession}</span></p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Accions</h2>
          <button
            onClick={() => setShowAddSessionModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out w-full mb-3"
          >
            Registrar Nova Sessió
          </button>
          <button
            onClick={() => { setEditingTrack(null); setNewTrackName(''); setNewTrackType(''); setNewTrackNotes(''); setShowAddTrackModal(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out w-full"
          >
            Afegir Nou Track
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Tracks/Cançons</h2>
          {program.tracks && program.tracks.length > 0 ? (
            <ul className="space-y-3">
              {program.tracks.map((track, index) => (
                <li key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm">
                  <div>
                    <p className="font-medium text-gray-800">{track.name} (<span className="text-gray-600 text-sm">{track.type}</span>)</p>
                    {track.notes && <p className="text-xs text-gray-500 mt-1">Notes: {track.notes}</p>}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleToggleFavorite(track)}
                      className={`p-2 rounded-full transition duration-200 ${track.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                      title={track.isFavorite ? 'Treure de Favorits' : 'Afegir a Favorits'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/><path d="M12 6.5l-2.031 4.125-4.569.664 3.308 3.227-.781 4.546L12 17.203l4.073 2.146-.781-4.546 3.308-3.227-4.569-.664L12 6.5z"/></svg>
                    </button>
                    <button
                      onClick={() => handleEditTrack(track)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold p-2 rounded-full shadow-sm transition duration-300 ease-in-out text-sm"
                      title="Editar Track"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M19 2H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h4l.001 2h6l.001-2h4c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zm-4.321 9.945-1.996-2.001L17.707 5.92l1.996 2.001-4.706 4.024zm-3.09 3.091 1.996 2.001L6.293 18.08l-1.996-2.001 4.706-4.024z"/></svg>
                    </button>
                    <button
                      onClick={() => handleDeleteTrack(track)}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold p-2 rounded-full shadow-sm transition duration-300 ease-in-out text-sm"
                      title="Eliminar Track"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.17l2.12-2.12 1.41 1.41L13.41 13.5l2.12 2.12-1.41 1.41L12 14.83l-2.12 2.12-1.41-1.41L10.59 13.5l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No hi ha tracks registrats per a aquest programa. Afegiu-ne un!</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Historial de Sessions</h2>
          {sortedSessions.length > 0 ? (
            <ul className="space-y-3">
              {sortedSessions.map((session, index) => (
                <li key={index} className="p-3 bg-gray-50 rounded-lg shadow-sm">
                  <p className="font-medium text-gray-800">Data: {formatDate(session.date)}</p>
                  {session.notes && <p className="text-sm text-gray-600 mt-1">Notes: {session.notes}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No hi ha sessions registrades per a aquest programa.</p>
          )}
        </div>
      </div>

      {/* Add/Edit Track Modal */}
      {showAddTrackModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingTrack ? 'Editar Track' : 'Afegir Nou Track'}</h2>
            <div className="mb-4">
              <label htmlFor="trackName" className="block text-gray-700 text-sm font-bold mb-2">Nom del Track:</label>
              <input
                type="text"
                id="trackName"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newTrackName}
                onChange={(e) => setNewTrackName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="trackType" className="block text-gray-700 text-sm font-bold mb-2">Tipus de Track:</label>
              <input
                type="text"
                id="trackType"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newTrackType}
                onChange={(e) => setNewTrackType(e.target.value)}
                placeholder="Ex: Warm-up, Squats, Cool-down"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="trackNotes" className="block text-gray-700 text-sm font-bold mb-2">Notes:</label>
              <textarea
                id="trackNotes"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newTrackNotes}
                onChange={(e) => setNewTrackNotes(e.target.value)}
                rows="3"
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => { setShowAddTrackModal(false); setEditingTrack(null); }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleAddTrack}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                {editingTrack ? 'Guardar Canvis' : 'Afegir Track'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Session Modal */}
      {showAddSessionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Registrar Nova Sessió per {program.name}</h2>
            <div className="mb-4">
              <label htmlFor="sessionDate" className="block text-gray-700 text-sm font-bold mb-2">Data de la Sessió:</label>
              <input
                type="date"
                id="sessionDate"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newSessionDate}
                onChange={(e) => setNewSessionDate(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="sessionNotes" className="block text-gray-700 text-sm font-bold mb-2">Notes de la Sessió:</label>
              <textarea
                id="sessionNotes"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newSessionNotes}
                onChange={(e) => setNewSessionNotes(e.target.value)}
                rows="3"
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowAddSessionModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleAddSession}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Registrar Sessió
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

export default ProgramDetail;
