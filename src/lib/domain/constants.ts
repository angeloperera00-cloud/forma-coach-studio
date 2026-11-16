export const GOALS = ["weight_loss", "muscle_gain", "strength", "recomposition", "endurance", "maintenance", "mobility"] as const;
export type Goal = (typeof GOALS)[number];
export const GOAL_LABELS: Record<Goal, string> = {
  weight_loss: "Dimagrimento",
  muscle_gain: "Massa muscolare",
  strength: "Forza",
  recomposition: "Ricomposizione",
  endurance: "Resistenza",
  maintenance: "Mantenimento",
  mobility: "Mobilità e benessere",
};

export const CLIENT_STATUSES = ["active", "paused", "archived"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Attivo",
  paused: "In pausa",
  archived: "Archiviato",
};

export const GENDERS = ["female", "male", "other"] as const;
export type Gender = (typeof GENDERS)[number];
export const GENDER_LABELS: Record<Gender, string> = { female: "Donna", male: "Uomo", other: "Altro" };

export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "core",
  "glutes",
  "quadriceps",
  "hamstrings",
  "calves",
  "adductors",
  "full_body",
  "cardio",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "Petto",
  back: "Dorsali",
  shoulders: "Spalle",
  biceps: "Bicipiti",
  triceps: "Tricipiti",
  forearms: "Avambracci",
  core: "Core",
  glutes: "Glutei",
  quadriceps: "Quadricipiti",
  hamstrings: "Femorali",
  calves: "Polpacci",
  adductors: "Adduttori",
  full_body: "Total body",
  cardio: "Cardio",
};

export const EQUIPMENT = ["barbell", "dumbbell", "kettlebell", "machine", "cable", "bodyweight", "bands", "other"] as const;
export type Equipment = (typeof EQUIPMENT)[number];
export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Bilanciere",
  dumbbell: "Manubri",
  kettlebell: "Kettlebell",
  machine: "Macchina",
  cable: "Cavi",
  bodyweight: "Corpo libero",
  bands: "Elastici",
  other: "Altro",
};

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzato",
};

export const PLAN_STATUSES = ["draft", "published", "archived"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];
/** "Scheda" is feminine, "piano" masculine. */
export const WORKOUT_STATUS_LABELS: Record<PlanStatus, string> = { draft: "Bozza", published: "Pubblicata", archived: "Archiviata" };
export const NUTRITION_STATUS_LABELS: Record<PlanStatus, string> = { draft: "Bozza", published: "Pubblicato", archived: "Archiviato" };

export const WORKOUT_CATEGORIES = [
  "strength",
  "hypertrophy",
  "full_body",
  "upper_body",
  "lower_body",
  "push",
  "pull",
  "legs",
  "core",
  "cardio",
  "hiit",
  "mobility",
] as const;
export type WorkoutCategory = (typeof WORKOUT_CATEGORIES)[number];
export const WORKOUT_CATEGORY_LABELS: Record<WorkoutCategory, string> = {
  strength: "Forza",
  hypertrophy: "Ipertrofia",
  full_body: "Total body",
  upper_body: "Parte superiore",
  lower_body: "Parte inferiore",
  push: "Push",
  pull: "Pull",
  legs: "Gambe",
  core: "Core",
  cardio: "Cardio",
  hiit: "HIIT",
  mobility: "Mobilità",
};

/** 0 = Monday … 6 = Sunday */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export const WEEKDAY_LABELS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"] as const;
export const WEEKDAY_SHORT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"] as const;

export const MEAL_SLOTS = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "pre_bed"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];
export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Colazione",
  morning_snack: "Spuntino mattina",
  lunch: "Pranzo",
  afternoon_snack: "Spuntino pomeriggio",
  dinner: "Cena",
  pre_bed: "Pre-nanna",
};

export const FOOD_CATEGORIES = [
  "grains",
  "dairy",
  "meat_fish",
  "eggs",
  "legumes",
  "fruit",
  "vegetables",
  "nuts_seeds",
  "fats_oils",
  "sweets",
  "drinks",
  "supplements",
  "dishes",
  "other",
] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];
export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  grains: "Cereali e derivati",
  dairy: "Latte e derivati",
  meat_fish: "Carne e pesce",
  eggs: "Uova",
  legumes: "Legumi",
  fruit: "Frutta",
  vegetables: "Verdura",
  nuts_seeds: "Frutta secca e semi",
  fats_oils: "Grassi e condimenti",
  sweets: "Dolci",
  drinks: "Bevande",
  supplements: "Integratori",
  dishes: "Piatti e ricette",
  other: "Altro",
};

export const FOOD_UNITS = ["g", "ml"] as const;
export type FoodUnit = (typeof FOOD_UNITS)[number];
export const MEAL_UNITS = ["g", "ml", "pz"] as const;
export type MealUnit = (typeof MEAL_UNITS)[number];
export const MEAL_UNIT_LABELS: Record<MealUnit, string> = { g: "g", ml: "ml", pz: "pz" };

export const FOOD_KINDS = ["food", "recipe"] as const;
export type FoodKind = (typeof FOOD_KINDS)[number];

/** demo = bundled starter values (indicative), custom = entered by the coach, external = imported from an authoritative database */
export const FOOD_SOURCES = ["demo", "custom", "external"] as const;
export type FoodSource = (typeof FOOD_SOURCES)[number];
export const FOOD_SOURCE_LABELS: Record<FoodSource, string> = {
  demo: "Valori indicativi",
  custom: "Inserito dal coach",
  external: "Database esterno",
};

export const APPOINTMENT_TYPES = ["training", "check_in", "video_call", "assessment"] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];
export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  training: "Allenamento",
  check_in: "Check-in",
  video_call: "Videochiamata",
  assessment: "Valutazione",
};

export const APPOINTMENT_STATUSES = ["scheduled", "completed", "cancelled"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Programmato",
  completed: "Completato",
  cancelled: "Annullato",
};

export const ACTIVITY_TYPES = [
  "client_created",
  "client_updated",
  "workout_created",
  "workout_published",
  "nutrition_created",
  "nutrition_published",
  "progress_logged",
  "appointment_scheduled",
  "appointment_updated",
  "note_added",
  "library_updated",
  "reminder",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const MEDIA_FOLDERS = ["avatars", "exercises", "foods"] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export const PROGRESS_METRICS = ["weightKg", "bodyFatPct", "waistCm", "hipsCm", "chestCm", "armCm", "thighCm"] as const;
export type ProgressMetric = (typeof PROGRESS_METRICS)[number];
export const PROGRESS_METRIC_LABELS: Record<ProgressMetric, { label: string; unit: string; digits: 0 | 1 }> = {
  weightKg: { label: "Peso", unit: "kg", digits: 1 },
  bodyFatPct: { label: "Massa grassa", unit: "%", digits: 1 },
  waistCm: { label: "Vita", unit: "cm", digits: 1 },
  hipsCm: { label: "Fianchi", unit: "cm", digits: 1 },
  chestCm: { label: "Petto", unit: "cm", digits: 1 },
  armCm: { label: "Braccio", unit: "cm", digits: 1 },
  thighCm: { label: "Coscia", unit: "cm", digits: 1 },
};
