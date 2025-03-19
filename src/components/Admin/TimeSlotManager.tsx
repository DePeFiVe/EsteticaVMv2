import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Plus, Clock, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

interface TimeSlotManagerProps {
  staffId: string;
  staffName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface TimeSlot {
  time: string;
  selected: boolean;
}

const TimeSlotManager: React.FC<TimeSlotManagerProps> = ({
  staffId,
  staffName,
  onClose,
  onSuccess
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [displayDate, setDisplayDate] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDate) {
      // Create date with explicit timezone to prevent conversion issues
      const dateToDisplay = new Date(`${selectedDate}T00:00:00`);
      setDisplayDate(format(dateToDisplay, 'EEEE, d MMMM yyyy', { locale: es }));
      fetchTimeSlots();
    }
  }, [selectedDate, staffId]);

  const fetchTimeSlots = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener horarios disponibles para esta fecha
      const { data, error } = await supabase
        .from('blocked_times')
        .select('*')
        .eq('staff_id', staffId)
        .eq('is_available_slot', true)
        .gte('start_time', `${selectedDate}T00:00:00`)
        .lte('start_time', `${selectedDate}T23:59:59`);

      if (error) throw error;

      // Generar todos los slots de 30 minutos entre 09:00 y 19:00
      const allTimeSlots: TimeSlot[] = [];
      for (let hour = 12; hour < 20; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          allTimeSlots.push({
            time: timeString,
            selected: false
          });
        }
      }

      // Marcar como seleccionados los slots que ya están guardados
      if (data && data.length > 0) {
        data.forEach(slot => {
          const startTime = new Date(slot.start_time);
          const timeString = format(startTime, 'HH:mm');
          
          const existingSlot = allTimeSlots.find(s => s.time === timeString);
          if (existingSlot) {
            existingSlot.selected = true;
          }
        });
      }

      setTimeSlots(allTimeSlots);
    } catch (err) {
      console.error('Error fetching time slots:', err);
      setError('Error al cargar los horarios');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const navigateDay = (days: number) => {
    const date = new Date(selectedDate);
    const newDate = days > 0 ? addDays(date, days) : subDays(date, Math.abs(days));
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const toggleTimeSlot = (index: number) => {
    setTimeSlots(prev => prev.map((slot, i) => 
      i === index ? { ...slot, selected: !slot.selected } : slot
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Primero eliminar todos los horarios existentes para esta fecha
      const { error: deleteError } = await supabase
        .from('blocked_times')
        .delete()
        .eq('staff_id', staffId)
        .eq('is_available_slot', true)
        .gte('start_time', `${selectedDate}T00:00:00`)
        .lte('start_time', `${selectedDate}T23:59:59`);

      if (deleteError) throw deleteError;

      // Luego insertar los nuevos horarios seleccionados
      const selectedSlots = timeSlots.filter(slot => slot.selected);
      
      if (selectedSlots.length > 0) {
        // Creamos strings ISO con zona horaria explícita para Uruguay (-03:00)
        // para mantener la hora exacta que seleccionó el usuario
        const slotsToInsert = selectedSlots.map(slot => {
          // Creamos objetos Date con la fecha y hora seleccionadas
          const startDateTime = new Date(`${selectedDate}T${slot.time}:00`);
          
          // Calculamos el tiempo de fin sumando 30 minutos al tiempo de inicio
          const [hours, minutes] = slot.time.split(':').map(Number);
          let endHours = hours;
          let endMinutes = minutes + 30;
          
          if (endMinutes >= 60) {
            endHours += 1;
            endMinutes -= 60;
          }
          
          const endDateTime = new Date(`${selectedDate}T${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`);
          
          // Formateamos las fechas con zona horaria explícita para Uruguay (-03:00)
          // Esto asegura que se guarden exactamente como las seleccionó el usuario
          const startTimeISO = formatInTimeZone(startDateTime, 'America/Montevideo', "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
          const endTimeISO = formatInTimeZone(endDateTime, 'America/Montevideo', "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
          
          return {
            staff_id: staffId,
            start_time: startTimeISO,
            end_time: endTimeISO,
            reason: `Horario disponible: ${slot.time}`,
            is_available_slot: true
          };
        });

        const { error: insertError } = await supabase
          .from('blocked_times')
          .insert(slotsToInsert);

        if (insertError) throw insertError;
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving time slots:', err);
      setError('Error al guardar los horarios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-black">
            Horarios Específicos - {staffName}
          </h2>
          <button
            onClick={onClose}
            className="text-black hover:text-primary"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content with scroll */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form id="timeSlotForm" onSubmit={handleSubmit} className="space-y-4">
            {/* Date selector */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => navigateDay(-1)}
                className="p-2 text-gray-600 hover:text-primary"
              >
                &larr;
              </button>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-black mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              
              <button
                type="button"
                onClick={() => navigateDay(1)}
                className="p-2 text-gray-600 hover:text-primary"
              >
                &rarr;
              </button>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="font-medium text-black">
                {displayDate}
              </h3>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando horarios...</p>
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-gray-300 rounded-md">
                <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No hay horarios disponibles</p>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Selecciona los horarios disponibles:</p>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((slot, index) => (
                    <div
                      key={index}
                      className="relative"
                    >
                      <button
                        type="button"
                        onClick={() => toggleTimeSlot(index)}
                        className={`
                          w-full py-2 text-sm border
                          ${slot.selected 
                            ? 'border-primary bg-primary text-primary-accent'
                            : 'border-gray-300 hover:border-primary-accent hover:bg-primary/5'}
                        `}
                      >
                        {slot.time}
                        {slot.selected && (
                          <CheckCircle className="h-3 w-3 absolute top-1 right-1 text-primary-accent" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="timeSlotForm"
              disabled={loading || saving}
              className="bg-primary text-primary-accent px-4 py-2 text-sm hover:bg-black/90 disabled:bg-primary/50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeSlotManager;