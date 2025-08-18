// Define some initial data for demonstration purposes
export const initialPrograms = [
    { id: 'bp120', name: 'BodyPump 120', shortName: 'BP', color: '#EF4444', releaseDate: '2024-09-01', tracks: [
      { id: 'bp120_t1', name: 'Warm-up', type: 'Warm-up', isFavorite: false, notes: '' },
      { id: 'bp120_t2', name: 'Squats', type: 'Squats', isFavorite: true, notes: 'Molta energia!' },
      { id: 'bp120_t3', name: 'Chest', type: 'Chest', isFavorite: false, notes: '' },
      { id: 'bp120_t4', name: 'Back', type: 'Back', isFavorite: false, notes: '' },
      { id: 'bp120_t5', name: 'Triceps', type: 'Triceps', isFavorite: false, notes: '' },
      { id: 'bp120_t6', name: 'Biceps', type: 'Biceps', isFavorite: false, notes: '' },
      { id: 'bp120_t7', name: 'Lunges', type: 'Lunges', isFavorite: false, notes: '' },
      { id: 'bp120_t8', name: 'Shoulders', type: 'Shoulders', isFavorite: false, notes: '' },
      { id: 'bp120_t9', name: 'Core', type: 'Core', isFavorite: true, notes: 'Bon track de core.' },
      { id: 'bp120_t10', name: 'Cool-down', type: 'Cool-down', isFavorite: false, notes: '' },
    ], sessions: [
      { date: '2025-07-01', notes: 'Primera sessió' },
      { date: '2025-07-03', notes: '' },
      { date: '2025-07-07', notes: '' },
      { date: '2025-07-09', notes: 'Grup amb molta energia' },
      { date: '2025-07-14', notes: '' },
      { date: '2025-07-16', notes: '' },
      { date: '2025-07-21', notes: 'Última sessió' },
    ] },
    { id: 'bc95', name: 'BodyCombat 95', shortName: 'BC', color: '#FCD34D', releaseDate: '2024-10-01', tracks: [
      { id: 'bc95_t1', name: 'Warm-up', type: 'Warm-up', isFavorite: false, notes: '' },
      { id: 'bc95_t2', name: 'Combat 1', type: 'Combat', isFavorite: true, notes: 'Ritme ràpid.' },
      { id: 'bc95_t3', name: 'Power 1', type: 'Power', isFavorite: false, notes: '' },
      { id: 'bc95_t4', name: 'Combat 2', type: 'Combat', isFavorite: false, notes: '' },
      { id: 'bc95_t5', name: 'Power 2', type: 'Power', isFavorite: false, notes: '' },
      { id: 'bc95_t6', name: 'Combat 3', type: 'Combat', isFavorite: false, notes: '' },
      { id: 'bc95_t7', name: 'Muay Thai', type: 'Muay Thai', isFavorite: false, notes: '' },
      { id: 'bc95_t8', type: 'Power 3', isFavorite: false, notes: '' },
      { id: 'bc95_t9', type: 'Core', isFavorite: false, notes: '' },
      { id: 'bc95_t10', name: 'Cool-down', type: 'Cool-down', isFavorite: false, notes: '' },
    ], sessions: [] },
    { id: 'sb60', name: 'Sh\'Bam 60', shortName: 'SB', color: '#EC4899', releaseDate: '2024-09-15', tracks: [
      { id: 'sb60_t1', name: 'Warm-up', type: 'Warm-up', isFavorite: false, notes: '' },
      { id: 'sb60_t2', name: 'Track 2', type: 'Dance', isFavorite: true, notes: 'Molt divertida!' },
      { id: 'sb60_t3', name: 'Track 3', type: 'Dance', isFavorite: false, notes: '' },
      { id: 'sb60_t4', type: 'Dance', isFavorite: false, notes: '' },
      { id: 'sb60_t5', type: 'Dance', isFavorite: false, notes: '' },
      { id: 'sb60_t6', type: 'Dance', isFavorite: false, notes: '' },
      { id: 'sb60_t7', type: 'Dance', isFavorite: false, notes: '' },
      { id: 'sb60_t8', type: 'Dance', isFavorite: false, notes: '' },
      { id: 'sb60_t9', type: 'Core', isFavorite: false, notes: '' },
      { id: 'sb60_t10', name: 'Cool-down', type: 'Cool-down', isFavorite: false, notes: '' },
    ], sessions: [
      { date: '2025-06-10', notes: '' },
      { date: '2025-06-17', notes: '' },
      { date: '2025-07-02', notes: '' },
    ] },
  ];
  
  export const initialUsers = [
    { id: 'user1', name: 'Maria Garcia', birthday: '1990-08-07', usualSessions: ['BP', 'SB'], notes: 'Li agrada la música llatina.', gymId: 'gym_arbucies', phone: '600112233', email: 'maria.g@example.com', photoUrl: 'https://placehold.co/50x50/aabbcc/ffffff?text=MG' },
    { id: 'user2', name: 'Joan Pons', birthday: '1985-08-08', usualSessions: ['BC', 'BP'], notes: '', gymId: 'gym_arbucies', phone: '600445566', email: 'joan.p@example.com', photoUrl: 'https://placehold.co/50x50/ccddeeff/ffffff?text=JP' },
    { id: 'user3', name: 'Anna Soler', birthday: '1992-08-10', usualSessions: ['SB'], notes: '', gymId: 'gym_santhilari', phone: '600778899', email: 'anna.s@example.com', photoUrl: 'https://placehold.co/50x50/eeffcc/ffffff?text=AS' },
    { id: 'user4', name: 'Test Aniversari', birthday: '2000-08-06', usualSessions: ['BP'], notes: 'Usuari de prova per aniversaris.', gymId: 'gym_santhilari', phone: '600000000', email: 'test.a@example.com', photoUrl: 'https://placehold.co/50x50/ffccaa/ffffff?text=TA' },
  ];
  
  export const initialGyms = [
    { id: 'gym_arbucies', name: 'Gimnàs Arbúcies', workDays: ['Dilluns', 'Dimarts', 'Dijous'], totalVacationDays: 13, holidaysTaken: [] },
    { id: 'gym_santhilari', name: 'Gimnàs Sant Hilari', workDays: ['Dimecres', 'Divendres'], totalVacationDays: 9, holidaysTaken: [] },
  ];
  
  export const initialFixedSchedules = [
    {
      id: 'fixed_1',
      startDate: '2024-01-01',
      schedule: {
        'Dilluns': [
          { id: 'ses_d1_1', programId: 'sb60', time: '17:00', gymId: 'gym_arbucies' },
          { id: 'ses_d1_2', programId: 'bp120', time: '18:00', gymId: 'gym_arbucies' },
          { id: 'ses_d1_3', programId: 'bp120', time: '19:00', gymId: 'gym_arbucies' },
        ],
        'Dimarts': [
          { id: 'ses_d2_1', programId: 'bc95', time: '18:00', gymId: 'gym_arbucies' },
        ],
        'Dimecres': [
          { id: 'ses_d3_1', programId: 'bp120', time: '19:00', gymId: 'gym_santhilari' },
        ],
        'Dijous': [
          { id: 'ses_d4_1', programId: 'sb60', time: '17:00', gymId: 'gym_arbucies' },
          { id: 'ses_d4_2', programId: 'bp120', time: '18:00', gymId: 'gym_arbucies' },
        ],
        'Divendres': [
          { id: 'ses_d5_1', programId: 'sb60', time: '10:00', gymId: 'gym_santhilari' },
          { id: 'ses_d5_2', programId: 'bc95', time: '11:00', gymId: 'gym_santhilari' },
          { id: 'ses_d5_3', programId: 'bp120', time: '12:00', gymId: 'gym_santhilari' },
        ],
        'Dissabte': [],
        'Diumenge': [],
      }
    },
  ];
  
  export const initialRecurringSessions = [
    { id: 'rec_1', programId: 'bp120', time: '17:00', gymId: 'gym_santhilari', daysOfWeek: ['Divendres'], startDate: '2025-09-19', endDate: '2025-12-31', notes: 'Sessió de prova recurrent' }
  ];
  
  export const initialMissedDays = [
    { id: 'md1', date: '2025-08-05', gymId: 'gym_arbucies', notes: 'Malalt' },
    { id: 'md2', date: '2025-07-28', gymId: 'gym_santhilari', notes: 'Viatge' },
  ];