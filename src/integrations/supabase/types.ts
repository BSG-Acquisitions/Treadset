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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
            referencedRelation: "pickup_analytics"
            referencedColumns: ["client_id"]
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
            referencedRelation: "pickup_analytics"
            referencedColumns: ["client_id"]
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
          type: Database["public"]["Enums"]["client_type"] | null
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
          type?: Database["public"]["Enums"]["client_type"] | null
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
          type?: Database["public"]["Enums"]["client_type"] | null
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
      dropoff_customers: {
        Row: {
          company_name: string | null
          contact_name: string
          created_at: string
          customer_type: string | null
          email: string | null
          id: string
          is_active: boolean | null
          last_dropoff_at: string | null
          lifetime_revenue: number | null
          notes: string | null
          organization_id: string
          phone: string | null
          pricing_tier_id: string | null
          requires_invoicing: boolean | null
          requires_manifest: boolean | null
          tags: string[] | null
          total_dropoffs: number | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          contact_name: string
          created_at?: string
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_dropoff_at?: string | null
          lifetime_revenue?: number | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          pricing_tier_id?: string | null
          requires_invoicing?: boolean | null
          requires_manifest?: boolean | null
          tags?: string[] | null
          total_dropoffs?: number | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          contact_name?: string
          created_at?: string
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_dropoff_at?: string | null
          lifetime_revenue?: number | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          pricing_tier_id?: string | null
          requires_invoicing?: boolean | null
          requires_manifest?: boolean | null
          tags?: string[] | null
          total_dropoffs?: number | null
          updated_at?: string
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
      haulers: {
        Row: {
          created_at: string | null
          hauler_city: string | null
          hauler_mailing_address: string | null
          hauler_mi_reg: string | null
          hauler_name: string
          hauler_phone: string | null
          hauler_state: string | null
          hauler_zip: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          created_at?: string | null
          hauler_city?: string | null
          hauler_mailing_address?: string | null
          hauler_mi_reg?: string | null
          hauler_name: string
          hauler_phone?: string | null
          hauler_state?: string | null
          hauler_zip?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          created_at?: string | null
          hauler_city?: string | null
          hauler_mailing_address?: string | null
          hauler_mi_reg?: string | null
          hauler_name?: string
          hauler_phone?: string | null
          hauler_state?: string | null
          hauler_zip?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
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
            referencedRelation: "pickup_analytics"
            referencedColumns: ["client_id"]
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
            referencedRelation: "pickup_analytics"
            referencedColumns: ["client_id"]
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
          emailed_to: string[] | null
          finalized_by: string | null
          generator_signed_at: string | null
          hauler_id: string | null
          hauler_signed_at: string | null
          id: string
          location_id: string | null
          manifest_number: string
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
          sign_ip: unknown | null
          signed_at: string | null
          signed_by_email: string | null
          signed_by_name: string | null
          signed_by_title: string | null
          status: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          subtotal: number | null
          surcharges: number | null
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
          emailed_to?: string[] | null
          finalized_by?: string | null
          generator_signed_at?: string | null
          hauler_id?: string | null
          hauler_signed_at?: string | null
          id?: string
          location_id?: string | null
          manifest_number: string
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
          sign_ip?: unknown | null
          signed_at?: string | null
          signed_by_email?: string | null
          signed_by_name?: string | null
          signed_by_title?: string | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number | null
          surcharges?: number | null
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
          emailed_to?: string[] | null
          finalized_by?: string | null
          generator_signed_at?: string | null
          hauler_id?: string | null
          hauler_signed_at?: string | null
          id?: string
          location_id?: string | null
          manifest_number?: string
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
          sign_ip?: unknown | null
          signed_at?: string | null
          signed_by_email?: string | null
          signed_by_name?: string | null
          signed_by_title?: string | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number | null
          surcharges?: number | null
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
            referencedRelation: "pickup_analytics"
            referencedColumns: ["client_id"]
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
          created_at: string
          id: string
          is_read: boolean
          message: string
          organization_id: string
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          organization_id: string
          related_id?: string | null
          related_type?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          organization_id?: string
          related_id?: string | null
          related_type?: string | null
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
            referencedRelation: "pickup_analytics"
            referencedColumns: ["client_id"]
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
            referencedRelation: "pickup_analytics"
            referencedColumns: ["client_id"]
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
      receivers: {
        Row: {
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
          organization_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          license_plate?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          license_plate?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
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
      pickup_analytics: {
        Row: {
          avg_pickup_size: number | null
          client_id: string | null
          client_type: Database["public"]["Enums"]["client_type"] | null
          company_name: string | null
          first_pickup: string | null
          last_pickup: string | null
          month: number | null
          organization_id: string | null
          pickup_count: number | null
          total_otr: number | null
          total_ptes: number | null
          total_revenue: number | null
          total_tractor: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
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
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_manifest_number: {
        Args: { org_id: string }
        Returns: string
      }
      get_current_user_organization: {
        Args: { org_slug?: string }
        Returns: string
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
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
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
      client_type: "commercial" | "residential" | "industrial"
      price_source:
        | "org_default"
        | "admin_manual"
        | "smart_suggested"
        | "client_override"
        | "location_override"
      rim_status: "off" | "on" | "any"
      service_mode: "pickup" | "dropoff"
      surcharge_type: "rim_on" | "after_hours" | "fuel" | "distance_band"
      tire_category:
        | "passenger"
        | "commercial_17_5_19_5"
        | "commercial_22_5"
        | "otr"
        | "other"
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
      ],
      client_type: ["commercial", "residential", "industrial"],
      price_source: [
        "org_default",
        "admin_manual",
        "smart_suggested",
        "client_override",
        "location_override",
      ],
      rim_status: ["off", "on", "any"],
      service_mode: ["pickup", "dropoff"],
      surcharge_type: ["rim_on", "after_hours", "fuel", "distance_band"],
      tire_category: [
        "passenger",
        "commercial_17_5_19_5",
        "commercial_22_5",
        "otr",
        "other",
      ],
      value_type: ["flat", "percent"],
    },
  },
} as const
