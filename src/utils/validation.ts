import { parseISO, isValid, isFuture } from 'date-fns';

// Validación de cédula uruguaya
export function validateCI(ci: string): boolean {
  // Remover caracteres no numéricos y puntos
  const cleanCI = ci.replace(/[^\d]/g, '');

  // La cédula debe tener 7 u 8 dígitos
  if (cleanCI.length < 7 || cleanCI.length > 8) {
    return false;
  }

  // Agregar cero al inicio si tiene 7 dígitos
  const paddedCI = cleanCI.length === 7 ? '0' + cleanCI : cleanCI;
  
  // Algoritmo de validación
  const digits = paddedCI.split('').map(Number);
  const validationDigit = digits.pop() || 0;
  const factors = [2, 9, 8, 7, 6, 3, 4];
  
  const sum = digits.reduce((acc, digit, index) => 
    acc + digit * factors[index], 0);
  
  const calculatedDigit = (10 - (sum % 10)) % 10;
  
  return calculatedDigit === validationDigit;
}

// Validación de teléfono uruguayo
export function validatePhone(phone: string): boolean {
  // Remover caracteres no numéricos
  const cleanPhone = phone.replace(/\D/g, '');

  // Validar formato: 09X XXX XXX o 2XXX XXXX
  return /^(?:09[1-9]\d{6}|2\d{7})$/.test(cleanPhone);
}

// Validación de fecha de nacimiento
export function validateBirthDate(date: string | Date): boolean {
  const birthDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(birthDate)) {
    return false;
  }

  // Verificar que la persona tenga al menos 16 años
  const minAge = 16;
  const today = new Date();
  const minDate = new Date(
    today.getFullYear() - minAge,
    today.getMonth(),
    today.getDate()
  );

  return birthDate <= minDate;
}

// Formatear teléfono
export function formatPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.startsWith('09')) {
    // Formato móvil: 09X XXX XXX
    return cleanPhone.replace(/(\d{3})(\d{3})(\d{3})/, '$1$2$3');
  } else if (cleanPhone.startsWith('2')) {
    // Formato fijo: 2XXX XXXX
    return cleanPhone.replace(/(\d{4})(\d{4})/, '$1$2');
  }
  
  return cleanPhone;
}

// Formatear cédula
export function formatCI(ci: string): string {
  // Remover caracteres no numéricos
  let cleanCI = ci.replace(/[^\d]/g, '');
  
  // Agregar cero al inicio si tiene 7 dígitos
  if (cleanCI.length === 7) {
    cleanCI = '0' + cleanCI;
  }
  
  // Formatear como X.XXX.XXX-X
  return cleanCI.replace(/(\d)(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
}

// Limpiar cédula (remover formato)
export function cleanCI(ci: string): string {
  return ci.replace(/[^\d]/g, '');
}