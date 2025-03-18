// Script para probar diferentes formatos de fecha
const date = new Date();
const selectedDate = date.toISOString().split('T')[0];

// Probar diferentes formatos de fecha
console.log('Fecha seleccionada:', selectedDate);

// Probar con zona horaria explícita (como en el código actual)
const startDateTime1 = new Date(`${selectedDate}T10:00:00-00:00`);
console.log('Con zona -00:00:', startDateTime1.toISOString());

// Probar sin zona horaria
const startDateTime2 = new Date(`${selectedDate}T10:00:00`);
console.log('Sin zona horaria:', startDateTime2.toISOString());

// Probar con Z (UTC)
const startDateTime3 = new Date(`${selectedDate}T10:00:00Z`);
console.log('Con Z (UTC):', startDateTime3.toISOString());

// Probar con hora local
const startDateTime4 = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0, 0);
console.log('Con hora local:', startDateTime4.toISOString());

// Mostrar offset de zona horaria local
const offsetMinutes = date.getTimezoneOffset();
const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
const offsetMins = Math.abs(offsetMinutes % 60);
const offsetSign = offsetMinutes <= 0 ? '+' : '-';
const offsetFormatted = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`;
console.log('Zona horaria local:', offsetFormatted);