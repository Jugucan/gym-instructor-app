// src/utils/dateHelpers.jsx

/**
 * Funció auxiliar per assegurar que qualsevol valor de data (Date, String, Firebase Timestamp)
 * es converteixi correctament en un objecte Date de JavaScript.
 */
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
      const parts = timestampOrString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (parts) {
        // DD-MM-YYYY a YYYY-MM-DD per a una millor conversió
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
 */
export const formatDate = (dateValue) => {
  const date = toDate(dateValue);

  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

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
  }).filter(e => e !== null); 
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


/**
 * Calcula l'edat d'una persona a partir de la seva data de naixement.
 */
export const calculateAge = (birthDateValue) => {
  const birthDate = toDate(birthDateValue);

  if (isNaN(birthDate.getTime())) {
    return null;
  }
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Formata una data d'aniversari mostrant la data en format DD-MM-YYYY i l'edat actual.
 */
export const formatBirthdayWithAge = (birthDateValue) => {
    const age = calculateAge(birthDateValue);
    const formattedDate = formatDateDDMMYYYY(birthDateValue);
    
    return age !== null ? `${formattedDate} (${age} anys)` : formattedDate;
};


/**
 * Retorna l'últim dia del mes de la data donada.
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
