// src/utils/dateHelpers.jsx

/**
 * Normalitza una data a l'inici del dia (00:00:00.000) per a comparacions consistents.
 * @param {Date} date - L'objecte Date.
 * @returns {Date} L'objecte Date normalitzat.
 */
export const normalizeDateToStartOfDay = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return new Date(NaN); // Retorna una data no vàlida si l'entrada no ho és
  }
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

/**
 * Retorna la data local en format string, p. ex. "DD/MM/YYYY" per a ES-ES.
 * @param {Date} date - La data a formatejar.
 * @returns {string} La data formatada.
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
 * Formata una data o string en format DD-MM-YYYY.
 * @param {string|Date} dateValue - La data.
 * @returns {string} La data formatada (DD-MM-YYYY), o 'N/A'.
 */
export const formatDateDDMMYYYY = (dateValue) => {
  let date;
  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (typeof dateValue === 'string') {
    // Si ja és DD-MM-YYYY, la retornem
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateValue)) return dateValue;
    
    // Convertim YYYY-MM-DD a objecte Date amb T00:00:00 per evitar desplaçaments de dia
    const parts = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (parts) {
      date = new Date(`${parts[1]}-${parts[2]}-${parts[3]}T00:00:00`);
    } else {
      date = new Date(dateValue);
    }
  } else {
    return 'N/A';
  }

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
 * @param {Date | string} date - La data a formatejar.
 * @returns {string} La data en format ISO (YYYY-MM-DD).
 */
export const formatDate = (date) => {
  if (!date) return '';

  let d = date;
  if (typeof date === 'string') {
    // Si és una cadena com "DD-MM-YYYY" la convertim a YYYY-MM-DD
    const parts = date.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (parts) {
      d = new Date(`${parts[3]}-${parts[2]}-${parts[1]}T00:00:00`);
    } else {
      d = new Date(`${date}T00:00:00`);
    }
  }

  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Funció per a FullCalendar: Converteix dates simples (YYYY-MM-DD) en esdeveniments.
 * CLAU PER A FESTIUS I TANCAMENTS.
 * @param {string[]} dateList - Array de dates en format YYYY-MM-DD.
 * @param {string} title - Títol de l'esdeveniment.
 * @param {string} color - Codi hexadecimal del color.
 * @param {string} type - Tipus (p. ex., 'closure', 'holiday').
 * @returns {object[]} Array d'objectes d'esdeveniment per a FullCalendar.
 */
export const transformSimpleDatesToEvents = (dateList, title, color, type) => {
  if (!dateList || dateList.length === 0) return [];

  return dateList.map(dateStr => {
    // FullCalendar requereix 'start' en format ISO8601.
    // El 'dateStr' ja hauria de ser YYYY-MM-DD, que és el format ISO per a un dia.
    const isoDate = formatDate(dateStr); 

    return {
      title: title,
      start: isoDate,
      allDay: true,
      backgroundColor: color, // El codi de color hexadecimal
      borderColor: color,
      textColor: '#FFFFFF',   // Per a un bon contrast
      extendedProps: {
        eventType: type, 
      }
    };
  });
};


/**
 * Funció per a FullCalendar: Converteix rangs de dates en esdeveniments.
 * CLAU PER A VACANCES.
 * @param {object[]} rangeList - Array d'objectes amb { startDate, endDate, name }.
 * @param {string} color - Codi hexadecimal del color.
 * @returns {object[]} Array d'objectes d'esdeveniment per a FullCalendar.
 */
export const transformDateRangesToEvents = (rangeList, color) => {
    if (!rangeList || rangeList.length === 0) return [];

    return rangeList.map(range => {
        // Assegurem que les dates de rang siguin en format ISO8601 (YYYY-MM-DD)
        const start = formatDate(range.startDate);
        const end = formatDate(range.endDate);

        // Aquesta funció pot ser complexa si la 'endDate' a Firebase és l'últim dia INCLÒS.
        // FullCalendar vol el dia DESPRÉS. Com que no tenim una llibreria de dates,
        // confiem en què la teva lògica actual ja ho gestiona.
        // Si les teves vacances de l'1 al 5 acaben el 6-01 (format FullCalendar), no cal fer res.
        
        return {
            title: `Vacances: ${range.name || 'Gimnàs Tancat'}`,
            start: start,
            end: end, // Potser necessita ajust +1 dia si 'endDate' és l'últim dia inclòs.
            allDay: true,
            backgroundColor: color,
            borderColor: color,
            textColor: '#FFFFFF',
            extendedProps: {
                eventType: 'vacation',
            }
        };
    });
};

// **Deixem la funció per calcular l'edat tal qual (si la fas servir):**
export const calculateAge = (birthDateValue) => {
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
    
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
};

// **Deixem la funció per formatar la data d'aniversari tal qual (si la fas servir):**
export const formatBirthDateWithAge = (birthDateValue) => {
    const age = calculateAge(birthDateValue);
    const formattedDate = formatDateDDMMYYYY(birthDateValue);
    
    return age !== null ? `${formattedDate} (${age} anys)` : formattedDate;
};


/**
 * Retorna l'últim dia del mes de la data donada.
 * @param {Date} date - L'objecte Date.
 * @returns {Date} L'últim dia del mes.
 */
export const getLastDayOfMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

/**
 * Retorna un array amb les dates d'inici i final per a un informe mensual.
 * @param {Date} date - La data dins del mes de l'informe.
 * @returns {object} Objecte amb les dates d'inici i final normalitzades.
 */
export const getReportMonthDates = (date) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = getLastDayOfMonth(date);
  
  return {
    startDate: normalizeDateToStartOfDay(firstDay),
    endDate: normalizeDateToStartOfDay(lastDay),
  };
};
