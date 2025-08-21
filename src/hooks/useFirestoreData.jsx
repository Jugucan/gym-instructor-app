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
  // FULL INITIAL DATA AS PER OPTIMIZED_APP_PROMPT
  const initialData = {
    programs: [
      { 
        id: 'bodypump', 
        name: 'BodyPump 120', 
        shortName: 'BP', 
        color: '#EF4444', 
        releaseDate: '2024-09-01', 
        tracks: [
          { id: 'bp_wu', name: 'Warm-up', type: 'Warm-up', isFavorite: false, notes: '' },
          { id: 'bp_squats', name: 'Squats', type: 'Squats', isFavorite: true, notes: 'Good for building strength.' },
          { id: 'bp_chest', name: 'Chest', type: 'Chest', isFavorite: false, notes: '' },
          { id: 'bp_back', name: 'Back', type: 'Back', isFavorite: false, notes: '' },
          { id: 'bp_triceps', name: 'Triceps', type: 'Triceps', isFavorite: false, notes: '' },
          { id: 'bp_biceps', name: 'Biceps', type: 'Biceps', isFavorite: false, notes: '' },
          { id: 'bp_lunges', name: 'Lunges', type: 'Lunges', isFavorite: false, notes: '' },
          { id: 'bp_shoulders', name: 'Shoulders', type: 'Shoulders', isFavorite: false, notes: '' },
          { id: 'bp_core', name: 'Core', type: 'Core', isFavorite: false, notes: '' },
          { id: 'bp_cooldown', name: 'Cool-down', type: 'Cool-down', isFavorite: false, notes: '' },
        ], 
        sessions: [
          { date: '2024-10-05', notes: 'Great energy!' },
          { date: '2024-10-12', notes: 'New participants.' }
        ] 
      },
      { 
        id: 'bodycombat', 
        name: 'BodyCombat 95', 
        shortName: 'BC', 
        color: '#FCD34D', 
        releaseDate: '2024-10-01', 
        tracks: [
          { id: 'bc_wu', name: 'Warm-up', type: 'Warm-up', isFavorite: false, notes: '' },
          { id: 'bc_combat', name: 'Combat', type: 'Combat', isFavorite: true, notes: 'Fast pace.' },
          { id: 'bc_power', name: 'Power Training', type: 'Power Training', isFavorite: false, notes: '' },
          { id: 'bc_muaythai', name: 'Muay Thai', type: 'Muay Thai', isFavorite: false, notes: '' },
          { id: 'bc_cooldown', name: 'Cool-down', type: 'Cool-down', isFavorite: false, notes: '' },
        ], 
        sessions: [] 
      },
      { 
        id: 'shbam', 
        name: 'Sh\'Bam 60', 
        shortName: 'SB', 
        color: '#EC4899', 
        releaseDate: '2024-09-15', 
        tracks: [
          { id: 'sb_wu', name: 'Warm-up', type: 'Warm-up', isFavorite: false, notes: '' },
          { id: 'sb_dance', name: 'Dance', type: 'Dance', isFavorite: true, notes: 'Fun routine.' },
          { id: 'sb_groove', name: 'Groove', type: 'Groove', isFavorite: false, notes: '' },
          { id: 'sb_party', name: 'Party', type: 'Party', isFavorite: false, notes: '' },
          { id: 'sb_cooldown', name: 'Cool-down', type: 'Cool-down', isFavorite: false, notes: '' },
        ], 
        sessions: [
          { date: '2024-10-06', notes: 'Energetic group.' }
        ] 
      },
    ],
    users: [
      { id: 'user1', name: 'Maria Garcia', birthday: '1990-08-07', usualSessions: ['BP', 'SB'], notes: 'Li agrada la música llatina.', gymId: 'arbucies', phone: '600112233', email: 'maria.g@example.com', photoUrl: 'https://placehold.co/50x50/aabbcc/ffffff?text=MG' },
      { id: 'user2', name: 'Joan Pons', birthday: '1985-08-08', usualSessions: ['BC', 'BP'], notes: '', gymId: 'arbucies', phone: '600445566', email: 'joan.p@example.com', photoUrl: 'https://placehold.co/50x50/ccddeeff/ffffff?text=JP' },
      { id: 'user3', name: 'Anna Soler', birthday: '1992-08-10', usualSessions: ['SB'], notes: '', gymId: 'sant_hilari', phone: '600778899', email: 'anna.s@example.com', photoUrl: 'https://placehold.co/50x50/eeffcc/ffffff?text=AS' },
      { id: 'user4', name: 'Test Aniversari', birthday: '2000-08-06', usualSessions: ['BP'], notes: 'Usuari de prova per aniversaris.', gymId: 'sant_hilari', phone: '600000000', email: 'test.a@example.com', photoUrl: 'https://placehold.co/50x50/ffccaa/ffffff?text=TA' },
    ],
    gyms: [
      { id: 'sant_hilari', name: 'Gimnàs Sant Hilari', workDays: ['Dilluns', 'Dimecres', 'Divendres'], totalVacationDays: 9, holidaysTaken: [] },
      { id: 'arbucies', name: 'Gimnàs Arbúcies', workDays: ['Dimarts', 'Dijous'], totalVacationDays: 13, holidaysTaken: [] },
    ],
    fixedSchedules: [
      {
        id: 'fixed_default_2024',
        startDate: '2024-01-01', // This schedule is active from Jan 1, 2024
        schedule: {
          'Dilluns': [
            { programId: 'bodypump', time: '18:00', gymId: 'sant_hilari' },
            { programId: 'shbam', time: '19:00', gymId: 'sant_hilari' }
          ],
          'Dimarts': [
            { programId: 'bodycombat', time: '17:30', gymId: 'arbucies' }
          ],
          'Dimecres': [
            { programId: 'bodypump', time: '10:00', gymId: 'sant_hilari' }
          ],
          'Dijous': [
            { programId: 'shbam', time: '18:30', gymId: 'arbucies' }
          ],
          'Divendres': [
            { programId: 'bodycombat', time: '09:00', gymId: 'sant_hilari' }
          ],
          'Dissabte': [],
          'Diumenge': []
        }
      },
      {
        id: 'fixed_new_sept_2025', // A new fixed schedule starting Sept 2025
        startDate: '2025-09-01',
        schedule: {
          'Dilluns': [
            { programId: 'bodycombat', time: '18:00', gymId: 'sant_hilari' },
            { programId: 'bodypump', time: '19:00', gymId: 'sant_hilari' }
          ],
          'Dimarts': [
            { programId: 'shbam', time: '17:30', gymId: 'arbucies' }
          ],
          'Dimecres': [
            { programId: 'bodycombat', time: '10:00', gymId: 'sant_hilari' }
          ],
          'Dijous': [
            { programId: 'bodypump', time: '18:30', gymId: 'arbucies' }
          ],
          'Divendres': [], // No sessions on Friday in this new schedule
          'Dissabte': [],
          'Diumenge': []
        }
      },
    ],
    recurringSessions: [
      { id: 'rec_1', programId: 'bodypump', time: '17:00', gymId: 'sant_hilari', daysOfWeek: ['Divendres'], startDate: '2025-01-01', endDate: '2025-12-31', notes: 'Sessió de prova recurrent' }
    ],
    scheduleOverrides: [
        { id: '2025-08-20', date: '2025-08-20', sessions: [{ programId: 'shbam', time: '17:00', gymId: 'arbucies', notes: 'Sessió especial per esdeveniment' }] },
    ],
    missedDays: [
      { id: 'md1', date: '2025-08-05', gymId: 'arbucies', notes: 'Malalt' },
      { id: 'md2', date: '2025-07-28', gymId: 'sant_hilari', notes: 'Viatge' },
    ],
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
      setMessageModalContent({
        title: 'Error d\'Inicialització',
        message: `Hi ha hagut un error al crear les dades inicials: ${error.message}`,
        isConfirm: false,
        onConfirm: () => setShowMessageModal(false),
      });
      setShowMessageModal(true);
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
      const unsubscribe = onSnapshot(q, async (snapshot) => { // Added async here
        if (snapshot.empty && initialArray.length > 0) {
          setLoadingMessage(`Inicialitzant ${collectionName}...`);
          await populateInitialData(path, initialArray); // Await population
          // Data will be picked up by the next onSnapshot call, or rely on the state update
          // No need for markCollectionLoaded here as the outer effect waits for data to appear
        } else {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Special handling for fixedSchedules to ensure sorting
          if (collectionName === 'fixedSchedules') {
              setData(data.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
          } else {
              setData(data);
          }
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
  }, [db, currentUserId, appId, isFirebaseReady]); // Added missing dependencies to useEffect

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
