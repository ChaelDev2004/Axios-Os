export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TransactionType = "income" | "expense";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          avatar_url: string | null;
          role: string;
          pin_hash: string | null;
          has_pin: boolean;
          pin_attempts: number;
          pin_locked_until: string | null;
          pin_lock_level: number;
          password_attempts: number;
          password_locked_until: string | null;
          password_lock_level: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          email: string;
          avatar_url?: string | null;
          role?: string;
          pin_hash?: string | null;
          has_pin?: boolean;
          pin_attempts?: number;
          pin_locked_until?: string | null;
          pin_lock_level?: number;
          password_attempts?: number;
          password_locked_until?: string | null;
          password_lock_level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          avatar_url?: string | null;
          role?: string;
          pin_hash?: string | null;
          has_pin?: boolean;
          pin_attempts?: number;
          pin_locked_until?: string | null;
          pin_lock_level?: number;
          password_attempts?: number;
          password_locked_until?: string | null;
          password_lock_level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      auth_security_events: {
        Row: {
          id: string;
          kind: string;
          email: string | null;
          user_id: string | null;
          ip: string | null;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          kind: string;
          email?: string | null;
          user_id?: string | null;
          ip?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          kind?: string;
          email?: string | null;
          user_id?: string | null;
          ip?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          status: string;
          priority: string;
          start_date: string | null;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          status?: string;
          priority?: string;
          start_date?: string | null;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          status?: string;
          priority?: string;
          start_date?: string | null;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          title: string;
          description: string | null;
          priority: string;
          status: string;
          due_date: string | null;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          title: string;
          description?: string | null;
          priority?: string;
          status?: string;
          due_date?: string | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          title?: string;
          description?: string | null;
          priority?: string;
          status?: string;
          due_date?: string | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          task_id: string | null;
          title: string;
          body: string | null;
          tag: string | null;
          pinned: boolean;
          favorite: boolean;
          due_date: string | null;
          remind_enabled: boolean;
          remind_weekday: number | null;
          remind_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id?: string | null;
          title: string;
          body?: string | null;
          tag?: string | null;
          pinned?: boolean;
          favorite?: boolean;
          due_date?: string | null;
          remind_enabled?: boolean;
          remind_weekday?: number | null;
          remind_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string | null;
          title?: string;
          body?: string | null;
          tag?: string | null;
          pinned?: boolean;
          favorite?: boolean;
          due_date?: string | null;
          remind_enabled?: boolean;
          remind_weekday?: number | null;
          remind_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notes_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      pomodoro_sessions: {
        Row: {
          id: string;
          user_id: string;
          duration: number;
          completed: boolean;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          duration?: number;
          completed?: boolean;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          duration?: number;
          completed?: boolean;
          started_at?: string;
          ended_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pomodoro_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: TransactionType;
          amount: number;
          category: string | null;
          description: string | null;
          transaction_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: TransactionType;
          amount: number;
          category?: string | null;
          description?: string | null;
          transaction_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: TransactionType;
          amount?: number;
          category?: string | null;
          description?: string | null;
          transaction_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          project_url: string | null;
          published: boolean;
          views: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          project_url?: string | null;
          published?: boolean;
          views?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          project_url?: string | null;
          published?: boolean;
          views?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_view_events: {
        Row: {
          id: string;
          user_id: string;
          portfolio_project_id: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          portfolio_project_id: string;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          portfolio_project_id?: string;
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_view_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "portfolio_view_events_portfolio_project_id_fkey";
            columns: ["portfolio_project_id"];
            isOneToOne: false;
            referencedRelation: "portfolio_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      landing_page_visits: {
        Row: {
          id: string;
          visited_at: string;
          path: string;
          referrer: string;
          session_id: string;
          user_agent: string;
        };
        Insert: {
          id?: string;
          visited_at?: string;
          path?: string;
          referrer?: string;
          session_id?: string;
          user_agent?: string;
        };
        Update: {
          id?: string;
          visited_at?: string;
          path?: string;
          referrer?: string;
          session_id?: string;
          user_agent?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          read: boolean;
          type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          read?: boolean;
          type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          read?: boolean;
          type?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          prompt: string;
          response: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          prompt: string;
          response: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          prompt?: string;
          response?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      hero_content: {
        Row: {
          id: string;
          term_tag: string;
          headline_top: string;
          rotating_words: string[];
          bio_name: string;
          bio_body: string;
          stat_1_value: string;
          stat_1_label: string;
          stat_2_value: string;
          stat_2_label: string;
          stat_3_value: string;
          stat_3_label: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          term_tag?: string;
          headline_top?: string;
          rotating_words?: string[];
          bio_name?: string;
          bio_body?: string;
          stat_1_value?: string;
          stat_1_label?: string;
          stat_2_value?: string;
          stat_2_label?: string;
          stat_3_value?: string;
          stat_3_label?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          term_tag?: string;
          headline_top?: string;
          rotating_words?: string[];
          bio_name?: string;
          bio_body?: string;
          stat_1_value?: string;
          stat_1_label?: string;
          stat_2_value?: string;
          stat_2_label?: string;
          stat_3_value?: string;
          stat_3_label?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hero_content_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      about_content: {
        Row: {
          id: string;
          lead_text: string;
          hire_button_label: string;
          cv_button_label: string;
          cv_url: string;
          cv_file_name: string;
          cv_redirect_url: string;
          lanyard_hint: string;
          feature_1_num: string;
          feature_1_title: string;
          feature_1_desc: string;
          feature_2_num: string;
          feature_2_title: string;
          feature_2_desc: string;
          feature_3_num: string;
          feature_3_title: string;
          feature_3_desc: string;
          feature_4_num: string;
          feature_4_title: string;
          feature_4_desc: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          lead_text?: string;
          hire_button_label?: string;
          cv_button_label?: string;
          cv_url?: string;
          cv_file_name?: string;
          cv_redirect_url?: string;
          lanyard_hint?: string;
          feature_1_num?: string;
          feature_1_title?: string;
          feature_1_desc?: string;
          feature_2_num?: string;
          feature_2_title?: string;
          feature_2_desc?: string;
          feature_3_num?: string;
          feature_3_title?: string;
          feature_3_desc?: string;
          feature_4_num?: string;
          feature_4_title?: string;
          feature_4_desc?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          lead_text?: string;
          hire_button_label?: string;
          cv_button_label?: string;
          cv_url?: string;
          cv_file_name?: string;
          cv_redirect_url?: string;
          lanyard_hint?: string;
          feature_1_num?: string;
          feature_1_title?: string;
          feature_1_desc?: string;
          feature_2_num?: string;
          feature_2_title?: string;
          feature_2_desc?: string;
          feature_3_num?: string;
          feature_3_title?: string;
          feature_3_desc?: string;
          feature_4_num?: string;
          feature_4_title?: string;
          feature_4_desc?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "about_content_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      projects_content: {
        Row: {
          id: string;
          section_subtitle: string;
          section_title: string;
          section_intro: string;
          projects: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          section_subtitle?: string;
          section_title?: string;
          section_intro?: string;
          projects?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          section_subtitle?: string;
          section_title?: string;
          section_intro?: string;
          projects?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_content_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_content: {
        Row: {
          id: string;
          section_subtitle: string;
          section_title: string;
          section_intro: string;
          email: string;
          phone: string;
          socials: Json;
          marquee_items: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          section_subtitle?: string;
          section_title?: string;
          section_intro?: string;
          email?: string;
          phone?: string;
          socials?: Json;
          marquee_items?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          section_subtitle?: string;
          section_title?: string;
          section_intro?: string;
          email?: string;
          phone?: string;
          socials?: Json;
          marquee_items?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contact_content_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      site_branding: {
        Row: {
          id: string;
          app_name: string;
          page_title: string;
          favicon_url: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          app_name?: string;
          page_title?: string;
          favicon_url?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          app_name?: string;
          page_title?: string;
          favicon_url?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "site_branding_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Note = Database["public"]["Tables"]["notes"]["Row"];
export type PomodoroSession = Database["public"]["Tables"]["pomodoro_sessions"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type PortfolioProject = Database["public"]["Tables"]["portfolio_projects"]["Row"];
export type PortfolioViewEvent = Database["public"]["Tables"]["portfolio_view_events"]["Row"];
export type LandingPageVisit = Database["public"]["Tables"]["landing_page_visits"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type AiConversation = Database["public"]["Tables"]["ai_conversations"]["Row"];
export type HeroContentRecord = Database["public"]["Tables"]["hero_content"]["Row"];
export type AboutContentRecord = Database["public"]["Tables"]["about_content"]["Row"];
export type ProjectsContentRecord = Database["public"]["Tables"]["projects_content"]["Row"];
export type ContactContentRecord = Database["public"]["Tables"]["contact_content"]["Row"];
export type SiteBrandingRecord = Database["public"]["Tables"]["site_branding"]["Row"];

export type AuthActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; lockedUntil?: string };
