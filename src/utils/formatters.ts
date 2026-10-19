/**
 * Formatting utilities for Currency (EUR), Date (DD/MM/YYYY), and Timezone (Europe/Vienna)
 */

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDateDDMMYYYY = (dateInput: string | Date): string => {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  
  // Format strictly in DD/MM/YYYY using Europe/Vienna timezone
  const formatter = new Intl.DateTimeFormat('de-AT', {
    timeZone: 'Europe/Vienna',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  
  return formatter.format(d);
};

export const formatDateTimeVienna = (isoString: string): string => {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  
  const formatter = new Intl.DateTimeFormat('de-AT', {
    timeZone: 'Europe/Vienna',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  return formatter.format(d);
};

export const getMonthName = (date: Date = new Date(), lang: 'sq' | 'en' = 'sq'): string => {
  const monthSq = [
    'Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor',
    'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'
  ];
  const monthEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const monthIndex = date.getMonth();
  const year = date.getFullYear();
  const name = lang === 'sq' ? monthSq[monthIndex] : monthEn[monthIndex];
  return `${name} ${year}`;
};

export const getTodayISODate = (): string => {
  // Returns YYYY-MM-DD in Europe/Vienna time
  const now = new Date();
  const viennaDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vienna',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  
  return viennaDateStr; // YYYY-MM-DD
};
