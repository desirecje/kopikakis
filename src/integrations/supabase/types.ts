export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      menu_items: {
        Row: {
          available: boolean
          created_at: string
          description: string
          id: string
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          description?: string
          id: string
          name: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      option_choices: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_default: boolean
          label: string
          price_delta: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_default?: boolean
          label: string
          price_delta?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_default?: boolean
          label?: string
          price_delta?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_choices_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      option_groups: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          name: string
          required: boolean
          selection_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          name: string
          required?: boolean
          selection_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          name?: string
          required?: boolean
          selection_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_groups_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_audit_log: {
        Row: {
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          to_status: string
        }
        Insert: {
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          to_status: string
        }
        Update: {
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_audit_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_queue_state: {
        Row: {
          id: string
          next_number: number
          reset_at: string
        }
        Insert: {
          id?: string
          next_number?: number
          reset_at?: string
        }
        Update: {
          id?: string
          next_number?: number
          reset_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          cancellation_requested: boolean
          cancellation_requested_at: string | null
          cancelled_at: string | null
          created_at: string
          customer_name: string
          done_at: string | null
          drink: string
          id: string
          notes: string | null
          owner_token: string
          preparing_at: string | null
          queue_number: number | null
          ready_at: string | null
          size: string
          status: string
          status_updated_at: string
        }
        Insert: {
          cancellation_requested?: boolean
          cancellation_requested_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_name: string
          done_at?: string | null
          drink: string
          id?: string
          notes?: string | null
          owner_token?: string
          preparing_at?: string | null
          queue_number?: number | null
          ready_at?: string | null
          size: string
          status?: string
          status_updated_at?: string
        }
        Update: {
          cancellation_requested?: boolean
          cancellation_requested_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_name?: string
          done_at?: string | null
          drink?: string
          id?: string
          notes?: string | null
          owner_token?: string
          preparing_at?: string | null
          queue_number?: number | null
          ready_at?: string | null
          size?: string
          status?: string
          status_updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      session_signups: {
        Row: {
          admin_override: boolean
          created_at: string
          id: string
          name: string
          owner_token: string
          session_id: string
          status: string
          telegram_handle: string
        }
        Insert: {
          admin_override?: boolean
          created_at?: string
          id?: string
          name: string
          owner_token?: string
          session_id: string
          status?: string
          telegram_handle: string
        }
        Update: {
          admin_override?: boolean
          created_at?: string
          id?: string
          name?: string
          owner_token?: string
          session_id?: string
          status?: string
          telegram_handle?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_signups_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          id: string
          label: string
          max_capacity: number
          published: boolean
          session_date: string
          signups_locked: boolean
          special_drink: string
          week_number: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          max_capacity?: number
          published?: boolean
          session_date: string
          signups_locked?: boolean
          special_drink?: string
          week_number: number
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          max_capacity?: number
          published?: boolean
          session_date?: string
          signups_locked?: boolean
          special_drink?: string
          week_number?: number
          year?: number
        }
        Relationships: []
      }
      site_content: {
        Row: {
          hero_eyebrow: string
          hero_headline: string
          hero_headline_accent: string
          hero_subheading: string
          id: string
          special_description: string
          special_enabled: boolean
          special_image_url: string | null
          special_title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          hero_eyebrow?: string
          hero_headline?: string
          hero_headline_accent?: string
          hero_subheading?: string
          id?: string
          special_description?: string
          special_enabled?: boolean
          special_image_url?: string | null
          special_title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          hero_eyebrow?: string
          hero_headline?: string
          hero_headline_accent?: string
          hero_subheading?: string
          id?: string
          special_description?: string
          special_enabled?: boolean
          special_image_url?: string | null
          special_title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_session_signup: {
        Args: { _name: string; _session_id: string; _telegram_handle: string }
        Returns: {
          id: string
          owner_token: string
          status: string
        }[]
      }
      delete_session_signup: {
        Args: { _owner_token: string; _signup_id: string }
        Returns: boolean
      }
      demote_admin: { Args: { _user_id: string }; Returns: undefined }
      get_my_lockout_weeks: {
        Args: { _handle: string }
        Returns: {
          week: number
          year: number
        }[]
      }
      get_my_signups: {
        Args: { _handle: string }
        Returns: {
          id: string
          session_id: string
          session_week: number
          session_year: number
          status: string
          telegram_handle: string
        }[]
      }
      get_session_seat_counts: {
        Args: never
        Returns: {
          accepted_count: number
          session_id: string
          total_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      promote_user_to_admin: { Args: { _email: string }; Returns: string }
      reset_order_queue: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
