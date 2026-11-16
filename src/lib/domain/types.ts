import type {
  ActivityType,
  AppointmentStatus,
  AppointmentType,
  ClientStatus,
  Difficulty,
  Equipment,
  FoodCategory,
  FoodKind,
  FoodSource,
  FoodUnit,
  Gender,
  Goal,
  MealSlot,
  MealUnit,
  MuscleGroup,
  PlanStatus,
  WorkoutCategory,
} from "./constants";

export type DataMode = "demo" | "supabase";

export interface CoachProfile {
  fullName: string;
  email: string | null;
  phone: string | null;
  studioName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  defaultSets: number;
  defaultReps: string;
  defaultRestSeconds: number;
  pdfFooter: string | null;
  updatedAt: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  /** YYYY-MM-DD */
  birthDate: string | null;
  gender: Gender | null;
  heightCm: number | null;
  goal: Goal;
  goalDetails: string | null;
  status: ClientStatus;
  avatarUrl: string | null;
  /** YYYY-MM-DD */
  startDate: string;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientNote {
  id: string;
  clientId: string;
  body: string;
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  difficulty: Difficulty;
  instructions: string[];
  imageUrls: string[];
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: number;
  /** "10", "8-12", "30s", "AMRAP" */
  reps: string;
  restSeconds: number;
  weightKg: number | null;
  tempo: string | null;
  notes: string | null;
  /** Consecutive exercises sharing an id form a superset. */
  supersetId: string | null;
}

export interface WorkoutDay {
  id: string;
  /** 0 = Monday … 6 = Sunday */
  weekday: number;
  title: string | null;
  category: WorkoutCategory | null;
  goal: Goal | null;
  durationMinutes: number | null;
  notes: string | null;
  exercises: WorkoutExercise[];
}

export interface WorkoutPlan {
  id: string;
  clientId: string | null;
  name: string;
  status: PlanStatus;
  notes: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  days: WorkoutDay[];
}

export interface WorkoutPlanSummary {
  id: string;
  clientId: string | null;
  name: string;
  status: PlanStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  weekdays: number[];
  exerciseCount: number;
  totalSets: number;
}

export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface RecipeIngredient {
  foodId: string;
  /** in the ingredient's own unit (g or ml) */
  amount: number;
}

export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  kind: FoodKind;
  imageUrl: string | null;
  unit: FoodUnit;
  /** default portion, in `unit` */
  servingSize: number;
  servingLabel: string | null;
  /** nutrients per 100 g / 100 ml */
  per100: Nutrients;
  /** recipes only: portions the recipe yields */
  servings: number | null;
  ingredients: RecipeIngredient[];
  source: FoodSource;
  sourceRef: string | null;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MealEntry {
  id: string;
  /** 0 = Monday … 6 = Sunday */
  day: number;
  slot: MealSlot;
  position: number;
  foodId: string | null;
  name: string;
  imageUrl: string | null;
  amount: number | null;
  unit: MealUnit | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  /** food = computed from the library, manual = typed by the coach, null = unknown */
  nutritionSource: "food" | "manual" | null;
  notes: string | null;
}

export interface NutritionTargets {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface NutritionPlan {
  id: string;
  clientId: string | null;
  name: string;
  notes: string | null;
  status: PlanStatus;
  /** Monday of the planned week (YYYY-MM-DD), optional */
  weekStart: string | null;
  targets: NutritionTargets;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  meals: MealEntry[];
}

export interface NutritionPlanSummary {
  id: string;
  clientId: string | null;
  name: string;
  notes: string | null;
  status: PlanStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  mealCount: number;
  daysWithMeals: number[];
  avgKcal: number | null;
  targetKcal: number | null;
}

export interface ProgressRecord {
  id: string;
  clientId: string;
  /** YYYY-MM-DD */
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  notes: string | null;
  createdAt: string;
}

export interface Appointment {
  id: string;
  clientId: string | null;
  title: string;
  type: AppointmentType;
  startsAt: string;
  durationMinutes: number;
  location: string | null;
  notes: string | null;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  clientId: string | null;
  title: string;
  description: string | null;
  href: string | null;
  /** Values for the {placeholders} in title/description (rendered in the coach's language). */
  params: Record<string, string | number> | null;
  dedupeKey?: string | null;
  createdAt: string;
  readAt: string | null;
}

/** Lightweight client shape used by pickers across the app. */
export interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  goal: Goal;
  status: ClientStatus;
  workout: { id: string; name: string; status: PlanStatus } | null;
  nutrition: { id: string; name: string; status: PlanStatus } | null;
}

export interface SearchItem {
  id: string;
  group: "clients" | "workouts" | "nutrition" | "exercises" | "foods";
  title: string;
  subtitle: string;
  href: string;
  image: string | null;
}
