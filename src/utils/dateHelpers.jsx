// src/utils/dateHelpers.jsx

// Funció clau per convertir objectes de Firebase (timestamps) o strings a Date
export const toDate = (timestampOrString) => {
    if (timestampOrString instanceof Date && !isNaN(timestampOrString.getTime())) {
        return timestampOrString;
    }
    
    // Si és un objecte Firebase Timestamp: { seconds: X, nanoseconds: Y }
    if (timestampOrString && typeof timestampOrString === 'object' && timestampOrString.seconds) {
        return new Date(timestampOrString.seconds * 1000 + (timestampOrString.nanoseconds || 0) / 1000000);
    }

    // Si és un string, intenta convertir-lo a Date
    if (typeof timestampOrString === 'string') {
      // Intenta convertir DD-MM-YYYY a YYYY-MM-DD per a una millor conversió
      const parts = timestampOrString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (parts) {
        const date = new Date(`${parts[3]}-${parts[2]}-${parts[1]}T00:00:00`);
        if (!isNaN(date.getTime())) return date;
      }
      // Intenta convertir directament (per YYYY-MM-DD o altres formats estàndards)
      const date = new Date(timestampOrString + 'T00:00:00'); // Afegim T00:00:00 per dates simples
      if (!isNaN(date.getTime())) return date;
    }
    
    // Si és un altre valor invàlid
    return new Date(NaN);
};


/**
 * Normalitza una data a l'inici del dia (00:00:00.000) per a comparacions consistents.
 * S'ha reforçat amb toDate.
 * @param {Date | object | string} dateValue - El valor de la data.
 * @returns {Date} L'objecte Date normalitzat.
 */
export const normalizeDateToStartOfDay = (dateValue) => {
  const date = toDate(dateValue);

  if (isNaN(date.getTime())) {
    return new Date(NaN); 
  }
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

/**
 * Retorna la data local en format string, p. ex. "DD/MM/YYYY" per a ES-ES.
 * S'ha reforçat amb toDate.
 * @param {Date | object | string} dateValue - El valor de la data.
 * @returns {string} La data formatada.
 */
export const getLocalDateString = (dateValue) => {
  const date = toDate(dateValue);
  if (isNaN(date.getTime())) {
    console.error("Invalid date provided to getLocalDateString:", dateValue);
    return "";
  }
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formata una data o string en format DD-MM-YYYY.
 * S'ha reforçat amb toDate.
 * @param {string|Date|object} dateValue - La data.
 * @returns {string} La data formatada (DD-MM-YYYY), o 'N/A'.
 */
export const formatDateDDMMYYYY = (dateValue) => {
  const date = toDate(dateValue);

  if (isNaN(date.getTime())) {
    return 'N/A';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

/**
 * Formata una data a format ISO (YYYY-MM-DD), crucial per a FullCalendar.
 * S'ha reforçat amb toDate.
 * @param {Date | string|object} dateValue - La data a formatejar.
 * @returns {string} La data en format ISO (YYYY-MM-DD).
 */
export const formatDate = (dateValue) => {
  const date = toDate(dateValue);

  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// ====================================================================
// FUNCIONS PER FULLCALENDAR
// ====================================================================

/**
 * Funció per a FullCalendar: Converteix dates simples (YYYY-MM-DD) en esdeveniments.
 */
export const transformSimpleDatesToEvents = (dateList, title, color, type) => {
  if (!dateList || dateList.length === 0) return [];

  return dateList.map(dateStr => {
    const isoDate = formatDate(dateStr); 
    if (!isoDate) return null;

    return {
      title: title,
      start: isoDate,
      allDay: true,
      backgroundColor: color, 
      borderColor: color,
      textColor: '#FFFFFF',   
      extendedProps: {
        eventType: type, 
      }
    };
  }).filter(e => e !== null); // Elimina elements nuls
};


/**
 * Funció per a FullCalendar: Converteix rangs de dates en esdeveniments.
 */
export const transformDateRangesToEvents = (rangeList, color) => {
    if (!rangeList || rangeList.length === 0) return [];

    return rangeList.map(range => {
        const start = formatDate(range.startDate);
        const end = formatDate(range.endDate);

        if (!start || !end) return null;
        
        // Atenció: Aquí NO hem d'utilitzar toDate per evitar la doble conversió de rangs.
        // Assumim que range.startDate i range.endDate ja estan sent tractats per formatDate.

        return {
            title: `Vacances: ${range.name || 'Gimnàs Tancat'}`,
            start: start,
            end: end,
            allDay: true,
            backgroundColor: color,
            borderColor: color,
            textColor: '#FFFFFF',
            extendedProps: {
                eventType: 'vacation',
            }
        };
    }).filter(e => e !== null);
};


// ====================================================================
// FUNCIONS PER A USUARIS (L'error venia d'aquí)
// ====================================================================

/**
 * Calcula l'edat d'una persona a partir de la seva data de naixement.
 * @param {string|Date|object} birthDateValue - Data de naixement.
 * @returns {number|null} L'edat en anys, o null si la data no és vàlida.
 */
export const calculateAge = (birthDateValue) => {
  const birthDate = toDate(birthDateValue);

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
 * Formata una data d'aniversari mostrant la data en format DD-MM-YYYY i l'edat actual.
 * El nom de la funció ha de ser 'formatBirthdayWithAge' per a evitar l'error.
 * @param {string|Date|object} birthDateValue - Data de naixement.
 * @returns {string} La data formatada amb l'edat (p. ex., "01-01-1990 (35 anys)").
 */
export const formatBirthdayWithAge = (birthDateValue) => {
    const age = calculateAge(birthDateValue);
    const formattedDate = formatDateDDMMYYYY(birthDateValue);
    
    return age !== null ? `${formattedDate} (${age} anys)` : formattedDate;
};


// ====================================================================
// FUNCIONS PER A REPORTS
// ====================================================================

/**
 * Retorna l'últim dia del mes de la data donada.
 * @param {Date | object | string} dateValue - La data dins del mes.
 * @returns {Date} L'últim dia del mes.
 */
export const getLastDayOfMonth = (dateValue) => {
  const date = toDate(dateValue);

  if (isNaN(date.getTime())) {
    return new Date(NaN);
  }
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

/**
 * Retorna un objecte amb les dates d'inici i final per a un informe mensual.
 * @param {Date | object | string} dateValue - La data dins del mes de l'informe.
 * @returns {object} Objecte amb les dates d'inici i final normalitzades.
 */
export const getReportMonthDates = (dateValue) => {
  const date = toDate(dateValue);

  if (isNaN(date.getTime())) {
    return { startDate: new Date(NaN), endDate: new Date(NaN) };
  }

  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = getLastDayOfMonth(date);
  
  return {
    startDate: normalizeDateToStartOfDay(firstDay),
    endDate: normalizeDateToStartOfDay(lastDay),
  };
};
