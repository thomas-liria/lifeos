export type SessionType = "Upper A" | "Lower A" | "Upper B" | "Lower B";

export interface ExerciseSet {
  weight: number;
  reps:   number;
  done:   boolean;
}

export interface Exercise {
  id:   string;
  name: string;
  sets: ExerciseSet[];
}

export interface GymSession {
  id:               string;
  type:             SessionType;
  date:             string;       // "YYYY-MM-DD"
  exercises:        Exercise[];
  durationMinutes?: number;
}
