import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StaffScheduleProps {
  staffId: string;
  staffName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const daysOfWeek = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado'
];

const StaffSchedule: React.FC<StaffScheduleProps> = ({
  staffId,
  staffName,
  onClose,
  onSuccess
}) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, [staffId]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('staff_id', staffId)
        .order('day_of_week');

      if (error) throw error;
      setSchedules(data || []);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Error al cargar los horarios');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleChange = (dayOfWeek: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.day_of_week === dayOfWeek
        ? { ...schedule, [field]: value }
        : schedule
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validar horarios
      for (const schedule of schedules) {
        if (schedule.start_time >= schedule.end_time) {
          throw new Error(`El horario de fin debe ser posterior al de inicio para el día ${daysOfWeek[schedule.day_of_week]}`);
        }
      }

      // Actualizar horarios
      const { error: updateError } = await supabase
        .from('staff_schedules')
        .upsert(
          schedules.map(schedule => ({
            ...schedule,
            staff_id: staffId
          }))
        );

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving schedules:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar los horarios');
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
            Horarios - {staffName}
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

          <form id="scheduleForm" onSubmit={handleSubmit} className="space-y-4">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando horarios...</p>
              </div>
            ) : (
              daysOfWeek.map((day, index) => {
                const schedule = schedules.find(s => s.day_of_week === index) || {
                  day_of_week: index,
                  start_time: '09:00',
                  end_time: '20:00'
                };

                return (
                  <div key={index} className="p-3 border rounded">
                    <h3 className="font-medium text-black mb-3">{day}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Hora de inicio
                        </label>
                        <input
                          type="time"
                          value={schedule.start_time}
                          onChange={(e) => handleScheduleChange(index, 'start_time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Hora de fin
                        </label>
                        <input
                          type="time"
                          value={schedule.end_time}
                          onChange={(e) => handleScheduleChange(index, 'end_time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
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
              form="scheduleForm"
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

export default StaffSchedule;