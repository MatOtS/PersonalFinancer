export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          name_key: string;
          opening_balance_cents: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          name_key: string;
          opening_balance_cents?: number;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          name_key?: string;
          opening_balance_cents?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      bank_profiles: {
        Row: {
          account_id: string;
          amount_column: string;
          date_column: string;
          description_column: string;
          id: string;
          sign_column: string | null;
          user_id: string;
        };
        Insert: {
          account_id: string;
          amount_column: string;
          date_column: string;
          description_column: string;
          id?: string;
          sign_column?: string | null;
          user_id?: string;
        };
        Update: {
          account_id?: string;
          amount_column?: string;
          date_column?: string;
          description_column?: string;
          id?: string;
          sign_column?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bank_profiles_account_fkey";
            columns: ["account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          name: string;
          name_key: string;
          parent_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          name: string;
          name_key: string;
          parent_id?: string | null;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          name?: string;
          name_key?: string;
          parent_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_user_id_kind_fkey";
            columns: ["parent_id", "user_id", "kind"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id", "kind"];
          },
        ];
      };
      category_keywords: {
        Row: {
          category_id: string;
          created_at: string;
          id: string;
          keyword: string;
          keyword_key: string;
          user_id: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          id?: string;
          keyword: string;
          keyword_key: string;
          user_id?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          id?: string;
          keyword?: string;
          keyword_key?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_keywords_category_fkey";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      clients: {
        Row: {
          address: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          tax_id: string | null;
          user_id: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          tax_id?: string | null;
          user_id?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          tax_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      fixed_expenses: {
        Row: {
          account_id: string | null;
          active: boolean;
          amount_cents: number;
          category_id: string | null;
          created_at: string;
          frequency: string;
          id: string;
          name: string;
          user_id: string;
        };
        Insert: {
          account_id?: string | null;
          active?: boolean;
          amount_cents: number;
          category_id?: string | null;
          created_at?: string;
          frequency: string;
          id?: string;
          name: string;
          user_id?: string;
        };
        Update: {
          account_id?: string | null;
          active?: boolean;
          amount_cents?: number;
          category_id?: string | null;
          created_at?: string;
          frequency?: string;
          id?: string;
          name?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fixed_expenses_account_fkey";
            columns: ["account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "fixed_expenses_category_fkey";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      invoice_lines: {
        Row: {
          description: string;
          id: string;
          invoice_id: string;
          position: number;
          quantity_hundredths: number;
          unit_price_cents: number;
          user_id: string;
        };
        Insert: {
          description: string;
          id?: string;
          invoice_id: string;
          position?: number;
          quantity_hundredths: number;
          unit_price_cents: number;
          user_id?: string;
        };
        Update: {
          description?: string;
          id?: string;
          invoice_id?: string;
          position?: number;
          quantity_hundredths?: number;
          unit_price_cents?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_fkey";
            columns: ["invoice_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      invoices: {
        Row: {
          client_id: string;
          created_at: string;
          due_date: string | null;
          id: string;
          invoice_number: string | null;
          irpf_bp: number;
          issue_date: string;
          iva_bp: number;
          paid_date: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          due_date?: string | null;
          id?: string;
          invoice_number?: string | null;
          irpf_bp?: number;
          issue_date: string;
          iva_bp?: number;
          paid_date?: string | null;
          status?: string;
          user_id?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          due_date?: string | null;
          id?: string;
          invoice_number?: string | null;
          irpf_bp?: number;
          issue_date?: string;
          iva_bp?: number;
          paid_date?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_client_fkey";
            columns: ["client_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      movements: {
        Row: {
          account_id: string;
          amount_cents: number;
          category_id: string | null;
          client_id: string | null;
          created_at: string;
          date: string;
          description: string | null;
          id: string;
          invoice_id: string | null;
          is_fixed: boolean;
          kind: string;
          source: string;
          subcategory_id: string | null;
          user_id: string;
          work_kind: string;
        };
        Insert: {
          account_id: string;
          amount_cents: number;
          category_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          date: string;
          description?: string | null;
          id?: string;
          invoice_id?: string | null;
          is_fixed?: boolean;
          kind: string;
          source?: string;
          subcategory_id?: string | null;
          user_id?: string;
          work_kind: string;
        };
        Update: {
          account_id?: string;
          amount_cents?: number;
          category_id?: string | null;
          client_id?: string | null;
          created_at?: string;
          date?: string;
          description?: string | null;
          id?: string;
          invoice_id?: string | null;
          is_fixed?: boolean;
          kind?: string;
          source?: string;
          subcategory_id?: string | null;
          user_id?: string;
          work_kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: "movements_account_fkey";
            columns: ["account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "movements_category_fkey";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "movements_client_fkey";
            columns: ["client_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "movements_invoice_fkey";
            columns: ["invoice_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "movements_subcategory_category_fkey";
            columns: ["subcategory_id", "user_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id", "parent_id"];
          },
          {
            foreignKeyName: "movements_subcategory_fkey";
            columns: ["subcategory_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      profiles: {
        Row: {
          default_categories_added_at: string | null;
          user_id: string;
        };
        Insert: {
          default_categories_added_at?: string | null;
          user_id?: string;
        };
        Update: {
          default_categories_added_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          default_irpf_bp: number;
          default_iva_bp: number;
          due_days: number;
          invoice_number_format: string;
          invoice_number_next: number;
          issuer_address: string | null;
          issuer_email: string | null;
          issuer_iban: string | null;
          issuer_name: string | null;
          issuer_phone: string | null;
          issuer_tax_id: string | null;
          logo_path: string | null;
          user_id: string;
        };
        Insert: {
          default_irpf_bp?: number;
          default_iva_bp?: number;
          due_days?: number;
          invoice_number_format?: string;
          invoice_number_next?: number;
          issuer_address?: string | null;
          issuer_email?: string | null;
          issuer_iban?: string | null;
          issuer_name?: string | null;
          issuer_phone?: string | null;
          issuer_tax_id?: string | null;
          logo_path?: string | null;
          user_id?: string;
        };
        Update: {
          default_irpf_bp?: number;
          default_iva_bp?: number;
          due_days?: number;
          invoice_number_format?: string;
          invoice_number_next?: number;
          issuer_address?: string | null;
          issuer_email?: string | null;
          issuer_iban?: string | null;
          issuer_name?: string | null;
          issuer_phone?: string | null;
          issuer_tax_id?: string | null;
          logo_path?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      issue_invoice: {
        Args: { p_id: string; p_year: number };
        Returns: string;
      };
      pay_invoice: {
        Args: { p_amount_cents: number; p_date: string; p_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
