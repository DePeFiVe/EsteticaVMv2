import React, { useState, useEffect } from 'react';
import { format, addMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { X, CheckCircle, Bell, AlertCircle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { extendSupabaseWithHeaders } from '../lib/supabaseHeaders';
import { getCurrentUser } from '../lib/auth';
import type { Database } from '../types/database.types';
import type { Service } from '../types';
import { validatePhone, formatPhone } from '../utils/validation';

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
      extendSupabaseWithHeaders(supabase);
      const { data, error } = await supabase
        .from('staff_schedules')
        .select('day_of_week')
        .gt('start_time', '00:00:00')
        .lt('end_time', '23:59:59')
        .limit(1);

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
      extendSupabaseWithHeaders(supabase);
      const { data: staffServices, error } = await supabase
        .from('staff_services')
        .select('staff:staff_id (id, first_name, last_name)')
        .eq('service_id', service.id);

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

    try {
      setLoading(true);
      setError(null);

      const timeZone = 'America/Montevideo';
      const startOfDay = formatInTimeZone(new Date(selectedDate), timeZone, "yyyy-MM-dd'T'00:00:00XXX");
      const endOfDay = formatInTimeZone(new Date(selectedDate), timeZone, "yyyy-MM-dd'T'23:59:59XXX");

      const { data: availableSlots, error } = await supabase
        .from('blocked_times')
        .select('*')
        .eq('staff_id', selectedStaff)
        .eq('is_available_slot', true)
        .gte('start_time', startOfDay)
        .lte('end_time', endOfDay);

      if (error) throw error;

      const slots: TimeSlot[] = [];
      const now = new Date();

      availableSlots?.forEach((slot) => {
        const startTime = new Date(slot.start_time);
        const endTime = addMinutes(startTime, service.duration);

        if (endTime <= new Date(slot.end_time) && startTime > now) {
          slots.push({ time: format(startTime, 'HH:mm', { locale: es }), available: true });
        }
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
      if (!selectedDate || !selectedTime || !selectedStaff) {
        throw new Error('Por favor selecciona profesional, fecha y hora');
      }

      const [hours, minutes] = selectedTime.split(':').map(Number);
      const appointmentDate = new Date(
        new Date(selectedDate).setHours(hours, minutes, 0, 0)
      ).toISOString();

      const appointmentData = user
        ? {
            service_id: service.id,
            staff_id: selectedStaff,
            user_id: user.id,
            date: appointmentDate,
            status: 'pending',
          }
        : {
            service_id: service.id,
            staff_id: selectedStaff,
            first_name: guestInfo.firstName,
            last_name: guestInfo.lastName,
            phone: formatPhone(guestInfo.phone),
            date: appointmentDate,
            status: 'pending',
          };

      const table = user ? 'appointments' : 'guest_appointments';

      extendSupabaseWithHeaders(supabase, { Accept: 'application/json' });

      const { error } = await supabase.from(table).insert(appointmentData);

      if (error) throw error;

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