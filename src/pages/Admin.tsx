import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isAdmin } from '../lib/auth';
import { format, addMinutes, parseISO } from 'date-fns';
import { Calendar, Clock, CheckCircle, XCircle, BarChart2, CalendarIcon, Lock, Users, UserX, MessageSquare } from 'lucide-react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format as formatDate, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Staff from './Admin/Staff';
import NotificationStatus from '../components/NotificationStatus';
// import { deleteBlockedTime } from '../lib/admin'; // Eliminado porque ya no se utiliza
import TimeSlotManager from '../components/Admin/TimeSlotManager';
import WhatsAppSettings from '../components/WhatsAppSettings';
// Temporarily comment out until WhatsAppSimulator component is created
// import WhatsAppSimulator from '../components/WhatsAppSimulator';

interface AppointmentWithDetails {
  id: string;
  date: string;
  status: string;
  service: {
    name: string;
    duration: number;
    price: number;
  };
  user: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
  first_name?: string;
  last_name?: string;
  phone?: string;
  isGuest?: boolean;
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface ServiceStats {
  name: string;
  count: number;
  revenue: number;
  month?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    client?: string;
    phone?: string;
    service?: string;
    duration?: number;
    isBlocked?: boolean;
    isAvailableSlot?: boolean;
    reason?: string;
    staffId?: string;
    status?: string;
  };
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
}

const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format: formatDate,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const Admin = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [stats, setStats] = useState<ServiceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'calendar' | 'pending' | 'stats' | 'staff' | 'whatsapp'>('calendar');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<AppointmentWithDetails[]>([]);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [monthlyStats, setMonthlyStats] = useState<{
    totalAppointments: number;
    totalRevenue: number;
    month: string;
  }>({ totalAppointments: 0, totalRevenue: 0, month: '' });
  const [availableMonths, setAvailableMonths] = useState<{value: string, label: string}[]>([]);
  const [showWhatsAppSettings, setShowWhatsAppSettings] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log('Verificando permisos para acceder al panel de administración...');
      const adminStatus = await isAdmin();
      console.log('Resultado de verificación de permisos de administrador:', adminStatus ? 'Acceso permitido' : 'Acceso denegado');
      
      if (!adminStatus) {
        console.log('Redirigiendo a página principal: usuario no es administrador');
        navigate('/');
      } else {
        console.log('Acceso al panel de administración concedido');
        fetchStaffMembers();
        generateAvailableMonths();
      }
    };

    checkAdminStatus();
  }, [navigate]);

  useEffect(() => {
    if (selectedStaff) {
      fetchData();
    }
  }, [selectedStaff]);

  useEffect(() => {
    if (selectedMonth) {
      calculateMonthlyStats();
    }
  }, [selectedMonth, appointments]);

  const generateAvailableMonths = () => {
    const months = [];
    const currentDate = new Date();
    
    // Generate last 6 months and next 6 months
    for (let i = -6; i <= 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        value: monthValue,
        label: format(date, 'MMMM yyyy', { locale: es })
      });
    }
    
    setAvailableMonths(months);
    
    // Set current month as default
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(currentMonth);
  };

  const calculateMonthlyStats = () => {
    if (!selectedMonth || !appointments.length) return;
    
    const [year, month] = selectedMonth.split('-');
    const filteredAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate.getFullYear() === parseInt(year) && 
             aptDate.getMonth() + 1 === parseInt(month) &&
             (apt.status === 'confirmed' || apt.status === 'no-show');
    });
    
    // Only count confirmed appointments for revenue (not no-shows)
    const confirmedAppointments = filteredAppointments.filter(apt => apt.status === 'confirmed');
    
    const totalAppointments = filteredAppointments.length;
    const totalRevenue = confirmedAppointments.reduce((sum, apt) => sum + apt.service.price, 0);
    
    setMonthlyStats({
      totalAppointments,
      totalRevenue,
      month: format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM yyyy', { locale: es })
    });
  };

  const fetchStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, first_name, last_name')
        .order('first_name');

      if (error) throw error;
      setStaffMembers(data || []);
      
      // Select first staff member by default
      if (data && data.length > 0) {
        setSelectedStaff(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching staff members:', err);
      setError('Error al cargar los profesionales');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch appointments
      const [
        { data: appointmentsData, error: appointmentsError },
        { data: guestAppointmentsData, error: guestAppointmentsError },
        { data: blockedTimesData, error: blockedTimesError }
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select(`
            id,
            date,
            status,
            service:services (
              name,
              duration,
              price
            ),
            user:users (
              first_name,
              last_name,
              phone
            ),
            staff:staff (
              id,
              first_name,
              last_name
            )
          `)
          .eq('staff_id', selectedStaff)
          .order('date', { ascending: true }),
        supabase
          .from('guest_appointments')
          .select(`
            id,
            date,
            status,
            service:services (
              name,
              duration,
              price
            ),
            first_name,
            last_name,
            phone,
            staff:staff (
              id,
              first_name,
              last_name
            )
          `)
          .eq('staff_id', selectedStaff)
          .order('date', { ascending: true }),
        supabase
          .from('blocked_times')
          .select('*')
          .or(`staff_id.is.null,staff_id.eq.${selectedStaff}`)
          .order('start_time', { ascending: true })
       ]);

      if (appointmentsError) throw appointmentsError;
      if (guestAppointmentsError) throw guestAppointmentsError;
      if (blockedTimesError) throw blockedTimesError;

      // Combine and format appointments
      const allAppointments = [
        ...(appointmentsData || []).map(apt => ({
          ...apt,
          isGuest: false
        })),
        ...(guestAppointmentsData || []).map(apt => ({
          ...apt,
          isGuest: true,
          user: null
        }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setAppointments(allAppointments as AppointmentWithDetails[]);

      // Separate pending appointments
      const pending = allAppointments.filter(apt => apt.status === 'pending');
setPendingAppointments(pending as AppointmentWithDetails[]);

      // Create calendar events from confirmed appointments and blocked times
      const confirmedEvents = allAppointments
        .filter(apt => apt.status === 'confirmed' || apt.status === 'no-show')
        .map(apt => {
          const startDate = parseISO(apt.date);
          const endDate = addMinutes(startDate, apt.service.duration);
          const clientName = apt.user 
            ? `${apt.user.first_name} ${apt.user.last_name}`
            : `${apt.first_name} ${apt.last_name}`;
          const clientPhone = apt.user ? apt.user.phone : apt.phone;

          return {
            id: apt.id,
            title: apt.status === 'no-show' ? `${apt.service.name} (No asistió)` : apt.service.name,
            start: startDate,
            end: endDate,
            resource: {
              client: clientName,
              phone: clientPhone,
              service: apt.service.name,
              duration: apt.service.duration,
              staffId: apt.staff?.id,
              status: apt.status
            }
          };
        });

      // Filter out available time slots (they're handled differently)
      const filteredBlockedTimes = (blockedTimesData || []).filter(block => !block.is_available_slot);
      
      // Add blocked times as events
      const blockedEvents = filteredBlockedTimes.map(block => ({
        id: block.id,
        title: 'BLOQUEADO',
        start: new Date(block.start_time),
        end: new Date(block.end_time),
        resource: {
          isBlocked: true,
          reason: block.reason,
          staffId: block.staff_id
        }
      }));

      // Add available time slots as events with special styling
      const availableSlotEvents = (blockedTimesData || [])
        .filter(block => block.is_available_slot)
        .map(block => ({
          id: block.id,
          title: 'DISPONIBLE',
          start: new Date(block.start_time),
          end: new Date(block.end_time),
          resource: {
            isAvailableSlot: true,
            reason: block.reason,
            staffId: block.staff_id
          }
        }));

      setEvents((prevEvents) => {
        // Cast events to ensure type compatibility with CalendarEvent[]
        const newEvents = [...confirmedEvents, ...blockedEvents, ...availableSlotEvents] as CalendarEvent[];
        return newEvents;
      });

      // Calculate service statistics
      const serviceStats = allAppointments.reduce((acc: ServiceStats[], apt) => {
        // Only count confirmed appointments for stats
        if (apt.status !== 'confirmed') return acc;
        
        const aptDate = new Date(apt.date);
        const monthKey = `${aptDate.getFullYear()}-${String(aptDate.getMonth() + 1).padStart(2, '0')}`;
// Remove unused monthLabel declaration
        
        const existingService = acc.find(s => 
          s.name === apt.service.name && 
          s.month === monthKey
        );
        
        if (existingService) {
          existingService.count += 1;
          existingService.revenue += apt.service.price;
        } else {
          acc.push({
            name: apt.service.name,
            count: 1,
            revenue: apt.service.price,
            month: monthKey
          });
        }
        return acc;
      }, []);

      setStats(serviceStats.sort((a, b) => b.count - a.count));
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: string, isGuest: boolean) => {
    try {
      const table = isGuest ? 'guest_appointments' : 'appointments';
      const { error: updateError } = await supabase
        .from(table)
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Update local state
      const updatedAppointments = appointments.map(apt => {
        if (apt.id === appointmentId) {
          const updatedApt = { ...apt, status: newStatus };
          
          // If confirmed, add to calendar events
          if (newStatus === 'confirmed' || newStatus === 'no-show') {
            const startDate = parseISO(apt.date);
            const endDate = addMinutes(startDate, apt.service.duration);
            const clientName = apt.user 
              ? `${apt.user.first_name} ${apt.user.last_name}`
              : `${apt.first_name} ${apt.last_name}`;
            const clientPhone = apt.user ? apt.user.phone : apt.phone;

            const newEvent: CalendarEvent = {
              id: apt.id,
              title: newStatus === 'no-show' ? `${apt.service.name} (No asistió)` : apt.service.name,
              start: startDate,
              end: endDate,
              resource: {
                client: clientName,
                phone: clientPhone,
                service: apt.service.name,
                duration: apt.service.duration,
                staffId: apt.staff?.id,
                status: newStatus
              }
            };
            
            // Remove existing event if it exists
            const filteredEvents = events.filter(event => event.id !== apt.id);
            setEvents([...filteredEvents, newEvent]);
          } else if (newStatus === 'cancelled') {
            // Remove from events if cancelled
            setEvents(prev => prev.filter(event => event.id !== apt.id));
          }

          return updatedApt;
        }
        return apt;
      });

      setAppointments(updatedAppointments);
      setPendingAppointments(updatedAppointments.filter(apt => apt.status === 'pending'));
      
      // Recalculate stats if needed
      if (selectedMonth) {
        calculateMonthlyStats();
      }

    } catch (err) {
      console.error('Error updating appointment:', err);
      setError('Error al actualizar la cita');
    }
  };

  const handleDeleteBlock = async (eventId: string) => {
    try {
      // Mostrar indicador de carga o deshabilitar botones si es necesario
      setLoading(true);
      
      // Eliminar directamente el horario de la base de datos
      const { error: deleteError } = await supabase
        .from('blocked_times')
        .delete()
        .eq('id', eventId);

      if (deleteError) {
        throw new Error(`Error al eliminar el horario: ${deleteError.message}`);
      }
      
      // Actualizar la UI eliminando el evento
      setEvents(prev => prev.filter(event => event.id !== eventId));
      // Opcional: mostrar mensaje de éxito
      setError(null);
    } catch (err) {
      console.error('Error deleting blocked time:', err);
      // Mostrar mensaje de error al usuario
      setError(err instanceof Error ? err.message : 'Error al eliminar el horario');
    } finally {
      // Asegurar que el indicador de carga se oculte
      setLoading(false);
      
      // Refrescar los datos después de un breve retraso
      setTimeout(() => {
        fetchData();
      }, 500);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'confirmed':
        return 'Confirmada';
      case 'cancelled':
        return 'Cancelada';
      case 'no-show':
        return 'No asistió';
      default:
        return status;
    }
  };

  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    if (event.resource?.isBlocked) {
      return (
        <div className="p-1">
          <div className="font-semibold flex items-center">
            <Lock className="h-4 w-4 mr-1" />
            BLOQUEADO
          </div>
          <div className="text-sm">
            <div>{event.resource.reason}</div>
            <div>{format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteBlock(event.id);
            }}
            className="text-xs text-red-500 hover:text-red-700 mt-1"
          >
            Eliminar bloqueo
          </button>
        </div>
      );
    }
    
    if (event.resource?.isAvailableSlot) {
      return (
        <div className="p-1 bg-green-50 border border-green-200">
          <div className="font-semibold flex items-center text-green-700">
            <Clock className="h-4 w-4 mr-1" />
            DISPONIBLE
          </div>
          <div className="text-sm text-green-700">
            <div>{format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteBlock(event.id);
            }}
            className="text-xs text-red-500 hover:text-red-700 mt-1"
          >
            Eliminar horario
          </button>
        </div>
      );
    }

    return (
      <div className={`p-1 ${event.resource?.status === 'no-show' ? 'bg-purple-50' : ''}`}>
        <div className="font-semibold">{event.resource?.service}</div>
        <div className="text-sm">
          <div>{event.resource?.client}</div>
          <div>{event.resource?.phone}</div>
          <div>{format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</div>
        </div>
      </div>
    );
  };

  if (loading && !selectedStaff) {
    return (
      <div className="min-h-screen py-16 flex items-center justify-center">
        <div className="text-xl text-black">Cargando datos...</div>
      </div>
    );
  }

  if (error && !selectedStaff) {
    return (
      <div className="min-h-screen py-16 flex items-center justify-center">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-black">Panel de Administración</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 flex items-center ${
                view === 'calendar' 
                  ? 'bg-primary text-primary-accent' 
                  : 'bg-gray-200 text-black'
              }`}
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Calendario
            </button>
            <button
              onClick={() => setView('pending')}
              className={`px-4 py-2 flex items-center ${
                view === 'pending' 
                  ? 'bg-primary text-primary-accent' 
                  : 'bg-gray-200 text-black'
              }`}
            >
              <Clock className="w-4 h-4 mr-2" />
              Pendientes ({pendingAppointments.length})
            </button>
            <button
              onClick={() => setView('stats')}
              className={`px-4 py-2 flex items-center ${
                view === 'stats' 
                  ? 'bg-primary text-primary-accent' 
                  : 'bg-gray-200 text-black'
              }`}
            >
              <BarChart2 className="w-4 h-4 mr-2" />
              Estadísticas
            </button>
            <button
              onClick={() => setView('staff')}
              className={`px-4 py-2 flex items-center ${
                view === 'staff' 
                  ? 'bg-primary text-primary-accent' 
                  : 'bg-gray-200 text-black'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Personal
            </button>
            <button
              onClick={() => setView('whatsapp')}
              className={`px-4 py-2 flex items-center ${
                view === 'whatsapp' 
                  ? 'bg-primary text-primary-accent' 
                  : 'bg-gray-200 text-black'
              }`}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              WhatsApp
            </button>
          </div>
        </div>

        {view === 'calendar' && (
          <div className="bg-white shadow-lg p-6">
            <div className="flex justify-between mb-4">
              <div className="w-64">
                <label className="block text-sm font-medium text-black mb-1">
                  Profesional
                </label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {staffMembers.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.first_name} {staff.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowTimeSlotModal(true)}
                  className="bg-green-600 text-white px-4 py-2 flex items-center"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Gestionar Horarios
                </button>
              </div>
            </div>
            <BigCalendar
              localizer={localizer}
              events={events.filter(event => 
                !event.resource?.staffId || event.resource.staffId === selectedStaff
              )}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 'calc(100vh - 200px)' }}
              components={{
                event: EventComponent
              }}
              messages={{
                next: "Siguiente",
                previous: "Anterior",
                today: "Hoy",
                month: "Mes",
                week: "Semana",
                day: "Día",
                agenda: "Agenda",
                date: "Fecha",
                time: "Hora",
                event: "Evento",
                noEventsInRange: "No hay citas en este rango"
              }}
            />
          </div>
        )}

        {showTimeSlotModal && selectedStaff && staffMembers.length > 0 && (
          <TimeSlotManager
            staffId={selectedStaff}
            staffName={staffMembers.find(s => s.id === selectedStaff)?.first_name + ' ' + staffMembers.find(s => s.id === selectedStaff)?.last_name}
            onClose={() => setShowTimeSlotModal(false)}
            onSuccess={() => {
              fetchData();
              setShowTimeSlotModal(false);
            }}
          />
        )}

        {view === 'pending' && (
          <div className="grid gap-6">
            {pendingAppointments.length === 0 ? (
              <div className="text-center py-8 bg-white shadow-lg">
                <p className="text-xl text-gray-600">No hay citas pendientes</p>
              </div>
            ) : (
              pendingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-white shadow-lg p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2 mb-4 md:mb-0">
                      <h3 className="text-xl font-semibold text-black">
                        {appointment.service.name}
                      </h3>
                      <p className="text-gray-600">
                        {appointment.user 
                          ? `${appointment.user.first_name} ${appointment.user.last_name}`
                          : `${appointment.first_name} ${appointment.last_name} (Invitado)`}
                      </p>
                      <p className="text-gray-600">
                        {appointment.user?.phone || appointment.phone}
                      </p>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-5 w-5 mr-2" />
                        <span>
                          {format(new Date(appointment.date), 'dd/MM/yyyy', { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-5 w-5 mr-2" />
                        <span>
                          {format(new Date(appointment.date), 'HH:mm', { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className={`px-3 py-1 rounded-sm text-sm ${getStatusColor(appointment.status)}`}>
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                      {appointment.status === 'confirmed' && (
                        <div className="mt-2">
                          <NotificationStatus 
                            appointmentId={appointment.id} 
                            isGuest={!!appointment.isGuest} 
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end space-y-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-black">
                          ${appointment.service.price}
                        </p>
                        <p className="text-sm text-gray-600">
                          {appointment.service.duration} minutos
                        </p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStatusUpdate(appointment.id, 'confirmed', !!appointment.isGuest)}
                          className="p-2 text-green-600 hover:text-green-800"
                          title="Confirmar cita"
                        >
                          <CheckCircle className="h-6 w-6" />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(appointment.id, 'no-show', !!appointment.isGuest)}
                          className="p-2 text-purple-600 hover:text-purple-800"
                          title="Marcar como no asistió"
                        >
                          <UserX className="h-6 w-6" />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(appointment.id, 'cancelled', !!appointment.isGuest)}
                          className="p-2 text-red-600 hover:text-red-800"
                          title="Cancelar cita"
                        >
                          <XCircle className="h-6 w-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {view === 'stats' && (
          <div className="grid gap-8">
            <div className="bg-white shadow-lg p-6">
              <h2 className="text-2xl font-bold text-black mb-6 flex items-center">
                <BarChart2 className="h-6 w-6 mr-2" />
                Estadísticas de Servicios
              </h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-black mb-1">
                  Mes
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-64 px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {availableMonths.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Monthly summary */}
              <div className="bg-gray-50 p-4 mb-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-2">Resumen mensual: {monthlyStats.month}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">Total de citas:</p>
                    <p className="text-2xl font-bold">{monthlyStats.totalAppointments}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Ingresos totales:</p>
                    <p className="text-2xl font-bold">${monthlyStats.totalRevenue}</p>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Servicio</th>
                      <th className="text-right py-2 px-4">Citas</th>
                      <th className="text-right py-2 px-4">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats
                      .filter(stat => !stat.month || stat.month === selectedMonth)
                      .map((stat, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2 px-4">{stat.name}</td>
                          <td className="text-right py-2 px-4">{stat.count}</td>
                          <td className="text-right py-2 px-4">${stat.revenue}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === 'staff' && <Staff />}

        {view === 'whatsapp' && (
          <div className="mt-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Configuración de WhatsApp
              </h2>
              <p className="mb-4 text-gray-600">
                Configura los parámetros de Twilio para enviar notificaciones y recordatorios por WhatsApp.
              </p>
              <WhatsAppSettings onClose={() => setView('calendar')} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;