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
      bookings: {
        Row: {
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          end_time: string
          google_event_id: string | null
          grand_total: number | null
          id: string
          items_total: number | null
          notes: string | null
          reminder_sent: boolean | null
          space_id: string
          space_total: number | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          end_time: string
          google_event_id?: string | null
          grand_total?: number | null
          id?: string
          items_total?: number | null
          notes?: string | null
          reminder_sent?: boolean | null
          space_id: string
          space_total?: number | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          end_time?: string
          google_event_id?: string | null
          grand_total?: number | null
          id?: string
          items_total?: number | null
          notes?: string | null
          reminder_sent?: boolean | null
          space_id?: string
          space_total?: number | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          venue_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          venue_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_tokens_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          state: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          state: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          state?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_states_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          booking_id: string
          created_at: string
          description: string
          id: string
          product_id: string | null
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          description: string
          id?: string
          product_id?: string | null
          quantity?: number
          subtotal: number
          unit_price: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          description?: string
          id?: string
          product_id?: string | null
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_order_items: {
        Row: {
          created_at: string
          description: string
          id: string
          quantity: number
          service_code: string | null
          service_order_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          quantity?: number
          service_code?: string | null
          service_order_id: string
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          service_code?: string | null
          service_order_id?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_order_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          booking_id: string | null
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_city: string | null
          customer_document: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_state: string | null
          customer_zip_code: string | null
          description: string
          discount: number | null
          executed_at: string | null
          finished_at: string | null
          id: string
          issued_at: string | null
          nfse_issued_at: string | null
          nfse_number: string | null
          nfse_pdf_url: string | null
          nfse_verification_code: string | null
          notes: string | null
          order_number: number
          order_type: Database["public"]["Enums"]["service_order_type"]
          status_complete:
            | Database["public"]["Enums"]["service_order_status_complete"]
            | null
          status_simple:
            | Database["public"]["Enums"]["service_order_status_simple"]
            | null
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          total: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_city?: string | null
          customer_document?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_state?: string | null
          customer_zip_code?: string | null
          description: string
          discount?: number | null
          executed_at?: string | null
          finished_at?: string | null
          id?: string
          issued_at?: string | null
          nfse_issued_at?: string | null
          nfse_number?: string | null
          nfse_pdf_url?: string | null
          nfse_verification_code?: string | null
          notes?: string | null
          order_number: number
          order_type?: Database["public"]["Enums"]["service_order_type"]
          status_complete?:
            | Database["public"]["Enums"]["service_order_status_complete"]
            | null
          status_simple?:
            | Database["public"]["Enums"]["service_order_status_simple"]
            | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_city?: string | null
          customer_document?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_state?: string | null
          customer_zip_code?: string | null
          description?: string
          discount?: number | null
          executed_at?: string | null
          finished_at?: string | null
          id?: string
          issued_at?: string | null
          nfse_issued_at?: string | null
          nfse_number?: string | null
          nfse_pdf_url?: string | null
          nfse_verification_code?: string | null
          notes?: string | null
          order_number?: number
          order_type?: Database["public"]["Enums"]["service_order_type"]
          status_complete?:
            | Database["public"]["Enums"]["service_order_status_complete"]
            | null
          status_simple?:
            | Database["public"]["Enums"]["service_order_status_simple"]
            | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          capacity: number | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price_per_hour: number | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          capacity?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_per_hour?: number | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          capacity?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_per_hour?: number | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaces_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
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
      venue_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_members_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_sequences: {
        Row: {
          current_order_number: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          current_order_number?: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          current_order_number?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_sequences_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          accent_color: string | null
          address: string | null
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          booking_mode: 'calendar' | 'inquiry' | 'external_link' | null
          created_at: string
          dark_mode: boolean | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          plan_type: string | null
          primary_color: string | null
          public_page_enabled: boolean | null
          public_settings: {
            external_link_url?: string
            inquiry_notification_email?: string
            page_title?: string
            page_instruction?: string
          } | null
          reminder_hours_before: number | null
          secondary_color: string | null
          slug: string | null
          subscription_ends_at: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          booking_mode?: 'calendar' | 'inquiry' | 'external_link' | null
          created_at?: string
          dark_mode?: boolean | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          plan_type?: string | null
          primary_color?: string | null
          public_page_enabled?: boolean | null
          public_settings?: {
            external_link_url?: string
            inquiry_notification_email?: string
            page_title?: string
            page_instruction?: string
          } | null
          reminder_hours_before?: number | null
          secondary_color?: string | null
          slug?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          booking_mode?: 'calendar' | 'inquiry' | 'external_link' | null
          created_at?: string
          dark_mode?: boolean | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          plan_type?: string | null
          primary_color?: string | null
          public_page_enabled?: boolean | null
          public_settings?: {
            external_link_url?: string
            inquiry_notification_email?: string
            page_title?: string
            page_instruction?: string
          } | null
          reminder_hours_before?: number | null
          secondary_color?: string | null
          slug?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      bookings_safe: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          end_time: string | null
          google_event_id: string | null
          grand_total: number | null
          id: string | null
          items_total: number | null
          notes: string | null
          reminder_sent: boolean | null
          space_id: string | null
          space_total: number | null
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_email?: never
          customer_name?: never
          customer_phone?: never
          end_time?: string | null
          google_event_id?: string | null
          grand_total?: number | null
          id?: string | null
          items_total?: number | null
          notes?: string | null
          reminder_sent?: boolean | null
          space_id?: string | null
          space_total?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_email?: never
          customer_name?: never
          customer_phone?: never
          end_time?: string | null
          google_event_id?: string | null
          grand_total?: number | null
          id?: string | null
          items_total?: number | null
          notes?: string | null
          reminder_sent?: boolean | null
          space_id?: string | null
          space_total?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_login_rate_limit: {
        Args: {
          _email: string
          _ip_address?: string
          _max_attempts?: number
          _window_minutes?: number
        }
        Returns: {
          allowed: boolean
          attempts_remaining: number
          locked_until: string
        }[]
      }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      create_venue_with_admin: {
        Args: { _address?: string; _name: string; _phone?: string }
        Returns: {
          address: string | null
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          plan_type: string | null
          reminder_hours_before: number | null
          subscription_ends_at: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "venues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      is_venue_admin: {
        Args: { _user_id: string; _venue_id: string }
        Returns: boolean
      }
      is_venue_member: {
        Args: { _user_id: string; _venue_id: string }
        Returns: boolean
      }
      record_login_attempt: {
        Args: { _email: string; _ip_address?: string; _success?: boolean }
        Returns: undefined
      }
      get_public_venue_by_slug: {
        Args: { p_slug: string }
        Returns: {
          id: string
          name: string
          slug: string
          booking_mode: string
          public_settings: Json
          logo_url: string
          primary_color: string
        }[]
      }
      get_public_spaces_by_venue: {
        Args: { p_venue_id: string }
        Returns: {
          id: string
          name: string
          description: string
          price_per_hour: number
          capacity: number
        }[]
      }
      create_public_inquiry: {
        Args: {
          p_venue_id: string
          p_space_id: string
          p_customer_name: string
          p_customer_email: string
          p_customer_phone: string | null
          p_start_time: string
          p_end_time: string
          p_notes: string | null
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff" | "superadmin"
      booking_status: "PENDING" | "CONFIRMED" | "CANCELLED" | "FINALIZED"
      payment_method: "CASH" | "CREDIT" | "DEBIT" | "PIX"
      service_order_status_complete:
        | "draft"
        | "approved"
        | "in_progress"
        | "finished"
        | "invoiced"
        | "cancelled"
      service_order_status_simple: "open" | "finished" | "invoiced"
      service_order_type: "simple" | "complete"
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
      app_role: ["admin", "manager", "staff", "superadmin"],
      booking_status: ["PENDING", "CONFIRMED", "CANCELLED", "FINALIZED"],
      payment_method: ["CASH", "CREDIT", "DEBIT", "PIX"],
      service_order_status_complete: [
        "draft",
        "approved",
        "in_progress",
        "finished",
        "invoiced",
        "cancelled",
      ],
      service_order_status_simple: ["open", "finished", "invoiced"],
      service_order_type: ["simple", "complete"],
    },
  },
} as const
