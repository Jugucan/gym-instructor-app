// src/initialData.js

// Initial Programs Data
export const initialPrograms = [
  {
    id: 'prog1',
    name: 'Rutina Força Bàsica',
    shortName: 'RFB',
    description: 'Programa d\'entrenament de força general per principiants.',
    difficulty: 'Fàcil',
    durationWeeks: 8,
    frequencyPerWeek: 3,
    goals: ['Augmentar força', 'Millorar resistència'],
    exercises: [
      { name: 'Sentadilla', sets: '3x10', notes: 'Profunditat completa' },
      { name: 'Press Banca', sets: '3x10', notes: '' },
      { name: 'Rem amb Barra', sets: '3x10', notes: '' },
      { name: 'Press Militar', sets: '3x10', notes: '' },
    ],
    color: '#FF6347' // Tomato
  },
  {
    id: 'prog2',
    name: 'Ciclisme Indoor Avançat',
    shortName: 'CIA',
    description: 'Sessions d\'intervals d\'alta intensitat per ciclistes.',
    difficulty: 'Difícil',
    durationWeeks: 12,
    frequencyPerWeek: 2,
    goals: ['Millorar VO2Max', 'Augmentar potència'],
    exercises: [
      { name: 'Sprint 30s ON / 30s OFF', sets: '10 rondes', notes: 'Màxima potència' },
      { name: 'Intervals llargs', sets: '4x5min', notes: 'Ritme de llindar' },
    ],
    color: '#4682B4' // SteelBlue
  },
  {
    id: 'prog3',
    name: 'Ioga Flow Matinal',
    shortName: 'YFM',
    description: 'Sèries de postures per augmentar la flexibilitat i la calma.',
    difficulty: 'Mitjana',
    durationWeeks: 4,
    frequencyPerWeek: 4,
    goals: ['Flexibilitat', 'Relaxació', 'Consciència corporal'],
    exercises: [
      { name: 'Salutació al Sol A', sets: '5 repeticions', notes: 'Fluid' },
      { name: 'Guerrer I, II, III', sets: 'Seqüència', notes: '' },
    ],
    color: '#32CD32' // LimeGreen
  },
  {
    id: 'prog4',
    name: 'Entrenament Funcional',
    shortName: 'EF',
    description: 'Exercicis que milloren la força per a activitats diàries.',
    difficulty: 'Mitjana',
    durationWeeks: 10,
    frequencyPerWeek: 3,
    goals: ['Força funcional', 'Agilitat', 'Estabilitat'],
    exercises: [
      { name: 'Burpees', sets: '3x10', notes: '' },
      { name: 'Kettlebell Swings', sets: '4x12', notes: '' },
      { name: 'Box Jumps', sets: '3x8', notes: '' },
    ],
    color: '#FFD700' // Gold
  },
  {
    id: 'prog5',
    name: 'Body Pump',
    shortName: 'BP',
    description: 'Classe col·lectiva amb barra i pesos lleugers.',
    difficulty: 'Mitjana',
    durationWeeks: 0, // Ongoing class
    frequencyPerWeek: 2,
    goals: ['Tonificació', 'Resistència muscular'],
    exercises: [
      { name: 'Squats amb barra', sets: 'N/A', notes: 'Clase dirigida' },
      { name: 'Lunges amb barra', sets: 'N/A', notes: 'Clase dirigida' },
    ],
    color: '#DA70D6' // Orchid
  },
  {
    id: 'prog6',
    name: 'Spinning',
    shortName: 'SP',
    description: 'Classe de ciclisme indoor amb música.',
    difficulty: 'Fàcil',
    durationWeeks: 0, // Ongoing class
    frequencyPerWeek: 3,
    goals: ['Cardio', 'Resistència'],
    exercises: [
      { name: 'Ritme constant', sets: 'N/A', notes: 'Clase dirigida' },
      { name: 'Pujades', sets: 'N/A', notes: 'Clase dirigida' },
    ],
    color: '#87CEEB' // SkyBlue
  }
];

// Initial Users Data
export const initialUsers = [
  {
    id: 'user1',
    name: 'Anna Garcia',
    birthday: '1990-05-15',
    usualSessions: ['YFM', 'EF'],
    notes: 'Motivada per la flexibilitat.',
    gymId: 'gym1',
    phone: '600111222',
    email: 'anna.garcia@example.com',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  },
  {
    id: 'user2',
    name: 'Pere Lopez',
    birthday: '1985-11-20',
    usualSessions: ['RFB', 'BP'],
    notes: 'Vol augmentar la força i massa muscular.',
    gymId: 'gym2',
    phone: '600333444',
    email: 'pere.lopez@example.com',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  },
  {
    id: 'user3',
    name: 'Marta Soler',
    birthday: '1992-02-28',
    usualSessions: ['CIA', 'SP'],
    notes: 'Cerca millorar la resistència cardiovascular.',
    gymId: 'gym1',
    phone: '600555666',
    email: 'marta.soler@example.com',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29329?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  },
  {
    id: 'user4',
    name: 'Jordi Vila',
    birthday: '1978-08-01',
    usualSessions: ['RFB'],
    notes: 'Es recupera d\'una lesió a l\'espatlla.',
    gymId: 'gym3',
    phone: '600777888',
    email: 'jordi.vila@example.com',
    photoUrl: 'https://images.unsplash.com/photo-1528892952291-009c669ce260?q=80&w=1964&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  },
  {
    id: 'user5',
    name: 'Laia Puig',
    birthday: '1995-07-10',
    usualSessions: ['YFM', 'EF'],
    notes: 'Interessada en la nutrició esportiva.',
    gymId: 'gym2',
    phone: '600999000',
    email: 'laia.puig@example.com',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1888&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  },
];

// Initial Gyms Data
export const initialGyms = [
  {
    id: 'gym1',
    name: 'Gimnàs Central',
    location: 'Carrer Major 123',
    totalVacationDays: 30,
    holidaysTaken: ['2025-01-01', '2025-03-29', '2025-03-30', '2025-05-01'], // Example holidays
    notes: 'El gimnàs principal de la ciutat.',
  },
  {
    id: 'gym2',
    name: 'Fitness Express',
    location: 'Avinguda Llibertat 45',
    totalVacationDays: 20,
    holidaysTaken: ['2025-01-01', '2025-08-15'],
    notes: 'Obert 24 hores.',
  },
  {
    id: 'gym3',
    name: 'Centre Wellness',
    location: 'Plaça Nova 7',
    totalVacationDays: 25,
    holidaysTaken: ['2025-01-06'],
    notes: 'Especialitzat en rehabilitació.',
  },
];


// Initial Fixed Schedules Data
export const initialFixedSchedules = [
  {
    id: 'fixedsch1',
    startDate: '2025-01-01', // This schedule is active from this date onwards
    schedule: {
      'Dilluns': [
        { programId: 'prog1', time: '09:00', gymId: 'gym1', notes: 'Força principiants' },
        { programId: 'prog5', time: '18:00', gymId: 'gym1', notes: 'Body Pump vespre' },
      ],
      'Dimarts': [
        { programId: 'prog3', time: '07:00', gymId: 'gym2', notes: 'Ioga Matinal' },
        { programId: 'prog6', time: '19:00', gymId: 'gym2', notes: 'Spinning vespre' },
      ],
      'Dimecres': [
        { programId: 'prog1', time: '09:00', gymId: 'gym1', notes: 'Força principiants' },
        { programId: 'prog4', time: '17:00', gymId: 'gym3', notes: 'Entrenament funcional' },
      ],
      'Dijous': [
        { programId: 'prog3', time: '07:00', gymId: 'gym2', notes: 'Ioga Matinal' },
        { programId: 'prog5', time: '18:00', gymId: 'gym1', notes: 'Body Pump vespre' },
      ],
      'Divendres': [
        { programId: 'prog1', time: '09:00', gymId: 'gym1', notes: 'Força principiants' },
        { programId: 'prog6', time: '17:00', gymId: 'gym3', notes: 'Spinning tarda' },
      ],
      'Dissabte': [
        { programId: 'prog2', time: '10:00', gymId: 'gym2', notes: 'Ciclisme avançat' },
      ],
      'Diumenge': [],
    }
  },
  {
    id: 'fixedsch2',
    startDate: '2025-07-01', // A new schedule starting later in the year
    schedule: {
      'Dilluns': [
        { programId: 'prog1', time: '08:30', gymId: 'gym1', notes: 'Força matí' },
        { programId: 'prog5', time: '19:00', gymId: 'gym1', notes: 'Body Pump tarda' },
      ],
      'Dimarts': [
        { programId: 'prog3', time: '07:30', gymId: 'gym2', notes: 'Ioga Express' },
        { programId: 'prog6', time: '18:30', gymId: 'gym2', notes: 'Spinning' },
      ],
      'Dimecres': [
        { programId: 'prog4', time: '10:00', gymId: 'gym3', notes: 'Funcional' },
      ],
      'Dijous': [
        { programId: 'prog3', time: '07:30', gymId: 'gym2', notes: 'Ioga Express' },
      ],
      'Divendres': [
        { programId: 'prog1', time: '08:30', gymId: 'gym1', notes: 'Força matí' },
      ],
      'Dissabte': [],
      'Diumenge': [],
    }
  }
];


// Initial Recurring Sessions (These are like "classes" that happen regularly)
export const initialRecurringSessions = [
  {
    id: 'rec1',
    programId: 'prog5',
    gymId: 'gym1',
    time: '10:00',
    daysOfWeek: ['Dilluns', 'Dimecres', 'Divendres'],
    startDate: '2025-01-01',
    endDate: null, // No end date
    notes: 'Classe Body Pump habitual.',
  },
  {
    id: 'rec2',
    programId: 'prog6',
    gymId: 'gym2',
    time: '08:00',
    daysOfWeek: ['Dimarts', 'Dijous'],
    startDate: '2025-01-01',
    endDate: null,
    notes: 'Sessió de Spinning de bon matí.',
  },
  {
    id: 'rec3',
    programId: 'prog3',
    gymId: 'gym3',
    time: '12:00',
    daysOfWeek: ['Dissabte'],
    startDate: '2025-06-01',
    endDate: '2025-12-31', // Example of an end date
    notes: 'Ioga de cap de setmana.',
  },
];

// Initial Missed Days (example of days an instructor missed)
export const initialMissedDays = [
  {
    id: 'missed1',
    date: '2025-08-05',
    gymId: 'gym1',
    notes: 'Cita mèdica',
  },
  {
    id: 'missed2',
    date: '2025-08-10',
    gymId: 'all_gyms', // Example of missing all gyms
    notes: 'Malaltia',
  },
];
