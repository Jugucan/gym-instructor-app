import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { getUserCollectionPath, getAppCollectionPath } from '../utils/firebasePaths.jsx'; // Changed .js to .jsx

const useFirestoreData = (db, currentUserId, appId, isFirebaseReady, setLoadingMessage, setShowMessageModal, setMessageModalContent) => {
  const [programs, setPrograms] = useState([]);
  const [users, setUsers] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [fixedSchedules, setFixedSchedules] = useState([]);
  const [recurringSessions, setRecurringSessions] = useState([]);
  const [scheduleOverrides, setScheduleOverrides] = useState([]);
  const [missedDays, setMissedDays] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Default initial data for quick setup if Firestore is empty
  const initialData = {
    programs: [
      { id: 'bodypump', name: 'BodyPump', shortName: 'BP', color: '#FF6347', releaseDate: '2024-01-01', tracks: [], sessions: [] },
      { id: 'bodycombat', name: 'BodyCombat', shortName: 'BC', color: '#4682B4', releaseDate: '2024-01-01', tracks: [], sessions: [] },
      { id: 'shbam', name: 'Sh\'Bam', shortName: 'SB', color: '#DA70D6', releaseDate: '2024-01-01', tracks: [], sessions: [] },
    ],
    users: [], // Users will be added by the user
    gyms: [
      { id: 'sant_hilari', name: 'Sant Hilari', workDays: ['Dilluns', 'Dimecres', 'Divendres'], totalVacationDays: 9, holidaysTaken: [] },
      { id: 'arbucies', name: 'Arbúcies', workDays: ['Dimarts', 'Dijous'], totalVacationDays: 13, holidaysTaken: [] },
    ],
    fixedSchedules: [],
    recurringSessions: [],
    scheduleOverrides: [],
    missedDays: [],
  };

  useEffect(() => {
    if (!db || !currentUserId || !isFirebaseReady) {
      setDataLoaded(false); // Data not ready if Firebase isn't ready or user isn't authenticated
      return;
    }

    setLoadingMessage('Carregant dades...');
    setDataLoaded(false);

    const unsubscribeFunctions = [];

    // Function to check if a collection exists and populate with initial data if empty
    const checkAndPopulateCollection = async (collectionName, setData, initialArray) => {
      const path = getUserCollectionPath(appId, currentUserId, collectionName);
      if (!path) return;

      const q = query(collection(db, path));
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        if (snapshot.empty && initialArray.length > 0) {
          setLoadingMessage(`Inicialitzant ${collectionName}...`);
          for (const item of initialArray) {
            const docRef = item.id ? doc(db, path, item.id) : null;
            if (docRef) {
              await setDoc(docRef, item);
            } else {
              // Add doc with auto-generated ID if no ID is specified (e.g., for users)
              await addDoc(collection(db, path), item);
            }
          }
        } else {
          setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        // Only set dataLoaded to true after ALL initial fetches are attempted
        // (This might require a more sophisticated loading state management for multiple collections)
      }, (error) => {
        console.error(`Error fetching ${collectionName}:`, error);
        setMessageModalContent({
          title: 'Error de Dades',
          message: `No s'han pogut carregar les dades de ${collectionName}. Potser hi ha un problema de permisos. Detalls: ${error.message}`,
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
        setShowMessageModal(true);
      });
      unsubscribeFunctions.push(unsubscribe);
    };

    // Programs
    checkAndPopulateCollection('programs', setPrograms, initialData.programs);

    // Users (no initial data, user will add)
    const usersPath = getUserCollectionPath(appId, currentUserId, 'users');
    if (usersPath) {
      const unsubscribeUsers = onSnapshot(collection(db, usersPath), (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Error fetching users:", error);
      });
      unsubscribeFunctions.push(unsubscribeUsers);
    }

    // Gyms
    checkAndPopulateCollection('gyms', setGyms, initialData.gyms);

    // Fixed Schedules
    const fixedSchedulesPath = getUserCollectionPath(appId, currentUserId, 'fixedSchedules');
    if (fixedSchedulesPath) {
      const unsubscribeFixedSchedules = onSnapshot(collection(db, fixedSchedulesPath), (snapshot) => {
        setFixedSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Error fetching fixed schedules:", error);
      });
      unsubscribeFunctions.push(unsubscribeFixedSchedules);
    }

    // Recurring Sessions
    const recurringSessionsPath = getUserCollectionPath(appId, currentUserId, 'recurringSessions');
    if (recurringSessionsPath) {
      const unsubscribeRecurringSessions = onSnapshot(collection(db, recurringSessionsPath), (snapshot) => {
        setRecurringSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Error fetching recurring sessions:", error);
      });
      unsubscribeFunctions.push(unsubscribeRecurringSessions);
    }

    // Schedule Overrides
    const scheduleOverridesPath = getUserCollectionPath(appId, currentUserId, 'scheduleOverrides');
    if (scheduleOverridesPath) {
      const unsubscribeScheduleOverrides = onSnapshot(collection(db, scheduleOverridesPath), (snapshot) => {
        setScheduleOverrides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Error fetching schedule overrides:", error);
      });
      unsubscribeFunctions.push(unsubscribeScheduleOverrides);
    }

    // Missed Days
    const missedDaysPath = getUserCollectionPath(appId, currentUserId, 'missedDays');
    if (missedDaysPath) {
      const unsubscribeMissedDays = onSnapshot(collection(db, missedDaysPath), (snapshot) => {
        setMissedDays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Error fetching missed days:", error);
      });
      unsubscribeFunctions.push(unsubscribeMissedDays);
    }

    // Set dataLoaded to true after all initial snapshot listeners are set up
    // In a real app, you might want to wait until all initial data is actually loaded.
    // For simplicity, we assume listeners will populate states soon after.
    setDataLoaded(true);


    return () => unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
  }, [db, currentUserId, appId, isFirebaseReady]); // Dependencies

  return { programs, users, gyms, fixedSchedules, recurringSessions, scheduleOverrides, missedDays, setMissedDays, dataLoaded };
};

export default useFirestoreData;
