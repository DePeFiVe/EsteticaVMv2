import React, { useState, useEffect } from 'react';
import { format, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import { X, CheckCircle, Bell, AlertCircle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import type { Service } from '../types';
import { validatePhone, formatPhone } from '../utils/validation';

// Utilidad para depuración de horarios
const debugTimeSlots = {
  logTimeZone: (timeZone: string) => {
    console.log(`[DEBUG] TimeZone: ${timeZone}`);
  },
  logStaffSchedule: (schedule: any) => {
    console.log('[DEBUG] Staff Schedule:', schedule);
  },
  logDateRange: (startOfDay: string, endOfDay: string) => {
    console.log(`[DEBUG] Date Range: ${startOfDay} - ${endOfDay}`);
  },
  logAvailableSlots: (slots: any[]) => {
    console.log(`[DEBUG] Available Slots: ${slots.length}`, slots);
  },
  logWorkingHoursFallback: (startTime: Date, endTime: Date) => {
    console.log(`[DEBUG] Working Hours Fallback: ${startTime.toISOString()} - ${endTime.toISOString()}`);
  },
  logOccupiedRanges: (appointments: any[], guestAppointments: any[], blockedTimes: any[]) => {
    console.log(`[DEBUG] Occupied Ranges - Appointments: ${appointments?.length || 0}, Guest Appointments: ${guestAppointments?.length || 0}, Blocked Times: ${blockedTimes?.length || 0}`);
  }
};

interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
}

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
}

interface AppointmentModalProps {
  service: Service;
  isOpen: boolean;
  onClose: () => void;
}

interface AvailableMonth {
  year: number;
  month: number;
  label: string;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({ service, isOpen, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [success, setSuccess] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
  const [guestInfo, setGuestInfo] = useState({
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [validationErrors, setValidationErrors] = useState<{
    phone?: string;
  }>({});

  const user = getCurrentUser();

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    } else {
      fetchStaff();
      fetchAvailableMonths();
    }
  }, [isOpen]);

  useEffect(() => {
    let closeTimeout: NodeJS.Timeout;
    if (success) {
      closeTimeout = setTimeout(() => {
        onClose();
      }, 6000);
    }
    return () => {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
      }
    };
  }, [success, onClose]);

  const resetForm = () => {
    setSelectedDate('');
    setSelectedTime('');
    setSelectedStaff('');
    setError(null);
    setSuccess(false);
    setGuestInfo({
      firstName: '',
      lastName: '',
      phone: ''
    });
    setValidationErrors({});
    setTimeSlots([]);
  };

  const fetchAvailableMonths = async () => {
    try {
      // Fetch months where staff have available schedules
      const { data, error } = await supabase
        .from('staff_schedules')
        .select('day_of_week')
        .gt('start_time', '00:00:00')
        .lt('end_time', '23:59:59')
        .limit(1);

      if (error) throw error;

      // If schedules exist, get the next 6 months as available
      if (data && data.length > 0) {
        const months: AvailableMonth[] = [];
        const now = new Date();
        
        for (let i = 0; i < 6; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
          months.push({
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            label: format(date, 'MMMM yyyy', { locale: es })
          });
        }
        
        setAvailableMonths(months);
      }
    } catch (err) {
      console.error('Error fetching available months:', err);
      setError('Error al cargar los meses disponibles');
    }
  };

  const fetchStaff = async () => {
    try {
      const { data: staffServices, error: staffError } = await supabase
        .from('staff_services')
        .select(`
          staff:staff_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq('service_id', service.id);

      if (staffError) throw staffError;

      if (staffServices) {
        const uniqueStaff = staffServices
          .map(item => item.staff)
          .filter((staff, index, self) => 
            index === self.findIndex(s => s.id === staff.id)
          );
        setStaff(uniqueStaff);

        if (uniqueStaff.length === 1) {
          setSelectedStaff(uniqueStaff[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError('Error al cargar los profesionales disponibles');
    }
  };

  const updateTimeSlots = async () => {
    if (!selectedStaff || !selectedDate) return;

    try {
      setLoading(true);
      setError(null);

      console.log(`[DEBUG-CRITICAL] ===== INICIO updateTimeSlots =====`);
      console.log(`[DEBUG-CRITICAL] Staff seleccionado: ${selectedStaff}, Fecha: ${selectedDate}`);

      // Forzar zona horaria a America/Montevideo
      const timeZone = 'America/Montevideo';
      debugTimeSlots.logTimeZone(timeZone);
      console.log(`[DEBUG-CRITICAL] Usando zona horaria forzada: ${timeZone}`);

      // Obtener horario del profesional para ese día
      // Formato de selectedDate: YYYY-MM-DD
      console.log(`[DEBUG-CRITICAL] Fecha seleccionada original: ${selectedDate}`);
      
      // Crear la fecha con la zona horaria correcta de America/Montevideo
      // Usamos el formato ISO con la fecha seleccionada y hora 00:00:00 en la zona horaria de Montevideo
      const selectedDateTimeStr = `${selectedDate}T00:00:00`;
      // Crear un objeto Date que represente la fecha en la zona horaria de Montevideo
      const selectedDateObj = new Date(selectedDateTimeStr);
      console.log(`[DEBUG-CRITICAL] Fecha seleccionada como objeto: ${selectedDateObj.toISOString()}`);
      
      const { data: schedules, error: schedulesError } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('staff_id', selectedStaff)
        .eq('day_of_week', selectedDateObj.getDay());

      if (schedulesError) throw schedulesError;

      console.log(`[DEBUG-CRITICAL] Horarios encontrados para staff_id=${selectedStaff}:`, schedules);

      const staffSchedule = schedules?.[0];
      debugTimeSlots.logStaffSchedule(staffSchedule);

      if (!staffSchedule) {
        console.log(`[DEBUG-CRITICAL] No se encontró horario para el profesional en este día`);
        setTimeSlots([]);
        setError('El profesional no atiende este día');
        return;
      }

      // Crear el rango de fechas correctamente usando la fecha seleccionada
      // Usamos formatInTimeZone para asegurar que las fechas estén en la zona horaria correcta
      const startOfDay = formatInTimeZone(new Date(`${selectedDate}T00:00:00`), timeZone, "yyyy-MM-dd'T'00:00:00XXX");
      const endOfDay = formatInTimeZone(new Date(`${selectedDate}T23:59:59`), timeZone, "yyyy-MM-dd'T'23:59:59XXX");
      console.log(`[DEBUG-CRITICAL] Rango de fecha con zona horaria ${timeZone}:`);
      console.log(`[DEBUG-CRITICAL] - Inicio del día: ${startOfDay}`);
      console.log(`[DEBUG-CRITICAL] - Fin del día: ${endOfDay}`);
      debugTimeSlots.logDateRange(startOfDay, endOfDay);

      // Verificar si hay horarios específicos disponibles para este día
      console.log(`[DEBUG-CRITICAL] Buscando horarios disponibles para staff_id: ${selectedStaff}`);
      console.log(`[DEBUG-CRITICAL] Parámetros de consulta: startOfDay=${startOfDay}, endOfDay=${endOfDay}`);
      
      // Consulta para verificar si existen registros en blocked_times con is_available_slot=true
      const { data: allAvailableSlots, error: allSlotsError } = await supabase
        .from('blocked_times')
        .select('*')
        .eq('is_available_slot', true);
        
      if (allSlotsError) {
        console.log(`[DEBUG-CRITICAL] Error al verificar todos los horarios disponibles:`, allSlotsError);
      } else {
        console.log(`[DEBUG-CRITICAL] Total de horarios disponibles en la base de datos: ${allAvailableSlots?.length || 0}`);
        if (allAvailableSlots && allAvailableSlots.length > 0) {
          console.log(`[DEBUG-CRITICAL] Ejemplo de un horario disponible:`, allAvailableSlots[0]);
          // Mostrar todos los horarios disponibles para mejor depuración
          console.log(`[DEBUG-CRITICAL] Listado de todos los horarios disponibles:`);
          allAvailableSlots.forEach((slot, index) => {
            console.log(`[DEBUG-CRITICAL] Slot ${index + 1}: staff_id=${slot.staff_id}, start=${slot.start_time}, end=${slot.end_time}`);
          });
        }
      }
      
      // Consulta original con todos los filtros
      console.log(`[DEBUG-CRITICAL] Consultando horarios disponibles con los siguientes filtros:`);
      console.log(`[DEBUG-CRITICAL] - staff_id: ${selectedStaff}`);
      console.log(`[DEBUG-CRITICAL] - is_available_slot: true`);
      console.log(`[DEBUG-CRITICAL] - start_time >= ${startOfDay}`);
      console.log(`[DEBUG-CRITICAL] - start_time <= ${endOfDay}`);
      
      const { data: availableSlots, error: availableSlotsError } = await supabase
        .from('blocked_times')
        .select('*')
        .eq('staff_id', selectedStaff)
        .eq('is_available_slot', true)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay);

      if (availableSlotsError) {
        console.log(`[DEBUG-CRITICAL] Error al buscar horarios disponibles:`, availableSlotsError);
        throw availableSlotsError;
      }

      // Mostrar datos crudos de blocked_times para depuración
      console.log(`[DEBUG-CRITICAL] Datos crudos de blocked_times (availableSlots):`, availableSlots);
      console.log(`[DEBUG-CRITICAL] Número de bloques disponibles encontrados: ${availableSlots?.length || 0}`);
      
      // Mostrar detalles de cada bloque disponible
      if (availableSlots && availableSlots.length > 0) {
        console.log(`[DEBUG-CRITICAL] Detalles de bloques disponibles:`);
        availableSlots.forEach((slot, index) => {
          console.log(`[DEBUG-CRITICAL] Bloque disponible ${index + 1}: start=${slot.start_time}, end=${slot.end_time}`);
        });
      } else {
        console.log(`[DEBUG-CRITICAL] ⚠️ NO SE ENCONTRARON BLOQUES DISPONIBLES para el profesional en esta fecha`);
      }
      
      // Verificar cada filtro por separado para identificar cuál está fallando
      if (availableSlots && availableSlots.length === 0) {
        console.log(`[DEBUG-CRITICAL] No se encontraron horarios disponibles con todos los filtros. Verificando filtros individuales...`);
        
        // Verificar solo por staff_id
        const { data: staffSlots } = await supabase
          .from('blocked_times')
          .select('*')
          .eq('staff_id', selectedStaff);
          
        console.log(`[DEBUG-CRITICAL] Horarios para staff_id=${selectedStaff}: ${staffSlots?.length || 0}`);
        
        // Verificar solo por is_available_slot
        const { data: availableOnlySlots } = await supabase
          .from('blocked_times')
          .select('*')
          .eq('is_available_slot', true);
          
        console.log(`[DEBUG-CRITICAL] Horarios con is_available_slot=true: ${availableOnlySlots?.length || 0}`);
        
        // Verificar solo por rango de fechas
        const { data: dateRangeSlots } = await supabase
          .from('blocked_times')
          .select('*')
          .gte('start_time', startOfDay)
          .lte('start_time', endOfDay);
          
        console.log(`[DEBUG-CRITICAL] Horarios en el rango de fechas: ${dateRangeSlots?.length || 0}`);
      }

      // Solo usar horarios específicos si existen
      let workingHours = [];
      if (availableSlots && availableSlots.length > 0) {
        debugTimeSlots.logAvailableSlots(availableSlots);
        workingHours = availableSlots.map(slot => ({
          start: new Date(slot.start_time),
          end: new Date(slot.end_time)
        }));
        console.log(`[DEBUG-CRITICAL] Usando ${workingHours.length} horarios específicos configurados:`, workingHours);
      } else {
        // Si no hay horarios específicos, mostrar mensaje de error
        console.log(`[DEBUG-CRITICAL] No hay horarios específicos disponibles para este día`);
        setTimeSlots([]);
        setError('No hay horarios disponibles para esta fecha. Por favor contacte al profesional.');
        setLoading(false);
        return;
      }

      // Obtener citas existentes y bloques
      console.log(`[DEBUG-CRITICAL] Consultando citas y bloques para staff_id=${selectedStaff} entre ${startOfDay} y ${endOfDay}`);
      const [
        { data: appointments, error: appError },
        { data: guestAppointments, error: guestError },
        { data: blockedTimes, error: blockedError }
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select('date, service:services(duration)')
          .eq('staff_id', selectedStaff)
          .eq('status', 'confirmed')
          .gte('date', startOfDay)
          .lte('date', endOfDay),
        supabase
          .from('guest_appointments')
          .select('date, service:services(duration)')
          .eq('staff_id', selectedStaff)
          .eq('status', 'confirmed')
          .gte('date', startOfDay)
          .lte('date', endOfDay),
        supabase
          .from('blocked_times')
          .select('*')
          .eq('is_available_slot', false)
          .or(`staff_id.is.null,staff_id.eq.${selectedStaff}`)
          .gte('start_time', startOfDay)
          .lte('start_time', endOfDay)
      ]);

      if (appError) {
        console.log(`[DEBUG-CRITICAL] Error al obtener citas:`, appError);
        throw appError;
      }
      if (guestError) {
        console.log(`[DEBUG-CRITICAL] Error al obtener citas de invitados:`, guestError);
        throw guestError;
      }
      if (blockedError) {
        console.log(`[DEBUG-CRITICAL] Error al obtener bloques:`, blockedError);
        throw blockedError;
      }

      debugTimeSlots.logOccupiedRanges(appointments, guestAppointments, blockedTimes);
      console.log(`[DEBUG-CRITICAL] Citas: ${appointments?.length || 0}, Citas de invitados: ${guestAppointments?.length || 0}, Bloques: ${blockedTimes?.length || 0}`);
      
      // Mostrar detalles de cada bloque para depuración
      if (blockedTimes && blockedTimes.length > 0) {
        console.log(`[DEBUG-CRITICAL] Detalles de bloques:`);
        blockedTimes.forEach((block, index) => {
          console.log(`[DEBUG-CRITICAL] Bloque ${index + 1}: staff_id=${block.staff_id}, start=${block.start_time}, end=${block.end_time}, is_available=${block.is_available_slot}`);
        });
      }

      // Crear un mapa de horarios ocupados
      const occupiedTimeRanges = [
        ...(appointments || []).map(apt => ({
          start: new Date(apt.date),
          end: addMinutes(new Date(apt.date), apt.service.duration)
        })),
        ...(guestAppointments || []).map(apt => ({
          start: new Date(apt.date),
          end: addMinutes(new Date(apt.date), apt.service.duration)
        })),
        ...(blockedTimes || []).filter(block => !block.is_available_slot).map(block => ({
          start: new Date(block.start_time),
          end: new Date(block.end_time)
        }))
      ];

      console.log(`[DEBUG-CRITICAL] Total de rangos ocupados: ${occupiedTimeRanges.length}`);
      occupiedTimeRanges.forEach((range, index) => {
        console.log(`[DEBUG-CRITICAL] Rango ocupado ${index + 1}: ${range.start.toISOString()} - ${range.end.toISOString()}`);
      });

      // Generar slots considerando la duración del servicio
      const slots: TimeSlot[] = [];
      const now = new Date();
      console.log(`[DEBUG-CRITICAL] Hora actual: ${now.toISOString()}`);
      console.log(`[DEBUG-CRITICAL] Duración del servicio: ${service.duration} minutos`);
      
      // Combinar horarios de trabajo consecutivos para permitir servicios más largos
      const combinedWorkingHours = [];
      
      // Ordenar los horarios por tiempo de inicio
      const sortedHours = [...workingHours].sort((a, b) => a.start.getTime() - b.start.getTime());
      
      // Combinar horarios consecutivos
      let currentCombined = null;
      for (const hours of sortedHours) {
        if (!currentCombined) {
          currentCombined = { ...hours };
        } else {
          // Si el horario actual comienza exactamente cuando termina el anterior o hay una superposición
          if (hours.start.getTime() <= currentCombined.end.getTime()) {
            // Extender el horario combinado si el actual termina después
            if (hours.end.getTime() > currentCombined.end.getTime()) {
              currentCombined.end = hours.end;
            }
          } else {
            // Si hay un hueco, guardar el horario combinado actual y comenzar uno nuevo
            combinedWorkingHours.push(currentCombined);
            currentCombined = { ...hours };
          }
        }
      }
      
      // Añadir el último horario combinado si existe
      if (currentCombined) {
        combinedWorkingHours.push(currentCombined);
      }
      
      console.log(`[DEBUG-CRITICAL] Horarios combinados: ${combinedWorkingHours.length}`);
      combinedWorkingHours.forEach((hours, idx) => {
        console.log(`[DEBUG-CRITICAL] Horario combinado ${idx + 1}: ${hours.start.toISOString()} - ${hours.end.toISOString()}`);
      });
      
      // Generar slots usando los horarios combinados
      combinedWorkingHours.forEach((hours, idx) => {
        console.log(`[DEBUG-CRITICAL] Procesando horario combinado ${idx + 1}: ${hours.start.toISOString()} - ${hours.end.toISOString()}`);
        let currentTime = new Date(hours.start);
        
        while (currentTime < hours.end) {
          const timeString = format(currentTime, 'HH:mm', { locale: es });
          const slotEndTime = addMinutes(currentTime, service.duration);
          
          // Verificar si el slot puede acomodar la duración del servicio
          if (slotEndTime <= hours.end) {
            // Verificar si el slot está en el pasado, considerando la zona horaria
            // Convertir la hora actual a la misma zona horaria para una comparación correcta
            const nowInTimeZone = new Date();
            const isInPast = currentTime < nowInTimeZone;
            console.log(`[DEBUG-CRITICAL] Comparación de tiempo: currentTime=${currentTime.toISOString()}, nowInTimeZone=${nowInTimeZone.toISOString()}, isInPast=${isInPast}`);
            
            // Verificar superposición con horarios ocupados
            const isOverlapping = occupiedTimeRanges.some(range => 
              (currentTime >= range.start && currentTime < range.end) || 
              (slotEndTime > range.start && slotEndTime <= range.end) ||
              (currentTime <= range.start && slotEndTime >= range.end)
            );
            
            // Verificar que el slot completo está cubierto por horarios disponibles
            // Modificado para permitir que un slot pueda estar cubierto por múltiples bloques consecutivos
            const isFullyCoveredByAvailableSlot = (() => {
              // Ordenar los slots disponibles por tiempo de inicio
              const sortedSlots = [...availableSlots].sort(
                (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
              );
              
              // Verificar si el slot está completamente cubierto por un único bloque
              const isFullyCoveredBySingleSlot = sortedSlots.some(slot => {
                const slotStart = new Date(slot.start_time);
                const slotEnd = new Date(slot.end_time);
                const isCovered = currentTime >= slotStart && slotEndTime <= slotEnd;
                
                if (isCovered) {
                  console.log(`[DEBUG-CRITICAL] Slot ${format(currentTime, 'HH:mm')} - ${format(slotEndTime, 'HH:mm')} está completamente cubierto por bloque ${slotStart.toISOString()} - ${slotEnd.toISOString()}`);
                }
                
                return isCovered;
              });
              
              // Si está cubierto por un único bloque, retornar true inmediatamente
              if (isFullyCoveredBySingleSlot) return true;
              
              // Verificar si está cubierto por múltiples bloques consecutivos
              console.log(`[DEBUG-CRITICAL] Verificando cobertura por múltiples bloques para slot ${format(currentTime, 'HH:mm')} - ${format(slotEndTime, 'HH:mm')}`);
              
              let timeToCheck = new Date(currentTime);
              let isFullyCovered = true;
              let lastCoveredTime = new Date(currentTime);
              
              while (timeToCheck < slotEndTime) {
                // Buscar un bloque que cubra el tiempo actual
                const coveringSlot = sortedSlots.find(slot => {
                  const slotStart = new Date(slot.start_time);
                  const slotEnd = new Date(slot.end_time);
                  return timeToCheck >= slotStart && timeToCheck < slotEnd;
                });
                
                // Si no hay un bloque que cubra este tiempo, el slot no está completamente cubierto
                if (!coveringSlot) {
                  console.log(`[DEBUG-CRITICAL] ❌ Hueco encontrado en ${format(timeToCheck, 'HH:mm')} - No hay bloque que cubra este tiempo`);
                  isFullyCovered = false;
                  break;
                }
                
                const slotStart = new Date(coveringSlot.start_time);
                const slotEnd = new Date(coveringSlot.end_time);
                console.log(`[DEBUG-CRITICAL] ✓ Tiempo ${format(timeToCheck, 'HH:mm')} cubierto por bloque ${format(slotStart, 'HH:mm')} - ${format(slotEnd, 'HH:mm')}`);
                
                // Avanzar al final del bloque encontrado
                lastCoveredTime = timeToCheck;
                timeToCheck = new Date(coveringSlot.end_time);
              }
              
              if (isFullyCovered) {
                console.log(`[DEBUG-CRITICAL] ✅ Slot ${format(currentTime, 'HH:mm')} - ${format(slotEndTime, 'HH:mm')} está completamente cubierto por múltiples bloques`);
              } else {
                console.log(`[DEBUG-CRITICAL] ❌ Slot ${format(currentTime, 'HH:mm')} - ${format(slotEndTime, 'HH:mm')} NO está completamente cubierto (cubierto hasta ${format(lastCoveredTime, 'HH:mm')})`);
                return false;
              }
              
              // Si llegamos aquí, significa que todo el rango está cubierto
              return true;
            })();
            
            // Mostrar información de depuración para cada slot
            console.log(`[DEBUG-CRITICAL] Slot ${timeString}: isInPast=${isInPast}, isOverlapping=${isOverlapping}, isFullyCoveredByAvailableSlot=${isFullyCoveredByAvailableSlot}, currentTime=${currentTime.toISOString()}, slotEndTime=${slotEndTime.toISOString()}`);
            
            // Solo agregar slots disponibles y que estén completamente cubiertos por un horario disponible
            if (!isInPast && !isOverlapping && isFullyCoveredByAvailableSlot) {
              slots.push({
                time: timeString,
                available: true
              });
              console.log(`[DEBUG-CRITICAL] ✅ Slot ${timeString} AÑADIDO como disponible`);
            } else {
              const reason = isInPast ? 'en el pasado' : 
                           isOverlapping ? 'superpuesto con otro horario' : 
                           'no está completamente dentro de un horario disponible';
              console.log(`[DEBUG-CRITICAL] ❌ Slot ${timeString} descartado: ${reason}`);
            }
          } else {
            console.log(`[DEBUG-CRITICAL] ❌ Slot ${timeString} descartado: no cabe en el horario de trabajo (terminaría a ${format(slotEndTime, 'HH:mm')})`);
          }
          
          // Avanzar en incrementos de 30 minutos
          currentTime = addMinutes(currentTime, 30);
        }
      });

      console.log(`[DEBUG-CRITICAL] Total de slots generados: ${slots.length}`);
      if (slots.length > 0) {
        console.log(`[DEBUG-CRITICAL] Slots disponibles:`, slots.map(s => s.time).join(', '));
      } else {
        console.log(`[DEBUG-CRITICAL] No se generaron slots disponibles`);
      }
      setTimeSlots(slots);

      // Si no hay slots disponibles, mostrar mensaje
      if (slots.length === 0) {
        setError('No hay horarios disponibles para esta fecha');
      } else {
        setError(null);
      }

    } catch (err) {
      console.error('[DEBUG-CRITICAL] Error checking availability:', err);
      setError('Error al verificar disponibilidad');
    } finally {
      console.log(`[DEBUG-CRITICAL] ===== FIN updateTimeSlots =====`);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate && selectedStaff) {
      updateTimeSlots();
    } else {
      setTimeSlots([]);
    }
  }, [selectedDate, selectedStaff]);

  const validateGuestInfo = () => {
    const errors: { phone?: string } = {};

    if (!validatePhone(guestInfo.phone)) {
      errors.phone = 'Ingresa un número de teléfono válido (ej: 099123456 o 24875632)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!selectedDate || !selectedTime || !selectedStaff) {
        throw new Error('Por favor selecciona profesional, fecha y hora');
      }

      // Create exact date objects with America/Montevideo timezone
      // Usamos formatInTimeZone para asegurar que la fecha se cree correctamente en la zona horaria de Montevideo
      const dateTimeString = `${selectedDate}T${selectedTime}:00`;
      const timeZone = 'America/Montevideo';
      
      // Usamos formatInTimeZone para crear la fecha con la zona horaria correcta
      // Esto evita el desplazamiento de un día causado por la conversión UTC
      const appointmentDate = formatInTimeZone(
        new Date(`${selectedDate}T${selectedTime}:00`),
        timeZone,
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
      );
      
      // Log detailed information for debugging
      console.log(`[DEBUG-CRITICAL] Fecha de cita creada: ${appointmentDate}`);
      console.log(`[DEBUG-CRITICAL] Formato original: ${dateTimeString}`);
      console.log(`[DEBUG-CRITICAL] Zona horaria: ${timeZone}`);
      console.log(`[DEBUG-CRITICAL] Fecha ISO con formatInTimeZone: ${appointmentDate}`);
      console.log(`[DEBUG-CRITICAL] Objeto Date original:`, new Date(dateTimeString));
      console.log(`[DEBUG-CRITICAL] Fecha seleccionada: ${selectedDate}, Hora seleccionada: ${selectedTime}`);

      const appointmentData = user ? {
        service_id: service.id,
        staff_id: selectedStaff,
        user_id: user.id,
        date: appointmentDate,
        status: 'pending'
      } : {
        service_id: service.id,
        staff_id: selectedStaff,
        first_name: guestInfo.firstName,
        last_name: guestInfo.lastName,
        phone: formatPhone(guestInfo.phone),
        date: appointmentDate,
        status: 'pending'
      };

      // Log the data being sent to Supabase
      console.log(`[DEBUG-CRITICAL] Datos de cita a insertar:`, appointmentData);

      if (user) {
        const { data, error: insertError } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select();

        if (insertError) {
          console.error('[DEBUG-CRITICAL] Error completo de Supabase:', insertError);
          console.error('[DEBUG-CRITICAL] Código de error:', insertError.code);
          console.error('[DEBUG-CRITICAL] Mensaje de error:', insertError.message);
          console.error('[DEBUG-CRITICAL] Detalles:', insertError.details);
          console.error('[DEBUG-CRITICAL] Sugerencia:', insertError.hint);
          throw insertError;
        }

        console.log('[DEBUG-CRITICAL] Cita creada exitosamente:', data);
      } else {
        if (!guestInfo.firstName || !guestInfo.lastName || !guestInfo.phone) {
          throw new Error('Por favor completa todos los campos');
        }

        if (!validateGuestInfo()) {
          setLoading(false);
          return;
        }

        const { data, error: insertError } = await supabase
          .from('guest_appointments')
          .insert(appointmentData)
          .select();

        if (insertError) {
          console.error('[DEBUG-CRITICAL] Error completo de Supabase:', insertError);
          console.error('[DEBUG-CRITICAL] Código de error:', insertError.code);
          console.error('[DEBUG-CRITICAL] Mensaje de error:', insertError.message);
          console.error('[DEBUG-CRITICAL] Detalles:', insertError.details);
          console.error('[DEBUG-CRITICAL] Sugerencia:', insertError.hint);
          throw insertError;
        }

        console.log('[DEBUG-CRITICAL] Cita de invitado creada exitosamente:', data);
      }

      setSuccess(true);
    } catch (err) {
      console.error('[DEBUG-CRITICAL] Error creating appointment:', err);
      
      // Extraer mensaje de error más detallado
      let errorMessage = 'Error al crear la cita';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Verificar si es un error de Supabase con más detalles
        if ('code' in err && 'details' in err && 'hint' in err) {
          const supabaseError = err as any;
          console.error('[DEBUG-CRITICAL] Detalles del error de Supabase:', {
            code: supabaseError.code,
            details: supabaseError.details,
            hint: supabaseError.hint
          });
          
          // Incluir detalles adicionales en el mensaje de error
          if (supabaseError.hint) {
            errorMessage += ` - ${supabaseError.hint}`;
          }
        }
      }
      
      setError(errorMessage);
      
      // Si el error menciona superposición, actualizar los slots disponibles
      if (errorMessage.toLowerCase().includes('overlap') || 
          errorMessage.toLowerCase().includes('superpone')) {
        console.log('[DEBUG-CRITICAL] Detectado error de superposición, actualizando slots...');
        updateTimeSlots();
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-xl font-semibold text-black mb-4">¡Reserva Exitosa!</h2>
            <p className="text-gray-600 mb-4">
              Tu cita ha sido registrada. Te enviaremos una notificación por {user?.phone?.startsWith('09') ? 'WhatsApp' : 'SMS'} cuando sea confirmada.
            </p>
            <div className="flex items-center justify-center text-gray-500">
              <Bell className="h-5 w-5 mr-2" />
              <span>Recibirás un recordatorio 24 horas antes de tu cita</span>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              Esta ventana se cerrará automáticamente en unos segundos...
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black">Reservar Cita</h2>
              <button
                onClick={onClose}
                className="text-black hover:text-primary"
                aria-label=" Cerrar modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <h3 className="font-medium text-black">{service.name}</h3>
              <p className="text-gray-600">Duración: {service.duration} minutos</p>
              <p className="text-gray-600">Precio: ${service.price}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!user && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={guestInfo.firstName}
                      onChange={(e) => setGuestInfo({ ...guestInfo, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Apellido
                    </label>
                    <input
                      type="text"
                      value={guestInfo.lastName}
                      onChange={(e) => setGuestInfo({ ...guestInfo, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={guestInfo.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setGuestInfo({ ...guestInfo, phone: value });
                        if (validationErrors.phone) {
                          setValidationErrors({});
                        }
                      }}
                      placeholder="099123456"
                      className={`w-full px-3 py-2 border ${
                        validationErrors.phone 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:border-primary focus:ring-primary'
                      }`}
                      required
                    />
                    {validationErrors.phone && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {staff.length > 1 ? (
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Profesional
                  </label>
                  <select
                    value={selectedStaff}
                    onChange={(e) => {
                      setSelectedStaff(e.target.value);
                      setSelectedTime('');
                      setError(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="">Selecciona un profesional</option>
                    {staff.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.first_name} {person.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : staff.length === 1 ? (
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Profesional
                  </label>
                  <div className="flex items-center px-3 py-2 border border-gray-200 bg-gray-50">
                    <User className="h-5 w-5 text-gray-500 mr-2" />
                    <span>{staff[0].first_name} {staff[0].last_name}</span>
                  </div>
                </div>
              ) : null}

              {selectedStaff && availableMonths.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Fecha
                  </label>
                  <div className="flex flex-col space-y-2">
                    <select
                      value={selectedDate ? selectedDate.substring(0, 7) : ''}
                      onChange={(e) => {
                        // Reset date when month changes
                        setSelectedDate('');
                        setSelectedTime('');
                        
                        if (e.target.value) {
                          // Set to first day of month by default
                          const [year, month] = e.target.value.split('-');
                          const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
                          
                          // If first day is in the past, set to today
                          if (firstDay < new Date()) {
                            if (new Date().getMonth() === firstDay.getMonth() && 
                                new Date().getFullYear() === firstDay.getFullYear()) {
                              setSelectedDate(new Date().toISOString().split('T')[0]);
                            }
                          } else {
                            setSelectedDate(firstDay.toISOString().split('T')[0]);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                      required
                    >
                      <option value="">Selecciona un mes</option>
                      {availableMonths.map((month) => (
                        <option 
                          key={`${month.year}-${month.month}`} 
                          value={`${month.year}-${month.month.toString().padStart(2, '0')}`}
                        >
                          {month.label}
                        </option>
                      ))}
                    </select>
                    
                    {selectedDate && (
                      <div className="relative">
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={selectedDate}
                          onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setSelectedTime('');
                            setError(null);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                          required
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="inline-block bg-gray-100 px-1 py-0.5 rounded">Nota: El selector puede mostrar el formato MM/DD/YYYY según tu navegador.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Hora
                </label>
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-gray-600">Verificando disponibilidad...</p>
                  </div>
                ) : selectedDate && selectedStaff ? (
                  timeSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map(({ time, available }) => (
                        <div
                          key={time}
                          className="relative"
                        >
                          <button
                            type="button"
                            onClick={() => available && setSelectedTime(time)}
                            className={`
                              w-full py-2 text-sm border
                              ${available 
                                ? selectedTime === time
                                  ? 'border-primary bg-primary text-primary-accent'
                                  : 'border-gray-300 hover:border-primary-accent hover:bg-primary/5'
                                : 'border-gray-200 bg-gray-50 cursor-not-allowed'}
                            `}
                            disabled={!available}
                          >
                            {time}
                            {selectedTime === time && available && (
                              <CheckCircle className="h-3 w-3 absolute top-1 right-1 text-primary-accent" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-red-600 text-sm mt-1">
                      No hay horarios disponibles para esta fecha
                    </p>
                  )
                ) : (
                  <p className="text-gray-600 text-sm mt-1">
                    Selecciona un profesional y una fecha para ver los horarios disponibles
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !selectedDate || !selectedTime || !selectedStaff}
                className="w-full bg-primary text-primary-accent py-2 px-4 hover:bg-black/90 disabled:bg-primary/50 mt-4"
              >
                {loading ? 'Reservando...' : 'Confirmar Reserva'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AppointmentModal;