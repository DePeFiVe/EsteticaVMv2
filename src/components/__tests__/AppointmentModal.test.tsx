import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import AppointmentModal from '../AppointmentModal';
import { supabase } from '../../lib/supabase';
import { format, addMinutes, Locale } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

// Mock de las dependencias
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          neq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
          lte: vi.fn(() => Promise.resolve({ data: [], error: null })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          gt: vi.fn(() => Promise.resolve({ data: [], error: null })),
          lt: vi.fn(() => Promise.resolve({ data: [], error: null })),
          setHeader: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        gt: vi.fn(() => ({
          lt: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: { id: 1 }, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }
}));

// Mock de getCurrentUser
vi.mock('../../lib/auth', () => ({
  getCurrentUser: vi.fn(() => ({
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      first_name: 'Test',
      last_name: 'User',
      phone: '099123456'
    }
  }))
}));

// Mock de date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string, options?: { locale?: Locale }) => {
    if (formatStr === 'MMMM yyyy' && options?.locale === es) {
      return 'marzo 2024';
    }
    if (formatStr === 'yyyy-MM-dd') {
      return '2024-03-20';
    }
    if (formatStr === 'HH:mm') {
      return '10:00';
    }
    return formatStr;
  }),
  addMinutes: vi.fn((date, minutes) => new Date(date.getTime() + minutes * 60000)),
  parseISO: vi.fn((dateStr) => new Date(dateStr)),
  startOfDay: vi.fn((date) => new Date(date.setHours(0, 0, 0, 0))),
  endOfDay: vi.fn((date) => new Date(date.setHours(23, 59, 59, 999)))
}));

// Mock de date-fns-tz
vi.mock('date-fns-tz', () => ({
  formatInTimeZone: vi.fn((date, timeZone, formatStr) => {
    if (formatStr === 'HH:mm') {
      return '10:00';
    }
    if (formatStr === 'yyyy-MM-dd\'T\'HH:mm:ssXXX') {
      return '2024-03-20T10:00:00-03:00';
    }
    return formatStr;
  }),
  zonedTimeToUtc: vi.fn((date, timeZone) => new Date(date))
}));

// Mock de supabaseHeaders
vi.mock('../../lib/supabaseHeaders', () => ({
  extendSupabaseWithHeaders: vi.fn(() => supabase)
}));

describe('AppointmentModal', () => {
  const mockService = {
    id: '1',
    name: 'Test Service',
    duration: 60,
    price: 100
  };

  const mockProps = {
    service: mockService,
    isOpen: true,
    onClose: vi.fn()
  };

  const mockStaffData = [
    { staff: { id: '1', first_name: 'Juan', last_name: 'Pérez' } }
  ];

  const mockScheduleData = [
    { day_of_week: 1, start_time: '09:00', end_time: '18:00' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Configuración por defecto de los mocks de Supabase
    vi.mocked(supabase.from).mockImplementation((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockImplementation(() => {
        if (table === 'staff_services') {
          return Promise.resolve({ data: mockStaffData, error: null });
        } else if (table === 'staff_schedules') {
          return Promise.resolve({ data: mockScheduleData, error: null });
        }
        return Promise.resolve({ data: [], error: null });
      })
    }));
  });

  test('renderiza correctamente el modal y carga datos iniciales', async () => {
    render(<AppointmentModal {...mockProps} />);
    expect(screen.getByText('Reservar Cita')).toBeInTheDocument();
    expect(screen.getByText(mockService.name)).toBeInTheDocument();

    // Verificar que se cargan los meses disponibles
    await waitFor(() => {
      expect(screen.getByText('marzo 2024')).toBeInTheDocument();
    });

    // Verificar que se carga el personal
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });
  });

  test('muestra campos de invitado cuando no hay usuario', () => {
    render(<AppointmentModal {...mockProps} />);
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Apellido')).toBeInTheDocument();
    expect(screen.getByLabelText('Teléfono')).toBeInTheDocument();
  });

  test('valida el formato del teléfono', async () => {
    render(<AppointmentModal {...mockProps} />);
    const phoneInput = screen.getByLabelText('Teléfono');
    
    // Teléfono inválido
    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.submit(screen.getByRole('form'));
    
    await waitFor(() => {
      expect(screen.getByText(/Ingresa un número de teléfono válido/)).toBeInTheDocument();
    });

    // Teléfono válido
    fireEvent.change(phoneInput, { target: { value: '099123456' } });
    fireEvent.submit(screen.getByRole('form'));
    
    await waitFor(() => {
      expect(screen.queryByText(/Ingresa un número de teléfono válido/)).not.toBeInTheDocument();
    });
  });

  test('maneja errores en la carga de horarios y fechas no disponibles', async () => {
    // Simular error en la carga de horarios
    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockResolvedValue({ data: null, error: new Error('Error al cargar horarios') })
    }));

    render(<AppointmentModal {...mockProps} />);
    
    // Verificar mensaje de error en la carga inicial
    await waitFor(() => {
      expect(screen.getByText('Error al cargar los meses disponibles')).toBeInTheDocument();
    });

    // Simular selección de fecha no disponible
    const dateInput = screen.getByLabelText('Fecha');
    fireEvent.change(dateInput, { target: { value: '2024-03-20' } });

    // Simular error en la carga de horarios disponibles
    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockResolvedValue({ 
        data: [], 
        error: new Error('Error al cargar horarios disponibles') 
      })
    }));

    await waitFor(() => {
      expect(screen.getByText('Error al cargar los horarios disponibles')).toBeInTheDocument();
    });
  });

  test('maneja correctamente las zonas horarias al mostrar horarios disponibles', async () => {
    const mockAvailableSlots = [
      { start_time: '2024-03-20T10:00:00-03:00', end_time: '2024-03-20T11:00:00-03:00' },
      { start_time: '2024-03-20T11:00:00-03:00', end_time: '2024-03-20T12:00:00-03:00' }
    ];

    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockResolvedValue({ data: mockAvailableSlots, error: null })
    }));

    render(<AppointmentModal {...mockProps} />);

    // Seleccionar fecha y personal
    const dateInput = screen.getByLabelText('Fecha');
    fireEvent.change(dateInput, { target: { value: '2024-03-20' } });

    const staffSelect = screen.getByLabelText('Profesional');
    fireEvent.change(staffSelect, { target: { value: '1' } });

    // Verificar que los horarios se muestran en la zona horaria local
    await waitFor(() => {
      expect(screen.getByText('10:00')).toBeInTheDocument();
      expect(screen.getByText('11:00')).toBeInTheDocument();
    });
  });

  test('maneja errores en la carga de personal', async () => {
    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockResolvedValue({ data: null, error: new Error('Error al cargar personal') })
    }));

    render(<AppointmentModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Error al cargar los profesionales disponibles')).toBeInTheDocument();
    });
  });

  test('actualiza los horarios disponibles al seleccionar fecha', async () => {
    const mockAvailableSlots = [
      { start_time: '2024-03-20T10:00:00Z', end_time: '2024-03-20T11:00:00Z' },
      { start_time: '2024-03-20T11:00:00Z', end_time: '2024-03-20T12:00:00Z' }
    ];

    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockResolvedValue({ data: mockAvailableSlots, error: null })
    }));

    render(<AppointmentModal {...mockProps} />);
    
    // Simular selección de fecha y personal
    const dateInput = screen.getByLabelText('Fecha');
    fireEvent.change(dateInput, { target: { value: '2024-03-20' } });
    
    const staffSelect = screen.getByLabelText('Profesional');
    fireEvent.change(staffSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('10:00')).toBeInTheDocument();
      expect(screen.getByText('11:00')).toBeInTheDocument();
    });
  });

  test('realiza una reserva exitosa como invitado', async () => {
    // Mock de inserción exitosa
    vi.mocked(supabase.from).mockImplementation(() => ({
      insert: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockResolvedValue({ data: [], error: null })
    }));

    // Mock de getCurrentUser para simular usuario no autenticado
    vi.mocked(getCurrentUser).mockReturnValue(null);

    render(<AppointmentModal {...mockProps} />);

    // Llenar formulario de invitado
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Pérez' } });
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '099123456' } });
    
    const dateInput = screen.getByLabelText('Fecha');
    fireEvent.change(dateInput, { target: { value: '2024-03-20' } });
    
    const staffSelect = screen.getByLabelText('Profesional');
    fireEvent.change(staffSelect, { target: { value: '1' } });
    
    const timeSelect = screen.getByLabelText('Hora');
    fireEvent.change(timeSelect, { target: { value: '10:00' } });

    // Enviar formulario
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(screen.getByText('¡Cita reservada con éxito!')).toBeInTheDocument();
    });
  });

  test('maneja errores en la reserva de cita', async () => {
    // Mock de error en la inserción
    vi.mocked(supabase.from).mockImplementation(() => ({
      insert: vi.fn().mockResolvedValue({ 
        data: null, 
        error: new Error('Error al reservar la cita')
      }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockResolvedValue({ data: [], error: null })
    }));

    render(<AppointmentModal {...mockProps} />);

    // Llenar formulario
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Pérez' } });
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '099123456' } });
    
    const dateInput = screen.getByLabelText('Fecha');
    fireEvent.change(dateInput, { target: { value: '2024-03-20' } });
    
    const staffSelect = screen.getByLabelText('Profesional');
    fireEvent.change(staffSelect, { target: { value: '1' } });
    
    const timeSelect = screen.getByLabelText('Hora');
    fireEvent.change(timeSelect, { target: { value: '10:00' } });

    // Enviar formulario
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(screen.getByText('Error al reservar la cita')).toBeInTheDocument();
    });
  });

  test('valida campos requeridos del formulario', async () => {
    render(<AppointmentModal {...mockProps} />);

    // Enviar formulario sin llenar campos
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(screen.getByText('El nombre es requerido')).toBeInTheDocument();
      expect(screen.getByText('El apellido es requerido')).toBeInTheDocument();
      expect(screen.getByText('El teléfono es requerido')).toBeInTheDocument();
      expect(screen.getByText('Debes seleccionar una fecha')).toBeInTheDocument();
      expect(screen.getByText('Debes seleccionar un profesional')).toBeInTheDocument();
      expect(screen.getByText('Debes seleccionar un horario')).toBeInTheDocument();
    });
  });
}));