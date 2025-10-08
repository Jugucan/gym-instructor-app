// scheduleHelpers.jsx
// Utility functions for managing schedule logic.

import { normalizeDateToStartOfDay } from './dateHelpers.jsx';

/**
 * Finds the most recent active fixed schedule for a given date.
 * Assumes fixedSchedules are sorted by startDate (earliest first) for efficiency.
 * @param {Date} date The date to check against.
 * @param {Array<Object>} fixedSchedules An array of fixed schedule objects.
 * @returns {Object} The active fixed schedule object for that date, or an empty schedule.
 */
export const getActiveFixedSchedule = (date, fixedSchedules) => {
    const normalizedDate = normalizeDateToStartOfDay(date);
    let activeSchedule = null;

    // Sort schedules by start date in ascending order
    const sortedSchedules = [...fixedSchedules].sort((a, b) => {
        return normalizeDateToStartOfDay(a.startDate).getTime() - normalizeDateToStartOfDay(b.startDate).getTime();
    });

    for (const scheduleEntry of sortedSchedules) {
        const scheduleStartDate = normalizeDateToStartOfDay(scheduleEntry.startDate);
        if (normalizedDate >= scheduleStartDate) {
            activeSchedule = scheduleEntry.schedule; // Use the schedule content itself
        }
    }
    return activeSchedule || {}; // Return the active schedule or an empty object if none found
};

/**
 * Calculates the total working minutes for a given day based on recurring sessions.
 * @param {string} dayName The name of the day (e.g., 'Dilluns').
 * @param {Array<Object>} recurringSessions All recurring sessions.
 * @returns {number} Total minutes of recurring sessions for that day.
 */
export const calculateRecurringSessionMinutes = (dayName, recurringSessions) => {
    return recurringSessions
        .filter(session => session.daysOfWeek.includes(dayName))
        .reduce((totalMinutes, session) => {
            // Assuming each session is 60 minutes for simplicity, or we could add a 'duration' field to sessions
            return totalMinutes + 60; // Example: 60 minutes per session
        }, 0);
};

/**
 * Funció Dummy: Assumeix que totes les dades de tancaments ja venen en AAAA-MM-DD.
 * Només normalitzem la llista afegint 'normalizedDate' per mantenir la lògica de FullCalendar
 * Neteja el format AAAA-MM-DD (la teva BD) al format AAAA-MM-DD (que necessita FullCalendar)
 * @param {Array<Object>} gymClosures Llista de tancaments generals (id, date: AAAA-MM-DD, reason).
 * @returns {Array<Object>} Llista de tancaments amb la data en format AAAA-MM-DD.
 */
export const normalizeGymClosures = (gymClosures) => {
    if (!gymClosures || !Array.isArray(gymClosures)) {
        return [];
    }
    // Si la data ja està en AAAA-MM-DD a la BD (com sembla), només li afegim la propietat de normalització.
    return gymClosures.map(closure => {
        return {
            ...closure,
            // Utilitzem la data original com a data normalitzada
            normalizedDate: closure.date, 
        };
    });
};
