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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bill_analyses: {
        Row: {
          account_holder: string | null
          account_number: string | null
          ai_analysis: string | null
          ai_explanations: Json | null
          ai_recommendations: Json | null
          alerts: Json | null
          availability_cost: number | null
          bill_file_url: string | null
          bill_score: number | null
          billed_consumption_kwh: number | null
          billing_days: number | null
          cofins_cost: number | null
          compensated_energy_kwh: number | null
          consumer_class: string | null
          created_at: string
          credit_expiry_date: string | null
          current_credits_kwh: number | null
          demand_contracted_kw: number | null
          demand_measured_kw: number | null
          distributor: string | null
          energy_cost: number | null
          estimated_savings: number | null
          expected_generation_kwh: number | null
          fine_amount: number | null
          generation_efficiency: number | null
          icms_cost: number | null
          id: string
          injected_energy_kwh: number | null
          interest_amount: number | null
          meter_reading_current: number | null
          meter_reading_previous: number | null
          monitored_generation_kwh: number
          pis_cofins_cost: number | null
          pis_cost: number | null
          previous_credits_kwh: number | null
          property_id: string
          public_lighting_cost: number | null
          real_consumption_kwh: number | null
          reference_month: number
          reference_year: number
          sectoral_charges: number | null
          solar_system_id: string | null
          status: string | null
          tariff_flag: string | null
          tariff_flag_cost: number | null
          tariff_modality: string | null
          tariff_te_value: number | null
          tariff_tusd_value: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          ai_analysis?: string | null
          ai_explanations?: Json | null
          ai_recommendations?: Json | null
          alerts?: Json | null
          availability_cost?: number | null
          bill_file_url?: string | null
          bill_score?: number | null
          billed_consumption_kwh?: number | null
          billing_days?: number | null
          cofins_cost?: number | null
          compensated_energy_kwh?: number | null
          consumer_class?: string | null
          created_at?: string
          credit_expiry_date?: string | null
          current_credits_kwh?: number | null
          demand_contracted_kw?: number | null
          demand_measured_kw?: number | null
          distributor?: string | null
          energy_cost?: number | null
          estimated_savings?: number | null
          expected_generation_kwh?: number | null
          fine_amount?: number | null
          generation_efficiency?: number | null
          icms_cost?: number | null
          id?: string
          injected_energy_kwh?: number | null
          interest_amount?: number | null
          meter_reading_current?: number | null
          meter_reading_previous?: number | null
          monitored_generation_kwh: number
          pis_cofins_cost?: number | null
          pis_cost?: number | null
          previous_credits_kwh?: number | null
          property_id: string
          public_lighting_cost?: number | null
          real_consumption_kwh?: number | null
          reference_month: number
          reference_year: number
          sectoral_charges?: number | null
          solar_system_id?: string | null
          status?: string | null
          tariff_flag?: string | null
          tariff_flag_cost?: number | null
          tariff_modality?: string | null
          tariff_te_value?: number | null
          tariff_tusd_value?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          ai_analysis?: string | null
          ai_explanations?: Json | null
          ai_recommendations?: Json | null
          alerts?: Json | null
          availability_cost?: number | null
          bill_file_url?: string | null
          bill_score?: number | null
          billed_consumption_kwh?: number | null
          billing_days?: number | null
          cofins_cost?: number | null
          compensated_energy_kwh?: number | null
          consumer_class?: string | null
          created_at?: string
          credit_expiry_date?: string | null
          current_credits_kwh?: number | null
          demand_contracted_kw?: number | null
          demand_measured_kw?: number | null
          distributor?: string | null
          energy_cost?: number | null
          estimated_savings?: number | null
          expected_generation_kwh?: number | null
          fine_amount?: number | null
          generation_efficiency?: number | null
          icms_cost?: number | null
          id?: string
          injected_energy_kwh?: number | null
          interest_amount?: number | null
          meter_reading_current?: number | null
          meter_reading_previous?: number | null
          monitored_generation_kwh?: number
          pis_cofins_cost?: number | null
          pis_cost?: number | null
          previous_credits_kwh?: number | null
          property_id?: string
          public_lighting_cost?: number | null
          real_consumption_kwh?: number | null
          reference_month?: number
          reference_year?: number
          sectoral_charges?: number | null
          solar_system_id?: string | null
          status?: string | null
          tariff_flag?: string | null
          tariff_flag_cost?: number | null
          tariff_modality?: string | null
          tariff_te_value?: number | null
          tariff_tusd_value?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_analyses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_analyses_solar_system_id_fkey"
            columns: ["solar_system_id"]
            isOneToOne: false
            referencedRelation: "solar_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_raw_data: {
        Row: {
          bill_analysis_id: string
          created_at: string
          extraction_model: string | null
          extraction_version: string | null
          id: string
          ocr_confidence: number | null
          raw_json: Json
        }
        Insert: {
          bill_analysis_id: string
          created_at?: string
          extraction_model?: string | null
          extraction_version?: string | null
          id?: string
          ocr_confidence?: number | null
          raw_json: Json
        }
        Update: {
          bill_analysis_id?: string
          created_at?: string
          extraction_model?: string | null
          extraction_version?: string | null
          id?: string
          ocr_confidence?: number | null
          raw_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "bill_raw_data_bill_analysis_id_fkey"
            columns: ["bill_analysis_id"]
            isOneToOne: false
            referencedRelation: "bill_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          average_consumption: number
          city: string
          created_at: string
          id: string
          name: string
          owner_id: string
          state: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address: string
          average_consumption?: number
          city: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
          state: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string
          average_consumption?: number
          city?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          state?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      property_access: {
        Row: {
          access_level: Database["public"]["Enums"]["app_role"]
          created_at: string
          granted_by: string | null
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          granted_by?: string | null
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          granted_by?: string | null
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_access_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_systems: {
        Row: {
          created_at: string
          expected_monthly_generation: number | null
          id: string
          installation_year: number
          inverter_brand: string | null
          inverter_power_watts: number | null
          last_maintenance_date: string | null
          module_brand: string | null
          module_power_watts: number
          number_of_modules: number
          property_id: string
          system_cost: number | null
          total_power_kw: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_monthly_generation?: number | null
          id?: string
          installation_year: number
          inverter_brand?: string | null
          inverter_power_watts?: number | null
          last_maintenance_date?: string | null
          module_brand?: string | null
          module_power_watts: number
          number_of_modules: number
          property_id: string
          system_cost?: number | null
          total_power_kw?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_monthly_generation?: number | null
          id?: string
          installation_year?: number
          inverter_brand?: string | null
          inverter_power_watts?: number | null
          last_maintenance_date?: string | null
          module_brand?: string | null
          module_power_watts?: number
          number_of_modules?: number
          property_id?: string
          system_cost?: number | null
          total_power_kw?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solar_systems_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      has_property_access: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "viewer" | "admin"
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
      app_role: ["owner", "viewer", "admin"],
    },
  },
} as const
