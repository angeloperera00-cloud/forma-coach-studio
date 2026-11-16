import type {
  Activity,
  Appointment,
  Client,
  ClientNote,
  CoachProfile,
  DataMode,
  Exercise,
  Food,
  NutritionPlan,
  NutritionPlanSummary,
  ProgressRecord,
  WorkoutPlan,
  WorkoutPlanSummary,
} from "@/lib/domain/types";
import type {
  AppointmentInput,
  ClientInput,
  CoachProfileInput,
  ExerciseInput,
  NutritionPlanInput,
  ProgressInput,
  WorkoutPlanInput,
} from "@/lib/domain/schemas";
import type { ActivityType, MediaFolder, PlanStatus } from "@/lib/domain/constants";

/**
 * Error shown to the coach. `template` is an Italian source string (translated when shown),
 * `params` fill its {placeholders}.
 */
export class AppError extends Error {
  readonly template: string;
  readonly params?: Record<string, string | number>;
  constructor(template: string, params?: Record<string, string | number>) {
    super(params ? template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : template);
    this.name = "AppError";
    this.template = template;
    this.params = params;
  }
}
export class NotFoundError extends AppError {}
export class ConflictError extends AppError {}

/** A food row as persisted. Recipes arrive with nutrition already computed from their ingredients. */
export type FoodRecord = Omit<Food, "id" | "createdAt" | "updatedAt">;

export interface ActivityInput {
  type: ActivityType;
  clientId: string | null;
  title: string;
  description?: string | null;
  href?: string | null;
  params?: Record<string, string | number> | null;
  /** Reminders use a stable key so they are created only once. */
  dedupeKey?: string | null;
  /** Events caused by the coach are stored as already read; reminders arrive unread. */
  read?: boolean;
}

export interface MediaUpload {
  bytes: Uint8Array;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
}

/**
 * Single-coach data access. Two implementations:
 * - Supabase (server-only, service role, RLS denies every other role)
 * - Demo (JSON file in .demo-data/, clearly labelled in the UI)
 */
export interface Repository {
  readonly mode: DataMode;

  getCoach(): Promise<CoachProfile>;
  updateCoach(input: CoachProfileInput): Promise<CoachProfile>;

  listClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | null>;
  createClient(input: ClientInput): Promise<Client>;
  updateClient(id: string, input: Partial<ClientInput>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  touchClient(id: string): Promise<void>;

  listClientNotes(clientId: string): Promise<ClientNote[]>;
  createClientNote(clientId: string, body: string): Promise<ClientNote>;
  deleteClientNote(id: string): Promise<void>;

  listExercises(): Promise<Exercise[]>;
  getExercise(id: string): Promise<Exercise | null>;
  createExercise(input: ExerciseInput): Promise<Exercise>;
  updateExercise(id: string, input: ExerciseInput): Promise<Exercise>;
  countExerciseUsage(id: string): Promise<number>;
  deleteExercise(id: string): Promise<void>;

  listWorkoutPlans(filter?: { clientId?: string }): Promise<WorkoutPlanSummary[]>;
  getWorkoutPlan(id: string): Promise<WorkoutPlan | null>;
  saveWorkoutPlan(input: WorkoutPlanInput): Promise<WorkoutPlan>;
  setWorkoutPlanStatus(id: string, status: PlanStatus): Promise<void>;
  deleteWorkoutPlan(id: string): Promise<void>;

  listFoods(): Promise<Food[]>;
  getFood(id: string): Promise<Food | null>;
  createFood(record: FoodRecord): Promise<Food>;
  updateFood(id: string, record: FoodRecord): Promise<Food>;
  countFoodUsage(id: string): Promise<number>;
  deleteFood(id: string): Promise<void>;

  listNutritionPlans(filter?: { clientId?: string }): Promise<NutritionPlanSummary[]>;
  getNutritionPlan(id: string): Promise<NutritionPlan | null>;
  saveNutritionPlan(input: NutritionPlanInput): Promise<NutritionPlan>;
  setNutritionPlanStatus(id: string, status: PlanStatus): Promise<void>;
  deleteNutritionPlan(id: string): Promise<void>;

  listProgress(clientId?: string): Promise<ProgressRecord[]>;
  createProgress(input: ProgressInput): Promise<ProgressRecord>;
  deleteProgress(id: string): Promise<void>;

  listAppointments(filter?: { from?: string; to?: string; clientId?: string }): Promise<Appointment[]>;
  createAppointment(input: AppointmentInput): Promise<Appointment>;
  updateAppointment(id: string, input: AppointmentInput): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;

  listActivity(opts?: { limit?: number; unreadOnly?: boolean; clientId?: string }): Promise<Activity[]>;
  countUnreadActivity(): Promise<number>;
  createActivity(input: ActivityInput): Promise<void>;
  markActivity(ids: string[] | "all", read: boolean): Promise<void>;
  deleteActivity(ids: string[] | "read"): Promise<void>;

  uploadMedia(file: MediaUpload, folder: MediaFolder): Promise<string>;

  /** Demo mode only. */
  resetDemoData?(): Promise<void>;
}
