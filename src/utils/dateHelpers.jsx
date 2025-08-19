// src/utils/dateHelpers.jsx

/**
 * Formats a Date object into a localized date string (e.g., "DD/MM/YYYY" for ES-ES locale).
 * Handles invalid Date objects gracefully.
 * @param {Date} date - The date object to format.
 * @returns {string} The formatted date string, or an empty string if the date is invalid.
 */
export const getLocalDateString = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) { // Use getTime() to check for valid date object
    console.error("Invalid date provided to getLocalDateString:", date);
    return ""; // Or some default value like 'N/A'
  }
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formats a Date object into a YYYY-MM-DD string.
 * This format is often useful for input fields or a more standard date representation.
 * Handles invalid Date objects gracefully.
 * @param {Date} date - The date object to format.
 * @returns {string} The formatted date string (YYYY-MM-DD), or an empty string if the date is invalid.
 */
export const formatDate = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) { // Use getTime() to check for valid date object
    console.error("Invalid date provided to formatDate:", date);
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses a YYYY-MM-DD string into a Date object.
 * @param {string} dateString - The date string in YYYY-MM-DD format.
 * @returns {Date | null} The Date object, or null if the string is invalid.
 */
export const parseDateString = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  // Month is 0-indexed in Date constructor
  const date = new Date(year, month - 1, day);
  // Check if the parsed date is valid and corresponds to the input string to prevent invalid dates like Feb 30
  if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
    return date;
  }
  return null;
};
