import React, { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx'; // Confirmat: .jsx
import { formatDate } from '../../utils/dateHelpers.jsx'; // Confirmat: .jsx
import { MessageModal } from '../common/MessageModal.jsx'; // Confirmat: .jsx

const Programs = ({ programs, setCurrentPage, setSelectedProgramId, db, currentUserId, appId }) => {
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const [newProgramShortName, setNewProgramShortName] = useState('');
  const [newProgramColor, setNewProgramColor] = useState('#000000'); // Default color
  const [newProgramReleaseDate, setNewProgramReleaseDate] = useState('');
  const [editingProgram, setEditingProgram] = useState(null); // State for program being edited

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });


  const handleAddProgram = async () => {
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

    if (!newProgramName || !newProgramShortName || !newProgramReleaseDate) {
      setMessageModalContent({
        title: 'Camps Obligatoris',
        message: 'Si us plau, omple tots els camps obligatoris.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }

    const programsPath = getUserCollectionPath(appId, currentUserId, 'programs');
    if (!programsPath) return;

    try {
      const newProgramData = {
        name: newProgramName,
        shortName: newProgramShortName,
        color: newProgramColor,
        releaseDate: newProgramReleaseDate,
        tracks: [], // Initialize with empty tracks
        sessions: [], // Initialize with empty sessions
      };

      if (editingProgram) {
        // Update existing program
        const programRef = doc(db, programsPath, editingProgram.id);
        await updateDoc(programRef, newProgramData);
        setMessageModalContent({
          title: 'Programa Actualitzat',
          message: 'El programa s\'ha actualitzat correctament.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
      } else {
        // Add new program
        await addDoc(collection(db, programsPath), newProgramData);
        setMessageModalContent({
          title: 'Programa Afegit',
          message: 'El nou programa s\'ha afegit correctament.',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
      }
      setShowMessageModal(true);
      setShowAddProgramModal(false);
      setNewProgramName('');
      setNewProgramShortName('');
      setNewProgramColor('#000000');
      setNewProgramReleaseDate('');
      setEditingProgram(null);
    } catch (error) {
      console.error("Error adding/updating program:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar el programa: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleDeleteProgram = async (programId) => {
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
      message: 'Estàs segur que vols eliminar aquest programa? Aquesta acció és irreversible.',
      isConfirm: true,
      onConfirm: async () => {
        const programsPath = getUserCollectionPath(appId, currentUserId, 'programs');
        if (!programsPath) return;
        try {
          await deleteDoc(doc(db, programsPath, programId));
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Programa Eliminat',
            message: 'El programa s\'ha eliminat correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        } catch (error) {
          console.error("Error deleting program:", error);
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar el programa: ${error.message}`,
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        }
      },
      onCancel: () => setShowMessageModal(false),
    });
    setShowMessageModal(true);
  };

  const handleEditProgram = (program) => {
    setEditingProgram(program);
    setNewProgramName(program.name);
    setNewProgramShortName(program.shortName);
    setNewProgramColor(program.color);
    setNewProgramReleaseDate(program.releaseDate || '');
    setShowAddProgramModal(true);
  };

  const handleProgramClick = (programId) => {
    setSelectedProgramId(programId);
    setCurrentPage('programDetail');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestió de Programes</h1>

      <button
        onClick={() => { setShowAddProgramModal(true); setEditingProgram(null); setNewProgramName(''); setNewProgramShortName(''); setNewProgramColor('#000000'); setNewProgramReleaseDate(''); }}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-6"
      >
        Afegir Nou Programa
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map(program => (
          <div
            key={program.id}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between"
            style={{ borderLeft: `8px solid ${program.color}` }}
          >
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{program.name} ({program.shortName})</h2>
              {program.releaseDate && (
                <p className="text-sm text-gray-600 mb-1">
                  Data de Llançament: {formatDate(program.releaseDate)}
                </p>
              )}
              {program.sessions && program.sessions.length > 0 && (
                <p className="text-sm text-gray-600 mb-1">
                  Última sessió: {formatDate(program.sessions[program.sessions.length - 1]?.date)}
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => handleProgramClick(program.id)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
              >
                Veure Detalls
              </button>
              <button
                onClick={() => handleEditProgram(program)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
              >
                Editar
              </button>
              <button
                onClick={() => handleDeleteProgram(program.id)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg shadow-md transition duration-300 ease-in-out text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddProgramModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingProgram ? 'Editar Programa' : 'Afegir Nou Programa'}</h2>
            <div className="mb-4">
              <label htmlFor="programName" className="block text-gray-700 text-sm font-bold mb-2">Nom del Programa:</label>
              <input
                type="text"
                id="programName"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="programShortName" className="block text-gray-700 text-sm font-bold mb-2">Nom Curt (p. ex., BP, BC):</label>
              <input
                type="text"
                id="programShortName"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newProgramShortName}
                onChange={(e) => setNewProgramShortName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="programColor" className="block text-gray-700 text-sm font-bold mb-2">Color Associat:</label>
              <input
                type="color"
                id="programColor"
                className="w-full h-10 rounded-lg"
                value={newProgramColor}
                onChange={(e) => setNewProgramColor(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="programReleaseDate" className="block text-gray-700 text-sm font-bold mb-2">Data de Llançament:</label>
              <input
                type="date"
                id="programReleaseDate"
                className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newProgramReleaseDate}
                onChange={(e) => setNewProgramReleaseDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowAddProgramModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleAddProgram}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                {editingProgram ? 'Guardar Canvis' : 'Afegir Programa'}
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
