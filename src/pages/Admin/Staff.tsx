import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, Calendar, Briefcase } from 'lucide-react';
import StaffForm from '../../components/Admin/StaffForm';
import StaffSchedule from '../../components/Admin/StaffSchedule';

interface Staff {
  id: string;
  ci: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
}

const Staff = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('first_name', { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError('Error al cargar el personal');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este profesional?')) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('Iniciando proceso de eliminación para staff ID:', id);
      
      // 1. Verificar si hay citas pendientes o confirmadas
      const { data: activeAppointments, error: checkApptError } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('staff_id', id)
        .in('status', ['pending', 'confirmed']);
      
      if (checkApptError) {
        console.error('Error checking active appointments:', checkApptError);
      } else if (activeAppointments && activeAppointments.length > 0) {
        console.log('Citas activas encontradas:', activeAppointments);
        
        // En lugar de lanzar un error, preguntamos al usuario si desea cancelar las citas
        if (confirm(`Este profesional tiene ${activeAppointments.length} citas pendientes o confirmadas. ¿Desea cancelarlas y continuar con la eliminación?`)) {
          console.log('Actualizando citas activas para permitir la eliminación...');
          
          // Actualizar las citas activas estableciendo staff_id a null en lugar de eliminarlas
          const { error: updateApptError } = await supabase
            .from('appointments')
            .update({ staff_id: null, status: 'cancelled' })
            .eq('staff_id', id)
            .in('status', ['pending', 'confirmed']);
          
          if (updateApptError) {
            console.error('Error updating active appointments:', updateApptError);
            throw new Error('Error al actualizar las citas activas: ' + updateApptError.message);
          }
          
          console.log('Citas activas actualizadas exitosamente');
        } else {
          // El usuario decidió no cancelar las citas
          throw new Error(`Operación cancelada: El profesional tiene ${activeAppointments.length} citas pendientes o confirmadas`);
        }
      }
      
      // Verificar si hay citas de invitados pendientes o confirmadas
      const { data: activeGuestAppointments, error: checkGuestApptError } = await supabase
        .from('guest_appointments')
        .select('id, status')
        .eq('staff_id', id)
        .in('status', ['pending', 'confirmed']);
      
      if (checkGuestApptError) {
        console.error('Error checking active guest appointments:', checkGuestApptError);
      } else if (activeGuestAppointments && activeGuestAppointments.length > 0) {
        console.log('Citas de invitados activas encontradas:', activeGuestAppointments);
        
        // Preguntamos al usuario si desea cancelar las citas de invitados
        if (confirm(`Este profesional tiene ${activeGuestAppointments.length} citas de invitados pendientes o confirmadas. ¿Desea cancelarlas y continuar con la eliminación?`)) {
          console.log('Actualizando citas de invitados activas para permitir la eliminación...');
          
          // Actualizar las citas de invitados activas estableciendo staff_id a null
          const { error: updateGuestApptError } = await supabase
            .from('guest_appointments')
            .update({ staff_id: null, status: 'cancelled' })
            .eq('staff_id', id)
            .in('status', ['pending', 'confirmed']);
          
          if (updateGuestApptError) {
            console.error('Error updating active guest appointments:', updateGuestApptError);
            throw new Error('Error al actualizar las citas de invitados activas: ' + updateGuestApptError.message);
          }
          
          console.log('Citas de invitados activas actualizadas exitosamente');
        } else {
          // El usuario decidió no cancelar las citas de invitados
          throw new Error(`Operación cancelada: El profesional tiene ${activeGuestAppointments.length} citas de invitados pendientes o confirmadas`);
        }
      }
      
      // Continuar con el proceso de eliminación de otras relaciones
      // 1. Eliminar citas asociadas (ahora solo las que no están activas)
      const { data: deletedAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .delete()
        .eq('staff_id', id)
        .not('status', 'in', '("pending","confirmed")')
        .select();
      
      if (appointmentsError) {
        console.error('Error deleting appointments:', appointmentsError);
        throw new Error('Error al eliminar las citas asociadas: ' + appointmentsError.message);
      }
      console.log('Citas eliminadas:', deletedAppointments?.length || 0);
      
      // 2. Eliminar citas de invitados asociadas (ahora solo las que no están activas)
      const { data: deletedGuestAppointments, error: guestAppointmentsError } = await supabase
        .from('guest_appointments')
        .delete()
        .eq('staff_id', id)
        .not('status', 'in', '("pending","confirmed")')
        .select();
      
      if (guestAppointmentsError) {
        console.error('Error deleting guest appointments:', guestAppointmentsError);
        throw new Error('Error al eliminar las citas de invitados asociadas: ' + guestAppointmentsError.message);
      }
      console.log('Citas de invitados eliminadas:', deletedGuestAppointments?.length || 0);
      
      // 3. Eliminar servicios asociados en la tabla de unión staff_services
      const { data: deletedStaffServices = [] as any[], error: staffServicesError } = await supabase
        .from('staff_services')
        .delete()
        .eq('staff_id', id)
        .select();
      
      if (staffServicesError) {
        console.error('Error deleting staff services:', staffServicesError);
        throw new Error('Error al eliminar los servicios asociados: ' + staffServicesError.message);
      }
      console.log('Servicios asociados eliminados:', deletedStaffServices?.length ?? 0);

      // 4. Eliminar el registro del personal
      const { error: staffError } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);
      
      if (staffError) {
        console.error('Error deleting staff:', staffError);
        throw new Error('Error al eliminar el profesional: ' + staffError.message);
      }
      
      console.log('Profesional eliminado exitosamente');
      fetchStaff();
    } catch (err) {
      console.error('Error en el proceso de eliminación:', err);
      setError(err instanceof Error ? err.message : 'Error al eliminar el profesional');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (staff: Staff) => {
    setSelectedStaff(staff);
    setShowModal(true);
  };

  const handleSchedule = (staff: Staff) => {
    setSelectedStaff(staff);
    setShowScheduleModal(true);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Profesionales</h1>
        <button
          onClick={() => {
            setSelectedStaff(null);
            setShowModal(true);
          }}
          className="bg-primary text-white px-4 py-2 rounded-md flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Profesional
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && !error ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-3 text-gray-600">Cargando profesionales...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {staff.length === 0 && !loading ? (
            <div className="text-center py-10">
              <p className="text-gray-600">No hay profesionales registrados</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staff.map((person) => (
                  <tr key={person.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {person.first_name} {person.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{person.ci}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{person.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{person.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleSchedule(person)}
                        className="text-primary hover:text-primary-dark mr-3"
                        title="Gestionar horarios"
                      >
                        <Calendar className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(person)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Editar"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(person.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showModal && (
        <StaffForm
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            fetchStaff();
            setShowModal(false);
          }}
          selectedStaff={selectedStaff || undefined}
        />
      )}

      {showScheduleModal && selectedStaff && (
        <StaffSchedule
          staffId={selectedStaff.id}
          staffName={`${selectedStaff.first_name} ${selectedStaff.last_name}`}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => {
            setShowScheduleModal(false);
          }}
        />
      )}
    </div>
  );
};

export default Staff;
