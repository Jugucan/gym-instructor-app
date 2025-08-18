import { useState, useEffect } from 'react';
import { collection, onSnapshot, getDocs, setDoc, doc } from 'firebase/firestore';

// Import initial data
import {
  initialPrograms,
  initialUsers,
  initialGyms,
  initialFixedSchedules,
  initialRecurringSessions,
  initialMissedDays
} from '../data/initialData';

// Import path helper
import { getUserCollectionPath } from '../utils/firebasePaths';


const useFirestoreData = (dbInstance, currentUserId, appId, isFirebaseReady, setLoadingMessage, setShowMessageModal, setMessageModalContent) => {
  const [programs, setPrograms] = useState([]);
  const [users, setUsers] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [fixedSchedules, setFixedSchedules] = useState([]);
  const [recurringSessions, setRecurringSessions] = useState([]);
  const [scheduleOverrides, setScheduleOverrides] = useState([]);
  const [missedDays, setMissedDays] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!dbInstance || !currentUserId || !appId || !isFirebaseReady) {
      // If Firebase is not ready or user is not authenticated, load dummy data
      if (isFirebaseReady) { // Only if Firebase tried to connect but failed or config was invalid
        setPrograms(initialPrograms);
        setUsers(initialUsers);
        setGyms(initialGyms);
        setFixedSchedules(initialFixedSchedules);
        setRecurringSessions(initialRecurringSessions);
        setMissedDays(initialMissedDays);
        setDataLoaded(true);
        setLoadingMessage('Dades locals carregades (sense connexió a Firebase).');
      } else {
        // Still waiting for Firebase to be ready
        setLoadingMessage('Inicialitzant Firebase...');
      }
      return;
    }

    setLoadingMessage('Carregant dades del núvol...');
    const unsubscribes = [];

    const setupListeners = () => {
      unsubscribes.push(onSnapshot(collection(dbInstance, getUserCollectionPath(appId, currentUserId, 'programs')), (snapshot) => {
        setPrograms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => console.error("Error fetching programs:", error)));

      unsubscribes.push(onSnapshot(collection(dbInstance, getUserCollectionPath(appId, currentUserId, 'users')), (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => console.error("Error fetching users:", error)));

      unsubscribes.push(onSnapshot(collection(dbInstance, getUserCollectionPath(appId, currentUserId, 'gyms')), (snapshot) => {
        setGyms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => console.error("Error fetching gyms:", error)));

      unsubscribes.push(onSnapshot(collection(dbInstance, getUserCollectionPath(appId, currentUserId, 'fixedSchedules')), (snapshot) => {
        setFixedSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.startDate.localeCompare(b.startDate)));
      }, (error) => console.error("Error fetching fixed schedules:", error)));

      unsubscribes.push(onSnapshot(collection(dbInstance, getUserCollectionPath(appId, currentUserId, 'recurringSessions')), (snapshot) => {
        setRecurringSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => console.error("Error fetching recurring sessions:", error)));

      unsubscribes.push(onSnapshot(collection(dbInstance, getUserCollectionPath(appId, currentUserId, 'scheduleOverrides')), (snapshot) => {
        setScheduleOverrides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => console.error("Error fetching schedule overrides:", error)));

      unsubscribes.push(onSnapshot(collection(dbInstance, getUserCollectionPath(appId, currentUserId, 'missedDays')), (snapshot) => {
        setMissedDays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => console.error("Error fetching missed days:", error)));

      setDataLoaded(true);
      setLoadingMessage('Dades carregades amb èxit!');
    };

    const checkAndSeedData = async () => {
      const programsCollectionRef = collection(dbInstance, getUserCollectionPath(appId, currentUserId, 'programs'));
      const programsSnap = await getDocs(programsCollectionRef);

      if (programsSnap.empty) {
        setLoadingMessage('Inicialitzant dades per primera vegada...');
        try {
          for (const p of initialPrograms) {
            await setDoc(doc(dbInstance, getUserCollectionPath(appId, currentUserId, 'programs'), p.id), p);
          }
          for (const u of initialUsers) {
            await setDoc(doc(dbInstance, getUserCollectionPath(appId, currentUserId, 'users'), u.id), u);
          }
          for (const g of initialGyms) {
            await setDoc(doc(dbInstance, getUserCollectionPath(appId, currentUserId, 'gyms'), g.id), g);
          }
          for (const fs of initialFixedSchedules) {
            await setDoc(doc(dbInstance, getUserCollectionPath(appId, currentUserId, 'fixedSchedules'), fs.id), fs);
          }
          for (const rs of initialRecurringSessions) {
            await setDoc(doc(dbInstance, getUserCollectionPath(appId, currentUserId, 'recurringSessions'), rs.id), rs);
          }
          for (const md of initialMissedDays) {
            await setDoc(doc(dbInstance, getUserCollectionPath(appId, currentUserId, 'missedDays'), md.id), md);
          }
          setLoadingMessage('Dades inicials creades!');
          setupListeners(); // Start listening after seeding
        } catch (seedError) {
          console.error("Error seeding initial data:", seedError);
          setMessageModalContent({
            title: 'Error d\'Inicialització',
            message: `Hi ha hagut un error al crear les dades inicials: ${seedError.message}`,
            isConfirm: false,
            onConfirm: () => setShowMessageModal(false),
          });
          setShowMessageModal(true);
          setDataLoaded(true); // Allow app to render with potential partial data
        }
      } else {
        setupListeners(); // If data exists, just set up listeners
      }
    };

    checkAndSeedData();

    return () => unsubscribes.forEach(unsub => unsub());
  }, [dbInstance, currentUserId, appId, isFirebaseReady]); // Dependencies

  return { programs, users, gyms, fixedSchedules, recurringSessions, scheduleOverrides, missedDays, setMissedDays, dataLoaded };
};

export default useFirestoreData;