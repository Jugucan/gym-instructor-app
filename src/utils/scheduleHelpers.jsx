import { normalizeDateToStartOfDay } from './dateHelpers'; // Import here as well

// Function to get the active fixed schedule for a given date
export const getActiveFixedSchedule = (date, fixedSchedules) => {
  const dateNormalizedTime = normalizeDateToStartOfDay(date).getTime();
  let activeSchedule = null;
  const sortedSchedules = [...fixedSchedules].sort((a, b) => a.startDate.localeCompare(b.startDate));

  for (const scheduleEntry of sortedSchedules) {
    const entryStartDateNormalized = normalizeDateToStartOfDay(new Date(scheduleEntry.startDate)).getTime();
    if (entryStartDateNormalized <= dateNormalizedTime) {
      activeSchedule = scheduleEntry.schedule;
    } else {
      break;
    }
  }
  return activeSchedule || {};
};