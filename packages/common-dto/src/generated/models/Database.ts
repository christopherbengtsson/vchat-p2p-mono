export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      blacklist: {
        Row: {
          created_at: string;
          fingerprint: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          fingerprint: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          fingerprint?: string;
          id?: string;
        };
        Relationships: [];
      };
      ignored_users: {
        Row: {
          created_at: string;
          id: string;
          ignored_user_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ignored_user_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          ignored_user_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ignored_users_ignored_user_id_fkey';
            columns: ['ignored_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ignored_users_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          email: string | null;
          id: string;
          status: Database['public']['Enums']['user_status'];
          updated_at: string | null;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          email?: string | null;
          id: string;
          status?: Database['public']['Enums']['user_status'];
          updated_at?: string | null;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          email?: string | null;
          id?: string;
          status?: Database['public']['Enums']['user_status'];
          updated_at?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      user_bans: {
        Row: {
          ban_duration: Database['public']['Enums']['ban_duration'];
          created_at: string;
          id: string;
          user_id: string | null;
        };
        Insert: {
          ban_duration: Database['public']['Enums']['ban_duration'];
          created_at?: string;
          id?: string;
          user_id?: string | null;
        };
        Update: {
          ban_duration?: Database['public']['Enums']['ban_duration'];
          created_at?: string;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_bans_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_reports: {
        Row: {
          ban_duration: string | null;
          created_at: string;
          id: string;
          reason: Database['public']['Enums']['user_report_reason'] | null;
          reporter_id: string;
          user_id_to_report: string;
        };
        Insert: {
          ban_duration?: string | null;
          created_at?: string;
          id?: string;
          reason?: Database['public']['Enums']['user_report_reason'] | null;
          reporter_id: string;
          user_id_to_report: string;
        };
        Update: {
          ban_duration?: string | null;
          created_at?: string;
          id?: string;
          reason?: Database['public']['Enums']['user_report_reason'] | null;
          reporter_id?: string;
          user_id_to_report?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_user_id_to_report_fkey';
            columns: ['user_id_to_report'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cleanup_blacklist: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      cleanup_old_user_reports: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      delete_permanently_banned_users: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      lift_temporary_bans: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      report_user: {
        Args: {
          p_reporter_id: string;
          p_user_id_to_report: string;
          p_reason: string;
        };
        Returns: number;
      };
    };
    Enums: {
      ban_duration: '24' | '72' | '168' | '-1';
      user_report_reason: 'INAPPROPRIATE_BEHAVIOR' | 'UNDER_AGED';
      user_status: 'ACTIVE' | 'BANNED' | 'SUSPENDED';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
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
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
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
    | keyof DefaultSchema['Enums']
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      ban_duration: ['24', '72', '168', '-1'],
      user_report_reason: ['INAPPROPRIATE_BEHAVIOR', 'UNDER_AGED'],
      user_status: ['ACTIVE', 'BANNED', 'SUSPENDED'],
    },
  },
} as const;
