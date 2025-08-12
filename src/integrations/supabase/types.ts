export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          actual_arrival: string | null
          created_at: string
          estimated_arrival: string | null
          id: string
          pickup_id: string
          scheduled_date: string
          sequence_order: number | null
          status: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          actual_arrival?: string | null
          created_at?: string
          estimated_arrival?: string | null
          id?: string
          pickup_id: string
          scheduled_date: string
          sequence_order?: number | null
          status?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          actual_arrival?: string | null
          created_at?: string
          estimated_arrival?: string | null
          id?: string
          pickup_id?: string
          scheduled_date?: string
          sequence_order?: number | null
          status?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_pickup_id_fkey"
            columns: ["pickup_id"]
            isOneToOne: false
            referencedRelation: "pickups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_name: string
          contact_name: string | null
          created_at: string
          depot_lat: number | null
          depot_lng: number | null
          email: string | null
          id: string
          is_active: boolean | null
          last_pickup_at: string | null
          lifetime_revenue: number | null
          notes: string | null
          open_balance: number | null
          phone: string | null
          pricing_tier_id: string | null
          sla_weeks: number | null
          tags: string[] | null
          type: Database["public"]["Enums"]["client_type"] | null
          updated_at: string
        }
        Insert: {
          company_name: string
          contact_name?: string | null
          created_at?: string
          depot_lat?: number | null
          depot_lng?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_pickup_at?: string | null
          lifetime_revenue?: number | null
          notes?: string | null
          open_balance?: number | null
          phone?: string | null
          pricing_tier_id?: string | null
          sla_weeks?: number | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["client_type"] | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          contact_name?: string | null
          created_at?: string
          depot_lat?: number | null
          depot_lng?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_pickup_at?: string | null
          lifetime_revenue?: number | null
          notes?: string | null
          open_balance?: number | null
          phone?: string | null
          pricing_tier_id?: string | null
          sla_weeks?: number | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["client_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          pickup_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          pickup_id: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          pickup_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_pickup_id_fkey"
            columns: ["pickup_id"]
            isOneToOne: false
            referencedRelation: "pickups"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          issued_date: string | null
          notes: string | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issued_date?: string | null
          notes?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_date?: string | null
          notes?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          access_notes: string | null
          address: string
          client_id: string
          created_at: string
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string | null
          pricing_tier_id: string | null
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          address: string
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          pricing_tier_id?: string | null
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          address?: string
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          pricing_tier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          created_at: string
          default_otr_rate: number | null
          default_pte_rate: number | null
          default_tractor_rate: number | null
          id: string
          name: string
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_otr_rate?: number | null
          default_pte_rate?: number | null
          default_tractor_rate?: number | null
          id?: string
          name?: string
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_otr_rate?: number | null
          default_pte_rate?: number | null
          default_tractor_rate?: number | null
          id?: string
          name?: string
          tax_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      pickups: {
        Row: {
          client_id: string
          computed_revenue: number | null
          created_at: string
          id: string
          location_id: string | null
          notes: string | null
          otr_count: number | null
          pickup_date: string
          preferred_window: string | null
          pricing_tier_id: string | null
          pte_count: number | null
          status: string | null
          tractor_count: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          computed_revenue?: number | null
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          otr_count?: number | null
          pickup_date: string
          preferred_window?: string | null
          pricing_tier_id?: string | null
          pte_count?: number | null
          status?: string | null
          tractor_count?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          computed_revenue?: number | null
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          otr_count?: number | null
          pickup_date?: string
          preferred_window?: string | null
          pricing_tier_id?: string | null
          pte_count?: number | null
          status?: string | null
          tractor_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickups_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickups_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          otr_rate: number | null
          pte_rate: number | null
          rate: number | null
          tractor_rate: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          otr_rate?: number | null
          pte_rate?: number | null
          rate?: number | null
          tractor_rate?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          otr_rate?: number | null
          pte_rate?: number | null
          rate?: number | null
          tractor_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          capacity: number | null
          created_at: string
          id: string
          is_active: boolean | null
          license_plate: string | null
          name: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          license_plate?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          license_plate?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_pickup_revenue: {
        Args: { pickup_row: Database["public"]["Tables"]["pickups"]["Row"] }
        Returns: number
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      client_type: "commercial" | "residential" | "industrial"
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
      client_type: ["commercial", "residential", "industrial"],
    },
  },
} as const
