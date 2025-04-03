export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          ci: string
          created_at: string | null
        }
        Insert: {
          ci: string
          created_at?: string | null
        }
        Update: {
          ci?: string
          created_at?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          created_at: string | null
          date: string
          id: string
          service_id: string
          staff_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          service_id: string
          staff_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          service_id?: string
          staff_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_times: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          is_available_slot: boolean | null
          reason: string
          staff_id: string | null
          start_time: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          is_available_slot?: boolean | null
          reason: string
          staff_id?: string | null
          start_time: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          is_available_slot?: boolean | null
          reason?: string
          staff_id?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_times_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string
          service_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url: string
          service_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_images_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_appointments: {
        Row: {
          created_at: string | null
          date: string
          first_name: string
          id: string
          last_name: string
          phone: string
          service_id: string
          staff_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          date: string
          first_name: string
          id?: string
          last_name: string
          phone: string
          service_id: string
          staff_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          date?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          service_id?: string
          staff_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          error_message: string | null
          guest_appointment_id: string | null
          id: string
          next_retry_at: string | null
          retry_count: number | null
          scheduled_for: string
          sent_at: string | null
          status: string
          type: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          error_message?: string | null
          guest_appointment_id?: string | null
          id?: string
          next_retry_at?: string | null
          retry_count?: number | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          type: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          error_message?: string | null
          guest_appointment_id?: string | null
          id?: string
          next_retry_at?: string | null
          retry_count?: number | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_ref"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_appointment_ref"
            columns: ["guest_appointment_id"]
            isOneToOne: false
            referencedRelation: "guest_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          duration: number
          id: string
          name: string
          price: number
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          duration: number
          id?: string
          name: string
          price: number
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      staff: {
        Row: {
          ci: string
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string
        }
        Insert: {
          ci: string
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone: string
        }
        Update: {
          ci?: string
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
        }
        Relationships: []
      }
      staff_schedules: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          staff_id: string | null
          start_time: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          staff_id?: string | null
          start_time: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          staff_id?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedules_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_services: {
        Row: {
          created_at: string | null
          id: string
          service_id: string | null
          staff_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          service_id?: string | null
          staff_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          service_id?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_services_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          whatsapp_settings: Json | null
        }
        Insert: {
          created_at?: string | null
          id: string
          updated_at?: string | null
          whatsapp_settings?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          whatsapp_settings?: Json | null
        }
        Relationships: []
      }
      users: {
        Row: {
          birth_date: string
          ci: string
          created_at: string | null
          first_name: string
          id: string
          last_name: string
          phone: string
        }
        Insert: {
          birth_date: string
          ci: string
          created_at?: string | null
          first_name: string
          id?: string
          last_name: string
          phone: string
        }
        Update: {
          birth_date?: string
          ci?: string
          created_at?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          reminder_24h: boolean
          reminder_2h: boolean
          whatsapp_enabled: boolean
          sms_fallback: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          reminder_24h?: boolean
          reminder_2h?: boolean
          whatsapp_enabled?: boolean
          sms_fallback?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          reminder_24h?: boolean
          reminder_2h?: boolean
          whatsapp_enabled?: boolean
          sms_fallback?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      },
      whatsapp_logs: {
        Row: {
          id: string
          phone_number: string
          template_type: string
          parameters: Json | null
          status: string
          error_message: string | null
          sent_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          phone_number: string
          template_type: string
          parameters?: Json | null
          status: string
          error_message?: string | null
          sent_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          phone_number?: string
          template_type?: string
          parameters?: Json | null
          status?: string
          error_message?: string | null
          sent_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      execute_sql: {
        Args: {
          sql_query: string
        }
        Returns: undefined
      }
      normalize_ci: {
        Args: {
          ci: string
        }
        Returns: string
      }
      process_pending_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
