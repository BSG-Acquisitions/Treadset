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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          actual_arrival: string | null
          created_at: string
          driver_id: string | null
          estimated_arrival: string | null
          hauler_id: string | null
          id: string
          organization_id: string
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
          driver_id?: string | null
          estimated_arrival?: string | null
          hauler_id?: string | null
          id?: string
          organization_id: string
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
          driver_id?: string | null
          estimated_arrival?: string | null
          hauler_id?: string | null
          id?: string
          organization_id?: string
          pickup_id?: string
          scheduled_date?: string
          sequence_order?: number | null
          status?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_hauler_id_fkey"
            columns: ["hauler_id"]
            isOneToOne: false
            referencedRelation: "hauler_overlay_view"
            referencedColumns: ["hauler_id"]
          },
          {
            foreignKeyName: "assignments_hauler_id_fkey"
            columns: ["hauler_id"]
            isOneToOne: false
            referencedRelation: "haulers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
      audit_events: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          organization_id: string
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          organization_id: string
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_pricing_overrides: {
        Row: {
          client_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          notes: string | null
          organization_id: string
          rim: Database["public"]["Enums"]["rim_status"]
          service_mode: Database["public"]["Enums"]["service_mode"]
          size_max_inches: number | null
          size_min_inches: number | null
          tire_category: Database["public"]["Enums"]["tire_category"]
          unit_price: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          rim?: Database["public"]["Enums"]["rim_status"]
          service_mode: Database["public"]["Enums"]["service_mode"]
          size_max_inches?: number | null
          size_min_inches?: number | null
          tire_category: Database["public"]["Enums"]["tire_category"]
          unit_price: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          rim?: Database["public"]["Enums"]["rim_status"]
          service_mode?: Database["public"]["Enums"]["service_mode"]
          size_max_inches?: number | null
          size_min_inches?: number | null
          tire_category?: Database["public"]["Enums"]["tire_category"]
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      client_summaries: {
        Row: {
          average_pickup_size: number | null
          client_id: string
          created_at: string
          first_pickup_date: string | null
          id: string
          last_pickup_date: string | null
          month: number | null
          notes: string | null
          organization_id: string
          pickup_frequency_days: number | null
          total_otr: number | null
          total_pickups: number | null
          total_ptes: number | null
          total_revenue: number | null
          total_tractor: number | null
          total_volume_yards: number | null
          total_weight_tons: number | null
          updated_at: string
          year: number
        }
        Insert: {
          average_pickup_size?: number | null
          client_id: string
          created_at?: string
          first_pickup_date?: string | null
          id?: string
          last_pickup_date?: string | null
          month?: number | null
          notes?: string | null
          organization_id: string
          pickup_frequency_days?: number | null
          total_otr?: number | null
          total_pickups?: number | null
          total_ptes?: number | null
          total_revenue?: number | null
          total_tractor?: number | null
          total_volume_yards?: number | null
          total_weight_tons?: number | null
          updated_at?: string
          year: number
        }
        Update: {
          average_pickup_size?: number | null
          client_id?: string
          created_at?: string
          first_pickup_date?: string | null
          id?: string
          last_pickup_date?: string | null
          month?: number | null
          notes?: string | null
          organization_id?: string
          pickup_frequency_days?: number | null
          total_otr?: number | null
          total_pickups?: number | null
          total_ptes?: number | null
          total_revenue?: number | null
          total_tractor?: number | null
          total_volume_yards?: number | null
          total_weight_tons?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_summaries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_summaries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_entity_rollup"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "client_summaries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_summary"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "client_summaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_workflows: {
        Row: {
          client_id: string
          contact_frequency_days: number | null
          created_at: string
          id: string
          last_contact_date: string | null
          next_contact_date: string | null
          notes: string | null
          organization_id: string
          status: string
          updated_at: string
          workflow_type: string
        }
        Insert: {
          client_id: string
          contact_frequency_days?: number | null
          created_at?: string
          id?: string
          last_contact_date?: string | null
          next_contact_date?: string | null
          notes?: string | null
          organization_id: string
          status?: string
          updated_at?: string
          workflow_type?: string
        }
        Update: {
          client_id?: string
          contact_frequency_days?: number | null
          created_at?: string
          id?: string
          last_contact_date?: string | null
          next_contact_date?: string | null
          notes?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_client_workflows_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_client_workflows_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_entity_rollup"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "fk_client_workflows_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_summary"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "fk_client_workflows_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          city: string | null
          company_name: string
          contact_name: string | null
          county: string | null
          created_at: string
          depot_lat: number | null
          depot_lng: number | null
          email: string | null
          id: string
          is_active: boolean | null
          last_manifest_at: string | null
          last_payment_at: string | null
          last_pickup_at: string | null
          lifetime_revenue: number | null
          mailing_address: string | null
          notes: string | null
          open_balance: number | null
          organization_id: string
          phone: string | null
          physical_address: string | null
          physical_city: string | null
          physical_state: string | null
          physical_zip: string | null
          pricing_tier_id: string | null
          sla_weeks: number | null
          state: string | null
          tags: string[] | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          city?: string | null
          company_name: string
          contact_name?: string | null
          county?: string | null
          created_at?: string
          depot_lat?: number | null
          depot_lng?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_manifest_at?: string | null
          last_payment_at?: string | null
          last_pickup_at?: string | null
          lifetime_revenue?: number | null
          mailing_address?: string | null
          notes?: string | null
          open_balance?: number | null
          organization_id: string
          phone?: string | null
          physical_address?: string | null
          physical_city?: string | null
          physical_state?: string | null
          physical_zip?: string | null
          pricing_tier_id?: string | null
          sla_weeks?: number | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          city?: string | null
          company_name?: string
          contact_name?: string | null
          county?: string | null
          created_at?: string
          depot_lat?: number | null
          depot_lng?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_manifest_at?: string | null
          last_payment_at?: string | null
          last_pickup_at?: string | null
          lifetime_revenue?: number | null
          mailing_address?: string | null
          notes?: string | null
          open_balance?: number | null
          organization_id?: string
          phone?: string | null
          physical_address?: string | null
          physical_city?: string | null
          physical_state?: string | null
          physical_zip?: string | null
          pricing_tier_id?: string | null
          sla_weeks?: number | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      conversions: {
        Row: {
          created_at: string | null
          factor: number
          id: string
          notes: string | null
          precedence: number | null
          rounding: Database["public"]["Enums"]["rounding_type"] | null
          unit_from: Database["public"]["Enums"]["unit_basis"]
          unit_to: Database["public"]["Enums"]["unit_basis"]
        }
        Insert: {
          created_at?: string | null
          factor: number
          id?: string
          notes?: string | null
          precedence?: number | null
          rounding?: Database["public"]["Enums"]["rounding_type"] | null
          unit_from: Database["public"]["Enums"]["unit_basis"]
          unit_to: Database["public"]["Enums"]["unit_basis"]
        }
        Update: {
          created_at?: string | null
          factor?: number
          id?: string
          notes?: string | null
          precedence?: number | null
          rounding?: Database["public"]["Enums"]["rounding_type"] | null
          unit_from?: Database["public"]["Enums"]["unit_basis"]
          unit_to?: Database["public"]["Enums"]["unit_basis"]
        }
        Relationships: []
      }
      dropoff_customers: {
        Row: {
          city: string | null
          company_name: string | null
          contact_name: string
          county: string | null
          created_at: string
          customer_type: string | null
          email: string | null
          id: string
          is_active: boolean | null
          last_dropoff_at: string | null
          lifetime_revenue: number | null
          mailing_address: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          physical_address: string | null
          physical_city: string | null
          physical_state: string | null
          physical_zip: string | null
          pricing_tier_id: string | null
          requires_invoicing: boolean | null
          requires_manifest: boolean | null
          state: string | null
          tags: string[] | null
          total_dropoffs: number | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          city?: string | null
          company_name?: string | null
          contact_name: string
          county?: string | null
          created_at?: string
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_dropoff_at?: string | null
          lifetime_revenue?: number | null
          mailing_address?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          physical_address?: string | null
          physical_city?: string | null
          physical_state?: string | null
          physical_zip?: string | null
          pricing_tier_id?: string | null
          requires_invoicing?: boolean | null
          requires_manifest?: boolean | null
          state?: string | null
          tags?: string[] | null
          total_dropoffs?: number | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          city?: string | null
          company_name?: string | null
          contact_name?: string
          county?: string | null
          created_at?: string
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_dropoff_at?: string | null
          lifetime_revenue?: number | null
          mailing_address?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          physical_address?: string | null
          physical_city?: string | null
          physical_state?: string | null
          physical_zip?: string | null
          pricing_tier_id?: string | null
          requires_invoicing?: boolean | null
          requires_manifest?: boolean | null
          state?: string | null
          tags?: string[] | null
          total_dropoffs?: number | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_dropoff_customers_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dropoff_customers_pricing_tier"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      dropoffs: {
        Row: {
          computed_revenue: number | null
          created_at: string
          dropoff_customer_id: string
          dropoff_date: string
          dropoff_time: string | null
          hauler_id: string | null
          id: string
          manifest_id: string | null
          manifest_pdf_path: string | null
          notes: string | null
          organization_id: string
          otr_count: number | null
          payment_method: string | null
          payment_status: string | null
          pricing_tier_id: string | null
          processed_by: string | null
          pte_count: number | null
          requires_manifest: boolean | null
          status: string | null
          surcharges_applied_json: Json | null
          tractor_count: number | null
          unit_price_otr: number | null
          unit_price_pte: number | null
          unit_price_tractor: number | null
          updated_at: string
        }
        Insert: {
          computed_revenue?: number | null
          created_at?: string
          dropoff_customer_id: string
          dropoff_date?: string
          dropoff_time?: string | null
          hauler_id?: string | null
          id?: string
          manifest_id?: string | null
          manifest_pdf_path?: string | null
          notes?: string | null
          organization_id: string
          otr_count?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pricing_tier_id?: string | null
          processed_by?: string | null
          pte_count?: number | null
          requires_manifest?: boolean | null
          status?: string | null
          surcharges_applied_json?: Json | null
          tractor_count?: number | null
          unit_price_otr?: number | null
          unit_price_pte?: number | null
          unit_price_tractor?: number | null
          updated_at?: string
        }
        Update: {
          computed_revenue?: number | null
          created_at?: string
          dropoff_customer_id?: string
          dropoff_date?: string
          dropoff_time?: string | null
          hauler_id?: string | null
          id?: string
          manifest_id?: string | null
          manifest_pdf_path?: string | null
          notes?: string | null
          organization_id?: string
          otr_count?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pricing_tier_id?: string | null
          processed_by?: string | null
          pte_count?: number | null
          requires_manifest?: boolean | null
          status?: string | null
          surcharges_applied_json?: Json | null
          tractor_count?: number | null
          unit_price_otr?: number | null
          unit_price_pte?: number | null
          unit_price_tractor?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dropoffs_hauler_id_fkey"
            columns: ["hauler_id"]
            isOneToOne: false
            referencedRelation: "hauler_overlay_view"
            referencedColumns: ["hauler_id"]
          },
          {
            foreignKeyName: "dropoffs_hauler_id_fkey"
            columns: ["hauler_id"]
            isOneToOne: false
            referencedRelation: "haulers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dropoffs_dropoff_customer"
            columns: ["dropoff_customer_id"]
            isOneToOne: false
            referencedRelation: "dropoff_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dropoffs_manifest"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "manifests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dropoffs_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dropoffs_pricing_tier"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dropoffs_processed_by"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          county: string | null
          created_at: string | null
          dba: string | null
          eg_number: string | null
          id: string
          is_active: boolean | null
          kind: Database["public"]["Enums"]["entity_kind"]
          legal_name: string
          organization_id: string
          state: string | null
          street_address: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          county?: string | null
          created_at?: string | null
          dba?: string | null
          eg_number?: string | null
          id?: string
          is_active?: boolean | null
          kind: Database["public"]["Enums"]["entity_kind"]
          legal_name: string
          organization_id: string
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          county?: string | null
          created_at?: string | null
          dba?: string | null
          eg_number?: string | null
          id?: string
          is_active?: boolean | null
          kind?: Database["public"]["Enums"]["entity_kind"]
          legal_name?: string
          organization_id?: string
          state?: string | null
          street_address?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_hauler_rates: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          hauler_id: string
          id: string
          notes: string | null
          organization_id: string
          otr_rate: number
          pte_rate: number
          tractor_rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          hauler_id: string
          id?: string
          notes?: string | null
          organization_id: string
          otr_rate?: number
          pte_rate?: number
          tractor_rate?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          hauler_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          otr_rate?: number
          pte_rate?: number
          tractor_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_hauler_rates_hauler_id_fkey"
            columns: ["hauler_id"]
            isOneToOne: false
            referencedRelation: "hauler_overlay_view"
            referencedColumns: ["hauler_id"]
          },
          {
            foreignKeyName: "facility_hauler_rates_hauler_id_fkey"
            columns: ["hauler_id"]
            isOneToOne: false
            referencedRelation: "haulers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_hauler_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      generators: {
        Row: {
          created_at: string | null
          generator_city: string | null
          generator_city_2: string | null
          generator_county: string | null
          generator_mailing_address: string | null
          generator_name: string
          generator_phone: string | null
          generator_physical_address: string | null
          generator_state: string | null
          generator_state_2: string | null
          generator_zip: string | null
          generator_zip_2: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          created_at?: string | null
          generator_city?: string | null
          generator_city_2?: string | null
          generator_county?: string | null
          generator_mailing_address?: string | null
          generator_name: string
          generator_phone?: string | null
          generator_physical_address?: string | null
          generator_state?: string | null
          generator_state_2?: string | null
          generator_zip?: string | null
          generator_zip_2?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          created_at?: string | null
          generator_city?: string | null
          generator_city_2?: string | null
          generator_county?: string | null
          generator_mailing_address?: string | null
          generator_name?: string
          generator_phone?: string | null
          generator_physical_address?: string | null
          generator_state?: string | null
          generator_state_2?: string | null
          generator_zip?: string | null
          generator_zip_2?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      hauler_customers: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          contact_name: string | null
          county: string | null
          created_at: string
          email: string | null
          hauler_id: string
          id: string
          is_active: boolean | null
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          contact_name?: string | null
          county?: string | null
          created_at?: string
          email?: string | null
          hauler_id: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string | null
          county?: string | null
          created_at?: string
          email?: string | null
          hauler_id?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hauler_customers_hauler_id_fkey"
            columns: ["hauler_id"]
            isOneToOne: false
            referencedRelation: "hauler_overlay_view"
            referencedColumns: ["hauler_id"]
          },
          {
            foreignKeyName: "hauler_customers_hauler_id_fkey"
            columns: ["hauler_id"]
            isOneToOne: false
            referencedRelation: "haulers"
            referencedColumns: ["id"]
          },
        ]
      }
      haulers: {
        Row: {
          city: string | null
          company_name: string | null
          created_at: string | null
          dot_document_path: string | null
          dot_number: string | null
          email: string | null
          hauler_city: string | null
          hauler_mailing_address: string | null
          hauler_mi_reg: string | null
          hauler_name: string
          hauler_phone: string | null
          hauler_state: string | null
          hauler_zip: string | null
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          license_document_path: string | null
          license_number: string | null
          mailing_address: string | null
          phone: string | null
          state: string | null
          updated_at: string | null
          user_id: string | null
          zip: string | null
        }
        Insert: {
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          dot_document_path?: string | null
          dot_number?: string | null
          email?: string | null
          hauler_city?: string | null
          hauler_mailing_address?: string | null
          hauler_mi_reg?: string | null
          hauler_name: string
          hauler_phone?: string | null
          hauler_state?: string | null
          hauler_zip?: string | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          license_document_path?: string | null
          license_number?: string | null
          mailing_address?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
          zip?: string | null
        }
        Update: {
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          dot_document_path?: string | null
          dot_number?: string | null
          email?: string | null
          hauler_city?: string | null
          hauler_mailing_address?: string | null
          hauler_mi_reg?: string | null
          hauler_name?: string
          hauler_phone?: string | null
          hauler_state?: string | null
          hauler_zip?: string | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          license_document_path?: string | null
          license_number?: string | null
          mailing_address?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haulers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_entity_rollup"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_summary"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_pricing_overrides: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          location_id: string
          notes: string | null
          organization_id: string
          rim: Database["public"]["Enums"]["rim_status"]
          service_mode: Database["public"]["Enums"]["service_mode"]
          size_max_inches: number | null
          size_min_inches: number | null
          tire_category: Database["public"]["Enums"]["tire_category"]
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          location_id: string
          notes?: string | null
          organization_id: string
          rim?: Database["public"]["Enums"]["rim_status"]
          service_mode: Database["public"]["Enums"]["service_mode"]
          size_max_inches?: number | null
          size_min_inches?: number | null
          tire_category: Database["public"]["Enums"]["tire_category"]
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          organization_id?: string
          rim?: Database["public"]["Enums"]["rim_status"]
          service_mode?: Database["public"]["Enums"]["service_mode"]
          size_max_inches?: number | null
          size_min_inches?: number | null
          tire_category?: Database["public"]["Enums"]["tire_category"]
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
            foreignKeyName: "locations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_entity_rollup"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "locations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_summary"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      manifests: {
        Row: {
          acroform_pdf_path: string | null
          client_id: string
          commercial_17_5_19_5_off: number | null
          commercial_17_5_19_5_on: number | null
          commercial_22_5_off: number | null
          commercial_22_5_on: number | null
          created_at: string
          customer_sig_path: string | null
          customer_signature_png_path: string | null
          driver_id: string | null
          driver_sig_path: string | null
          driver_signature_png_path: string | null
          dropoff_id: string | null
          email_error: string | null
          email_resend_id: string | null
          email_sent_at: string | null
          email_sent_to: string[] | null
          email_status: string | null
          emailed_to: string[] | null
          finalized_by: string | null
          generator_signed_at: string | null
          gross_weight_lbs: number | null
          hauler_id: string | null
          hauler_signed_at: string | null
          id: string
          initial_pdf_path: string | null
          location_id: string | null
          manifest_number: string
          net_weight_lbs: number | null
          organization_id: string
          otr_count: number | null
          paid_amount: number | null
          payment_method: string | null
          payment_status: string | null
          pdf_bytes_hash: string | null
          pdf_path: string | null
          photos: string[] | null
          pickup_id: string | null
          pte_off_rim: number | null
          pte_on_rim: number | null
          receipt_url: string | null
          receiver_sig_path: string | null
          receiver_signed_at: string | null
          receiver_signed_by: string | null
          resolved_unit_prices: Json | null
          sign_ip: unknown
          signed_at: string | null
          signed_by_email: string | null
          signed_by_name: string | null
          signed_by_title: string | null
          status: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          subtotal: number | null
          surcharges: number | null
          tare_weight_lbs: number | null
          total: number | null
          tractor_count: number | null
          updated_at: string
          vehicle_id: string | null
          volume_yards: number | null
          weight_tons: number | null
        }
        Insert: {
          acroform_pdf_path?: string | null
          client_id: string
          commercial_17_5_19_5_off?: number | null
          commercial_17_5_19_5_on?: number | null
          commercial_22_5_off?: number | null
          commercial_22_5_on?: number | null
          created_at?: string
          customer_sig_path?: string | null
          customer_signature_png_path?: string | null
          driver_id?: string | null
          driver_sig_path?: string | null
          driver_signature_png_path?: string | null
          dropoff_id?: string | null
          email_error?: string | null
          email_resend_id?: string | null
          email_sent_at?: string | null
          email_sent_to?: string[] | null
          email_status?: string | null
          emailed_to?: string[] | null
          finalized_by?: string | null
          generator_signed_at?: string | null
          gross_weight_lbs?: number | null
          hauler_id?: string | null
          hauler_signed_at?: string | null
          id?: string
          initial_pdf_path?: string | null
          location_id?: string | null
          manifest_number: string
          net_weight_lbs?: number | null
          organization_id: string
          otr_count?: number | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pdf_bytes_hash?: string | null
          pdf_path?: string | null
          photos?: string[] | null
          pickup_id?: string | null
          pte_off_rim?: number | null
          pte_on_rim?: number | null
          receipt_url?: string | null
          receiver_sig_path?: string | null
          receiver_signed_at?: string | null
          receiver_signed_by?: string | null
          resolved_unit_prices?: Json | null
          sign_ip?: unknown
          signed_at?: string | null
          signed_by_email?: string | null
          signed_by_name?: string | null
          signed_by_title?: string | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number | null
          surcharges?: number | null
          tare_weight_lbs?: number | null
          total?: number | null
          tractor_count?: number | null
          updated_at?: string
          vehicle_id?: string | null
          volume_yards?: number | null
          weight_tons?: number | null
        }
        Update: {
          acroform_pdf_path?: string | null
          client_id?: string
          commercial_17_5_19_5_off?: number | null
          commercial_17_5_19_5_on?: number | null
          commercial_22_5_off?: number | null
          commercial_22_5_on?: number | null
          created_at?: string
          customer_sig_path?: string | null
          customer_signature_png_path?: string | null
          driver_id?: string | null
          driver_sig_path?: string | null
          driver_signature_png_path?: string | null
          dropoff_id?: string | null
          email_error?: string | null
          email_resend_id?: string | null
          email_sent_at?: string | null
          email_sent_to?: string[] | null
          email_status?: string | null
          emailed_to?: string[] | null
          finalized_by?: string | null
          generator_signed_at?: string | null
          gross_weight_lbs?: number | null
          hauler_id?: string | null
          hauler_signed_at?: string | null
          id?: string
          initial_pdf_path?: string | null
          location_id?: string | null
          manifest_number?: string
          net_weight_lbs?: number | null
          organization_id?: string
          otr_count?: number | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pdf_bytes_hash?: string | null
          pdf_path?: string | null
          photos?: string[] | null
          pickup_id?: string | null
          pte_off_rim?: number | null
          pte_on_rim?: number | null
          receipt_url?: string | null
          receiver_sig_path?: string | null
          receiver_signed_at?: string | null
          receiver_signed_by?: string | null
          resolved_unit_prices?: Json | null
          sign_ip?: unknown
          signed_at?: string | null
          signed_by_email?: string | null
          signed_by_name?: string | null
          signed_by_title?: string | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number | null
          surcharges?: number | null
          tare_weight_lbs?: number | null
          total?: number | null
          tractor_count?: number | null
          updated_at?: string
          vehicle_id?: string | null
          volume_yards?: number | null
          weight_tons?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_manifests_dropoff"
            columns: ["dropoff_id"]
            isOneToOne: false
            referencedRelation: "dropoffs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_entity_rollup"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "manifests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_summary"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "manifests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_hauler_id_fkey"
            columns: ["hauler_id"]
            isOneToOne: false
            referencedRelation: "hauler_overlay_view"
            referencedColumns: ["hauler_id"]
          },
          {
            foreignKeyName: "manifests_hauler_id_fkey"
            columns: ["hauler_id"]
            isOneToOne: false
            referencedRelation: "haulers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_pickup_id_fkey"
            columns: ["pickup_id"]
            isOneToOne: false
            referencedRelation: "pickups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_link: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          organization_id: string
          priority: string | null
          related_id: string | null
          related_type: string | null
          role_visibility: string[] | null
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action_link?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          organization_id: string
          priority?: string | null
          related_id?: string | null
          related_type?: string | null
          role_visibility?: string[] | null
          title: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action_link?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          organization_id?: string
          priority?: string | null
          related_id?: string | null
          related_type?: string | null
          role_visibility?: string[] | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      organizations: {
        Row: {
          brand_primary_color: string | null
          brand_secondary_color: string | null
          created_at: string
          default_otr_rate: number | null
          default_pte_rate: number | null
          default_tractor_rate: number | null
          depot_lat: number | null
          depot_lng: number | null
          id: string
          logo_url: string | null
          name: string
          service_hours_end: string | null
          service_hours_start: string | null
          slug: string
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          created_at?: string
          default_otr_rate?: number | null
          default_pte_rate?: number | null
          default_tractor_rate?: number | null
          depot_lat?: number | null
          depot_lng?: number | null
          id?: string
          logo_url?: string | null
          name: string
          service_hours_end?: string | null
          service_hours_start?: string | null
          slug: string
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          created_at?: string
          default_otr_rate?: number | null
          default_pte_rate?: number | null
          default_tractor_rate?: number | null
          depot_lat?: number | null
          depot_lng?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          service_hours_end?: string | null
          service_hours_start?: string | null
          slug?: string
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
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
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_entity_rollup"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_summary"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_calibrations: {
        Row: {
          created_at: string | null
          field_name: string
          font_size: number | null
          id: string
          page: number
          template_name: string
          version: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string | null
          field_name: string
          font_size?: number | null
          id?: string
          page?: number
          template_name: string
          version?: string
          x: number
          y: number
        }
        Update: {
          created_at?: string | null
          field_name?: string
          font_size?: number | null
          id?: string
          page?: number
          template_name?: string
          version?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "pdf_calibrations_template_name_fkey"
            columns: ["template_name"]
            isOneToOne: false
            referencedRelation: "pdf_templates"
            referencedColumns: ["template_name"]
          },
        ]
      }
      pdf_templates: {
        Row: {
          created_at: string | null
          storage_bucket: string
          storage_path: string
          template_name: string
        }
        Insert: {
          created_at?: string | null
          storage_bucket: string
          storage_path: string
          template_name: string
        }
        Update: {
          created_at?: string | null
          storage_bucket?: string
          storage_path?: string
          template_name?: string
        }
        Relationships: []
      }
      pickups: {
        Row: {
          client_id: string
          computed_revenue: number | null
          created_at: string
          estimated_revenue: number | null
          final_revenue: number | null
          id: string
          location_id: string | null
          manifest_id: string | null
          manifest_payment_status: string | null
          manifest_pdf_path: string | null
          notes: string | null
          organization_id: string
          otr_count: number | null
          payment_method: string | null
          payment_status: string | null
          pickup_date: string
          preferred_window: string | null
          price_version_id: string | null
          pricing_tier_id: string | null
          pte_count: number | null
          resolved_price_source:
            | Database["public"]["Enums"]["price_source"]
            | null
          rim_surcharge_applied: number | null
          status: string | null
          surcharges_applied_json: Json | null
          tractor_count: number | null
          unit_price_otr: number | null
          unit_price_pte: number | null
          unit_price_tractor: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          computed_revenue?: number | null
          created_at?: string
          estimated_revenue?: number | null
          final_revenue?: number | null
          id?: string
          location_id?: string | null
          manifest_id?: string | null
          manifest_payment_status?: string | null
          manifest_pdf_path?: string | null
          notes?: string | null
          organization_id: string
          otr_count?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_date: string
          preferred_window?: string | null
          price_version_id?: string | null
          pricing_tier_id?: string | null
          pte_count?: number | null
          resolved_price_source?:
            | Database["public"]["Enums"]["price_source"]
            | null
          rim_surcharge_applied?: number | null
          status?: string | null
          surcharges_applied_json?: Json | null
          tractor_count?: number | null
          unit_price_otr?: number | null
          unit_price_pte?: number | null
          unit_price_tractor?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          computed_revenue?: number | null
          created_at?: string
          estimated_revenue?: number | null
          final_revenue?: number | null
          id?: string
          location_id?: string | null
          manifest_id?: string | null
          manifest_payment_status?: string | null
          manifest_pdf_path?: string | null
          notes?: string | null
          organization_id?: string
          otr_count?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_date?: string
          preferred_window?: string | null
          price_version_id?: string | null
          pricing_tier_id?: string | null
          pte_count?: number | null
          resolved_price_source?:
            | Database["public"]["Enums"]["price_source"]
            | null
          rim_surcharge_applied?: number | null
          status?: string | null
          surcharges_applied_json?: Json | null
          tractor_count?: number | null
          unit_price_otr?: number | null
          unit_price_pte?: number | null
          unit_price_tractor?: number | null
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
            foreignKeyName: "pickups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_entity_rollup"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "pickups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_summary"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "pickups_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickups_manifest_id_fkey"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "manifests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      price_matrix: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          needs_confirmation: boolean | null
          notes: string | null
          organization_id: string
          priority: number
          rim: Database["public"]["Enums"]["rim_status"]
          service_mode: Database["public"]["Enums"]["service_mode"]
          size_max_inches: number | null
          size_min_inches: number | null
          source: Database["public"]["Enums"]["price_source"]
          tire_category: Database["public"]["Enums"]["tire_category"]
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          needs_confirmation?: boolean | null
          notes?: string | null
          organization_id: string
          priority?: number
          rim?: Database["public"]["Enums"]["rim_status"]
          service_mode: Database["public"]["Enums"]["service_mode"]
          size_max_inches?: number | null
          size_min_inches?: number | null
          source?: Database["public"]["Enums"]["price_source"]
          tire_category: Database["public"]["Enums"]["tire_category"]
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          needs_confirmation?: boolean | null
          notes?: string | null
          organization_id?: string
          priority?: number
          rim?: Database["public"]["Enums"]["rim_status"]
          service_mode?: Database["public"]["Enums"]["service_mode"]
          size_max_inches?: number | null
          size_min_inches?: number | null
          source?: Database["public"]["Enums"]["price_source"]
          tire_category?: Database["public"]["Enums"]["tire_category"]
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      price_versions: {
        Row: {
          changelog: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          version_tag: string
        }
        Insert: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          version_tag: string
        }
        Update: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          version_tag?: string
        }
        Relationships: []
      }
      pricing_tiers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          otr_rate?: number | null
          pte_rate?: number | null
          rate?: number | null
          tractor_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_events: {
        Row: {
          created_at: string | null
          destination_entity_id: string | null
          destination_location_id: string | null
          end_use: Database["public"]["Enums"]["end_use"] | null
          ended_at: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          facility_entity_id: string
          id: string
          input_pte: number
          location_id: string | null
          notes: string | null
          organization_id: string
          output_breakdown: Json | null
          output_pte: number
          started_at: string
          updated_at: string | null
          yield_loss_pte: number | null
        }
        Insert: {
          created_at?: string | null
          destination_entity_id?: string | null
          destination_location_id?: string | null
          end_use?: Database["public"]["Enums"]["end_use"] | null
          ended_at?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          facility_entity_id: string
          id?: string
          input_pte?: number
          location_id?: string | null
          notes?: string | null
          organization_id: string
          output_breakdown?: Json | null
          output_pte?: number
          started_at: string
          updated_at?: string | null
          yield_loss_pte?: number | null
        }
        Update: {
          created_at?: string | null
          destination_entity_id?: string | null
          destination_location_id?: string | null
          end_use?: Database["public"]["Enums"]["end_use"] | null
          ended_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          facility_entity_id?: string
          id?: string
          input_pte?: number
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          output_breakdown?: Json | null
          output_pte?: number
          started_at?: string
          updated_at?: string | null
          yield_loss_pte?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_events_destination_entity_id_fkey"
            columns: ["destination_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_events_destination_location_id_fkey"
            columns: ["destination_location_id"]
            isOneToOne: false
            referencedRelation: "reporting_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_events_facility_entity_id_fkey"
            columns: ["facility_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "reporting_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      receivers: {
        Row: {
          collection_site_reg: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          receiver_city: string | null
          receiver_mailing_address: string | null
          receiver_name: string
          receiver_phone: string | null
          receiver_state: string | null
          receiver_zip: string | null
        }
        Insert: {
          collection_site_reg?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          receiver_city?: string | null
          receiver_mailing_address?: string | null
          receiver_name: string
          receiver_phone?: string | null
          receiver_state?: string | null
          receiver_zip?: string | null
        }
        Update: {
          collection_site_reg?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          receiver_city?: string | null
          receiver_mailing_address?: string | null
          receiver_name?: string
          receiver_phone?: string | null
          receiver_state?: string | null
          receiver_zip?: string | null
        }
        Relationships: []
      }
      report_monthly_snapshots: {
        Row: {
          created_at: string | null
          entity_id: string
          id: string
          organization_id: string
          rollups: Json
          yyyymm: number
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          id?: string
          organization_id: string
          rollups: Json
          yyyymm: number
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          id?: string
          organization_id?: string
          rollups?: Json
          yyyymm?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_monthly_snapshots_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_monthly_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_locations: {
        Row: {
          city: string
          county: string
          created_at: string | null
          eg_site_id: string | null
          entity_id: string
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          organization_id: string
          site_type: Database["public"]["Enums"]["site_type"]
          state: string | null
          storage_capacity_cy: number | null
          street_address: string
          updated_at: string | null
          zip: string
        }
        Insert: {
          city: string
          county: string
          created_at?: string | null
          eg_site_id?: string | null
          entity_id: string
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          organization_id: string
          site_type?: Database["public"]["Enums"]["site_type"]
          state?: string | null
          storage_capacity_cy?: number | null
          street_address: string
          updated_at?: string | null
          zip: string
        }
        Update: {
          city?: string
          county?: string
          created_at?: string | null
          eg_site_id?: string | null
          entity_id?: string
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          organization_id?: string
          site_type?: Database["public"]["Enums"]["site_type"]
          state?: string | null
          storage_capacity_cy?: number | null
          street_address?: string
          updated_at?: string | null
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporting_locations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporting_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports_annual: {
        Row: {
          created_at: string | null
          entity_id: string
          exports: Json | null
          id: string
          organization_id: string
          status: Database["public"]["Enums"]["report_status"] | null
          submitted_at: string | null
          submitted_by: string | null
          totals: Json | null
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          exports?: Json | null
          id?: string
          organization_id: string
          status?: Database["public"]["Enums"]["report_status"] | null
          submitted_at?: string | null
          submitted_by?: string | null
          totals?: Json | null
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          exports?: Json | null
          id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["report_status"] | null
          submitted_at?: string | null
          submitted_by?: string | null
          totals?: Json | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "reports_annual_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_annual_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_annual_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          arrived_at: string | null
          bol_number: string | null
          carrier: string | null
          created_at: string | null
          departed_at: string
          destination_entity_id: string
          destination_location_id: string | null
          direction: Database["public"]["Enums"]["direction"]
          end_use: Database["public"]["Enums"]["end_use"] | null
          id: string
          manifest_id: string | null
          material_form: Database["public"]["Enums"]["material_form"]
          notes: string | null
          organization_id: string
          origin_entity_id: string
          origin_location_id: string | null
          quantity: number
          quantity_pte: number
          unit_basis: Database["public"]["Enums"]["unit_basis"]
          updated_at: string | null
        }
        Insert: {
          arrived_at?: string | null
          bol_number?: string | null
          carrier?: string | null
          created_at?: string | null
          departed_at: string
          destination_entity_id: string
          destination_location_id?: string | null
          direction: Database["public"]["Enums"]["direction"]
          end_use?: Database["public"]["Enums"]["end_use"] | null
          id?: string
          manifest_id?: string | null
          material_form: Database["public"]["Enums"]["material_form"]
          notes?: string | null
          organization_id: string
          origin_entity_id: string
          origin_location_id?: string | null
          quantity: number
          quantity_pte: number
          unit_basis: Database["public"]["Enums"]["unit_basis"]
          updated_at?: string | null
        }
        Update: {
          arrived_at?: string | null
          bol_number?: string | null
          carrier?: string | null
          created_at?: string | null
          departed_at?: string
          destination_entity_id?: string
          destination_location_id?: string | null
          direction?: Database["public"]["Enums"]["direction"]
          end_use?: Database["public"]["Enums"]["end_use"] | null
          id?: string
          manifest_id?: string | null
          material_form?: Database["public"]["Enums"]["material_form"]
          notes?: string | null
          organization_id?: string
          origin_entity_id?: string
          origin_location_id?: string | null
          quantity?: number
          quantity_pte?: number
          unit_basis?: Database["public"]["Enums"]["unit_basis"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_destination_entity_id_fkey"
            columns: ["destination_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_destination_location_id_fkey"
            columns: ["destination_location_id"]
            isOneToOne: false
            referencedRelation: "reporting_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_origin_entity_id_fkey"
            columns: ["origin_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_origin_location_id_fkey"
            columns: ["origin_location_id"]
            isOneToOne: false
            referencedRelation: "reporting_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stops: {
        Row: {
          created_at: string | null
          generator_date: string | null
          generator_id: string | null
          generator_print_name: string | null
          generator_signature: string | null
          gross_weight: number | null
          hauler_id: string | null
          hauler_print_name: string | null
          hauler_signature: string | null
          id: string
          manifest_number: string | null
          net_weight: number | null
          output_pdf_path: string | null
          receiver_date: string | null
          receiver_id: string | null
          receiver_print_name: string | null
          receiver_signature: string | null
          tare_weight: number | null
          tire_counts: Json | null
        }
        Insert: {
          created_at?: string | null
          generator_date?: string | null
          generator_id?: string | null
          generator_print_name?: string | null
          generator_signature?: string | null
          gross_weight?: number | null
          hauler_id?: string | null
          hauler_print_name?: string | null
          hauler_signature?: string | null
          id?: string
          manifest_number?: string | null
          net_weight?: number | null
          output_pdf_path?: string | null
          receiver_date?: string | null
          receiver_id?: string | null
          receiver_print_name?: string | null
          receiver_signature?: string | null
          tare_weight?: number | null
          tire_counts?: Json | null
        }
        Update: {
          created_at?: string | null
          generator_date?: string | null
          generator_id?: string | null
          generator_print_name?: string | null
          generator_signature?: string | null
          gross_weight?: number | null
          hauler_id?: string | null
          hauler_print_name?: string | null
          hauler_signature?: string | null
          id?: string
          manifest_number?: string | null
          net_weight?: number | null
          output_pdf_path?: string | null
          receiver_date?: string | null
          receiver_id?: string | null
          receiver_print_name?: string | null
          receiver_signature?: string | null
          tare_weight?: number | null
          tire_counts?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "stops_generator_id_fkey"
            columns: ["generator_id"]
            isOneToOne: false
            referencedRelation: "generator_overlay_view"
            referencedColumns: ["generator_id"]
          },
          {
            foreignKeyName: "stops_generator_id_fkey"
            columns: ["generator_id"]
            isOneToOne: false
            referencedRelation: "generators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stops_hauler_id_fkey"
            columns: ["hauler_id"]
            isOneToOne: false
            referencedRelation: "hauler_overlay_view"
            referencedColumns: ["hauler_id"]
          },
          {
            foreignKeyName: "stops_hauler_id_fkey"
            columns: ["hauler_id"]
            isOneToOne: false
            referencedRelation: "haulers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stops_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "receiver_overlay_view"
            referencedColumns: ["receiver_id"]
          },
          {
            foreignKeyName: "stops_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "receivers"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_payments: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          description: string | null
          id: string
          manifest_id: string | null
          metadata: Json | null
          organization_id: string
          pickup_id: string | null
          processed_by: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          description?: string | null
          id?: string
          manifest_id?: string | null
          metadata?: Json | null
          organization_id: string
          pickup_id?: string | null
          processed_by?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          description?: string | null
          id?: string
          manifest_id?: string | null
          metadata?: Json | null
          organization_id?: string
          pickup_id?: string | null
          processed_by?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_entity_rollup"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "stripe_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mv_revenue_summary"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "stripe_payments_manifest_id_fkey"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "manifests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_payments_pickup_id_fkey"
            columns: ["pickup_id"]
            isOneToOne: false
            referencedRelation: "pickups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_payments_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      surcharge_rules: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          priority: number
          type: Database["public"]["Enums"]["surcharge_type"]
          updated_at: string
          value: number
          value_type: Database["public"]["Enums"]["value_type"]
          when_expr: Json | null
        }
        Insert: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          priority?: number
          type: Database["public"]["Enums"]["surcharge_type"]
          updated_at?: string
          value: number
          value_type: Database["public"]["Enums"]["value_type"]
          when_expr?: Json | null
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          priority?: number
          type?: Database["public"]["Enums"]["surcharge_type"]
          updated_at?: string
          value?: number
          value_type?: Database["public"]["Enums"]["value_type"]
          when_expr?: Json | null
        }
        Relationships: []
      }
      system_updates: {
        Row: {
          created_at: string
          deployed_by: string | null
          id: string
          impacted_tables: string[] | null
          module_name: string
          notes: string | null
          organization_id: string
          status: string
          test_results: Json | null
          timestamp: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deployed_by?: string | null
          id?: string
          impacted_tables?: string[] | null
          module_name: string
          notes?: string | null
          organization_id: string
          status: string
          test_results?: Json | null
          timestamp?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deployed_by?: string | null
          id?: string
          impacted_tables?: string[] | null
          module_name?: string
          notes?: string | null
          organization_id?: string
          status?: string
          test_results?: Json | null
          timestamp?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_updates_deployed_by_fkey"
            columns: ["deployed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_updates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_organization_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organization_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organization_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          activity_logging: boolean | null
          client_alerts: boolean | null
          compact_layout: boolean | null
          created_at: string
          dark_mode: boolean | null
          email_notifications: boolean | null
          id: string
          reduced_motion: boolean | null
          route_updates: boolean | null
          session_timeout: boolean | null
          system_maintenance: boolean | null
          two_factor_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_logging?: boolean | null
          client_alerts?: boolean | null
          compact_layout?: boolean | null
          created_at?: string
          dark_mode?: boolean | null
          email_notifications?: boolean | null
          id?: string
          reduced_motion?: boolean | null
          route_updates?: boolean | null
          session_timeout?: boolean | null
          system_maintenance?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_logging?: boolean | null
          client_alerts?: boolean | null
          compact_layout?: boolean | null
          created_at?: string
          dark_mode?: boolean | null
          email_notifications?: boolean | null
          id?: string
          reduced_motion?: boolean | null
          route_updates?: boolean | null
          session_timeout?: boolean | null
          system_maintenance?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          password_hash: string | null
          phone: string | null
          signature_data_url: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          password_hash?: string | null
          phone?: string | null
          signature_data_url?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          password_hash?: string | null
          phone?: string | null
          signature_data_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          assigned_driver_id: string | null
          capacity: number | null
          created_at: string
          driver_email: string | null
          id: string
          is_active: boolean | null
          license_plate: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          assigned_driver_id?: string | null
          capacity?: number | null
          created_at?: string
          driver_email?: string | null
          id?: string
          is_active?: boolean | null
          license_plate?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          assigned_driver_id?: string | null
          capacity?: number | null
          created_at?: string
          driver_email?: string | null
          id?: string
          is_active?: boolean | null
          license_plate?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      generator_overlay_view: {
        Row: {
          generator_city: string | null
          generator_city_2: string | null
          generator_county: string | null
          generator_id: string | null
          generator_mailing_address: string | null
          generator_name: string | null
          generator_phone: string | null
          generator_physical_address: string | null
          generator_state: string | null
          generator_state_2: string | null
          generator_zip: string | null
          generator_zip_2: string | null
        }
        Insert: {
          generator_city?: string | null
          generator_city_2?: string | null
          generator_county?: string | null
          generator_id?: string | null
          generator_mailing_address?: string | null
          generator_name?: string | null
          generator_phone?: string | null
          generator_physical_address?: string | null
          generator_state?: string | null
          generator_state_2?: string | null
          generator_zip?: string | null
          generator_zip_2?: string | null
        }
        Update: {
          generator_city?: string | null
          generator_city_2?: string | null
          generator_county?: string | null
          generator_id?: string | null
          generator_mailing_address?: string | null
          generator_name?: string | null
          generator_phone?: string | null
          generator_physical_address?: string | null
          generator_state?: string | null
          generator_state_2?: string | null
          generator_zip?: string | null
          generator_zip_2?: string | null
        }
        Relationships: []
      }
      hauler_overlay_view: {
        Row: {
          hauler_city: string | null
          hauler_id: string | null
          hauler_mailing_address: string | null
          hauler_mi_reg: string | null
          hauler_name: string | null
          hauler_phone: string | null
          hauler_state: string | null
          hauler_zip: string | null
        }
        Insert: {
          hauler_city?: string | null
          hauler_id?: string | null
          hauler_mailing_address?: string | null
          hauler_mi_reg?: string | null
          hauler_name?: string | null
          hauler_phone?: string | null
          hauler_state?: string | null
          hauler_zip?: string | null
        }
        Update: {
          hauler_city?: string | null
          hauler_id?: string | null
          hauler_mailing_address?: string | null
          hauler_mi_reg?: string | null
          hauler_name?: string | null
          hauler_phone?: string | null
          hauler_state?: string | null
          hauler_zip?: string | null
        }
        Relationships: []
      }
      mv_monthly_entity_rollup: {
        Row: {
          by_destination: Json | null
          by_end_use: Json | null
          by_form: Json | null
          cubic_yards_any: number | null
          entity_id: string | null
          inbound_pte: number | null
          month: number | null
          organization_id: string | null
          outbound_pte: number | null
          tons_any: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pickups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_processing_summary: {
        Row: {
          entity_id: string | null
          on_site_proc_pte: number | null
          organization_id: string | null
          portable_shred_pte: number | null
          year: number | null
          yield_loss_pte: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_events_facility_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_revenue_summary: {
        Row: {
          avg_rate_per_pte: number | null
          entity_id: string | null
          organization_id: string | null
          revenue_by_material: Json | null
          total_revenue: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pickups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      receiver_overlay_view: {
        Row: {
          receiver_city: string | null
          receiver_id: string | null
          receiver_mailing_address: string | null
          receiver_name: string | null
          receiver_phone: string | null
          receiver_state: string | null
          receiver_zip: string | null
        }
        Insert: {
          receiver_city?: string | null
          receiver_id?: string | null
          receiver_mailing_address?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          receiver_state?: string | null
          receiver_zip?: string | null
        }
        Update: {
          receiver_city?: string | null
          receiver_id?: string | null
          receiver_mailing_address?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          receiver_state?: string | null
          receiver_zip?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_pickup_revenue: {
        Args: { pickup_row: Database["public"]["Tables"]["pickups"]["Row"] }
        Returns: number
      }
      create_followup_workflows_for_inactive_clients: {
        Args: never
        Returns: number
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_manifest_number: { Args: { org_id: string }; Returns: string }
      get_current_user_organization: {
        Args: { org_slug?: string }
        Returns: string
      }
      get_live_client_analytics: {
        Args: { p_organization_id: string; p_year?: number }
        Returns: {
          avg_ptes_per_pickup: number
          avg_revenue_per_pickup: number
          monthly_data: Json
          top_clients: Json
          total_clients: number
          total_otr: number
          total_pickups: number
          total_ptes: number
          total_revenue: number
          total_tractor: number
          total_weight_tons: number
        }[]
      }
      get_or_create_user_preferences: {
        Args: { target_user_id: string }
        Returns: {
          activity_logging: boolean | null
          client_alerts: boolean | null
          compact_layout: boolean | null
          created_at: string
          dark_mode: boolean | null
          email_notifications: boolean | null
          id: string
          reduced_motion: boolean | null
          route_updates: boolean | null
          session_timeout: boolean | null
          system_maintenance: boolean | null
          two_factor_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      refresh_reporting_views: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_has_role: {
        Args: {
          org_slug?: string
          user_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "ops_manager"
        | "dispatcher"
        | "driver"
        | "sales"
        | "client"
        | "hauler"
        | "receptionist"
      direction: "inbound" | "outbound" | "internal"
      end_use:
        | "reuse"
        | "tdf"
        | "crumb_rubberized"
        | "civil_construction"
        | "agriculture"
        | "landfill"
        | "export"
        | "other"
      entity_kind:
        | "generator"
        | "hauler"
        | "collection_site"
        | "processor"
        | "end_user"
      event_type:
        | "portable_shredding"
        | "on_site_processing"
        | "sorting"
        | "baling"
        | "granulation"
        | "tdf"
        | "devulc"
      material_form:
        | "whole_off_rim"
        | "on_rim"
        | "semi"
        | "otr"
        | "shreds"
        | "crumb"
        | "baled"
        | "tdf"
      price_source:
        | "org_default"
        | "admin_manual"
        | "smart_suggested"
        | "client_override"
        | "location_override"
      report_status: "in_progress" | "submitted" | "locked"
      rim_status: "off" | "on" | "any"
      rounding_type: "none" | "up" | "down" | "bankers"
      service_mode: "pickup" | "dropoff"
      site_type: "yard" | "facility" | "temporary" | "portable_shred_site"
      surcharge_type: "rim_on" | "after_hours" | "fuel" | "distance_band"
      tire_category:
        | "passenger"
        | "commercial_17_5_19_5"
        | "commercial_22_5"
        | "otr"
        | "other"
      unit_basis:
        | "pte"
        | "tons"
        | "cubic_yards"
        | "semi"
        | "otr"
        | "sidewalls_pass"
        | "sidewalls_semi"
        | "shredded_pte"
        | "crumbed_pte"
      value_type: "flat" | "percent"
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
      app_role: [
        "admin",
        "ops_manager",
        "dispatcher",
        "driver",
        "sales",
        "client",
        "hauler",
        "receptionist",
      ],
      direction: ["inbound", "outbound", "internal"],
      end_use: [
        "reuse",
        "tdf",
        "crumb_rubberized",
        "civil_construction",
        "agriculture",
        "landfill",
        "export",
        "other",
      ],
      entity_kind: [
        "generator",
        "hauler",
        "collection_site",
        "processor",
        "end_user",
      ],
      event_type: [
        "portable_shredding",
        "on_site_processing",
        "sorting",
        "baling",
        "granulation",
        "tdf",
        "devulc",
      ],
      material_form: [
        "whole_off_rim",
        "on_rim",
        "semi",
        "otr",
        "shreds",
        "crumb",
        "baled",
        "tdf",
      ],
      price_source: [
        "org_default",
        "admin_manual",
        "smart_suggested",
        "client_override",
        "location_override",
      ],
      report_status: ["in_progress", "submitted", "locked"],
      rim_status: ["off", "on", "any"],
      rounding_type: ["none", "up", "down", "bankers"],
      service_mode: ["pickup", "dropoff"],
      site_type: ["yard", "facility", "temporary", "portable_shred_site"],
      surcharge_type: ["rim_on", "after_hours", "fuel", "distance_band"],
      tire_category: [
        "passenger",
        "commercial_17_5_19_5",
        "commercial_22_5",
        "otr",
        "other",
      ],
      unit_basis: [
        "pte",
        "tons",
        "cubic_yards",
        "semi",
        "otr",
        "sidewalls_pass",
        "sidewalls_semi",
        "shredded_pte",
        "crumbed_pte",
      ],
      value_type: ["flat", "percent"],
    },
  },
} as const
