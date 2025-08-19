// src/components/schedule/FixedScheduleManagement.jsx

import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { getLocalDateString, normalizeDateToStartOfDay } from '../../utils/dateHelpers.jsx';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx';
import { MessageModal } from '../common/MessageModal.jsx'; // Import MessageModal


const FixedScheduleManagement = ({ fixedSchedules, programs, gyms, db, currentUserId, appId }) => {
  const defaultScheduleEntry = { programId: '', time: '', gymId: '' };
  const initialSchedule = {
    lunes: [defaultScheduleEntry],
    martes: [defaultScheduleEntry],
    miercoles: [defaultScheduleEntry],
    jueves: [defaultScheduleEntry],
    viernes: [defaultScheduleEntry],
    sabado: [defaultScheduleEntry],
    domingo: [defaultScheduleEntry],
  };

  const [isEditing, setIsEditing] = useState(false);
  const [currentFixedSchedule, setCurrentFixedSchedule] = useState({
    id: null,
    startDate: '',
    ...initialSchedule,
  });

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });


  const handleInputChange = (day, index, field, value) => {
    const updatedDay = [...currentFixedSchedule[day]];
    updatedDay[index] = { ...updatedDay[index], [field]: value };
    setCurrentFixedSchedule({ ...currentFixedSchedule, [day]: updatedDay });
  };

  const addSession = (day) => {
    setCurrentFixedSchedule({
      ...currentFixedSchedule,
      [day]: [...currentFixedSchedule[day], defaultScheduleEntry],
    });
  };

  const removeSession = (day, index) => {
    const updatedDay = currentFixedSchedule[day].filter((_, i) => i !== index);
    setCurrentFixedSchedule({ ...currentFixedSchedule, [day]: updatedDay });
  };

  const handleEdit = (schedule) => {
    setIsEditing(true);
    setCurrentFixedSchedule({
      id: schedule.id,
      startDate: schedule.startDate,
      lunes: schedule.lunes || [],
      martes: schedule.martes || [],
      miercoles: schedule.miercoles || [],
      jueves: schedule.jueves || [],
      viernes: schedule.viernes || [],
      sabado: schedule.sabado || [],
      domingo: schedule.domingo || [],
    });
  };

  const handleCopy = (schedule) => {
    setIsEditing(true); // Treat copy as starting a new edit operation
    const today = getLocalDateString(new Date()); // Default to today or a clear indicator
    setCurrentFixedSchedule({
      id: null, // New ID for new document
      startDate: today, // Provide a default new date for copying
      lunes: schedule.lunes || [],
      martes: schedule.martes || [],
      miercoles: schedule.miercoles || [],
      jueves: schedule.jueves || [],
      viernes: schedule.viernes || [],
      sabado: schedule.sabado || [],
      domingo: schedule.domingo || [],
    });
    setMessageModalContent({
      title: 'Horari Copiat',
      message: 'Les sessions de l\'horari han estat copiades. Edita la data d\'inici i les sessions per crear un nou horari.',
      isConfirm: false,
      onConfirm: () => setShowMessageModal(false),
    });
    setShowMessageModal(true);
  };

  const handleSave = async () => {
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

    if (!currentFixedSchedule.startDate) {
      setMessageModalContent({
        title: 'Error de Validació',
        message: 'La data d\'inici de validesa és obligatòria.',
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
      return;
    }

    // Validate sessions to ensure programId, time, and gymId are not empty for existing entries
    const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    for (const day of days) {
      for (const session of currentFixedSchedule[day]) {
        if (session.programId || session.time || session.gymId) { // Only validate if at least one field is filled, implies user intended to add a session
          if (!session.programId || !session.time || !session.gymId) {
            setMessageModalContent({
              title: 'Error de Validació',
              message: `Si us plau, assegura't que totes les sessions per al dia ${day} tenen un programa, hora i gimnàs seleccionats, o esborra les sessions incompletes.`,
              isConfirm: false,
              onConfirm: () => setShowMessageModal(false),
            });
            setShowMessageModal(true);
            return;
          }
        }
      }
    }


    const scheduleData = {
      startDate: currentFixedSchedule.startDate,
      lunes: currentFixedSchedule.lunes.filter(s => s.programId && s.time && s.gymId),
      martes: currentFixedSchedule.martes.filter(s => s.programId && s.time && s.gymId),
      miercoles: currentFixedSchedule.miercoles.filter(s => s.programId && s.time && s.gymId),
      jueves: currentFixedSchedule.jueves.filter(s => s.programId && s.time && s.gymId),
      viernes: currentFixedSchedule.viernes.filter(s => s.programId && s.time && s.gymId),
      sabado: currentFixedSchedule.sabado.filter(s => s.programId && s.time && s.gymId),
      domingo: currentFixedSchedule.domingo.filter(s => s.programId && s.time && s.gymId),
    };

    const fixedSchedulesCollectionPath = getUserCollectionPath(appId, currentUserId, 'fixedSchedules');
    if (!fixedSchedulesCollectionPath) return;

    try {
      if (isEditing && currentFixedSchedule.id) {
        await updateDoc(doc(db, fixedSchedulesCollectionPath, currentFixedSchedule.id), scheduleData);
        setMessageModalContent({
          title: 'Horari Actualitzat',
          message: 'Horari fix actualitzat correctament!',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
      } else {
        await addDoc(collection(db, fixedSchedulesCollectionPath), scheduleData);
        setMessageModalContent({
          title: 'Horari Creat',
          message: 'Horari fix creat correctament!',
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
      }
      setShowMessageModal(true);
      resetForm();
    } catch (error) {
      console.error("Error saving fixed schedule:", error);
      setMessageModalContent({
        title: 'Error',
        message: `Hi ha hagut un error al guardar l'horari fix: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
    }
  };

  const handleDelete = async (id) => {
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
      message: 'Estàs segur que vols eliminar aquest horari fix? Aquesta acció no es pot desfer.',
      isConfirm: true,
      onConfirm: async () => {
        try {
          const fixedSchedulesCollectionPath = getUserCollectionPath(appId, currentUserId, 'fixedSchedules');
          if (!fixedSchedulesCollectionPath) return;

          await deleteDoc(doc(db, fixedSchedulesCollectionPath, id));
          setMessageModalContent({
            title: 'Horari Eliminat',
            message: 'Horari fix eliminat correctament!',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
          resetForm();
        } catch (error) {
          console.error("Error deleting fixed schedule:", error);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar l'horari fix: ${error.message}`,
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

  const resetForm = () => {
    setIsEditing(false);
    setCurrentFixedSchedule({
      id: null,
      startDate: '',
      ...initialSchedule,
    });
  };

  const daysOfWeek = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const dayNamesCatalan = {
    lunes: 'Dilluns',
    martes: 'Dimarts',
    miercoles: 'Dimecres',
    jueves: 'Dijous',
    viernes: 'Divendres',
    sabado: 'Dissabte',
    domingo: 'Diumenge',
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{isEditing ? 'Editar Horari Fix' : 'Afegir Nou Horari Fix'}</h2>

        <div className="mb-4">
          <label htmlFor="startDate" className="block text-gray-700 text-sm font-bold mb-2">Data d'Inici de Validesa:</label>
          <input
            type="date"
            id="startDate"
            value={currentFixedSchedule.startDate}
            onChange={(e) => setCurrentFixedSchedule({ ...currentFixedSchedule, startDate: e.target.value })}
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:shadow-outline bg-white"
          />
        </div>

        {daysOfWeek.map(day => (
          <div key={day} className="mb-6 border-b pb-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-3 capitalize">{dayNamesCatalan[day]}</h3>
            {currentFixedSchedule[day].map((session, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2 mb-2 p-2 bg-gray-50 rounded-lg shadow-sm">
                <select
                  value={session.programId}
                  onChange={(e) => handleInputChange(day, index, 'programId', e.target.value)}
                  className="shadow border rounded-lg py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:shadow-outline flex-grow bg-white"
                >
                  <option value="">Selecciona un programa</option>
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>{program.name}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={session.time}
                  onChange={(e) => handleInputChange(day, index, 'time', e.target.value)}
                  className="shadow appearance-none border rounded-lg py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:shadow-outline w-auto bg-white"
                />
                <select
                  value={session.gymId}
                  onChange={(e) => handleInputChange(day, index, 'gymId', e.target.value)}
                  className="shadow border rounded-lg py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:shadow-outline flex-grow bg-white"
                >
                  <option value="">Selecciona un gimnàs</option>
                  {gyms.map(gym => (
                    <option key={gym.id} value={gym.id}>{gym.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeSession(day, index)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg shadow-md transition duration-300 ease-in-out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            ))}
            <button
              onClick={() => addSession(day)}
              className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
            >
              Afegir Sessió
            </button>
          </div>
        ))}

        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={handleSave}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            {isEditing ? 'Guardar Canvis' : 'Afegir Horari'}
          </button>
          <button
            onClick={resetForm}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Cancel·lar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Horaris Fixos Existents</h2>
        {fixedSchedules.length === 0 ? (
          <p className="text-gray-600">No hi ha horaris fixos. Afegeix-ne un per començar!</p>
        ) : (
          <ul className="space-y-4">
            {fixedSchedules.map(schedule => (
              <li key={schedule.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg shadow-sm">
                <span className="font-semibold text-gray-700">
                  Data d'inici: {getLocalDateString(new Date(schedule.startDate))}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(schedule)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg shadow-md transition duration-300 ease-in-out"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleCopy(schedule)}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-lg shadow-md transition duration-300 ease-in-out"
                  >
                    Copiar
                  </button>
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg shadow-md transition duration-300 ease-in-out"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
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

export default FixedScheduleManagement;
