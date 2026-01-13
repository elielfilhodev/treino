export type Tokens = { accessToken: string; refreshToken: string };

export type Preferences = { goals: string[]; trainingTypes: string[] };

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  preferences?: Preferences | null;
};

export type Exercise = {
  id: string;
  name: string;
  description?: string | null;
  order: number;
  completed: boolean;
  workoutId: string;
};

export type Workout = {
  id: string;
  userId: string;
  dayOfWeek: number;
  time: string;
  name: string;
  description?: string | null;
  completed: boolean;
  exercises: Exercise[];
};

export type WorkoutHistory = {
  id: string;
  workoutId: string;
  completedAt: string;
  workout: Workout;
};

export type ShoppingItem = {
  id: string;
  name: string;
  quantity?: string | null;
  purchased: boolean;
  userId: string;
  updatedAt: string;
};

