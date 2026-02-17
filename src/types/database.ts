export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'customer'
          phone: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'admin' | 'customer'
          phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'customer'
          phone?: string | null
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          size: string
          cost_price: number
          sale_price: number
          image_url: string | null
          stock_quantity: number
          is_available: boolean
          is_archived: boolean
          min_stock_alert: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          size: string
          cost_price: number
          sale_price: number
          image_url?: string | null
          stock_quantity?: number
          is_available?: boolean
          is_archived?: boolean
          min_stock_alert?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          size?: string
          cost_price?: number
          sale_price?: number
          image_url?: string | null
          stock_quantity?: number
          is_available?: boolean
          is_archived?: boolean
          min_stock_alert?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          name: string
          phone: string
          email: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          email?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          email?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          id: string
          customer_id: string
          total_amount: number
          payment_method: 'pix' | 'installment_1x' | 'installment_2x' | 'installment_3x'
          status: 'pending' | 'partial' | 'paid' | 'cancelled'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          total_amount: number
          payment_method: 'pix' | 'installment_1x' | 'installment_2x' | 'installment_3x'
          status?: 'pending' | 'partial' | 'paid' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          total_amount?: number
          payment_method?: 'pix' | 'installment_1x' | 'installment_2x' | 'installment_3x'
          status?: 'pending' | 'partial' | 'paid' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          quantity: number
          unit_price: number
          cost_price: number
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          product_id: string
          quantity?: number
          unit_price: number
          cost_price: number
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          cost_price?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      installments: {
        Row: {
          id: string
          sale_id: string
          installment_number: number
          amount: number
          due_date: string
          paid_date: string | null
          is_paid: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          installment_number: number
          amount: number
          due_date: string
          paid_date?: string | null
          is_paid?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          installment_number?: number
          amount?: number
          due_date?: string
          paid_date?: string | null
          is_paid?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_sale_id_fkey"
            columns: ["sale_id"]
            referencedRelation: "sales"
            referencedColumns: ["id"]
          }
        ]
      }
      expenses: {
        Row: {
          id: string
          description: string
          amount: number
          category: 'fuel' | 'bags' | 'gifts' | 'other'
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          description: string
          amount: number
          category: 'fuel' | 'bags' | 'gifts' | 'other'
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          description?: string
          amount?: number
          category?: 'fuel' | 'bags' | 'gifts' | 'other'
          date?: string
          created_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          value: string
          label: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: string
          label: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
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

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Sale = Database['public']['Tables']['sales']['Row']
export type SaleItem = Database['public']['Tables']['sale_items']['Row']
export type Installment = Database['public']['Tables']['installments']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']

export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type SaleInsert = Database['public']['Tables']['sales']['Insert']
export type SaleItemInsert = Database['public']['Tables']['sale_items']['Insert']
export type InstallmentInsert = Database['public']['Tables']['installments']['Insert']
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
export type AppSetting = Database['public']['Tables']['app_settings']['Row']
