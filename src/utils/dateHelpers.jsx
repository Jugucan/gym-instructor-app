// src/utils/dateHelpers.jsx

/**
 * Funció auxiliar per assegurar que qualsevol valor de data (Date, String, Firebase Timestamp)
 * es converteixi correctament en un objecte Date de JavaScript.
 * Utilitza 'T00:00:00' per forçar la creació a la mitjanit local i evitar desfasaments, 
 * especialment important quan es treballa amb strings de data (AAAA-MM-DD) sense hora.
 * @param {Date|string|Object} timestampOrString La data en qualsevol dels formats.
 * @returns {Date} L'objecte Date creat.
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
      // Intentar DD-MM-YYYY o DD/MM/YYYY
      // CORRECCIÓ: Utilitzem una expressió regular més flexible per DD/MM/YYYY o DD-MM-YYYY
      const parts = timestampOrString.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
      if (parts) {
        // DD-MM-YYYY a YYYY-MM-DD per a una millor conversió
        // Afegim 'T00:00:00' per forçar la interpretació local i evitar el desfasament UTC
        const date = new Date(`${parts[3]}-${parts[2]}-${parts[1]}T00:00:00`);
        if (!isNaN(date.getTime())) return date;
      }
      
      // Si no té T (hora), afegim 'T00:00:00' per forçar la interpretació local de YYYY-MM-DD
      const date = new Date(timestampOrString.includes('T') ? timestampOrString : timestampOrString + 'T00:00:00');
      if (!isNaN(date.getTime())) return date;
    }
    
    return new Date(NaN);
};

/**
 * Normalitza una data a la mitjanit de la zona horària local (00:00:00).
 * @param {Date|string} date La data o string de data.
 * @returns {Date} La data normalitzada a la mitjanit local.
 */
export const normalizeDateToStartOfDay = (date) => {
    let d = toDate(date);
    if (isNaN(d.getTime())) return new Date(NaN);
    
    // Assegura que es restableix a la mitjanit local sense cap desfasament d'hora
    d.setHours(0, 0, 0, 0); 
    return d;
};


/**
 * Formata un objecte Date a la cadena AAAA-MM-DD (útil per a BD i comparacions).
 * CORRECCIÓ CLAU: Utilitzem mètodes locals sobre la data normalitzada per garantir la coincidència.
 * @param {Date} date L'objecte Date.
 * @returns {string} La data formatada com YYYY-MM-DD.
 */
export const formatDate = (date) => {
    // Normalitzem la data abans de formatejar per assegurar-nos que és el dia correcte.
    const d = normalizeDateToStartOfDay(date); 

    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};

/**
 * Formata un objecte Date a la cadena DD/MM/YYYY (per a la visualització de l'usuari).
 */
export const formatDateDDMMYYYY = (dateValue) => {
  const date = toDate(dateValue);
  if (isNaN(date.getTime())) return '';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};


/**
 * Retorna la data en format local del sistema operatiu. (No utilitzada en comparacions)
 */
export const getLocalDateString = (date) => {
    const d = toDate(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ca-ES', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    });
};


/**
 * Calcula l'edat de l'usuari en anys.
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
 * Retorna un objecte amb les dates d'inici i final per a un informe mensual (del 26 al 25).
 */
export const getReportMonthDates = (dateValue) => {
  const date = toDate(dateValue);
  if (isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11

  // Inici del període: dia 26 del mes anterior (si el mes actual és el que es mostra)
  let startDate = new Date(year, month, 26);
  startDate.setMonth(startDate.getMonth() - 1);
  startDate.setHours(0, 0, 0, 0);

  // Fi del període: dia 25 del mes actual
  let endDate = new Date(year, month, 25);
  endDate.setHours(0, 0, 0, 0); // Normalitzem al principi del dia 25

  const startMonthName = startDate.toLocaleDateString('ca-ES', { month: 'short' });
  const endMonthName = endDate.toLocaleDateString('ca-ES', { month: 'short' });

  return {
    startDate: normalizeDateToStartOfDay(startDate),
    endDate: normalizeDateToStartOfDay(endDate),
    label: `26 ${startMonthName}. - 25 ${endMonthName}.`
  };
};
