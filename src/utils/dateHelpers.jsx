// dateHelpers.jsx
// Utility functions for date formatting and manipulation.

/**
 * Formats a date string (YYYY-MM-DD) or Date object into a more readable format (e.g., DD/MM/YYYY).
 * @param {string|Date} dateInput The date string (e.g., '2024-03-15') or Date object.
 * @returns {string} Formatted date string (e.g., '15/03/2024') or 'N/A' if invalid.
 */
export const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) {
            return 'N/A'; // Invalid date
        }
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error("Error formatting date:", error);
        return 'N/A';
    }
};

/**
 * Normalizes a Date object or date string to the start of the day (00:00:00.000 local time).
 * This is useful for consistent date comparisons, ignoring time components.
 * @param {string|Date} dateInput The date string (e.g., '2024-03-15') or Date object.
 * @returns {Date} A new Date object set to the start of the day.
 */
export const normalizeDateToStartOfDay = (dateInput) => {
    const date = new Date(dateInput);
    date.setHours(0, 0, 0, 0);
    return date;
};

/**
 * Gets the local date string in YYYY-MM-DD format from a Date object.
 * Ensures timezone doesn't shift the date.
 * @param {Date} date The Date object.
 * @returns {string} The date in YYYY-MM-DD format.
 */
export const getLocalDateString = (date) => {
    if (!date instanceof Date || isNaN(date.getTime())) {
        return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
