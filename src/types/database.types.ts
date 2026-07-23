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
      families: {
        Row: {
          id: string;
          name: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          family_id: string | null;
          role: 'parent' | 'child';
          display_name: string;
          avatar_seed: string | null;
          birth_year: number | null;
          onboarding_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          family_id?: string | null;
          role: 'parent' | 'child';
          display_name: string;
          avatar_seed?: string | null;
          birth_year?: number | null;
          onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string | null;
          role?: 'parent' | 'child';
          display_name?: string;
          avatar_seed?: string | null;
          birth_year?: number | null;
          onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      family_invites: {
        Row: {
          id: string;
          family_id: string;
          invited_by: string;
          invite_code: string;
          role: 'parent' | 'child';
          used_by: string | null;
          used_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          invited_by: string;
          invite_code?: string;
          role: 'parent' | 'child';
          used_by?: string | null;
          used_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          invited_by?: string;
          invite_code?: string;
          role?: 'parent' | 'child';
          used_by?: string | null;
          used_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      routines: {
        Row: {
          id: string;
          family_id: string;
          child_id: string | null;
          title: string;
          description: string | null;
          time_of_day: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          child_id?: string | null;
          title: string;
          description?: string | null;
          time_of_day?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          child_id?: string | null;
          title?: string;
          description?: string | null;
          time_of_day?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      routine_steps: {
        Row: {
          id: string;
          routine_id: string;
          step_order: number;
          title: string;
          spark_value: number;
          value_dimension: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          routine_id: string;
          step_order: number;
          title: string;
          spark_value?: number;
          value_dimension?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          routine_id?: string;
          step_order?: number;
          title?: string;
          spark_value?: number;
          value_dimension?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      routine_completions: {
        Row: {
          id: string;
          routine_id: string;
          child_id: string;
          completed_at: string;
          completed_steps: number[];
          sparks_awarded: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          routine_id: string;
          child_id: string;
          completed_at?: string;
          completed_steps: number[];
          sparks_awarded: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          routine_id?: string;
          child_id?: string;
          completed_at?: string;
          completed_steps?: number[];
          sparks_awarded?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      spark_ledger: {
        Row: {
          id: string;
          child_id: string;
          delta: number;
          reason: string;
          reference_id: string | null;
          source_type?: string;
          note?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          delta: number;
          reason?: string;
          reference_id?: string | null;
          source_type?: string;
          note?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          child_id?: string;
          delta?: number;
          reason?: string;
          reference_id?: string | null;
          source_type?: string;
          note?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      companions: {
        Row: {
          id: string;
          child_id: string;
          name: string;
          stage: 'egg' | 'sprout' | 'bloom' | 'glow' | 'radiant';
          theme: string | null;
          accessory: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          name?: string;
          stage?: 'egg' | 'sprout' | 'bloom' | 'glow' | 'radiant';
          theme?: string | null;
          accessory?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          child_id?: string;
          name?: string;
          stage?: 'egg' | 'sprout' | 'bloom' | 'glow' | 'radiant';
          theme?: string | null;
          accessory?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      companion_memories: {
        Row: {
          id: string;
          companion_id: string;
          child_id: string;
          type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          companion_id: string;
          child_id: string;
          type: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          companion_id?: string;
          child_id?: string;
          type?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          family_id: string;
          child_id: string;
          title: string;
          description: string | null;
          status: 'active' | 'completed' | 'paused' | 'archived';
          value_dimension: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          child_id: string;
          title: string;
          description?: string | null;
          status?: 'active' | 'completed' | 'paused' | 'archived';
          value_dimension?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          child_id?: string;
          title?: string;
          description?: string | null;
          status?: 'active' | 'completed' | 'paused' | 'archived';
          value_dimension?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      goal_microtasks: {
        Row: {
          id: string;
          goal_id: string;
          title: string;
          effort_tier: 'easy' | 'medium' | 'stretch';
          spark_value: number;
          status: 'pending' | 'completed';
          task_order: number;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          title: string;
          effort_tier?: 'easy' | 'medium' | 'stretch';
          spark_value?: number;
          status?: 'pending' | 'completed';
          task_order: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          goal_id?: string;
          title?: string;
          effort_tier?: 'easy' | 'medium' | 'stretch';
          spark_value?: number;
          status?: 'pending' | 'completed';
          task_order?: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      emotional_checkins: {
        Row: {
          id: string;
          child_id: string;
          emotion_word: string;
          valence: number;
          energy_level: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          emotion_word: string;
          valence: number;
          energy_level: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          child_id?: string;
          emotion_word?: string;
          valence?: number;
          energy_level?: number;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      child_value_scores: {
        Row: {
          id: string;
          child_id: string;
          dimension_id: string;
          score: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          dimension_id: string;
          score?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          child_id?: string;
          dimension_id?: string;
          score?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      rewards: {
        Row: {
          id: string;
          family_id: string;
          title: string;
          description: string | null;
          spark_cost: number;
          cooldown_hours: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          title: string;
          description?: string | null;
          spark_cost: number;
          cooldown_hours?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          title?: string;
          description?: string | null;
          spark_cost?: number;
          cooldown_hours?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reward_requests: {
        Row: {
          id: string;
          reward_id: string;
          child_id: string;
          status: 'pending' | 'approved' | 'rejected';
          spark_cost: number;
          requested_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          reward_id: string;
          child_id: string;
          status?: 'pending' | 'approved' | 'rejected';
          spark_cost: number;
          requested_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          reward_id?: string;
          child_id?: string;
          status?: 'pending' | 'approved' | 'rejected';
          spark_cost?: number;
          requested_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      child_badges: {
        Row: {
          id: string;
          child_id: string;
          badge_name: string;
          badge_tier: 'bronze' | 'silver' | 'gold';
          dimension_id: string;
          parent_note: string | null;
          awarded_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          badge_name: string;
          badge_tier: 'bronze' | 'silver' | 'gold';
          dimension_id: string;
          parent_note?: string | null;
          awarded_at?: string;
        };
        Update: {
          id?: string;
          child_id?: string;
          badge_name?: string;
          badge_tier?: 'bronze' | 'silver' | 'gold';
          dimension_id?: string;
          parent_note?: string | null;
          awarded_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      award_sparks: {
        Args: {
          p_child_id: string;
          p_delta: number;
          p_source_type?: string;
          p_source_id?: string | null;
          p_note?: string;
        };
        Returns: void;
      };
      create_family_with_parent: {
        Args: {
          p_user_id: string;
          p_family_name: string;
          p_display_name: string;
          p_avatar_seed?: string | null;
        };
        Returns: unknown;
      };
      join_family_with_invite: {
        Args: {
          p_user_id: string;
          p_invite_code: string;
          p_display_name: string;
          p_birth_year?: number | null;
          p_avatar_seed?: string | null;
        };
        Returns: unknown;
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
