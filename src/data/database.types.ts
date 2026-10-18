export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
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
          bank_format: string | null;
          created_at: string;
          household_id: string;
          id: string;
          kind: string;
          name: string;
          owner_id: string;
          visibility: string;
        };
        Insert: {
          bank_format?: string | null;
          created_at?: string;
          household_id: string;
          id?: string;
          kind: string;
          name: string;
          owner_id: string;
          visibility?: string;
        };
        Update: {
          bank_format?: string | null;
          created_at?: string;
          household_id?: string;
          id?: string;
          kind?: string;
          name?: string;
          owner_id?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'accounts_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      budgets: {
        Row: {
          category_id: string;
          household_id: string;
          id: string;
          limit_cents: number;
          member_id: string | null;
          month: string;
        };
        Insert: {
          category_id: string;
          household_id: string;
          id?: string;
          limit_cents: number;
          member_id?: string | null;
          month: string;
        };
        Update: {
          category_id?: string;
          household_id?: string;
          id?: string;
          limit_cents?: number;
          member_id?: string | null;
          month?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'budgets_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'budgets_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          household_id: string;
          id: string;
          is_hidden: boolean;
          kind: string;
          name: string;
        };
        Insert: {
          household_id: string;
          id?: string;
          is_hidden?: boolean;
          kind: string;
          name: string;
        };
        Update: {
          household_id?: string;
          id?: string;
          is_hidden?: boolean;
          kind?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      category_rules: {
        Row: {
          category_id: string;
          created_at: string;
          created_by: string | null;
          household_id: string;
          id: string;
          pattern: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          created_by?: string | null;
          household_id: string;
          id?: string;
          pattern: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          created_by?: string | null;
          household_id?: string;
          id?: string;
          pattern?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'category_rules_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'category_rules_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      households: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
        };
        Relationships: [];
      };
      imports: {
        Row: {
          account_id: string | null;
          ai_tokens_in: number;
          ai_tokens_out: number;
          by_ai: number;
          by_rule: number;
          created_at: string;
          error: string | null;
          file_name: string;
          household_id: string;
          id: string;
          needs_review: number;
          rows_duplicate: number;
          rows_inserted: number;
          rows_read: number;
          status: string;
          uploaded_by: string;
        };
        Insert: {
          account_id?: string | null;
          ai_tokens_in?: number;
          ai_tokens_out?: number;
          by_ai?: number;
          by_rule?: number;
          created_at?: string;
          error?: string | null;
          file_name: string;
          household_id: string;
          id?: string;
          needs_review?: number;
          rows_duplicate?: number;
          rows_inserted?: number;
          rows_read?: number;
          status?: string;
          uploaded_by: string;
        };
        Update: {
          account_id?: string | null;
          ai_tokens_in?: number;
          ai_tokens_out?: number;
          by_ai?: number;
          by_rule?: number;
          created_at?: string;
          error?: string | null;
          file_name?: string;
          household_id?: string;
          id?: string;
          needs_review?: number;
          rows_duplicate?: number;
          rows_inserted?: number;
          rows_read?: number;
          status?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'imports_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'imports_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      invites: {
        Row: {
          code: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          household_id: string;
          id: string;
          role: string;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          code?: string;
          created_at?: string;
          created_by: string;
          expires_at?: string;
          household_id: string;
          id?: string;
          role: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          household_id?: string;
          id?: string;
          role?: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'invites_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      members: {
        Row: {
          created_at: string;
          display_name: string;
          household_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          household_id: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          household_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'members_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          assignee_id: string | null;
          created_at: string;
          created_by: string;
          done_at: string | null;
          due_on: string | null;
          household_id: string;
          id: string;
          notes: string | null;
          recurrence: string | null;
          title: string;
        };
        Insert: {
          assignee_id?: string | null;
          created_at?: string;
          created_by: string;
          done_at?: string | null;
          due_on?: string | null;
          household_id: string;
          id?: string;
          notes?: string | null;
          recurrence?: string | null;
          title: string;
        };
        Update: {
          assignee_id?: string | null;
          created_at?: string;
          created_by?: string;
          done_at?: string | null;
          due_on?: string | null;
          household_id?: string;
          id?: string;
          notes?: string | null;
          recurrence?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      transactions: {
        Row: {
          account_id: string | null;
          ai_confidence: number | null;
          amount_cents: number;
          booked_on: string;
          category_id: string | null;
          category_source: string | null;
          created_at: string;
          description: string;
          household_id: string;
          id: string;
          import_hash: string | null;
          import_id: string | null;
          needs_review: boolean;
          note: string | null;
          owner_id: string | null;
          raw_description: string;
          transfer_member_id: string | null;
          visibility: string;
          visibility_overridden: boolean;
        };
        Insert: {
          account_id?: string | null;
          ai_confidence?: number | null;
          amount_cents: number;
          booked_on: string;
          category_id?: string | null;
          category_source?: string | null;
          created_at?: string;
          description: string;
          household_id: string;
          id?: string;
          import_hash?: string | null;
          import_id?: string | null;
          needs_review?: boolean;
          note?: string | null;
          owner_id?: string | null;
          raw_description: string;
          transfer_member_id?: string | null;
          visibility?: string;
          visibility_overridden?: boolean;
        };
        Update: {
          account_id?: string | null;
          ai_confidence?: number | null;
          amount_cents?: number;
          booked_on?: string;
          category_id?: string | null;
          category_source?: string | null;
          created_at?: string;
          description?: string;
          household_id?: string;
          id?: string;
          import_hash?: string | null;
          import_id?: string | null;
          needs_review?: boolean;
          note?: string | null;
          owner_id?: string | null;
          raw_description?: string;
          transfer_member_id?: string | null;
          visibility?: string;
          visibility_overridden?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_import_id_fkey';
            columns: ['import_id'];
            isOneToOne: false;
            referencedRelation: 'imports';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invite: { Args: { invite_code: string; member_name: string }; Returns: string };
      create_household: { Args: { household_name: string; member_name: string }; Returns: string };
      is_admin: { Args: { hh: string }; Returns: boolean };
      is_member: { Args: { hh: string }; Returns: boolean };
      is_owner: { Args: { hh: string; uid?: string }; Returns: boolean };
      owns_account: { Args: { acc: string; hh: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
