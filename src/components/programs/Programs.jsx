import React, { useState } from 'react';
import { collection, doc, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore'; // Added addDoc
import { formatDate } from '../../utils/dateHelpers.js';
import { getUserCollectionPath } from '../../utils/firebasePaths.js';
import { MessageModal } from '../common/MessageModal.jsx';

const Programs = ({ programs, setCurrentPage, setSelectedProgramId, db, currentUserId, appId }) => {
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [programName, setProgramName] = useState('');
  const [programShortName, setProgramShortName] = useState('');
  const [programColor, setProgramColor] = useState('#60A5FA');
  const [programReleaseDate, setProgramReleaseDate] = useState('');
  const [tracks, setTracks] = useState([]); // {id, name, type, isFavorite, notes}

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const handleAddProgram = () => {
    setEditingProgram(null);
    setProgramName('');
    setProgramShortName('');
    setProgramColor('#60A5FA');
    setProgramReleaseDate('');
    setTracks([
      { id: 'track_warmup', name: 'Warm-up', type: 'Warm-up', isFavorite: false, notes: '' },
      { id: 'track_cooldown', name: 'Cool-down', type: 'Cool-down', isFavorite: false, notes: '' },
    ]);
    setShowProgramModal(true);
  };

  const handleEditProgram = (program) => {
    setEditingProgram(program);
    setProgramName(program.name);
    setProgramShortName(program.shortName);
    setProgramColor(program.color);
    setProgramReleaseDate(program.releaseDate);
    setTracks(program.tracks);
    setShowProgramModal(true);
  };

  const handleSaveProgram = async () => {
    if (!programName || !programShortName || !programReleaseDate) {
      setMessageModalContent({
        title: 'Error de Validació',
        message: 'El nom del programa, el nom curt i la data de llançament són obligatoris.',
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

    const newProgramData = {
      name: programName,
      shortName: programShortName,
      color: programColor,
      releaseDate: programReleaseDate,
      tracks: tracks.map(({ id, ...rest }) => ({ id: id || `track_${Date.now()}_${Math.random()}`, ...rest })), // Ensure tracks have IDs
      sessions: editingProgram ? editingProgram.sessions : [], // Preserve existing sessions if editing
    };

    try {
      const programsCollectionPath = getUserCollectionPath(appId, currentUserId, 'programs');
      if (!programsCollectionPath) return;

      if (editingProgram) {
        const programRef = doc(db, programsCollectionPath, editingProgram.id);
        await updateDoc(programRef, newProgramData);
      } else {
        // Generate a new ID for a new program, or use a predefined one if available
        const newProgramId = newProgramData.shortName.toLowerCase().replace(/\s/g, ''); // Simple ID generation
        await setDoc(doc(db, programsCollectionPath, newProgramId), newProgramData);
      }
      setShowProgramModal(false);
    } catch (error) {
      console.error("Error saving program:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar el programa: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleDeleteProgram = (programId) => {
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
      message: 'Estàs segur que vols eliminar aquest programa? Totes les seves sessions i tracks associats es perdran.',
      isConfirm: true,
      onConfirm: async () => {
        try {
          const programsCollectionPath = getUserCollectionPath(appId, currentUserId, 'programs');
          if (!programsCollectionPath) return;

          await deleteDoc(doc(db, programsCollectionPath, programId));
          setShowMessageModal(false);
          setMessageModalContent({
            title: 'Eliminat',
            message: 'Programa eliminat correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
        } catch (error) {
          console.error("Error deleting program:", error);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar el programa: ${error.message}`,
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

  const handleAddTrack = () => {
    setTracks(prev => [...prev, { id: `new_track_${Date.now()}_${Math.random()}`, name: '', type: '', isFavorite: false, notes: '' }]);
  };

  const handleUpdateTrack = (id, field, value) => {
    setTracks(prev =>
      prev.map(track =>
        track.id === id ? { ...track, [field]: value } : track
      )
    );
  };

  const handleDeleteTrack = (id) => {
    setTracks(prev => prev.filter(track => track.id !== id));
  };


  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió de Programes</h1>
      <button
        onClick={handleAddProgram}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-6"
      >
        Afegir Nou Programa
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.length > 0 ? programs.map(program => (
          <div
            key={program.id}
            className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-between hover:shadow-lg transition duration-300 ease-in-out"
            style={{ borderLeft: `8px solid ${program.color}` }}
          >
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{program.name} ({program.shortName})</h2>
              <p className="text-gray-600 text-sm">Llançament: {formatDate(program.releaseDate)}</p>
              <p className="text-gray-600 text-sm">Tracks: {program.tracks.length}</p>
              <p className="text-gray-600 text-sm">Sessions: {program.sessions ? program.sessions.length : 0}</p>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setSelectedProgramId(program.id);
                  setCurrentPage('programDetail');
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 text-sm rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Veure Detalls
              </button>
              <button
                onClick={() => handleEditProgram(program)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 text-sm rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Editar
              </button>
              <button
                onClick={() => handleDeleteProgram(program.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 text-sm rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Eliminar
              </button>
            </div>
          </div>
        )) : <p className="text-gray-500">No hi ha programes definits. Afegeix el primer!</p>}
      </div>

      {showProgramModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingProgram ? 'Editar Programa' : 'Afegir Nou Programa'}</h2>
            <div className="mb-4">
              <label htmlFor="programName" className="block text-gray-700 text-sm font-bold mb-2">Nom del Programa:</label>
              <input
                type="text"
                id="programName"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="programShortName" className="block text-gray-700 text-sm font-bold mb-2">Nom Curt (ex: BP, BC):</label>
              <input
                type="text"
                id="programShortName"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={programShortName}
                onChange={(e) => setProgramShortName(e.target.value)}
                maxLength="4"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="programColor" className="block text-gray-700 text-sm font-bold mb-2">Color:</label>
              <input
                type="color"
                id="programColor"
                className="shadow border rounded-lg w-full h-10 px-1 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={programColor}
                onChange={(e) => setProgramColor(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="programReleaseDate" className="block text-gray-700 text-sm font-bold mb-2">Data de Llançament:</label>
              <input
                type="date"
                id="programReleaseDate"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={programReleaseDate}
                onChange={(e) => setProgramReleaseDate(e.target.value)}
              />
            </div>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">Tracks</h3>
            <div className="space-y-3 mb-4 max-h-40 overflow-y-auto pr-2">
              {tracks.map((track, index) => (
                <div key={track.id} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg">
                  <input
                    type="text"
                    placeholder="Nom del Track"
                    className="shadow border rounded-lg py-1 px-2 text-gray-700 text-sm w-1/3"
                    value={track.name}
                    onChange={(e) => handleUpdateTrack(track.id, 'name', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Tipus (ex: Squats, Combat)"
                    className="shadow border rounded-lg py-1 px-2 text-gray-700 text-sm w-1/3"
                    value={track.type}
                    onChange={(e) => handleUpdateTrack(track.id, 'type', e.target.value)}
                  />
                  <label className="flex items-center space-x-1 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={track.isFavorite}
                      onChange={(e) => handleUpdateTrack(track.id, 'isFavorite', e.target.checked)}
                    />
                    <span>Favorit</span>
                  </label>
                  <button
                    onClick={() => handleDeleteTrack(track.id)}
                    className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd"></path></svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleAddTrack}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded-lg shadow-sm transition duration-300 ease-in-out text-sm mb-4"
            >
              + Afegir Track
            </button>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowProgramModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleSaveProgram}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Guardar Programa
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

export default Programs;