import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import {
  formatDate,
  normalizeDateToStartOfDay,
  getLocalDateString,
  formatDateDDMMYYYY,
  getReportMonthDates,
} from '../../utils/dateHelpers.jsx';
import { getActiveFixedSchedule } from '../../utils/scheduleHelpers.jsx';
import { getUserCollectionPath } from '../../utils/firebasePaths.jsx';
import { SessionModal } from '../common/SessionModal.jsx';
import { MissedDayModal } from '../common/MissedDayModal.jsx';
import { MessageModal } from '../common/MessageModal.jsx';

// 🎨 Colors coherents
const COLOR_FESTIU_BG = 'bg-red-100';
const COLOR_FESTIU_TEXT = 'text-red-700';
const COLOR_FESTIU_BORDER = 'border-red-700';

const COLOR_VACANCES_BG = 'bg-blue-100';
const COLOR_VACANCES_TEXT = 'text-blue-700';
const COLOR_VACANCES_BORDER = 'border-blue-700';

const COLOR_NO_ASSISTIT_BG = 'bg-yellow-100';
const COLOR_NO_ASSISTIT_TEXT = 'text-yellow-700';
const COLOR_NO_ASSISTIT_BORDER = 'border-yellow-700';

// ✅ Funció per normalitzar els tancaments (festes)
const normalizeClosures = (closures = []) => {
  return closures.map((gc) => ({
    ...gc,
    normalizedDate: gc.date ? gc.date.slice(0, 10) : '',
  }));
};

const FullCalendar = ({
  programs,
  users,
  gyms,
  scheduleOverrides,
  fixedSchedules,
  recurringSessions,
  missedDays,
  gymClosures = [],
  db,
  currentUserId,
  appId,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [sessionsForDay, setSessionsForDay] = useState([]);
  const [showMissedDayModal, setShowMissedDayModal] = useState(false);
  const [missedDayDate, setMissedDayDate] = useState(null);
  const [isMissedDayForModal, setIsMissedDayForModal] = useState(false);
  const [missedDayDocIdForModal, setMissedDayDocIdForModal] = useState(null);
  const [existingMissedGymId, setExistingMissedGymId] = useState('');
  const [existingMissedNotes, setExistingMissedNotes] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({
    title: '',
    message: '',
    isConfirm: false,
    onConfirm: () => {},
    onCancel: () => {},
  });

  const daysOfWeekNames = [
    'Diumenge',
    'Dilluns',
    'Dimarts',
    'Dimecres',
    'Dijous',
    'Divendres',
    'Dissabte',
  ];

  // ✅ Normalitzem els tancaments
  const normalizedGymClosures = useMemo(
    () => normalizeClosures(gymClosures || []),
    [gymClosures]
  );

  const getSessionsForDate = (date) => {
    const dateNormalized = normalizeDateToStartOfDay(date);
    const dateStr = formatDate(dateNormalized);
    const dayOfWeek = dateNormalized.getDay();
    const dayName = daysOfWeekNames[dayOfWeek];

    const activeFixedSchedule = getActiveFixedSchedule(
      dateNormalized,
      fixedSchedules
    );
    const fixedDaySessions = activeFixedSchedule[dayName] || [];

    const recurringSessionsForDay = recurringSessions.filter((rec) => {
      const recStartDateNormalized = normalizeDateToStartOfDay(
        new Date(rec.startDate)
      );
      const recEndDateNormalized = rec.endDate
        ? normalizeDateToStartOfDay(new Date(rec.endDate))
        : null;
      return (
        rec.daysOfWeek.includes(dayName) &&
        dateNormalized.getTime() >= recStartDateNormalized.getTime() &&
        (!recEndDateNormalized ||
          dateNormalized.getTime() <= recEndDateNormalized.getTime())
      );
    });

    const override = scheduleOverrides.find((so) => so.date === dateStr);

    if (override) {
      return override.sessions.map((s) => ({
        ...s,
        id: s.id || `override_${Date.now()}_${Math.random()}`,
        isOverride: true,
      }));
    } else {
      const combinedSessions = [...fixedDaySessions, ...recurringSessionsForDay];
      const uniqueSessions = [];
      const seen = new Set();
      combinedSessions.forEach((session) => {
        const key = `${session.programId}-${session.time}-${session.gymId}`;
        if (!seen.has(key)) {
          uniqueSessions.push({
            ...session,
            id: session.id || `fixed_rec_${Date.now()}_${Math.random()}`,
          });
          seen.add(key);
        }
      });
      return uniqueSessions.map((s) => ({ ...s, isFixedOrRecurring: true }));
    }
  };

  const handleDayClick = (date) => {
    setSelectedDate(date);
    const sessions = getSessionsForDate(date);
    setSessionsForDay(sessions);

    const isMissed = missedDays.find(
      (md) => formatDate(new Date(md.date)) === formatDate(date)
    );
    if (isMissed) {
      handleOpenMissedDayModal(date);
      return;
    }

    setShowSessionModal(true);
  };

  const handleSaveDaySessions = async (sessionsToSave) => {
    if (!selectedDate || !db || !currentUserId || !appId) return;

    const dateToSave = formatDate(selectedDate);
    const scheduleOverridesCollectionPath = getUserCollectionPath(
      appId,
      currentUserId,
      'scheduleOverrides'
    );
    if (!scheduleOverridesCollectionPath) return;

    try {
      const overrideDocRef = doc(db, scheduleOverridesCollectionPath, dateToSave);

      if (sessionsToSave.length > 0) {
        await setDoc(overrideDocRef, {
          date: dateToSave,
          sessions: sessionsToSave.map(
            ({ id, isNew, isOverride, isFixedOrRecurring, ...rest }) => rest
          ),
        });
      } else {
        await deleteDoc(overrideDocRef);
      }

      setShowSessionModal(false);
    } catch (error) {
      console.error('Error saving day sessions:', error);
    }
  };

  const handleOpenMissedDayModal = (date) => {
    setMissedDayDate(date);
    const dateStr = formatDate(date);
    const existingMissedEntry = missedDays.find(
      (md) => formatDate(new Date(md.date)) === dateStr
    );

    if (existingMissedEntry) {
      setIsMissedDayForModal(true);
      setMissedDayDocIdForModal(existingMissedEntry.id);
      setExistingMissedGymId(existingMissedEntry.assignedGymId);
      setExistingMissedNotes(existingMissedEntry.notes);
    } else {
      setIsMissedDayForModal(false);
      setMissedDayDocIdForModal(null);
      setExistingMissedGymId('');
      setExistingMissedNotes('');
    }
    setShowMissedDayModal(true);
  };

  const handleAddMissedDay = async ({ date, gymId, notes }) => {
    if (!db || !currentUserId || !appId) return;
    try {
      const missedDaysCollectionPath = getUserCollectionPath(
        appId,
        currentUserId,
        'missedDays'
      );
      if (!missedDaysCollectionPath) return;

      const dateToSave = formatDate(date);
      const newMissedDay = { date: dateToSave, assignedGymId: gymId, notes };

      const existingMissedDayQuery = query(
        collection(db, missedDaysCollectionPath),
        where('date', '==', dateToSave)
      );
      const querySnapshot = await getDocs(existingMissedDayQuery);

      if (!querySnapshot.empty) return;

      await addDoc(collection(db, missedDaysCollectionPath), newMissedDay);
      setShowMissedDayModal(false);
    } catch (error) {
      console.error('Error adding missed day:', error);
    }
  };

  const handleRemoveMissedDay = async (docId) => {
    if (!db || !currentUserId || !appId) return;
    setMessageModalContent({
      title: 'Confirmar Desmarcar Dia',
      message: 'Estàs segur que vols desmarcar aquest dia com a no assistit?',
      isConfirm: true,
      onConfirm: async () => {
        try {
          const missedDaysCollectionPath = getUserCollectionPath(
            appId,
            currentUserId,
            'missedDays'
          );
          await deleteDoc(doc(db, missedDaysCollectionPath, docId));
          setShowMessageModal(false);
          setShowMissedDayModal(false);
        } catch (error) {
          console.error('Error removing missed day:', error);
        }
      },
      onCancel: () => setShowMessageModal(false),
    });
    setShowMessageModal(true);
  };

  // 📅 Construcció del calendari
  const currentYear = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, monthIndex, 1).getDay();

  const calendarDays = useMemo(() => {
    const days = [];
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(normalizeDateToStartOfDay(new Date(currentYear, monthIndex, i)));
    }
    return days;
  }, [currentMonth, daysInMonth, firstDayOfMonth, currentYear, monthIndex]);

  const todayNormalized = normalizeDateToStartOfDay(new Date());

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-inter">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Calendari</h2>

      <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-600 mb-2">
        {['Dl', 'Dm', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((date, index) => {
          if (!date) return <div key={index} className="p-2"></div>;

          const dateStr = formatDate(date);
          const isToday = dateStr === formatDate(todayNormalized);
          const isGymClosure = normalizedGymClosures.some(
            (gc) => gc.normalizedDate === dateStr
          );
          const isHoliday = gyms.some((gym) =>
            gym.holidaysTaken?.includes(dateStr)
          );
          const isMissed = missedDays.some(
            (md) => formatDate(new Date(md.date)) === dateStr
          );

          let bgClass = 'bg-white';
          let borderClass = 'border-gray-300';
          let textClass = 'text-gray-800';
          let badgeText = '';

          if (isGymClosure) {
            bgClass = COLOR_FESTIU_BG;
            borderClass = COLOR_FESTIU_BORDER;
            textClass = COLOR_FESTIU_TEXT;
            const closure = normalizedGymClosures.find(
              (gc) => gc.normalizedDate === dateStr
            );
            badgeText = closure?.notes || 'FESTIU/TANCAMENT';
          } else if (isHoliday) {
            bgClass = COLOR_VACANCES_BG;
            borderClass = COLOR_VACANCES_BORDER;
            textClass = COLOR_VACANCES_TEXT;
            badgeText = 'VACANCES';
          } else if (isMissed) {
            bgClass = COLOR_NO_ASSISTIT_BG;
            borderClass = COLOR_NO_ASSISTIT_BORDER;
            textClass = COLOR_NO_ASSISTIT_TEXT;
            badgeText = 'NO ASSISTIT';
          }

          if (isToday) borderClass = 'border-blue-500';

          return (
            <div
              key={dateStr}
              className={`p-2 rounded-lg flex flex-col items-center justify-center text-xs relative min-h-[80px] cursor-pointer border ${bgClass} ${borderClass}`}
              onClick={() => handleDayClick(date)}
            >
              <span className={`font-bold ${textClass}`}>
                {date.getDate()}
              </span>
              {badgeText && (
                <span className={`text-[9px] mt-1 font-semibold ${textClass}`}>
                  {badgeText}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FullCalendar;
