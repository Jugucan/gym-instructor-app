// src/utils/dateHelpers.jsx

/**
 * Formats a Date object into a localized date string (e.g., "DD/MM/YYYY" for ES-ES locale).
 * Handles invalid Date objects gracefully.
 * @param {Date} date - The date object to format.
 * @returns {string} The formatted date string, or an empty string if the date is invalid.
 */
export const getLocalDateString = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    console.error("Invalid date provided to getLocalDateString:", date);
    return "";
  }
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formats a YYYY-MM-DD date string, DD-MM-YYYY, or a Date object to a DD-MM-YYYY string.
 * This is the desired format for user-facing display.
 * @param {string|Date} dateValue - The date string or Date object to format.
 * @returns {string} The formatted date string (DD-MM-YYYY), or 'N/A' if the date is invalid.
 */
export const formatDateDDMMYYYY = (dateValue) => {
  let dateObj;

  if (dateValue instanceof Date) {
    dateObj = dateValue;
  } else if (typeof dateValue === 'string') {
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      dateObj = new Date(`${dateValue}T00:00:00`);
    }
    // Handle DD-MM-YYYY format (already in desired format, but validate and return)
    else if (/^\d{2}-\d{2}-\d{4}$/.test(dateValue)) {
      const [day, month, year] = dateValue.split('-');
      dateObj = new Date(`${year}-${month}-${day}T00:00:00`);
      // If valid, return original format
      if (!isNaN(dateObj.getTime())) {
        return dateValue;
      }
    }
    // Handle DD/MM/YYYY format
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
      const [day, month, year] = dateValue.split('/');
      dateObj = new Date(`${year}-${month}-${day}T00:00:00`);
    } else {
      dateObj = new Date(dateValue);
    }
  } else {
    return 'N/A';
  }

  if (isNaN(dateObj.getTime())) {
    return 'N/A';
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Formats a Date object, YYYY-MM-DD string, or DD-MM-YYYY string into a YYYY-MM-DD string.
 * This format is used for storage and consistent comparison.
 * @param {Date|string} date - The date object or string to format.
 * @returns {string} The formatted date string (YYYY-MM-DD), or an empty string if the date is invalid.
 */
export const formatDate = (date) => {
  let dateObj;
  
  // If it's already a Date object
  if (date instanceof Date) {
    dateObj = date;
  } 
  // If it's a string, try to parse it
  else if (typeof date === 'string') {
    // If it's already in YYYY-MM-DD format, return as is (after validation)
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const testDate = new Date(`${date}T00:00:00`);
      if (!isNaN(testDate.getTime())) {
        return date; // Already in correct format and valid
      }
    }
    // If it's in DD-MM-YYYY format, convert it
    else if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      const [day, month, year] = date.split('-');
      dateObj = new Date(`${year}-${month}-${day}T00:00:00`);
    }
    // If it's in DD/MM/YYYY format, convert it
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      const [day, month, year] = date.split('/');
      dateObj = new Date(`${year}-${month}-${day}T00:00:00`);
    } else {
      dateObj = new Date(date);
    }
  } 
  // If it's neither, return empty
  else {
    console.error("Invalid date type provided to formatDate:", typeof date, date);
    return "";
  }
  
  // Check if the resulting date is valid
  if (isNaN(dateObj.getTime())) {
    console.error("Invalid date provided to formatDate:", date);
    return "";
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses a date string (YYYY-MM-DD or DD-MM-YYYY) into a Date object.
 * @param {string} dateString - The date string to parse.
 * @returns {Date | null} The Date object, or null if the string is invalid.
 */
export const parseDateString = (dateString) => {
  if (!dateString) return null;
  
  let year, month, day;
  
  // Handle YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    [year, month, day] = dateString.split('-').map(Number);
  }
  // Handle DD-MM-YYYY format
  else if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
    [day, month, year] = dateString.split('-').map(Number);
  } else {
    return null;
  }
  
  // Month is 0-indexed in Date constructor
  const date = new Date(year, month - 1, day);
  // Check if the parsed date is valid and corresponds to the input string
  if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
    return date;
  }
  return null;
};

/**
 * Normalizes a Date object to the start of the day (00:00:00.000).
 * This is useful for consistent date comparisons, especially with Firestore timestamps.
 * @param {Date} date - The date object to normalize.
 * @returns {Date} A new Date object normalized to the start of the day.
 */
export const normalizeDateToStartOfDay = (date) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

/**
 * AFEGIT: Calcula l'edat actual basada en una data d'aniversari.
 * @param {string|Date} birthDateValue - La data d'aniversari (YYYY-MM-DD string o Date object).
 * @returns {number} L'edat en anys, o null si la data és invàlida.
 */
export const calculateAge = (birthDateValue) => {
  if (!birthDateValue) return null;
  
  let birthDate;
  
  if (birthDateValue instanceof Date) {
    birthDate = birthDateValue;
  } else if (typeof birthDateValue === 'string') {
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(birthDateValue)) {
      birthDate = new Date(`${birthDateValue}T00:00:00`);
    }
    // Handle DD-MM-YYYY format
    else if (/^\d{2}-\d{2}-\d{4}$/.test(birthDateValue)) {
      const [day, month, year] = birthDateValue.split('-');
      birthDate = new Date(`${year}-${month}-${day}T00:00:00`);
    } else {
      birthDate = new Date(birthDateValue);
    }
  } else {
    return null;
  }
  
  if (isNaN(birthDate.getTime())) {
    return null;
  }
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  
  // Si encara no ha arribat l'aniversari aquest any, restem un any
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * AFEGIT: Formata una data d'aniversari mostrant la data en format DD-MM-YYYY i l'edat actual.
 * @param {string|Date} birthDateValue - La data d'aniversari.
 * @returns {string} La data formatada amb l'edat (ex: "07-08-1990 (34 anys)").
 */
export const formatBirthdayWithAge = (birthDateValue) => {
  const formattedDate = formatDateDDMMYYYY(birthDateValue);
  const age = calculateAge(birthDateValue);
  
  if (formattedDate === 'N/A' || age === null) {
    return formattedDate;
  }
  
  return `${formattedDate} (${age} any${age !== 1 ? 's' : ''})`;
};
