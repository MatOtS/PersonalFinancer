// Hand-written to match supabase/migrations/0001_init.sql and 0002_seed_new_user.sql.
// Regenerate with `supabase gen types typescript` once a real project exists,
// keeping this file's shape (Row/Insert/Update/Relationships per table) as the
// source of truth in the meantime — @supabase/supabase-js's generics need that
// exact shape or type inference silently collapses to `never`.

export type MovementType = "personal" | "freelance";
export type FixedExpenseFrequency = "monthly" | "bimonthly" | "quarterly" | "annual";
export type MovementSource = "manual" | "csv_import";

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: { id: string; user_id: string; name: string; created_at: string };
        Insert: { id?: string; user_id?: string; name: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: { id: string; user_id: string; name: string };
        Insert: { id?: string; user_id?: string; name: string };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      subcategories: {
        Row: { id: string; user_id: string; category_id: string; name: string };
        Insert: { id?: string; user_id?: string; category_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["subcategories"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: { id: string; user_id: string; name: string; created_at: string };
        Insert: { id?: string; user_id?: string; name: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          issue_date: string;
          invoice_number: string;
          amount: number;
          irpf_pct: number;
          iva_pct: number;
          net_amount: number;
          issued: boolean;
          paid: boolean;
          paid_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          client_id: string;
          issue_date?: string;
          invoice_number: string;
          amount: number;
          irpf_pct?: number;
          iva_pct?: number;
          net_amount: number;
          issued?: boolean;
          paid?: boolean;
          paid_date?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      movements: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          description: string;
          account_id: string;
          category_id: string | null;
          subcategory_id: string | null;
          amount: number;
          type: MovementType;
          is_fixed_expense: boolean;
          client_id: string | null;
          invoice_id: string | null;
          source: MovementSource;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          date?: string;
          description: string;
          account_id: string;
          category_id?: string | null;
          subcategory_id?: string | null;
          amount: number;
          type: MovementType;
          is_fixed_expense?: boolean;
          client_id?: string | null;
          invoice_id?: string | null;
          source?: MovementSource;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["movements"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "movements_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movements_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movements_subcategory_id_fkey";
            columns: ["subcategory_id"];
            isOneToOne: false;
            referencedRelation: "subcategories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movements_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movements_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      fixed_expenses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          frequency: FixedExpenseFrequency;
          account_id: string | null;
          category_id: string | null;
          subcategory_id: string | null;
          active: boolean;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          amount: number;
          frequency: FixedExpenseFrequency;
          account_id?: string | null;
          category_id?: string | null;
          subcategory_id?: string | null;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["fixed_expenses"]["Insert"]>;
        Relationships: [];
      };
      csv_import_profiles: {
        Row: {
          id: string;
          user_id: string;
          bank_name: string;
          column_mapping: { date: string; description: string; amount: string; account?: string };
        };
        Insert: {
          id?: string;
          user_id?: string;
          bank_name: string;
          column_mapping: { date: string; description: string; amount: string; account?: string };
        };
        Update: Partial<Database["public"]["Tables"]["csv_import_profiles"]["Insert"]>;
        Relationships: [];
      };
      category_keywords: {
        Row: {
          id: string;
          user_id: string;
          keyword: string;
          category_id: string;
          subcategory_id: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          keyword: string;
          category_id: string;
          subcategory_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["category_keywords"]["Insert"]>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          default_irpf_pct: number;
          default_iva_pct: number;
          invoice_number_format: string;
          invoice_number_next: number;
        };
        Insert: {
          user_id?: string;
          default_irpf_pct?: number;
          default_iva_pct?: number;
          invoice_number_format?: string;
          invoice_number_next?: number;
        };
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      account_balances: {
        Row: { account_id: string; user_id: string; name: string; current_balance: number };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
