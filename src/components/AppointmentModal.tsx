import React, { useState, useEffect } from 'react';
import { format, addMinutes, addHours } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { X, CheckCircle, Bell, AlertCircle, User } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { extendSupabaseWithHeaders } from '../lib/supabaseHeaders';
import { getCurrentUser } from '../lib/auth';
import type { Database } from '../types/database.types';
import type { Service } from '../types';
import { validatePhone, formatPhone } from '../utils/validation';
import { start } from 'repl';

// Utilidad para depuración de horarios
const debugTimeSlots = {
  logTimeZone: (timeZone: string) => {
    console.log(`[DEBUG] TimeZone: ${timeZone}`);
  },
  logStaffSchedule: (schedule: Database['public']['Tables']['staff_schedules']['Row'] | null) => {
    console.log('[DEBUG] Staff Schedule:', schedule);
  },
  logDateRange: (startOfDay: string, endOfDay: string) => {
    console.log(`[DEBUG] Date Range: ${startOfDay} - ${endOfDay}`);
  },
  logAvailableSlots: (slots: Database['public']['Tables']['blocked_times']['Row'][]) => {
    console.log(`[DEBUG] Available Slots: ${slots.length}`, slots);
  },
  logWorkingHoursFallback: (startTime: Date, endTime: Date) => {
    console.log(`[DEBUG] Working Hours Fallback: ${startTime.toISOString()} - ${endTime.toISOString()}`);
  },
  logOccupiedRanges: (
    appointments: { date: string; service: { duration: number } }[], 
    guestAppointments: { date: string; service: { duration: number } }[], 
    blockedTimes: Database['public']['Tables']['blocked_times']['Row'][]
  ) => {
    console.log(`[DEBUG] Occupied Ranges - Appointments: ${appointments?.length || 0}, Guest Appointments: ${guestAppointments?.length || 0}, Blocked Times: ${blockedTimes?.length || 0}`);
  },
  logSlotDiscarded: (time: string, isInPast: boolean, isOverlapping: boolean) => {
    console.log(`[DEBUG] Slot ${time} discarded - isInPast: ${isInPast}, isOverlapping: ${isOverlapping}`);
  },
  logGeneratedSlots: (slots: TimeSlot[]) => {
    console.log(`[DEBUG] Generated Slots: ${slots.length}`, slots);
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

const AppointmentModal = ({ service, isOpen, onClose }: AppointmentModalProps) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  console.log(`[DEBUG-CRITICAL] AppointmentModal - selectedDate: ${selectedDate}`);
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
      const { data, error } = await extendSupabaseWithHeaders(supabase)
        .from('staff_schedules')
        .select('day_of_week')
        .gt('start_time', '00:00:00')
        .lt('end_time', '23:59:59')
        .limit(1)
        .setHeader('Accept', 'application/json')
          .setHeader('Content-Type', 'application/json')
          .setHeader('Prefer', 'return=representation');

      if (error) throw error;

      if (data?.length) {
        const months: AvailableMonth[] = [];
        const now = new Date();
        for (let i = 0; i < 6; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
          months.push({
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            label: format(date, 'MMMM yyyy', { locale: es }),
          });
        }
        setAvailableMonths(months);
      } else {
        setError('No hay horarios disponibles en este momento');
      }
    } catch (err) {
      console.error('Error fetching available months:', err);
      setError('Error al cargar los meses disponibles');
    }
  };

  const fetchStaff = async () => {
    try {
      const { data: staffServices, error } = await extendSupabaseWithHeaders(supabase)
        .from('staff_services')
        .select('staff:staff_id (id, first_name, last_name)')
        .eq('service_id', service.id)
        .setHeader('Accept', 'application/json')
          .setHeader('Content-Type', 'application/json')
          .setHeader('Prefer', 'return=representation');

      if (error) throw error;

      if (staffServices) {
        const uniqueStaff = staffServices
          .filter((item): item is { staff: Staff } => item.staff !== null)
          .map((item) => item.staff)
          .filter((staff, index, self) => self.findIndex((s) => s.id === staff.id) === index);
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

    setLoading(true);
    setError(null);

    try {
      const timeZone = 'America/Montevideo';
      const selectedDateTimeStr = `${selectedDate}T12:00:00`;
      const selectedDateObj = toZonedTime(selectedDateTimeStr, timeZone);
      console.log(`[DEBUG-CRITICAL] Fecha seleccionada como objeto: ${selectedDateObj.toISOString()}`);
      console.log(`[DEBUG-CRITICAL] Día de la semana: ${selectedDateObj.getDay()}`);

      const startOfDay = formatInTimeZone(selectedDateObj, timeZone, "yyyy-MM-dd'T'00:00:00XXX");
      const endOfDay = formatInTimeZone(selectedDateObj, timeZone, "yyyy-MM-dd'T'23:59:59XXX");

      console.log(`[DEBUG-CRITICAL] Procesando fecha: ${selectedDate}`);
      debugTimeSlots.logDateRange(startOfDay, endOfDay);

      // Obtener horarios del personal
      const { data: staffSchedule, error: scheduleError } = await extendSupabaseWithHeaders(supabase)
        .from('staff_schedules')
        .select('*')
        .eq('staff_id', selectedStaff)
        .eq('day_of_week', selectedDateObj.getDay())
        .single();

      if (scheduleError && scheduleError.code !== 'PGRST116') throw scheduleError;
      debugTimeSlots.logStaffSchedule(staffSchedule);

      // Obtener horarios bloqueados específicos
      const { data: availableSlots, error: slotsError } = await extendSupabaseWithHeaders(supabase)
        .from('blocked_times')
        .select('*')
        .eq('staff_id', selectedStaff)
        .eq('is_available_slot', true)
        .lte('start_time', endOfDay)
        .gte('end_time', startOfDay)
        .setHeader('Accept', 'application/json')
        .setHeader('Content-Type', 'application/json')
        .setHeader('Prefer', 'return=representation');

      if (slotsError) throw slotsError;
      debugTimeSlots.logAvailableSlots(availableSlots || []);

      // Obtener citas existentes
      const { data: appointments, error: appError } = await extendSupabaseWithHeaders(supabase)
        .from('appointments')
        .select('date, service:service_id (duration)')
        .eq('staff_id', selectedStaff)
        .gte('date', startOfDay)
        .lte('date', endOfDay)
        .neq('status', 'cancelled')
        .setHeader('Accept', 'application/json')
        .setHeader('Content-Type', 'application/json')
        .setHeader('Prefer', 'return=representation');

      if (appError) throw appError;

      // Obtener citas de invitados
      const { data: guestAppointments, error: guestError } = await extendSupabaseWithHeaders(supabase)
        .from('guest_appointments')
        .select('date, service:service_id (duration)')
        .eq('staff_id', selectedStaff)
        .gte('date', startOfDay)
        .lte('date', endOfDay)
        .neq('status', 'cancelled')
        .setHeader('Accept', 'application/json')
        .setHeader('Content-Type', 'application/json')
        .setHeader('Prefer', 'return=representation');

      if (guestError) throw guestError;

      // Obtener horarios no disponibles
      const { data: unavailableSlots, error: unavailableError } = await extendSupabaseWithHeaders(supabase)
        .from('blocked_times')
        .select('*')
        .eq('staff_id', selectedStaff)
        .eq('is_available_slot', false)
        .lte('start_time', endOfDay)
        .gte('end_time', startOfDay)
        .setHeader('Accept', 'application/json')
        .setHeader('Content-Type', 'application/json')
        .setHeader('Prefer', 'return=representation');

      if (unavailableError) throw unavailableError;

      const occupiedTimeRanges = [
        ...(appointments || []).map(apt => ({
          start: new Date(apt.date),
          end: addMinutes(new Date(apt.date), apt.service.duration)
        })),
        ...(guestAppointments || []).map(apt => ({
          start: new Date(apt.date),
          end: addMinutes(new Date(apt.date), apt.service.duration)
        })),
        ...(unavailableSlots || []).map(slot => ({
          start: new Date(slot.start_time),
          end: new Date(slot.end_time)
        }))
      ];

      console.log(`[DEBUG-CRITICAL] Total de rangos ocupados: ${occupiedTimeRanges.length}`);
      occupiedTimeRanges.forEach((range, index) => {
        console.log(`[DEBUG-CRITICAL] Rango ocupado ${index + 1}: ${range.start.toISOString()} - ${range.end.toISOString()}`);
      });

      const slots: TimeSlot[] = [];
      const now = new Date();
      console.log(`[DEBUG-CRITICAL] Hora actual: ${now.toISOString()}`);

      const workingHours = (availableSlots || []).map(slot => ({
        start: new Date(slot.start_time),
        end: new Date(slot.end_time)
      }));

      const sortedHours = [...workingHours].sort((a, b) => a.start.getTime() - b.start.getTime());
      const combinedWorkingHours = [];
      let currentCombined = null;
      for (const hours of sortedHours) {
        if (!currentCombined) {
          currentCombined = { ...hours };
        } else {
          if (hours.start.getTime() <= currentCombined.end.getTime()) {
            if (hours.end.getTime() > currentCombined.end.getTime()) {
              currentCombined.end = hours.end;
            }
          } else {
            combinedWorkingHours.push(currentCombined);
            currentCombined = { ...hours };
          }
        }
      }
      if (currentCombined) {
        combinedWorkingHours.push(currentCombined);
      }

      console.log(`[DEBUG-CRITICAL] Horarios combinados: ${combinedWorkingHours.length}`);
      combinedWorkingHours.forEach((hours, idx) => {
        console.log(`[DEBUG-CRITICAL] Horario combinado ${idx + 1}: ${hours.start.toISOString()} - ${hours.end.toISOString()}`);
      });

      combinedWorkingHours.forEach((hours, idx) => {
        console.log(`[DEBUG-CRITICAL] Procesando horario combinado ${idx + 1}: ${hours.start.toISOString()} - ${hours.end.toISOString()}`);
        let currentTime = new Date(hours.start);
        
        while (currentTime < hours.end) {
          const timeString = formatInTimeZone(currentTime, timeZone, 'HH:mm', { locale: es });
          const slotEndTime = addMinutes(currentTime, service.duration);
          
          console.log(`[DEBUG-CRITICAL] Evaluando slot: ${timeString} (${currentTime.toISOString()} - ${slotEndTime.toISOString()})`);
          
          const now = new Date();
          const isInPast = new Date(selectedDate).setHours(0,0,0,0) < now.setHours(0,0,0,0) || 
                          (new Date(selectedDate).setHours(0,0,0,0) === now.setHours(0,0,0,0) && 
                           currentTime <= now);
          const isOverlapping = occupiedTimeRanges.some(range => 
            (currentTime >= range.start && currentTime < range.end) || 
            (slotEndTime > range.start && slotEndTime <= range.end) ||
            (currentTime <= range.start && slotEndTime >= range.end)
          );
          const exceedsBlockTime = slotEndTime > hours.end;
          
          console.log(`[DEBUG-CRITICAL] Slot ${timeString} - isInPast: ${isInPast}, isOverlapping: ${isOverlapping}, exceedsBlockTime: ${exceedsBlockTime}`);
          
          if (!isInPast && !isOverlapping && !exceedsBlockTime) {
            slots.push({
              time: timeString,
              available: true
            });
            console.log(`[DEBUG-CRITICAL] ✅ Slot ${timeString} AÑADIDO como disponible`);
          } else {
            const reason = isInPast ? 'en el pasado' : 'superpuesto con otro horario';
            console.log(`[DEBUG-CRITICAL] ❌ Slot ${timeString} descartado: ${reason}`);
          }
          
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

      if (slots.length === 0) {
        setError('No hay horarios disponibles para esta fecha');
      } else {
        setError(null);
      }



      // Ordenar los horarios
      slots.sort((a, b) => {
        const timeA = new Date(`1970-01-01T${a.time}:00`);
        const timeB = new Date(`1970-01-01T${b.time}:00`);
        return timeA.getTime() - timeB.getTime();
      });

      setTimeSlots(slots);
      if (!slots.length) setError('No hay horarios disponibles para esta fecha');
    } catch (err) {
      console.error('Error updating time slots:', err);
      setError('Error al verificar disponibilidad');
    } finally {
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
      if (!user && !validateGuestInfo()) {
        throw new Error('Por favor verifica la información ingresada');
      }

      if (!selectedDate || !selectedTime || !selectedStaff) {
        throw new Error('Por favor selecciona profesional, fecha y hora');
      }

      const timeZone = 'America/Montevideo';
      const [hours, minutes] = selectedTime.split(':').map(Number);
      
      // Construir la fecha y hora en la zona horaria local (Montevideo)
      const localDate = `${selectedDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
      const appointmentDate = toZonedTime(localDate, timeZone);
      const endDate = addMinutes(appointmentDate, service.duration);

      // Verificar disponibilidad antes de crear la cita
      const startOfDay = formatInTimeZone(appointmentDate, timeZone, "yyyy-MM-dd'T'00:00:00XXX");
      const endOfDay = formatInTimeZone(appointmentDate, timeZone, "yyyy-MM-dd'T'23:59:59XXX");

      // Verificar citas existentes en el mismo horario
      const { data: existingAppointments, error: checkError } = await extendSupabaseWithHeaders(supabase)
        .from('appointments')
        .select('date, service:service_id (duration)')
        .eq('staff_id', selectedStaff)
        .gte('date', startOfDay)
        .lte('date', endOfDay)
        .neq('status', 'cancelled')
        .setHeader('Accept', 'application/json')
        .setHeader('Content-Type', 'application/json');

      if (checkError) throw checkError;

      // Verificar citas de invitados en el mismo horario
      const { data: existingGuestAppointments, error: guestCheckError } = await extendSupabaseWithHeaders(supabase)
        .from('guest_appointments')
        .select('date, service:service_id (duration)')
        .eq('staff_id', selectedStaff)
        .gte('date', startOfDay)
        .lte('date', endOfDay)
        .neq('status', 'cancelled')
        .setHeader('Accept', 'application/json')
        .setHeader('Content-Type', 'application/json');

      if (guestCheckError) throw guestCheckError;

      // Verificar si hay superposición con otras citas
      const hasOverlap = [...(existingAppointments || []), ...(existingGuestAppointments || [])].some(apt => {
        const existingStart = new Date(apt.date);
        const existingEnd = addMinutes(existingStart, apt.service.duration);
        return (
          (appointmentDate >= existingStart && appointmentDate < existingEnd) ||
          (endDate > existingStart && endDate <= existingEnd) ||
          (appointmentDate <= existingStart && endDate >= existingEnd)
        );
      });

      if (hasOverlap) {
        throw new Error('El horario seleccionado ya no está disponible. Por favor, elige otro horario.');
      }

      // Crear el objeto de cita con las fechas correctas
      const appointmentData = {
        service_id: service.id,
        staff_id: selectedStaff,
        start_time: appointmentDate.toISOString().replace('T', ' ').replace('Z','').replace('.000','+00'),
        end_time: endDate.toISOString().replace('T', ' ').replace('Z','').replace('.000','+00'),
        date: appointmentDate.toISOString().replace('T', ' ').replace('Z','').replace('.000','+00'),
        status: 'pending',
        duration: service.duration,
        ...(user ? { 
          user_id: user.id,
        } : {
          first_name: guestInfo.firstName,
          last_name: guestInfo.lastName,
          phone: formatPhone(guestInfo.phone),
        })
      };
      console.log('[DEBUG-CRITICAL] appointmentData:', appointmentData);

      const table = user ? 'appointments' : 'guest_appointments';

      // Configurar los headers necesarios para la solicitud
      const { error: insertError } = await extendSupabaseWithHeaders(supabase)
        .from(table)
        .insert(appointmentData)        
        .setHeader('Accept', 'application/json')
        .setHeader('Content-Type', 'application/json')
        .setHeader('Prefer', 'return=representation')
        .setHeader('Authorization', `Bearer ${user?.access_token || ''}`);

      if (insertError) throw insertError;

      setSuccess(true);
    } catch (err) {
      console.error('Error creating appointment:', err);
      setError('Error al crear la cita. Por favor, intenta de nuevo.');
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
                aria-label="Cerrar modal"
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
                          // Set to next day of month by default
                          const [year, month] = e.target.value.split('-');
                          const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
                          console.log(`[DEBUG-CRITICAL] Month selection - year: ${year}, month: ${month}, firstDay: ${firstDay.toISOString()}`);
                          
                          const today = new Date();
                          let selectedDay;
                          
                          if (firstDay < today) {
                            if (today.getMonth() === firstDay.getMonth() && 
                                today.getFullYear() === firstDay.getFullYear()) {
                              // Si es el mes actual, establecer al día siguiente
                              selectedDay = new Date(today);
                              selectedDay.setDate(today.getDate() + 1);
                            }
                          } else {
                            // Si es un mes futuro, establecer al segundo día del mes
                            selectedDay = new Date(firstDay);
                            selectedDay.setDate(2);
                          }
                          
                          if (selectedDay) {
                            setSelectedDate(selectedDay.toISOString().split('T')[0]);
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
                            console.log(`[DEBUG-CRITICAL] Date selection - raw value: ${e.target.value}`);
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