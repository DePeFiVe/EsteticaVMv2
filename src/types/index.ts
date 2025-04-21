export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string | null;
  category: string;
}

export interface ServiceCategory {
  name: string;
  services: Service[];
  image: string;
}

export interface Appointment {
  id: string;
  service_id: string;
  date: Date;
  user_id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: Date;
}

export interface GuestAppointment {
  id: string;
  service_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  date: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: Date;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  ci: string;
  phone: string;
  birthDate: Date;
  isAdmin?: boolean;
  access_token?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
}

export interface Database {
  public: {
    Tables: {
      services: {
        Row: {
          id: string;
          category: string;
          name: string;
          price: number;
          duration: number;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          category: string;
          name: string;
          price: number;
          duration: number;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          category?: string;
          name?: string;
          price?: number;
          duration?: number;
          description?: string | null;
          created_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          service_id: string;
          user_id: string;
          date: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          user_id: string;
          date: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          service_id?: string;
          user_id?: string;
          date?: string;
          status?: string;
          created_at?: string;
        };
      };
      guest_appointments: {
        Row: {
          id: string;
          service_id: string;
          first_name: string;
          last_name: string;
          phone: string;
          date: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          first_name: string;
          last_name: string;
          phone: string;
          date: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          service_id?: string;
          first_name?: string;
          last_name?: string;
          phone?: string;
          date?: string;
          status?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          appointment_id?: string;
          guest_appointment_id?: string;
          type: string;
          notification_channel?: string;
          status: string;
          scheduled_for: string;
          sent_at?: string;
          error_message?: string;
          service_instructions?: string;
          retry_count: number;
          next_retry_at?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id?: string;
          guest_appointment_id?: string;
          type: string;
          notification_channel?: string;
          status: string;
          scheduled_for: string;
          sent_at?: string;
          error_message?: string;
          service_instructions?: string;
          retry_count?: number;
          next_retry_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          guest_appointment_id?: string;
          type?: string;
          notification_channel?: string;
          status?: string;
          scheduled_for?: string;
          sent_at?: string;
          error_message?: string;
          service_instructions?: string;
          retry_count?: number;
          next_retry_at?: string;
          created_at?: string;
        };
      };
    };
  };
}