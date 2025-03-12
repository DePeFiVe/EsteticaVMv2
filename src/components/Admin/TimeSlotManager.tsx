import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, addDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface TimeSlotManagerProps {
  staffId: string;
  staffName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface TimeSlot {
  id?: string;
  day: string;
  startTime: string;
  endTime: string;
  isNew?: boolean;
}

const TimeSlotManager: React.FC<TimeSlotManagerProps> = ({
  staffId,
  staffName,
  onClose,
  onSuccess
}) => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'dd/MM/yyyy')
  );

  useEffect(() => {
    fetchTimeSlots();
  }, [staffId, selectedDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert from yyyy-MM-dd (HTML input format) to dd/MM/yyyy (our display format)
    const htmlDate = e.target.value;
    setSelectedDate(htmlDate);
  };

  const fetchTimeSlots = async () => {
    try {
      setLoading(true);
      setError(null);

      // Format date for API query (needs yyyy-MM-dd format)
      const apiDateFormat = format(new Date(selectedDate), 'yyyy-MM-dd');

      // Get available time slots for the selected date
      const { data, error: fetchError } = await supabase
        .from('blocked_times')
        .select('*')
        .eq('staff_id', staffId)
        .eq('is_available_slot', true)
        .gte('start_time', `${apiDateFormat}T00:00:00`)
        .lte('start_time', `${apiDateFormat}T23:59:59`)
        .order('start_time');

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        // Format the time slots
        const formattedSlots = data.map(slot => ({
          id: slot.id,
          day: format(new Date(slot.start_time), 'dd/MM/yyyy'),
          startTime: format(new Date(slot.start_time), 'HH:mm'),
          endTime: format(new Date(slot.end_time), 'HH:mm')
        }));
        setTimeSlots(formattedSlots);
      } else {
        // No slots found for this day
        setTimeSlots([]);
      }
    } catch (err) {
      console.error('Error fetching time slots:', err);
      setError('Error al cargar los horarios');
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = () => {
    setTimeSlots([
      ...timeSlots,
      {
        day: selectedDate,
        startTime: '09:00',
        endTime: '12:00',
        isNew: true
      }
    ]);
  };

  const removeTimeSlot = (index: number) => {
    const newSlots = [...timeSlots];
    newSlots.splice(index, 1);
    setTimeSlots(newSlots);
  };

  const handleTimeChange = (
    index: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    const newSlots = [...timeSlots];
    newSlots[index][field] = value;
    setTimeSlots(newSlots);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validate time slots
      for (const slot of timeSlots) {
        if (slot.startTime >= slot.endTime) {
          throw new Error('La hora de fin debe ser posterior a la hora de inicio');
        }
      }

      // Format date for API query (needs yyyy-MM-dd format)
      const apiDateFormat = format(new Date(selectedDate), 'yyyy-MM-dd');

      // First, delete any existing specific slots for this day
      const { error: deleteError } = await supabase
        .from('blocked_times')
        .delete()
        .eq('staff_id', staffId)
        .eq('is_available_slot', true)
        .gte('start_time', `${apiDateFormat}T00:00:00`)
        .lte('start_time', `${apiDateFormat}T23:59:59`);

      if (deleteError) {
        console.error('Error deleting existing slots:', deleteError);
        throw new Error('Error al eliminar horarios existentes');
      }

      // Then, insert the new time slots one by one to avoid batch issues
      if (timeSlots.length > 0) {
        for (const slot of timeSlots) {
          // Create exact date objects to ensure correct timezone handling
          const startDateTime = new Date(`${apiDateFormat}T${slot.startTime}:00`);
          const endDateTime = new Date(`${apiDateFormat}T${slot.endTime}:00`);
          
          const { error: insertError } = await supabase
            .from('blocked_times')
            .insert({
              staff_id: staffId,
              start_time: startDateTime.toISOString(),
              end_time: endDateTime.toISOString(),
              reason: `Horario disponible: ${slot.startTime} - ${slot.endTime}`,
              is_available_slot: true
            });

          if (insertError) {
            console.error('Error inserting time slot:', insertError);
            throw new Error(`Error al guardar el horario ${slot.startTime} - ${slot.endTime}`);
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving time slots:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar los horarios');
    } finally {
      setSaving(false);
    }
  };

  const navigateDay = (days: number) => {
    const currentDate = new Date(selectedDate);
    const newDate = addDays(currentDate, days);
    setSelectedDate(format(newDate, 'dd/MM/yyyy'));
  };

  // Format the display date correctly
  const displayDate = selectedDate ? 
    format(new Date(selectedDate), 'EEEE dd/MM/yyyy', { locale: es }) : '';

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
              <button
                type="button"
                onClick={addTimeSlot}
                className="text-primary hover:text-primary/80 flex items-center text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar horario
              </button>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando horarios...</p>
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-gray-300 rounded-md">
                <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No hay horarios específicos para este día</p>
                <button
                  type="button"
                  onClick={addTimeSlot}
                  className="mt-2 text-primary hover:text-primary/80"
                >
                  Agregar horario
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {timeSlots.map((slot, index) => (
                  <div key={index} className="p-3 border rounded flex items-center">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Hora de inicio
                        </label>
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Hora de fin
                        </label>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(index)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
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