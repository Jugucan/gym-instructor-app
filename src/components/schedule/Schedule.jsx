// Fragment corregit per a la funció handleSaveDaySessions en Schedule.jsx
// Substitueix les línies 202-209 amb aquest codi:

import { getDocs } from 'firebase/firestore'; // Afegir aquesta importació a la part superior

// Dins de handleSaveDaySessions, substitueix aquest bloc:
/*
const programsCollectionRef = collection(db, programsCollectionPath);
const programsSnapshot = await getDoc(programsCollectionRef);
const allProgramsDocs = await programsCollectionRef.get();
const currentProgramsData = allProgramsDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
*/

// Per aquest codi corregit:
const programsCollectionRef = collection(db, programsCollectionPath);
const allProgramsSnapshot = await getDocs(programsCollectionRef);
const currentProgramsData = allProgramsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
