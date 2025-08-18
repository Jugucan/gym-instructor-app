import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { getUserCollectionPath, getAppCollectionPath } from '../utils/firebasePaths.jsx';

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
    users: [],
    gyms: [
      { id: 'sant_hilari', name: 'Sant Hilari', workDays: ['Dilluns', 'Dimecres', 'Divendres'], totalVacationDays: 9, holidaysTaken: [] },
      { id: 'arbucies', name: 'Arbúcies', workDays: ['Dimarts', 'Dijous'], totalVacationDays: 13, holidaysTaken: [] },
    ],
    fixedSchedules: [],
    recurringSessions: [],
    scheduleOverrides: [],
    missedDays: [],
  };

  // Helper function to populate empty collections with initial data
  const populateInitialData = async (collectionPath, initialArray) => {
    try {
      for (const item of initialArray) {
        const docRef = item.id ? doc(db, collectionPath, item.id) : null;
        if (docRef) {
          await setDoc(docRef, item);
        } else {
          await addDoc(collection(db, collectionPath), item);
        }
      }
    } catch (error) {
      console.error("Error populating initial data:", error);
    }
  };

  useEffect(() => {
    if (!db || !currentUserId || !isFirebaseReady) {
      setDataLoaded(false);
      return;
    }

    setLoadingMessage('Carregant dades...');
    setDataLoaded(false);

    const unsubscribeFunctions = [];
    let collectionsLoaded = 0;
    const totalCollections = 7; // programs, users, gyms, fixedSchedules, recurringSessions, scheduleOverrides, missedDays

    const markCollectionLoaded = () => {
      collectionsLoaded++;
      if (collectionsLoaded === totalCollections) {
        setDataLoaded(true);
        setLoadingMessage('');
      }
    };

    // Function to set up collection listener with optional initial data population
    const setupCollectionListener = (collectionName, setData, initialArray = []) => {
      const path = getUserCollectionPath(appId, currentUserId, collectionName);
      if (!path) {
        markCollectionLoaded();
        return;
      }

      const q = query(collection(db, path));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        // First check if collection is empty and needs initialization
        if (snapshot.empty && initialArray.length > 0) {
          setLoadingMessage(`Inicialitzant ${collectionName}...`);
          // Populate initial data asynchronously but don't await in the callback
          populateInitialData(path, initialArray).then(() => {
            // Data will be picked up by the next onSnapshot call
            markCollectionLoaded();
          });
        } else {
          // Set the data from the snapshot
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setData(data);
          markCollectionLoaded();
        }
      }, (error) => {
        console.error(`Error fetching ${collectionName}:`, error);
        setMessageModalContent({
          title: 'Error de Dades',
          message: `No s'han pogut carregar les dades de ${collectionName}. Potser hi ha un problema de permisos. Detalls: ${error.message}`,
          isConfirm: false,
          onConfirm: () => setShowMessageModal(false),
        });
        setShowMessageModal(true);
        markCollectionLoaded(); // Mark as loaded even on error to prevent hanging
      });
      
      unsubscribeFunctions.push(unsubscribe);
    };

    // Set up all collection listeners
    setupCollectionListener('programs', setPrograms, initialData.programs);
    setupCollectionListener('users', setUsers, initialData.users);
    setupCollectionListener('gyms', setGyms, initialData.gyms);
    setupCollectionListener('fixedSchedules', setFixedSchedules, initialData.fixedSchedules);
    setupCollectionListener('recurringSessions', setRecurringSessions, initialData.recurringSessions);
    setupCollectionListener('scheduleOverrides', setScheduleOverrides, initialData.scheduleOverrides);
    setupCollectionListener('missedDays', setMissedDays, initialData.missedDays);

    // Cleanup function
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [db, currentUserId, appId, isFirebaseReady]);

  return { 
    programs, 
    users, 
    gyms, 
    fixedSchedules, 
    recurringSessions, 
    scheduleOverrides, 
    missedDays, 
    setMissedDays, 
    dataLoaded 
  };
};

export default useFirestoreData;
