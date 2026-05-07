export type TrackingType = "weighted" | "assisted" | "bodyweight" | "timed";

export type WorkoutStatus = "draft" | "completed";

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
      workout_splits: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
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
        };
        Insert: {
          id?: string;
          date: string;
          week: string;
          split: string;
          status?: WorkoutStatus;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          week?: string;
          split?: string;
          status?: WorkoutStatus;
          notes?: string | null;
          created_at?: string;
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
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
