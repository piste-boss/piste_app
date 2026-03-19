export type UserRole = "trainer" | "member";
export type SubscriptionStatus = "active" | "canceled" | "past_due";
export type TrainerMemberStatus = "active" | "inactive";
export type FileType = "audio" | "text";
export type PipelineStatus =
  | "queued"
  | "transcribing"
  | "structuring"
  | "pending_review"
  | "confirmed"
  | "failed";
export type SessionStatus = "pending" | "confirmed" | "completed";
export type PhotoType = "front" | "side" | "back";
export type SuggestionStatus = "pending" | "accepted" | "modified" | "rejected";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          last_name: string;
          first_name: string;
          phone: string | null;
          date_of_birth: string | null;
          avatar_url: string | null;
          stripe_customer_id: string | null;
          subscription_status: SubscriptionStatus | null;
          terms_agreed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role?: UserRole;
          last_name: string;
          first_name: string;
          phone?: string | null;
          date_of_birth?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          subscription_status?: SubscriptionStatus | null;
          terms_agreed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      trainer_members: {
        Row: {
          id: string;
          trainer_id: string;
          member_id: string;
          status: TrainerMemberStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          member_id: string;
          status?: TrainerMemberStatus;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["trainer_members"]["Insert"]
        >;
      };
      counseling_personality: {
        Row: {
          id: string;
          member_id: string;
          answers: Record<string, unknown> | null;
          training_style: string | null;
          coaching_tips: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          answers?: Record<string, unknown> | null;
          training_style?: string | null;
          coaching_tips?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["counseling_personality"]["Insert"]
        >;
      };
      counseling_body: {
        Row: {
          id: string;
          member_id: string;
          concerns: Record<string, unknown> | null;
          medical_history: string | null;
          goals: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          concerns?: Record<string, unknown> | null;
          medical_history?: string | null;
          goals?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["counseling_body"]["Insert"]
        >;
      };
      counseling_diet: {
        Row: {
          id: string;
          member_id: string;
          meal_frequency: number | null;
          meal_times: Record<string, unknown> | null;
          dietary_notes: string | null;
          allergies: Record<string, unknown> | null;
          improvement_goals: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          meal_frequency?: number | null;
          meal_times?: Record<string, unknown> | null;
          dietary_notes?: string | null;
          allergies?: Record<string, unknown> | null;
          improvement_goals?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["counseling_diet"]["Insert"]
        >;
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          muscle_group: string;
          description: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          muscle_group: string;
          description?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["exercises"]["Insert"]>;
      };
      inbox_files: {
        Row: {
          id: string;
          member_id: string;
          uploaded_by: string;
          file_type: FileType;
          original_filename: string;
          storage_path: string;
          file_size_bytes: number | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          member_id: string;
          uploaded_by: string;
          file_type: FileType;
          original_filename: string;
          storage_path: string;
          file_size_bytes?: number | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["inbox_files"]["Insert"]
        >;
      };
      pipeline_jobs: {
        Row: {
          id: string;
          inbox_file_id: string;
          route: FileType;
          status: PipelineStatus;
          whisper_result: string | null;
          structured_data: Record<string, unknown> | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          inbox_file_id: string;
          route: FileType;
          status?: PipelineStatus;
          whisper_result?: string | null;
          structured_data?: Record<string, unknown> | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["pipeline_jobs"]["Insert"]
        >;
      };
      workout_sessions: {
        Row: {
          id: string;
          member_id: string;
          trainer_id: string;
          pipeline_job_id: string | null;
          session_date: string;
          status: SessionStatus;
          voice_audio_url: string | null;
          voice_transcript: string | null;
          trainer_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          trainer_id: string;
          pipeline_job_id?: string | null;
          session_date: string;
          status?: SessionStatus;
          voice_audio_url?: string | null;
          voice_transcript?: string | null;
          trainer_notes?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["workout_sessions"]["Insert"]
        >;
      };
      session_sets: {
        Row: {
          id: string;
          session_id: string;
          exercise_id: string;
          set_number: number;
          weight_kg: number | null;
          reps: number | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          exercise_id: string;
          set_number: number;
          weight_kg?: number | null;
          reps?: number | null;
          notes?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["session_sets"]["Insert"]
        >;
      };
      body_photos: {
        Row: {
          id: string;
          member_id: string;
          taken_at: string;
          google_drive_file_id: string | null;
          google_drive_folder_id: string | null;
          photo_type: PhotoType;
          thumbnail_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          taken_at: string;
          google_drive_file_id?: string | null;
          google_drive_folder_id?: string | null;
          photo_type: PhotoType;
          thumbnail_url?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["body_photos"]["Insert"]
        >;
      };
      body_weight: {
        Row: {
          id: string;
          member_id: string;
          recorded_at: string;
          weight_kg: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          member_id: string;
          recorded_at?: string;
          weight_kg: number;
          notes?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["body_weight"]["Insert"]
        >;
      };
      ai_menu_suggestions: {
        Row: {
          id: string;
          member_id: string;
          trainer_id: string;
          suggested_for_date: string;
          suggestion: Record<string, unknown>;
          reasoning: string | null;
          status: SuggestionStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          trainer_id: string;
          suggested_for_date: string;
          suggestion: Record<string, unknown>;
          reasoning?: string | null;
          status?: SuggestionStatus;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ai_menu_suggestions"]["Insert"]
        >;
      };
      subscriptions: {
        Row: {
          id: string;
          member_id: string;
          stripe_subscription_id: string;
          plan_name: string | null;
          amount: number | null;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          stripe_subscription_id: string;
          plan_name?: string | null;
          amount?: number | null;
          status: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["subscriptions"]["Insert"]
        >;
      };
    };
  };
}

// Convenience type aliases
export type User = Database["public"]["Tables"]["users"]["Row"];
export type TrainerMember =
  Database["public"]["Tables"]["trainer_members"]["Row"];
export type CounselingPersonality =
  Database["public"]["Tables"]["counseling_personality"]["Row"];
export type CounselingBody =
  Database["public"]["Tables"]["counseling_body"]["Row"];
export type CounselingDiet =
  Database["public"]["Tables"]["counseling_diet"]["Row"];
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
export type InboxFile = Database["public"]["Tables"]["inbox_files"]["Row"];
export type PipelineJob = Database["public"]["Tables"]["pipeline_jobs"]["Row"];
export type WorkoutSession =
  Database["public"]["Tables"]["workout_sessions"]["Row"];
export type SessionSet = Database["public"]["Tables"]["session_sets"]["Row"];
export type BodyPhoto = Database["public"]["Tables"]["body_photos"]["Row"];
export type BodyWeight = Database["public"]["Tables"]["body_weight"]["Row"];
export type AiMenuSuggestion =
  Database["public"]["Tables"]["ai_menu_suggestions"]["Row"];
export type Subscription =
  Database["public"]["Tables"]["subscriptions"]["Row"];
