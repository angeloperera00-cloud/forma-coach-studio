import { z } from "zod";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  CLIENT_STATUSES,
  DIFFICULTIES,
  EQUIPMENT,
  FOOD_CATEGORIES,
  FOOD_UNITS,
  GENDERS,
  GOALS,
  MEAL_SLOTS,
  MEAL_UNITS,
  MUSCLE_GROUPS,
  WORKOUT_CATEGORIES,
} from "./constants";
import { msgp } from "@/lib/i18n/core";

// Italian fallback messages for anything without a custom message.
z.config(z.locales.it());

/* ----------------------------------------------------------------------------
 * Primitive helpers
 * -------------------------------------------------------------------------- */
const text = (max: number) => z.string().trim().max(max, msgp("Massimo {max} caratteri", { max }));
const optText = (max: number) =>
  text(max)
    .nullish()
    .transform((v) => (v ? v : null));
const range = (min: number, max: number, label = "Valore") =>
  z.number(msgp("{label} non valido", { label })).min(min, msgp("{label}: minimo {min}", { label, min })).max(max, msgp("{label}: massimo {max}", { label, max }));
const optRange = (min: number, max: number, label?: string) =>
  range(min, max, label)
    .nullish()
    .transform((v) => (v === undefined ? null : v));
export const idSchema = z.uuid("Identificativo non valido");
const optId = idSchema.nullish().transform((v) => v ?? null);
export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");
const optDateKey = dateKeySchema.nullish().transform((v) => v ?? null);
const imageUrl = z
  .string()
  .max(600)
  .refine((v) => v.startsWith("/") || v.startsWith("https://"), "URL immagine non valido");
const optImageUrl = imageUrl.nullish().transform((v) => v ?? null);

/* ----------------------------------------------------------------------------
 * Coach
 * -------------------------------------------------------------------------- */
export const coachProfileInput = z.object({
  fullName: text(80).min(1, "Inserisci il tuo nome"),
  email: z.email("Email non valida").max(120).nullish().transform((v) => v ?? null),
  phone: optText(30),
  studioName: optText(80),
  bio: optText(600),
  avatarUrl: optImageUrl,
  defaultSets: range(1, 20, "Serie"),
  defaultReps: text(12).min(1, "Inserisci le ripetizioni"),
  defaultRestSeconds: range(0, 900, "Recupero"),
  pdfFooter: optText(300),
});
export type CoachProfileInput = z.output<typeof coachProfileInput>;

/* ----------------------------------------------------------------------------
 * Clients
 * -------------------------------------------------------------------------- */
export const clientInput = z.object({
  firstName: text(60).min(1, "Inserisci il nome"),
  lastName: text(60).min(1, "Inserisci il cognome"),
  email: z.email("Email non valida").max(120).nullish().transform((v) => v ?? null),
  phone: optText(30),
  birthDate: optDateKey,
  gender: z.enum(GENDERS).nullish().transform((v) => v ?? null),
  heightCm: optRange(80, 250, "Altezza"),
  goal: z.enum(GOALS, "Seleziona un obiettivo"),
  goalDetails: optText(600),
  status: z.enum(CLIENT_STATUSES),
  avatarUrl: optImageUrl,
  startDate: dateKeySchema,
});
export type ClientInput = z.output<typeof clientInput>;

export const clientNoteInput = z.object({
  clientId: idSchema,
  body: text(4000).min(1, "Scrivi una nota"),
});

/* ----------------------------------------------------------------------------
 * Exercises
 * -------------------------------------------------------------------------- */
export const exerciseInput = z.object({
  name: text(80).min(2, "Inserisci il nome dell'esercizio"),
  primaryMuscles: z.array(z.enum(MUSCLE_GROUPS)).min(1, "Seleziona almeno un gruppo muscolare").max(4),
  secondaryMuscles: z.array(z.enum(MUSCLE_GROUPS)).max(6),
  equipment: z.enum(EQUIPMENT),
  difficulty: z.enum(DIFFICULTIES),
  instructions: z.array(text(400).min(1, "Il passaggio è vuoto")).max(12),
  imageUrls: z.array(imageUrl).max(2),
});
export type ExerciseInput = z.output<typeof exerciseInput>;

/* ----------------------------------------------------------------------------
 * Workout plans (saved as a whole tree)
 * -------------------------------------------------------------------------- */
export const workoutExerciseInput = z.object({
  id: idSchema,
  exerciseId: idSchema,
  sets: z.number().int().min(1, "Serie: minimo 1").max(20, "Serie: massimo 20"),
  reps: text(12).min(1, "Inserisci le ripetizioni"),
  restSeconds: z.number().int().min(0, "Recupero non valido").max(900, "Recupero: massimo 15 minuti"),
  weightKg: optRange(0, 1000, "Carico"),
  tempo: optText(16),
  notes: optText(300),
  supersetId: z.string().max(40).nullish().transform((v) => v ?? null),
});

export const workoutDayInput = z.object({
  id: idSchema,
  weekday: z.number().int().min(0).max(6),
  title: optText(80),
  category: z.enum(WORKOUT_CATEGORIES).nullish().transform((v) => v ?? null),
  goal: z.enum(GOALS).nullish().transform((v) => v ?? null),
  durationMinutes: optRange(5, 300, "Durata"),
  notes: optText(1000),
  exercises: z.array(workoutExerciseInput).max(40, "Massimo 40 esercizi per giorno"),
});

export const workoutPlanInput = z
  .object({
    id: idSchema,
    clientId: optId,
    name: text(100).min(1, "Dai un nome alla scheda"),
    status: z.enum(["draft", "published"]),
    notes: optText(1000),
    days: z.array(workoutDayInput).max(7),
  })
  .superRefine((plan, ctx) => {
    const seen = new Set<number>();
    for (const d of plan.days) {
      if (seen.has(d.weekday)) ctx.addIssue({ code: "custom", message: "Giorno duplicato nella scheda", path: ["days"] });
      seen.add(d.weekday);
    }
    if (plan.status === "published") {
      if (!plan.clientId) ctx.addIssue({ code: "custom", message: "Seleziona un cliente prima di pubblicare", path: ["clientId"] });
      if (!plan.days.some((d) => d.exercises.length > 0))
        ctx.addIssue({ code: "custom", message: "Aggiungi almeno un esercizio prima di pubblicare", path: ["days"] });
    }
  });
export type WorkoutPlanInput = z.output<typeof workoutPlanInput>;

/* ----------------------------------------------------------------------------
 * Foods & recipes
 * -------------------------------------------------------------------------- */
export const nutrientsPer100 = z
  .object({
    kcal: range(0, 900, "Energia"),
    protein: range(0, 100, "Proteine"),
    carbs: range(0, 100, "Carboidrati"),
    fat: range(0, 100, "Grassi"),
  })
  .refine((n) => n.protein + n.carbs + n.fat <= 100.5, {
    message: "Proteine, carboidrati e grassi superano 100 g ogni 100 g",
    path: ["protein"],
  });

export const foodInput = z.object({
  name: text(80).min(2, "Inserisci il nome dell'alimento"),
  category: z.enum(FOOD_CATEGORIES),
  imageUrl: optImageUrl,
  unit: z.enum(FOOD_UNITS),
  servingSize: range(1, 5000, "Porzione"),
  servingLabel: optText(60),
  per100: nutrientsPer100,
  sourceRef: optText(120),
});
export type FoodInput = z.output<typeof foodInput>;

export const recipeInput = z.object({
  name: text(80).min(2, "Inserisci il nome della ricetta"),
  category: z.enum(FOOD_CATEGORIES),
  imageUrl: optImageUrl,
  servings: z.number().int().min(1, "Almeno 1 porzione").max(50),
  servingLabel: optText(60),
  ingredients: z
    .array(z.object({ foodId: idSchema, amount: range(1, 5000, "Quantità") }))
    .min(1, "Aggiungi almeno un ingrediente")
    .max(30),
});
export type RecipeInput = z.output<typeof recipeInput>;

/* ----------------------------------------------------------------------------
 * Nutrition plans (saved as a whole)
 * -------------------------------------------------------------------------- */
export const mealEntryInput = z.object({
  id: idSchema,
  day: z.number().int().min(0).max(6),
  slot: z.enum(MEAL_SLOTS),
  position: z.number().int().min(0).max(100),
  foodId: optId,
  name: text(80).min(1, "Inserisci il nome del pasto"),
  imageUrl: optImageUrl,
  amount: optRange(0, 5000, "Porzione"),
  unit: z.enum(MEAL_UNITS).nullish().transform((v) => v ?? null),
  kcal: optRange(0, 5000, "Calorie"),
  protein: optRange(0, 500, "Proteine"),
  carbs: optRange(0, 1000, "Carboidrati"),
  fat: optRange(0, 500, "Grassi"),
  nutritionSource: z.enum(["food", "manual"]).nullish().transform((v) => v ?? null),
  notes: optText(300),
});

export const nutritionTargetsInput = z.object({
  kcal: optRange(600, 8000, "Calorie"),
  protein: optRange(0, 500, "Proteine"),
  carbs: optRange(0, 1000, "Carboidrati"),
  fat: optRange(0, 400, "Grassi"),
});

export const nutritionPlanInput = z
  .object({
    id: idSchema,
    clientId: optId,
    name: text(100).min(1, "Dai un nome al piano"),
    notes: optText(500),
    status: z.enum(["draft", "published"]),
    weekStart: optDateKey,
    targets: nutritionTargetsInput,
    meals: z.array(mealEntryInput).max(400),
  })
  .superRefine((plan, ctx) => {
    if (plan.status === "published") {
      if (!plan.clientId) ctx.addIssue({ code: "custom", message: "Seleziona un cliente prima di pubblicare", path: ["clientId"] });
      if (plan.meals.length === 0) ctx.addIssue({ code: "custom", message: "Aggiungi almeno un pasto prima di pubblicare", path: ["meals"] });
    }
  });
export type NutritionPlanInput = z.output<typeof nutritionPlanInput>;

/* ----------------------------------------------------------------------------
 * Progress
 * -------------------------------------------------------------------------- */
export const progressInput = z
  .object({
    clientId: idSchema,
    date: dateKeySchema,
    weightKg: optRange(25, 350, "Peso"),
    bodyFatPct: optRange(2, 70, "Massa grassa"),
    waistCm: optRange(30, 250, "Vita"),
    hipsCm: optRange(30, 250, "Fianchi"),
    chestCm: optRange(30, 250, "Petto"),
    armCm: optRange(10, 90, "Braccio"),
    thighCm: optRange(20, 120, "Coscia"),
    notes: optText(500),
  })
  .refine((r) => [r.weightKg, r.bodyFatPct, r.waistCm, r.hipsCm, r.chestCm, r.armCm, r.thighCm].some((v) => v !== null), {
    message: "Inserisci almeno una misurazione",
    path: ["weightKg"],
  });
export type ProgressInput = z.output<typeof progressInput>;

/* ----------------------------------------------------------------------------
 * Appointments
 * -------------------------------------------------------------------------- */
export const appointmentInput = z.object({
  clientId: optId,
  title: text(100).min(1, "Inserisci un titolo"),
  type: z.enum(APPOINTMENT_TYPES),
  startsAt: z.iso.datetime({ offset: true, message: "Data e ora non valide" }),
  durationMinutes: z.number().int().min(5, "Durata minima 5 minuti").max(600, "Durata massima 10 ore"),
  location: optText(120),
  notes: optText(1000),
  status: z.enum(APPOINTMENT_STATUSES),
});
export type AppointmentInput = z.output<typeof appointmentInput>;

/** First human-readable message of a ZodError. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dati non validi";
}

export function issuesByPath(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
