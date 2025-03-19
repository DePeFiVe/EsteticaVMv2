import { format } from 'date-fns';

const debugTimeSlots = {
  logTimeZone: (timeZone) => {
    console.log('Zona horaria del usuario:', timeZone);
  },

  logDateRange: (startOfDay, endOfDay) => {
    console.log('Rango del día:', { startOfDay, endOfDay });
  },

  logStaffSchedule: (staffSchedule) => {
    console.log('Horario regular del profesional:', staffSchedule);
  },

  logAvailableSlots: (availableSlots) => {
    if (availableSlots && availableSlots.length > 0) {
      console.log('Horarios específicos encontrados:', availableSlots);
      availableSlots.forEach(slot => {
        const start = new Date(slot.start_time);
        const end = new Date(slot.end_time);
        console.log(`Horario específico: ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`);
      });
    } else {
      console.log('No se encontraron horarios específicos.');
    }
  },

  logWorkingHoursFallback: (startTime, endTime) => {
    console.log('Usando horario regular:', {
      start: format(startTime, 'HH:mm'),
      end: format(endTime, 'HH:mm')
    });
  },

  logOccupiedRanges: (appointments, guestAppointments, blockedTimes) => {
    console.log('Citas confirmadas (appointments):', appointments);
    console.log('Citas de invitados (guest_appointments):', guestAppointments);
    console.log('Bloques no disponibles (blocked_times):', blockedTimes);
  },

  logGeneratedSlots: (slots) => {
    console.log('Slots generados:', slots);
  },

  logSlotDiscarded: (timeString, isInPast, isOverlapping) => {
    console.log(`Slot ${timeString} descartado - Pasado: ${isInPast}, Superpuesto: ${isOverlapping}`);
  }
};

export default debugTimeSlots;