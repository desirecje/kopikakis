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
      profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          course: string | null
          faculty: string | null
          year_of_study: string | null
          accommodation: string | null
          study_style: string | null
          gender_preference: string | null
          bio: string | null
          telegram_handle: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          course?: string | null
          faculty?: string | null
          year_of_study?: string | null
          accommodation?: string | null
          study_style?: string | null
          gender_preference?: string | null
          bio?: string | null
          telegram_handle?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          course?: string | null
          faculty?: string | null
          year_of_study?: string | null
          accommodation?: string | null
          study_style?: string | null
          gender_preference?: string | null
          bio?: string | null
          telegram_handle?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      buddy_requests: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          status?: string
          created_at?: string
        }
      }
      bid_modules: {
        Row: {
          id: string
          user_id: string
          module_code: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          module_code: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          module_code?: string
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          reported_id: string
          reason: string
          description: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_id: string
          reason: string
          description?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_id?: string
          reason?: string
          description?: string | null
          status?: string
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {
      promote_user_to_admin: {
        Args: { _email: string }
        Returns: void
      }
    }
    Enums: {}
  }
}