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
 * CONVERSIÓ CLAU: Transforma la llista de tancaments generals.
 * Utilitza la data en format DD-MM-YYYY (assumint que així es guarda a Firestore)
 * i li afegeix la propietat normalizedDate en format AAAA-MM-DD, que és la que utilitza el calendari.
 * @param {Array<Object>} gymClosures Llista de tancaments generals (id, date: DD-MM-YYYY, reason).
 * @returns {Array<Object>} Llista de tancaments amb la data en format AAAA-MM-DD.
 */
export const normalizeGymClosures = (gymClosures) => {
    if (!gymClosures || !Array.isArray(gymClosures)) {
        return [];
    }

    return gymClosures.map(closure => {
        if (!closure.date) return closure;
        
        const parts = closure.date.split('-'); 
        if (parts.length === 3) {
            let normalizedDate;
            
            // Si el primer component té 4 dígits (YYYY), assumim que ja està en format AAAA-MM-DD
            if (parts[0].length === 4) { 
                normalizedDate = closure.date;
            } else { // Assumim DD-MM-YYYY, i el convertim
                const [day, month, year] = parts;
                normalizedDate = `${year}-${month}-${day}`; 
            }
            
            return {
                ...closure,
                normalizedDate: normalizedDate, // Aquesta és la nova propietat AAAA-MM-DD
            };
        }
        return closure;
    });
};
