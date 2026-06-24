export type TrackingType = "weighted" | "assisted" | "bodyweight" | "timed";

export type StretchKind = "none" | "dynamic" | "static";

export type WorkoutStatus = "draft" | "completed";

export type SetType = "warmup" | "working";

export type Database = {
  public: {
    Tables: {
      exercises: {
        Row: {
          id: string;
          name: string;
          muscle: string;
          split: string;
          default_sets: number;
          tracking_type: TrackingType;
          notes: string | null;
          machine_start_weight: number | null;
          machine_end_weight: number | null;
          machine_increment: number | null;
          default_reps: number | null;
          progressive_overload_increment: number | null;
          rest_seconds: number | null;
          sort_order: number;
          stretch_kind: StretchKind;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          muscle: string;
          split: string;
          default_sets?: number;
          tracking_type: TrackingType;
          notes?: string | null;
          machine_start_weight?: number | null;
          machine_end_weight?: number | null;
          machine_increment?: number | null;
          default_reps?: number | null;
          progressive_overload_increment?: number | null;
          rest_seconds?: number | null;
          sort_order?: number;
          stretch_kind?: StretchKind;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          muscle?: string;
          split?: string;
          default_sets?: number;
          tracking_type?: TrackingType;
          notes?: string | null;
          machine_start_weight?: number | null;
          machine_end_weight?: number | null;
          machine_increment?: number | null;
          default_reps?: number | null;
          progressive_overload_increment?: number | null;
          rest_seconds?: number | null;
          sort_order?: number;
          stretch_kind?: StretchKind;
          archived_at?: string | null;
          created_at?: string;
        };
      };
      user_training_profile: {
        Row: {
          singleton: boolean;
          body_weight: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          singleton?: boolean;
          body_weight?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          singleton?: boolean;
          body_weight?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      exercise_splits: {
        Row: {
          exercise_id: string;
          split_name: string;
          sort_order: number;
        };
        Insert: {
          exercise_id: string;
          split_name: string;
          sort_order?: number;
        };
        Update: {
          exercise_id?: string;
          split_name?: string;
          sort_order?: number;
        };
      };
      workout_splits: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
          archived_at?: string | null;
          created_at?: string;
        };
      };
      workouts: {
        Row: {
          id: string;
          date: string;
          week: string;
          split: string;
          status: WorkoutStatus;
          notes: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          date: string;
          week: string;
          split: string;
          status?: WorkoutStatus;
          notes?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          date?: string;
          week?: string;
          split?: string;
          status?: WorkoutStatus;
          notes?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };
      workout_sets: {
        Row: {
          id: string;
          workout_id: string;
          exercise_id: string;
          set_number: number;
          reps: number | null;
          weight: number | null;
          rir: number | null;
          duration_seconds: number | null;
          volume: number | null;
          note: string | null;
          set_type: SetType;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          exercise_id: string;
          set_number: number;
          reps?: number | null;
          weight?: number | null;
          rir?: number | null;
          duration_seconds?: number | null;
          volume?: number | null;
          note?: string | null;
          set_type?: SetType;
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_id?: string;
          exercise_id?: string;
          set_number?: number;
          reps?: number | null;
          weight?: number | null;
          rir?: number | null;
          duration_seconds?: number | null;
          volume?: number | null;
          note?: string | null;
          set_type?: SetType;
          created_at?: string;
        };
      };
      weight_options: {
        Row: {
          id: string;
          exercise_id: string | null;
          value: number;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          exercise_id?: string | null;
          value: number;
          label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          exercise_id?: string | null;
          value?: number;
          label?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      weekly_volume_summary: {
        Row: {
          week: string;
          exercise: string;
          muscle: string;
          total_sets: number;
          total_reps: number | null;
          total_volume: number | null;
        };
      };
      weekly_volume_by_split: {
        Row: {
          week: string;
          split: string;
          exercise: string;
          muscle: string;
          total_sets: number;
          total_reps: number | null;
          total_volume: number | null;
        };
      };
      monthly_volume_by_split: {
        Row: {
          month_start: string;
          split: string;
          total_sets: number;
          total_reps: number | null;
          total_volume: number | null;
        };
      };
      weekly_volume_by_exercise: {
        Row: {
          week: string;
          exercise_id: string;
          exercise: string;
          muscle: string;
          total_sets: number;
          total_reps: number | null;
          total_volume: number | null;
        };
      };
      monthly_volume_by_exercise: {
        Row: {
          month_start: string;
          exercise_id: string;
          exercise: string;
          muscle: string;
          total_sets: number;
          total_reps: number | null;
          total_volume: number | null;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
