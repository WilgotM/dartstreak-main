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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      daily_throws: {
        Row: {
          created_at: string
          id: string
          league_id: string
          round_number: number
          throw_1: number
          throw_2: number
          throw_3: number
          throw_4: number
          throw_5: number
          throw_6: number
          throw_7: number
          throw_8: number
          throw_9: number
          throw_date: string
          total_score: number | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          round_number: number
          throw_1: number
          throw_2: number
          throw_3: number
          throw_4: number
          throw_5: number
          throw_6: number
          throw_7: number
          throw_8: number
          throw_9: number
          throw_date?: string
          total_score?: number | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          round_number?: number
          throw_1?: number
          throw_2?: number
          throw_3?: number
          throw_4?: number
          throw_5?: number
          throw_6?: number
          throw_7?: number
          throw_8?: number
          throw_9?: number
          throw_date?: string
          total_score?: number | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_throws_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_throws_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          status: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          status?: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          status?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_invites: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          league_id: string
          status: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          league_id: string
          status?: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          league_id?: string
          status?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_invites_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_invites_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_invites_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_members: {
        Row: {
          id: string
          joined_at: string
          league_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          league_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          league_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          created_by: string
          current_round: number
          id: string
          invite_code: string
          name: string
          round_start_day: number
          started_at: string | null
          total_rounds: number
        }
        Insert: {
          created_at?: string
          created_by: string
          current_round?: number
          id?: string
          invite_code?: string
          name: string
          round_start_day?: number
          started_at?: string | null
          total_rounds?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          current_round?: number
          id?: string
          invite_code?: string
          name?: string
          round_start_day?: number
          started_at?: string | null
          total_rounds?: number
        }
        Relationships: [
          {
            foreignKeyName: "leagues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_signals: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          match_id: string
          payload: Json
          signal_type: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          match_id: string
          payload: Json
          signal_type: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          match_id?: string
          payload?: Json
          signal_type?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_signals_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_signals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_signals_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_throws: {
        Row: {
          created_at: string
          dart_1: number
          dart_2: number
          dart_3: number
          id: string
          is_bust: boolean
          match_id: string
          player_id: string
          remaining_score: number
          throw_number: number
          total: number
        }
        Insert: {
          created_at?: string
          dart_1?: number
          dart_2?: number
          dart_3?: number
          id?: string
          is_bust?: boolean
          match_id: string
          player_id: string
          remaining_score: number
          throw_number: number
          total?: number
        }
        Update: {
          created_at?: string
          dart_1?: number
          dart_2?: number
          dart_3?: number
          id?: string
          is_bust?: boolean
          match_id?: string
          player_id?: string
          remaining_score?: number
          throw_number?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_throws_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_throws_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          checkout_type: string
          completed_at: string | null
          created_at: string
          current_turn: string | null
          id: string
          is_offline: boolean
          legs_to_win: number
          player1_id: string
          player1_legs: number
          player1_score: number
          player1_sets: number
          player2_id: string | null
          player2_legs: number
          player2_score: number | null
          player2_sets: number
          sets_to_win: number
          signaling_data: Json | null
          started_at: string | null
          starting_score: number
          status: string
          winner_id: string | null
        }
        Insert: {
          checkout_type?: string
          completed_at?: string | null
          created_at?: string
          current_turn?: string | null
          id?: string
          is_offline?: boolean
          legs_to_win?: number
          player1_id: string
          player1_legs?: number
          player1_score: number
          player1_sets?: number
          player2_id?: string | null
          player2_legs?: number
          player2_score?: number | null
          player2_sets?: number
          sets_to_win?: number
          signaling_data?: Json | null
          started_at?: string | null
          starting_score?: number
          status?: string
          winner_id?: string | null
        }
        Update: {
          checkout_type?: string
          completed_at?: string | null
          created_at?: string
          current_turn?: string | null
          id?: string
          is_offline?: boolean
          legs_to_win?: number
          player1_id?: string
          player1_legs?: number
          player1_score?: number
          player1_sets?: number
          player2_id?: string | null
          player2_legs?: number
          player2_score?: number | null
          player2_sets?: number
          sets_to_win?: number
          signaling_data?: Json | null
          started_at?: string | null
          starting_score?: number
          status?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          display_name_changed_at: string | null
          email_changed_at: string | null
          id: string
          timezone: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          display_name_changed_at?: string | null
          email_changed_at?: string | null
          id: string
          timezone?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          display_name_changed_at?: string | null
          email_changed_at?: string | null
          id?: string
          timezone?: string | null
        }
        Relationships: []
      }
      tournament_invites: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          status: string
          to_user_id: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          status?: string
          to_user_id: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          status?: string
          to_user_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_invites_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          created_at: string
          id: string
          match_id: string | null
          match_number: number
          player1_participant_id: string | null
          player2_participant_id: string | null
          round: number
          scheduled_start_at: string | null
          status: string
          tournament_id: string
          winner_participant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_id?: string | null
          match_number: number
          player1_participant_id?: string | null
          player2_participant_id?: string | null
          round: number
          scheduled_start_at?: string | null
          status?: string
          tournament_id: string
          winner_participant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string | null
          match_number?: number
          player1_participant_id?: string | null
          player2_participant_id?: string | null
          round?: number
          scheduled_start_at?: string | null
          status?: string
          tournament_id?: string
          winner_participant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_player1_participant_id_fkey"
            columns: ["player1_participant_id"]
            isOneToOne: false
            referencedRelation: "tournament_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_player2_participant_id_fkey"
            columns: ["player2_participant_id"]
            isOneToOne: false
            referencedRelation: "tournament_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_participant_id_fkey"
            columns: ["winner_participant_id"]
            isOneToOne: false
            referencedRelation: "tournament_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          bot_name: string | null
          created_at: string
          eliminated_at_round: number | null
          id: string
          is_bot: boolean
          seed: number | null
          tournament_id: string
          user_id: string | null
        }
        Insert: {
          bot_name?: string | null
          created_at?: string
          eliminated_at_round?: number | null
          id?: string
          is_bot?: boolean
          seed?: number | null
          tournament_id: string
          user_id?: string | null
        }
        Update: {
          bot_name?: string | null
          created_at?: string
          eliminated_at_round?: number | null
          id?: string
          is_bot?: boolean
          seed?: number | null
          tournament_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          bot_average: number | null
          checkout_type: string
          completed_at: string | null
          created_at: string
          created_by: string
          current_round: number
          id: string
          is_public: boolean
          legs_to_win: number
          max_players: number
          name: string
          round_started_at: string | null
          scheduled_start_at: string | null
          sets_to_win: number
          started_at: string | null
          starting_score: number
          status: string
          winner_id: string | null
        }
        Insert: {
          bot_average?: number | null
          checkout_type?: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          current_round?: number
          id?: string
          is_public?: boolean
          legs_to_win?: number
          max_players?: number
          name: string
          round_started_at?: string | null
          scheduled_start_at?: string | null
          sets_to_win?: number
          started_at?: string | null
          starting_score?: number
          status?: string
          winner_id?: string | null
        }
        Update: {
          bot_average?: number | null
          checkout_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          current_round?: number
          id?: string
          is_public?: boolean
          legs_to_win?: number
          max_players?: number
          name?: string
          round_started_at?: string | null
          scheduled_start_at?: string | null
          sets_to_win?: number
          started_at?: string | null
          starting_score?: number
          status?: string
          winner_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: {
        Args: { _friend_id: string; _user_id: string }
        Returns: boolean
      }
      is_league_creator: {
        Args: { _league_id: string; _user_id: string }
        Returns: boolean
      }
      is_league_member: {
        Args: { _league_id: string; _user_id: string }
        Returns: boolean
      }
      is_tournament_creator: {
        Args: { _tournament_id: string; _user_id: string }
        Returns: boolean
      }
      is_tournament_open_and_public: {
        Args: { _tournament_id: string }
        Returns: boolean
      }
      is_tournament_participant: {
        Args: { _tournament_id: string; _user_id: string }
        Returns: boolean
      }
      is_tournament_public: {
        Args: { _tournament_id: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
