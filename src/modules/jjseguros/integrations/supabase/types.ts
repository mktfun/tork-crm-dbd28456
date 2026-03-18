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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      base_conhecimento_seguros: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      integration_destinations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      integration_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          payload: Json | null
          response: Json | null
          service_name: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json | null
          response?: Json | null
          service_name: string
          status: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json | null
          response?: Json | null
          service_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          created_at: string | null
          health_accept_cnpj: boolean | null
          health_accept_cpf: boolean | null
          health_age_limit_max: number | null
          health_age_limit_min: number | null
          health_budget_min: number | null
          health_cnpj_min_employees: number | null
          health_cpf_require_higher_education: boolean | null
          health_lives_max: number | null
          health_lives_min: number | null
          health_region_locations: Json | null
          health_region_mode: string | null
          health_region_states: string[] | null
          id: number
          is_active: boolean
          meta_capi_token: string | null
          meta_pixel_id: string | null
          mode: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          health_accept_cnpj?: boolean | null
          health_accept_cpf?: boolean | null
          health_age_limit_max?: number | null
          health_age_limit_min?: number | null
          health_budget_min?: number | null
          health_cnpj_min_employees?: number | null
          health_cpf_require_higher_education?: boolean | null
          health_lives_max?: number | null
          health_lives_min?: number | null
          health_region_locations?: Json | null
          health_region_mode?: string | null
          health_region_states?: string[] | null
          id?: number
          is_active?: boolean
          meta_capi_token?: string | null
          meta_pixel_id?: string | null
          mode?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          health_accept_cnpj?: boolean | null
          health_accept_cpf?: boolean | null
          health_age_limit_max?: number | null
          health_age_limit_min?: number | null
          health_budget_min?: number | null
          health_cnpj_min_employees?: number | null
          health_cpf_require_higher_education?: boolean | null
          health_lives_max?: number | null
          health_lives_min?: number | null
          health_region_locations?: Json | null
          health_region_mode?: string | null
          health_region_states?: string[] | null
          id?: number
          is_active?: boolean
          meta_capi_token?: string | null
          meta_pixel_id?: string | null
          mode?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          abandoned_alert_sent: boolean | null
          cnpj: string | null
          cpf: string | null
          created_at: string
          custom_fields: Json
          disqualification_reason: string | null
          email: string
          funnel_name: string | null
          funnel_stage: string | null
          id: string
          insurance_type: string
          internal_notes: string | null
          is_completed: boolean | null
          is_qualified: boolean | null
          last_step_index: number | null
          name: string
          person_type: string | null
          phone: string
          qar_report: string | null
          rd_station_error: string | null
          rd_station_synced: boolean
          sync_confirmed_at: string | null
        }
        Insert: {
          abandoned_alert_sent?: boolean | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          custom_fields?: Json
          disqualification_reason?: string | null
          email: string
          funnel_name?: string | null
          funnel_stage?: string | null
          id?: string
          insurance_type: string
          internal_notes?: string | null
          is_completed?: boolean | null
          is_qualified?: boolean | null
          last_step_index?: number | null
          name: string
          person_type?: string | null
          phone: string
          qar_report?: string | null
          rd_station_error?: string | null
          rd_station_synced?: boolean
          sync_confirmed_at?: string | null
        }
        Update: {
          abandoned_alert_sent?: boolean | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          custom_fields?: Json
          disqualification_reason?: string | null
          email?: string
          funnel_name?: string | null
          funnel_stage?: string | null
          id?: string
          insurance_type?: string
          internal_notes?: string | null
          is_completed?: boolean | null
          is_qualified?: boolean | null
          last_step_index?: number | null
          name?: string
          person_type?: string | null
          phone?: string
          qar_report?: string | null
          rd_station_error?: string | null
          rd_station_synced?: boolean
          sync_confirmed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_seguros: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
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
    Enums: {},
  },
} as const
