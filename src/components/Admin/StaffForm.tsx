import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StaffFormProps {
  onClose: () => void;
  onSuccess: () => void;
  selectedStaff?: {
    id: string;
    ci: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string | null;
  };
}

interface Service {
  id: string;
  name: string;
  category: string;
}

const StaffForm: React.FC<StaffFormProps> = ({ onClose, onSuccess, selectedStaff }) => {
  const [formData, setFormData] = useState({
    ci: '',
    first_name: '',
    last_name: '',
    phone: '',
    email: ''
  });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedStaff) {
      setFormData({
        ci: selectedStaff.ci,
        first_name: selectedStaff.first_name,
        last_name: selectedStaff.last_name,
        phone: selectedStaff.phone,
        email: selectedStaff.email || ''
      });
      fetchStaffServices(selectedStaff.id);
    }
    fetchServices();
  }, [selectedStaff]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, category')
        .order('category')
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError('Error al cargar los servicios');
    }
  };

  const fetchStaffServices = async (staffId: string) => {
    try {
      const { data, error } = await supabase
        .from('staff_services')
        .select('service_id')
        .eq('staff_id', staffId);

      if (error) throw error;
      setSelectedServices(data.map(item => item.service_id));
    } catch (err) {
      console.error('Error fetching staff services:', err);
      setError('Error al cargar los servicios del profesional');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let staffId = selectedStaff?.id;

      if (selectedStaff) {
        // Update existing staff
        const { error: updateError } = await supabase
          .from('staff')
          .update(formData)
          .eq('id', staffId);

        if (updateError) throw updateError;
      } else {
        // Insert new staff
        const { data: newStaff, error: insertError } = await supabase
          .from('staff')
          .insert(formData)
          .select()
          .single();

        if (insertError) throw insertError;
        staffId = newStaff.id;
      }

      // Update staff services
      if (staffId) {
        // First, remove all existing services
        await supabase
          .from('staff_services')
          .delete()
          .eq('staff_id', staffId);

        // Then, add selected services
        if (selectedServices.length > 0) {
          const { error: servicesError } = await supabase
            .from('staff_services')
            .insert(
              selectedServices.map(serviceId => ({
                staff_id: staffId,
                service_id: serviceId
              }))
            );

          if (servicesError) throw servicesError;
        }

        // Add default schedule if it's a new staff member
        if (!selectedStaff) {
          const defaultSchedules = [1, 2, 3, 4, 5, 6].map(day => ({
            staff_id: staffId,
            day_of_week: day,
            start_time: '09:00',
            end_time: '20:00'
          }));

          const { error: scheduleError } = await supabase
            .from('staff_schedules')
            .insert(defaultSchedules);

          if (scheduleError) throw scheduleError;
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving staff:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar los datos');
    } finally {
      setLoading(false);
    }
  };

  const servicesByCategory = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-black">
            {selectedStaff ? 'Editar Profesional' : 'Nuevo Profesional'}
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

          <form id="staffForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  CI
                </label>
                <input
                  type="text"
                  value={formData.ci}
                  onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Apellido
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-black mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-black mb-3">Servicios</h3>
              <div className="space-y-4 max-h-[200px] overflow-y-auto border rounded p-3">
                {Object.entries(servicesByCategory).map(([category, services]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-medium text-black capitalize text-sm">{category}</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {services.map(service => (
                        <label key={service.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedServices.includes(service.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedServices([...selectedServices, service.id]);
                              } else {
                                setSelectedServices(selectedServices.filter(id => id !== service.id));
                              }
                            }}
                            className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                          />
                          <span className="text-sm">{service.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
              form="staffForm"
              disabled={loading || selectedServices.length === 0}
              className="bg-primary text-primary-accent px-4 py-2 text-sm hover:bg-black/90 disabled:bg-primary/50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffForm;