import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { getUserCollectionPath } from '../utils/firebasePaths.jsx';
import { MessageModal } from './common/MessageModal.jsx';
import { formatDate } from '../utils/dateHelpers.jsx';

const Dashboard = ({ db, currentUserId, appId }) => {
  const [gyms, setGyms] = useState([]);
  const [gymClosures, setGymClosures] = useState([]);
  const [daysOff, setDaysOff] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ title: '', message: '', isConfirm: false, onConfirm: () => {}, onCancel: () => {} });

  const isDataAvailable = db && currentUserId && appId;

  useEffect(() => {
    if (!isDataAvailable) return;

    const gymsPath = getUserCollectionPath(appId, currentUserId, 'gyms');
    const closuresPath = getUserCollectionPath(appId, currentUserId, 'gymClosures');
    const daysOffPath = getUserCollectionPath(appId, currentUserId, 'daysOff');

    if (!gymsPath || !closuresPath || !daysOffPath) return;

    const unsubGyms = onSnapshot(collection(db, gymsPath), (snapshot) => {
      const fetchedGyms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGyms(fetchedGyms);
    });

    const unsubClosures = onSnapshot(collection(db, closuresPath), (snapshot) => {
      const fetchedClosures = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGymClosures(fetchedClosures);
    });

    const unsubDaysOff = onSnapshot(collection(db, daysOffPath), (snapshot) => {
      const fetchedDaysOff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDaysOff(fetchedDaysOff);
    });

    return () => {
      unsubGyms();
      unsubClosures();
      unsubDaysOff();
    };
  }, [db, currentUserId, appId, isDataAvailable]);

  // NOU: Funció per eliminar un dia no assistit
  const handleDeleteDayOff = (docId) => {
    if (!isDataAvailable) {
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
      message: 'Estàs segur que vols eliminar aquest dia no assistit?',
      isConfirm: true,
      onConfirm: async () => {
        const daysOffPath = getUserCollectionPath(appId, currentUserId, 'daysOff');
        if (!daysOffPath) return;
        try {
          await deleteDoc(doc(db, daysOffPath, docId));
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Eliminat',
            message: 'Dia no assistit eliminat correctament.',
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        } catch (error) {
          console.error("Error deleting day off:", error);
          setShowMessageModal(true);
          setMessageModalContent({
            title: 'Error',
            message: `Hi ha hagut un error al eliminar el dia no assistit: ${error.message}`,
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
        }
      },
      onCancel: () => setShowMessageModal(false),
    });
    setShowMessageModal(true);
  };

  const getDayOffDetails = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayOff = daysOff.find(dayOff => dayOff.date === dateStr);
    return dayOff;
  };

  const getTileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = date.toISOString().split('T')[0];
      const isDayOff = daysOff.some(dayOff => dayOff.date === dateStr);
      const isGymClosure = gymClosures.some(closure => closure.date === dateStr);

      if (isDayOff) return 'bg-red-200';
      if (isGymClosure) return 'bg-blue-200';
    }
    return null;
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = date.toISOString().split('T')[0];
      const isDayOff = daysOff.some(dayOff => dayOff.date === dateStr);
      const isGymClosure = gymClosures.some(closure => closure.date === dateStr);
      const today = new Date().toISOString().split('T')[0];
      const isToday = dateStr === today;

      const classes = [];
      if (isDayOff) classes.push('bg-red-500');
      if (isGymClosure) classes.push('bg-blue-500');
      if (isToday) classes.push('border-2 border-green-500');

      if (classes.length > 0) {
        return (
          <div className="flex justify-center items-center mt-1">
            <span className={`w-2 h-2 rounded-full ${classes.join(' ')}`}></span>
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Vista del Calendari</h1>

      {/* Calendari */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <Calendar
          onChange={setCalendarDate}
          value={calendarDate}
          locale="ca-ES"
          className="react-calendar-responsive"
          tileClassName={getTileClassName}
          tileContent={tileContent}
        />
      </div>

      {/* Seccions de llistes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Horaris Fixos */}
        {/* Aquests no els gestionem en aquest component, però la lògica ja era correcta */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Horaris Fixos Actius</h2>
          <p className="text-sm text-gray-500 italic">No hi ha dades disponibles en aquest component.</p>
        </div>

        {/* Sessions Recurrents Actives */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Sessions Recurrents Actives</h2>
          <p className="text-sm text-gray-500 italic">No hi ha dades disponibles en aquest component.</p>
        </div>
        
        {/* Substitucions Programades */}
        {/* Aquest no el gestionem en aquest component, però la lògica ja era correcta */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Substitucions Programades (Overrides)</h2>
          <p className="text-sm text-gray-500 italic">No hi ha dades disponibles en aquest component.</p>
        </div>
      </div>
      
      {/* Llistes de Vacances i Tancaments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Vacances dels Gimnasos (Personals) */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Vacances Personals dels Gimnasos</h2>
          {gyms.length > 0 ? (
            <ul className="list-disc list-inside text-gray-600">
              {gyms.map(gym => (
                <li key={gym.id} className="mb-2">
                  <span className="font-semibold">{gym.name}:</span> {gym.holidaysTaken.length} dies
                  <ul className="list-disc list-inside ml-4 text-sm">
                    {/* APLICO LA FUNCIÓ formatDate AQUÍ */}
                    {gym.holidaysTaken.sort().map(date => (
                      <li key={date}>{formatDate(date)}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No hi ha vacances personals definides.</p>
          )}
        </div>

        {/* Tancaments Generals (Festius) */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Tancaments Generals (Festius)</h2>
          {gymClosures.length > 0 ? (
            <ul className="list-disc list-inside text-gray-600">
              {gymClosures.sort((a,b) => new Date(a.date) - new Date(b.date)).map(closure => (
                <li key={closure.id} className="mb-2">
                  {/* APLICO LA FUNCIÓ formatDate AQUÍ */}
                  {formatDate(closure.date)}
                  {closure.notes && <span className="text-sm italic ml-2">- {closure.notes}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No hi ha tancaments generals definits.</p>
          )}
        </div>

        {/* NOU: Secció de Dies No Assistits amb botó d'eliminar i dates formatades */}
        <div className="bg-white p-6 rounded-lg shadow-md col-span-1 md:col-span-2">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Dies No Assistits</h2>
          {daysOff.length > 0 ? (
            <ul className="list-disc list-inside text-gray-600">
              {daysOff.sort((a,b) => new Date(a.date) - new Date(b.date)).map(dayOff => (
                <li key={dayOff.id} className="mb-2 flex justify-between items-center">
                  <div>
                    {/* APLICO LA FUNCIÓ formatDate AQUÍ */}
                    <span className="font-semibold">{formatDate(dayOff.date) || '****'}</span>, {dayOff.gymName}
                  </div>
                  {/* BOTÓ D'ELIMINAR */}
                  <button
                    onClick={() => handleDeleteDayOff(dayOff.id)}
                    className="ml-4 text-red-500 hover:text-red-700"
                    title="Eliminar dia no assistit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.17l2.12-2.12 1.41 1.41L13.41 13.5l2.12 2.12-1.41 1.41L12 14.83l-2.12 2.12-1.41-1.41L10.59 13.5l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No hi ha dies no assistits definits.</p>
          )}
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

export default Dashboard;
