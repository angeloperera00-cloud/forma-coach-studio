/**
 * Realistic demo dataset, generated relative to "now" so dates always look fresh.
 * Used only in demo mode (no Supabase credentials). Never written to Supabase.
 */
import type {
  Activity,
  Appointment,
  Client,
  ClientNote,
  CoachProfile,
  Exercise,
  Food,
  MealEntry,
  NutritionPlan,
  ProgressRecord,
  WorkoutPlan,
} from "@/lib/domain/types";
import type { ActivityType, AppointmentStatus, AppointmentType, Gender, Goal, MealSlot, PlanStatus, WorkoutCategory } from "@/lib/domain/constants";
import { MEAL_SLOTS } from "@/lib/domain/constants";
import { buildExerciseLibrary, buildFoodLibrary, exerciseId, foodId } from "./library";
import { seedUuid } from "@/lib/id";
import { mealFieldsFromFood } from "@/lib/domain/nutrition";
import { addDaysToKey, dayKeyOf, zonedToUtc } from "@/lib/datetime";
import { round } from "@/lib/utils";

export interface DemoDb {
  version: number;
  seededAt: string;
  coach: CoachProfile;
  clients: Client[];
  clientNotes: ClientNote[];
  exercises: Exercise[];
  workoutPlans: WorkoutPlan[];
  foods: Food[];
  nutritionPlans: NutritionPlan[];
  progress: ProgressRecord[];
  appointments: Appointment[];
  activity: Activity[];
}

export const DEMO_DB_VERSION = 2;

const cid = (key: string) => seedUuid(`client:${key}`);

type ClientSeed = {
  key: string;
  first: string;
  last: string;
  gender: Gender;
  birth: string;
  height: number;
  goal: Goal;
  details: string | null;
  status: Client["status"];
  email: string;
  phone: string;
  avatar: string | null;
  startWeeksAgo: number;
  lastActiveMinAgo: number;
};

const CLIENTS: ClientSeed[] = [
  { key: "giulia", first: "Giulia", last: "Rossi", gender: "female", birth: "1996-03-14", height: 168, goal: "recomposition", details: "Ridurre la massa grassa mantenendo la forza. Obiettivo 60 kg entro l'estate.", status: "active", email: "giulia.rossi@email.it", phone: "+39 347 210 4589", avatar: "/brand/avatar-giulia.jpg", startWeeksAgo: 14, lastActiveMinAgo: 25 },
  { key: "marco", first: "Marco", last: "Bianchi", gender: "male", birth: "1990-07-02", height: 181, goal: "muscle_gain", details: "Aumentare la massa magra di 4 kg in sei mesi.", status: "active", email: "marco.bianchi@email.it", phone: "+39 333 908 1122", avatar: null, startWeeksAgo: 20, lastActiveMinAgo: 60 * 20 },
  { key: "sara", first: "Sara", last: "Esposito", gender: "female", birth: "1984-11-21", height: 163, goal: "weight_loss", details: "Perdere 8 kg e migliorare la resistenza nelle attività quotidiane.", status: "active", email: "sara.esposito@email.it", phone: "+39 340 551 7730", avatar: null, startWeeksAgo: 10, lastActiveMinAgo: 60 * 5 },
  { key: "luca", first: "Luca", last: "Romano", gender: "male", birth: "1998-05-09", height: 177, goal: "strength", details: "Squat a 140 kg e panca a 100 kg entro fine stagione.", status: "active", email: "luca.romano@email.it", phone: "+39 329 664 0091", avatar: null, startWeeksAgo: 8, lastActiveMinAgo: 60 * 26 },
  { key: "francesca", first: "Francesca", last: "Colombo", gender: "female", birth: "1973-01-30", height: 160, goal: "mobility", details: "Ridurre il mal di schiena e migliorare la postura.", status: "active", email: "francesca.colombo@email.it", phone: "+39 338 120 4471", avatar: null, startWeeksAgo: 24, lastActiveMinAgo: 60 * 24 * 2 },
  { key: "alessandro", first: "Alessandro", last: "Ricci", gender: "male", birth: "1980-09-12", height: 175, goal: "weight_loss", details: null, status: "paused", email: "alessandro.ricci@email.it", phone: "+39 335 778 2310", avatar: null, startWeeksAgo: 30, lastActiveMinAgo: 60 * 24 * 21 },
  { key: "chiara", first: "Chiara", last: "Marino", gender: "female", birth: "2002-04-18", height: 170, goal: "endurance", details: "Preparazione per la mezza maratona di primavera.", status: "active", email: "chiara.marino@email.it", phone: "+39 345 019 8823", avatar: null, startWeeksAgo: 6, lastActiveMinAgo: 60 * 20 },
  { key: "davide", first: "Davide", last: "Greco", gender: "male", birth: "1987-12-03", height: 183, goal: "recomposition", details: null, status: "active", email: "davide.greco@email.it", phone: "+39 331 400 6612", avatar: null, startWeeksAgo: 12, lastActiveMinAgo: 60 * 24 * 4 },
  { key: "elena", first: "Elena", last: "Bruno", gender: "female", birth: "1994-08-27", height: 165, goal: "maintenance", details: null, status: "active", email: "elena.bruno@email.it", phone: "+39 349 280 1194", avatar: null, startWeeksAgo: 40, lastActiveMinAgo: 60 * 24 * 9 },
  { key: "matteo", first: "Matteo", last: "Gallo", gender: "male", birth: "1996-02-15", height: 179, goal: "muscle_gain", details: null, status: "active", email: "matteo.gallo@email.it", phone: "+39 320 715 3348", avatar: null, startWeeksAgo: 16, lastActiveMinAgo: 60 * 24 * 5 },
  { key: "valentina", first: "Valentina", last: "Conti", gender: "female", birth: "1989-06-06", height: 167, goal: "weight_loss", details: null, status: "archived", email: "valentina.conti@email.it", phone: "+39 328 330 9087", avatar: null, startWeeksAgo: 52, lastActiveMinAgo: 60 * 24 * 90 },
  { key: "simone", first: "Simone", last: "De Luca", gender: "male", birth: "1978-10-10", height: 174, goal: "strength", details: "Tornare ad allenarsi con continuità dopo due anni di stop.", status: "active", email: "simone.deluca@email.it", phone: "+39 334 902 5561", avatar: null, startWeeksAgo: 1, lastActiveMinAgo: 60 * 24 * 2 },
];

/* ------------------------------- workouts -------------------------------- */
type ExRow = [key: string, sets: number, reps: string, rest: number, weight?: number | null, superset?: string | null, notes?: string | null, tempo?: string | null];
type DaySeed = { weekday: number; title: string; category: WorkoutCategory; goal: Goal | null; notes?: string | null; ex: ExRow[] };
type PlanSeed = { key: string; client: string; name: string; status: PlanStatus; updatedHoursAgo: number; notes?: string; days: DaySeed[] };

const WORKOUTS: PlanSeed[] = [
  {
    key: "giulia-forza",
    client: "giulia",
    name: "Forza & tonificazione",
    status: "published",
    updatedHoursAgo: 2,
    notes: "Progressione: +2,5 kg sui fondamentali quando tutte le serie sono pulite.",
    days: [
      {
        weekday: 0,
        title: "Gambe e glutei",
        category: "lower_body",
        goal: "strength",
        notes: "Focus forza",
        ex: [
          ["squat-bilanciere", 4, "10", 90, 40, null, null, "3-1-1-0"],
          ["hip-thrust", 4, "12", 60, 60],
          ["leg-press", 3, "12", 60, 110],
          ["affondi-manubri", 3, "12", 60, 10, null, "Per gamba. ROM ridotto sul ginocchio sinistro."],
        ],
      },
      {
        weekday: 2,
        title: "Parte superiore",
        category: "upper_body",
        goal: "recomposition",
        notes: "Tecnica prima del carico",
        ex: [
          ["lat-machine", 4, "10", 75, 35],
          ["panca-inclinata-manubri", 3, "10", 75, 12],
          ["pulley-basso", 3, "12", 60, 30],
          ["alzate-laterali", 3, "15", 45, 5, "ss-g1"],
          ["face-pull", 3, "15", 45, 15, "ss-g1"],
          ["plank", 3, "45s", 30],
        ],
      },
      {
        weekday: 4,
        title: "Glutei e femorali",
        category: "lower_body",
        goal: "recomposition",
        ex: [
          ["stacco-rumeno", 4, "8", 90, 40],
          ["glute-bridge", 3, "15", 60, 50],
          ["leg-curl", 3, "12", 45, 25, "ss-g2"],
          ["step-up", 3, "10", 60, 8, "ss-g2"],
          ["russian-twist", 3, "20", 30],
        ],
      },
    ],
  },
  {
    key: "marco-ipertrofia",
    client: "marco",
    name: "Ipertrofia 4 giorni",
    status: "published",
    updatedHoursAgo: 72,
    days: [
      { weekday: 0, title: "Push", category: "push", goal: "muscle_gain", ex: [["panca-piana", 4, "8", 120, 80], ["panca-inclinata-manubri", 3, "10", 90, 30], ["croci-cavi", 3, "12", 60, 15], ["lento-manubri", 3, "10", 90, 22], ["pushdown-cavi", 3, "12", 60, 30]] },
      { weekday: 1, title: "Pull", category: "pull", goal: "muscle_gain", ex: [["trazioni", 4, "6-8", 120], ["rematore-bilanciere", 4, "8", 90, 70], ["lat-machine", 3, "10", 75, 60], ["face-pull", 3, "15", 45, 20], ["curl-manubri", 3, "12", 60, 14]] },
      { weekday: 3, title: "Gambe", category: "legs", goal: "muscle_gain", ex: [["squat-bilanciere", 4, "6", 150, 100], ["stacco-rumeno", 3, "8", 120, 80], ["leg-extension", 3, "12", 60, 50, "ss-m1"], ["leg-curl", 3, "12", 60, 40, "ss-m1"], ["calf-raise", 4, "15", 45, 60]] },
      { weekday: 5, title: "Upper", category: "upper_body", goal: "muscle_gain", ex: [["arnold-press", 3, "10", 75, 18], ["rematore-manubrio", 3, "10", 75, 32], ["dip-parallele", 3, "10", 90], ["curl-martello", 3, "12", 60, 16, "ss-m2"], ["french-press", 3, "12", 60, 30, "ss-m2"]] },
    ],
  },
  {
    key: "sara-total",
    client: "sara",
    name: "Total body 3x",
    status: "published",
    updatedHoursAgo: 24 * 6,
    days: [
      { weekday: 0, title: "Total body A", category: "full_body", goal: "weight_loss", ex: [["goblet-squat", 3, "12", 60, 16], ["piegamenti", 3, "10", 60], ["rematore-manubrio", 3, "12", 60, 12], ["glute-bridge", 3, "15", 45, 30], ["mountain-climber", 3, "30s", 30], ["plank", 3, "40s", 30]] },
      { weekday: 2, title: "Total body B", category: "full_body", goal: "weight_loss", ex: [["affondi-manubri", 3, "10", 60, 8], ["lat-machine", 3, "12", 60, 30], ["alzate-laterali", 3, "15", 45, 4], ["kettlebell-swing", 4, "15", 45, 12], ["crunch", 3, "15", 30]] },
      { weekday: 4, title: "Cardio e core", category: "cardio", goal: "endurance", ex: [["cyclette", 1, "20 min", 60, null, null, "Zona 2, cadenza costante"], ["vogatore", 4, "2 min", 60], ["russian-twist", 3, "20", 30], ["plank", 3, "45s", 30]] },
    ],
  },
  {
    key: "luca-5x5",
    client: "luca",
    name: "Forza 5×5",
    status: "draft",
    updatedHoursAgo: 26,
    days: [
      { weekday: 0, title: "Giorno A", category: "strength", goal: "strength", ex: [["squat-bilanciere", 5, "5", 180, 110], ["panca-piana", 5, "5", 180, 85], ["rematore-bilanciere", 5, "5", 120, 70]] },
      { weekday: 2, title: "Giorno B", category: "strength", goal: "strength", ex: [["squat-bilanciere", 5, "5", 180, 112.5], ["lento-manubri", 5, "5", 120, 26], ["stacco-da-terra", 1, "5", 180, 150]] },
      { weekday: 4, title: "Giorno A", category: "strength", goal: "strength", ex: [["squat-bilanciere", 5, "5", 180, 115], ["panca-piana", 5, "5", 180, 87.5], ["rematore-bilanciere", 5, "5", 120, 72.5]] },
    ],
  },
  {
    key: "francesca-mobilita",
    client: "francesca",
    name: "Mobilità e postura",
    status: "published",
    updatedHoursAgo: 24 * 14,
    days: [
      { weekday: 1, title: "Postura e core", category: "mobility", goal: "mobility", ex: [["cyclette", 1, "10 min", 60], ["glute-bridge", 3, "12", 45], ["face-pull", 3, "15", 45, 10], ["plank", 3, "30s", 30], ["russian-twist", 2, "16", 30]] },
      { weekday: 3, title: "Mobilità e forza leggera", category: "mobility", goal: "mobility", ex: [["tapis-roulant", 1, "12 min", 60, null, null, "Camminata veloce in pendenza"], ["goblet-squat", 3, "10", 60, 8], ["step-up", 3, "8", 60], ["pulley-basso", 3, "12", 60, 20], ["crunch", 2, "12", 30]] },
    ],
  },
  {
    key: "davide-ricomp",
    client: "davide",
    name: "Ricomposizione 3 giorni",
    status: "draft",
    updatedHoursAgo: 24 * 4,
    days: [
      { weekday: 0, title: "Upper", category: "upper_body", goal: "recomposition", ex: [["panca-piana", 4, "8", 90, 70], ["rematore-manubrio", 4, "10", 75, 28], ["alzate-laterali", 3, "15", 45, 8]] },
      { weekday: 3, title: "Lower", category: "lower_body", goal: "recomposition", ex: [["squat-bilanciere", 4, "8", 120, 90], ["hip-thrust", 3, "10", 90, 100], ["leg-curl", 3, "12", 60, 35]] },
    ],
  },
  {
    key: "matteo-ul",
    client: "matteo",
    name: "Upper / Lower",
    status: "published",
    updatedHoursAgo: 24 * 5,
    days: [
      { weekday: 0, title: "Upper A", category: "upper_body", goal: "muscle_gain", ex: [["panca-piana", 4, "6-8", 120, 75], ["trazioni", 4, "6-8", 120], ["lento-manubri", 3, "10", 90, 22], ["curl-manubri", 3, "10", 60, 14, "ss-t1"], ["pushdown-cavi", 3, "12", 60, 30, "ss-t1"]] },
      { weekday: 1, title: "Lower A", category: "lower_body", goal: "muscle_gain", ex: [["squat-bilanciere", 4, "6-8", 150, 95], ["stacco-rumeno", 3, "10", 120, 75], ["leg-press", 3, "12", 90, 160], ["calf-raise", 4, "12", 45, 70]] },
      { weekday: 3, title: "Upper B", category: "upper_body", goal: "muscle_gain", ex: [["panca-inclinata-manubri", 4, "10", 90, 28], ["rematore-bilanciere", 4, "8", 90, 65], ["arnold-press", 3, "12", 60, 16], ["face-pull", 3, "15", 45, 20]] },
      { weekday: 4, title: "Lower B", category: "lower_body", goal: "muscle_gain", ex: [["stacco-da-terra", 3, "5", 180, 140], ["affondi-manubri", 3, "10", 60, 18], ["leg-extension", 3, "15", 60, 45], ["crunch", 3, "20", 30]] },
    ],
  },
  {
    key: "valentina-old",
    client: "valentina",
    name: "Dimagrimento — inverno",
    status: "archived",
    updatedHoursAgo: 24 * 120,
    days: [{ weekday: 1, title: "Circuito", category: "hiit", goal: "weight_loss", ex: [["jump-squat", 4, "12", 30], ["piegamenti", 4, "10", 30], ["kettlebell-swing", 4, "15", 30], ["salto-corda", 4, "1 min", 60]] }],
  },
];

/* ------------------------------ nutrition -------------------------------- */
/** foodKey | [foodKey, amount?, nameOverride?] | null — seven entries, Monday → Sunday */
type Cell = string | [string, number?, string?] | null | Cell[];
type NutritionSeed = {
  key: string;
  client: string;
  name: string;
  notes: string | null;
  status: PlanStatus;
  updatedHoursAgo: number;
  targets: NutritionPlan["targets"];
  grid: Partial<Record<MealSlot, Cell[]>>;
};

const Y: Cell = ["yogurt-greco", 170, "Yogurt greco"];
const R: Cell = ["ricotta", 100, "Ricotta"];

const NUTRITION: NutritionSeed[] = [
  {
    key: "giulia-ipo",
    client: "giulia",
    name: "Piano ipocalorico",
    notes: "Piano ipocalorico mantenimento",
    status: "published",
    updatedHoursAgo: 24 * 12,
    targets: { kcal: 1600, protein: 120, carbs: 170, fat: 55 },
    grid: {
      breakfast: ["porridge", "yogurt-frutta", "pane-uova", "smoothie", "porridge", "yogurt-frutta", "pancake"],
      morning_snack: ["frutta-mista", "mandorle", "banana", "frutta-mista", "noci", Y, "frutta-mista"],
      lunch: ["pollo-riso", "pasta-integrale-pomodoro", "tonno-insalata", "pollo-patate", "riso-verdure", "pasta-tonno", "salmone-quinoa"],
      afternoon_snack: [Y, "frutta-mista", "mandorle", "frullato-proteico", "banana", Y, "noci"],
      dinner: ["pesce-verdure", "tacchino-insalata", "uova-verdure", "carne-magra", "salmone-verdure", "pollo-verdure", "zuppa-verdure"],
      pre_bed: [R, Y, "caseina", R, Y, ["fiocchi-latte", 150], "caseina"],
    },
  },
  {
    key: "sara-fase1",
    client: "sara",
    name: "Dimagrimento — fase 1",
    notes: "Deficit moderato, cinque pasti. Domenica colazione libera.",
    status: "published",
    updatedHoursAgo: 24 * 6,
    targets: { kcal: 1400, protein: 100, carbs: 150, fat: 45 },
    grid: {
      breakfast: ["yogurt-frutta", "porridge", "pane-uova", "yogurt-frutta", "porridge", "pancake", "cornetto-caffe"],
      morning_snack: ["frutta-mista", ["banana", 120], ["mela", 180], ["kiwi", 150, "Kiwi"], ["pera", 170], "frutta-mista", null],
      lunch: ["tonno-insalata", "riso-verdure", "pollo-verdure", "pasta-tonno", "tacchino-insalata", "salmone-quinoa", "pasta-integrale-pomodoro"],
      afternoon_snack: [Y, ["mandorle", 20], ["fiocchi-latte", 150], ["noci", 20], Y, "frutta-mista", null],
      dinner: ["pesce-verdure", "uova-verdure", "zuppa-verdure", "salmone-verdure", "carne-magra", "gamberi-avocado", "pollo-verdure"],
    },
  },
  {
    key: "marco-iper",
    client: "marco",
    name: "Ipercalorico pulito",
    notes: "Surplus leggero, carboidrati concentrati attorno all'allenamento.",
    status: "draft",
    updatedHoursAgo: 20,
    targets: { kcal: 2400, protein: 165, carbs: 270, fat: 70 },
    grid: {
      breakfast: [["porridge", 450], ["pancake", 330], ["pane-uova", 210], ["porridge", 450], "smoothie", ["pancake", 330], ["pane-uova", 210]],
      morning_snack: ["smoothie", ["mandorle", 40], "frullato-proteico", "yogurt-frutta", [["pane-integrale", 60], ["burro-arachidi", 20]], "smoothie", ["banana", 150]],
      lunch: [["pollo-riso", 470], ["pasta-tonno", 350], ["salmone-quinoa", 450], ["pasta-integrale-pomodoro", 330], ["pollo-patate", 500], ["riso-verdure", 520], ["carne-magra", 500]],
      afternoon_snack: ["yogurt-frutta", ["banana", 150], ["noci", 30], "frullato-proteico", ["mandorle", 30], "smoothie", "frutta-mista"],
      dinner: ["carne-magra", "pollo-patate", "salmone-verdure", "tacchino-insalata", "pesce-verdure", "uova-verdure", "pollo-verdure"],
      pre_bed: ["caseina", "caseina", "caseina", "caseina", "caseina", R, "caseina"],
    },
  },
  {
    key: "chiara-endurance",
    client: "chiara",
    name: "Settimana tipo — endurance",
    notes: "Bozza: completare da giovedì in base ai lunghi del weekend.",
    status: "draft",
    updatedHoursAgo: 30,
    targets: { kcal: 2000, protein: 100, carbs: 270, fat: 55 },
    grid: {
      breakfast: ["porridge", "pancake", "porridge", null, null, null, null],
      morning_snack: [["banana", 120], "frutta-mista", ["banana", 120], null, null, null, null],
      lunch: ["pasta-integrale-pomodoro", "riso-verdure", "pasta-tonno", null, null, null, null],
      afternoon_snack: ["yogurt-frutta", "smoothie", Y, null, null, null, null],
      dinner: ["salmone-quinoa", "pollo-patate", "zuppa-verdure", null, null, null, null],
    },
  },
];

/* ------------------------------- progress -------------------------------- */
type Series = { client: string; weeks: number; weight: [number, number]; bf?: [number, number]; waist?: [number, number]; hips?: [number, number]; chest?: [number, number]; arm?: [number, number]; thigh?: [number, number]; everyDays?: number };
const PROGRESS: Series[] = [
  { client: "giulia", weeks: 12, weight: [66.4, 62.8], bf: [27.5, 24.6], waist: [77, 72], hips: [101, 98], chest: [90, 89], arm: [29, 28.5], thigh: [58, 56] },
  { client: "marco", weeks: 10, weight: [76, 79.2], bf: [15, 15.6], waist: [82, 83], chest: [100, 103], arm: [35, 36.5], thigh: [57, 59] },
  { client: "sara", weeks: 8, weight: [78.5, 74.9], bf: [34, 31.5], waist: [92, 87], hips: [108, 104] },
  { client: "davide", weeks: 8, weight: [88, 85.6], bf: [22, 19.8], waist: [94, 90] },
  { client: "matteo", weeks: 6, weight: [71.5, 73.4], arm: [33, 34] },
  { client: "francesca", weeks: 5, weight: [61, 60.2], waist: [80, 78], everyDays: 21 },
  { client: "chiara", weeks: 4, weight: [58, 57.6], bf: [21, 20.5] },
  { client: "luca", weeks: 4, weight: [80.2, 81] },
];

/** Deterministic pseudo-random noise so the demo looks organic but stable. */
function noise(seed: string, i: number, amplitude: number) {
  let h = 2166136261;
  const s = `${seed}:${i}`;
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619);
  return (((h >>> 0) % 1000) / 1000 - 0.5) * 2 * amplitude;
}

export function createDemoData(now = new Date()): DemoDb {
  const nowIso = now.toISOString();
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  const today = dayKeyOf(now);

  const coach: CoachProfile = {
    fullName: "Luca Ferraro",
    email: "luca@formastudio.it",
    phone: "+39 333 123 4567",
    studioName: "Forma Studio",
    bio: "Personal trainer e preparatore atletico. Ricomposizione corporea, forza e benessere a lungo termine.",
    avatarUrl: null,
    defaultSets: 3,
    defaultReps: "10",
    defaultRestSeconds: 90,
    pdfFooter: "Programma personale preparato da Luca Ferraro — Forma Studio. Contattami prima di modificare carichi o esercizi.",
    updatedAt: nowIso,
  };

  const clients: Client[] = CLIENTS.map((c) => ({
    id: cid(c.key),
    firstName: c.first,
    lastName: c.last,
    email: c.email,
    phone: c.phone,
    birthDate: c.birth,
    gender: c.gender,
    heightCm: c.height,
    goal: c.goal,
    goalDetails: c.details,
    status: c.status,
    avatarUrl: c.avatar,
    startDate: addDaysToKey(today, -7 * c.startWeeksAgo),
    lastActivityAt: ago(c.lastActiveMinAgo),
    createdAt: ago(c.startWeeksAgo * 7 * 24 * 60),
    updatedAt: ago(c.lastActiveMinAgo),
  }));

  const exercises = buildExerciseLibrary(ago(60 * 24 * 60));
  const foods = buildFoodLibrary(ago(60 * 24 * 60));
  const foodsById = new Map(foods.map((f) => [f.id, f]));

  const workoutPlans: WorkoutPlan[] = WORKOUTS.map((p) => {
    const updatedAt = ago(p.updatedHoursAgo * 60);
    return {
      id: seedUuid(`workout:${p.key}`),
      clientId: cid(p.client),
      name: p.name,
      status: p.status,
      notes: p.notes ?? null,
      publishedAt: p.status === "draft" ? null : updatedAt,
      createdAt: ago(p.updatedHoursAgo * 60 + 60 * 24 * 3),
      updatedAt,
      days: p.days.map((d) => ({
        id: seedUuid(`workout:${p.key}:day:${d.weekday}`),
        weekday: d.weekday,
        title: d.title,
        category: d.category,
        goal: d.goal,
        durationMinutes: null,
        notes: d.notes ?? null,
        exercises: d.ex.map(([key, sets, reps, rest, weight, superset, notes, tempo], i) => ({
          id: seedUuid(`workout:${p.key}:day:${d.weekday}:ex:${i}`),
          exerciseId: exerciseId(key),
          sets,
          reps,
          restSeconds: rest,
          weightKg: weight ?? null,
          tempo: tempo ?? null,
          notes: notes ?? null,
          supersetId: superset ? seedUuid(`superset:${p.key}:${superset}`) : null,
        })),
      })),
    };
  });

  const nutritionPlans: NutritionPlan[] = NUTRITION.map((p) => {
    const meals: MealEntry[] = [];
    for (const slot of MEAL_SLOTS) {
      const row = p.grid[slot];
      if (!row) continue;
      row.forEach((cell, day) => {
        const items: Cell[] = Array.isArray(cell) && Array.isArray(cell[0]) ? (cell as Cell[]) : [cell];
        items.forEach((item, position) => {
          if (!item) return;
          const [key, amount, nameOverride] = typeof item === "string" ? [item] : (item as [string, number?, string?]);
          const food = foodsById.get(foodId(key));
          if (!food) throw new Error(`Unknown food ${key}`);
          const fields = mealFieldsFromFood(food, amount ?? food.servingSize);
          meals.push({
            id: seedUuid(`meal:${p.key}:${slot}:${day}:${position}`),
            day,
            slot,
            position,
            ...fields,
            name: nameOverride ?? fields.name,
            notes: null,
          });
        });
      });
    }
    const updatedAt = ago(p.updatedHoursAgo * 60);
    return {
      id: seedUuid(`nutrition:${p.key}`),
      clientId: cid(p.client),
      name: p.name,
      notes: p.notes,
      status: p.status,
      weekStart: null,
      targets: p.targets,
      publishedAt: p.status === "published" ? updatedAt : null,
      createdAt: ago(p.updatedHoursAgo * 60 + 60 * 24 * 2),
      updatedAt,
      meals,
    };
  });

  const progress: ProgressRecord[] = [];
  for (const s of PROGRESS) {
    const step = s.everyDays ?? 7;
    for (let i = 0; i < s.weeks; i++) {
      const t = s.weeks === 1 ? 1 : i / (s.weeks - 1);
      const lerp = (r?: [number, number], amp = 0.3) =>
        r ? round(r[0] + (r[1] - r[0]) * t + (i === 0 || i === s.weeks - 1 ? 0 : noise(s.client, i, amp)), 1) : null;
      const date = addDaysToKey(today, -2 - step * (s.weeks - 1 - i));
      progress.push({
        id: seedUuid(`progress:${s.client}:${i}`),
        clientId: cid(s.client),
        date,
        weightKg: lerp(s.weight, 0.35),
        bodyFatPct: lerp(s.bf, 0.25),
        waistCm: lerp(s.waist, 0.4),
        hipsCm: lerp(s.hips, 0.4),
        chestCm: lerp(s.chest, 0.3),
        armCm: lerp(s.arm, 0.2),
        thighCm: lerp(s.thigh, 0.3),
        notes: i === s.weeks - 1 && s.client === "giulia" ? "Ottima aderenza al piano, energia alta anche nei giorni di allenamento." : null,
        createdAt: zonedToUtc(date, "08:30").toISOString(),
      });
    }
  }

  type ApptSeed = [client: string | null, offsetDays: number, time: string, type: AppointmentType, title: string, minutes: number, location: string | null, status?: AppointmentStatus];
  const APPTS: ApptSeed[] = [
    ["giulia", 0, "18:30", "training", "Allenamento — Gambe e glutei", 60, "Forma Studio · Sala pesi"],
    ["marco", 1, "07:30", "training", "Allenamento — Push", 75, "Forma Studio · Sala pesi"],
    ["chiara", 1, "13:00", "video_call", "Revisione piano alimentare", 30, "Google Meet"],
    ["sara", 2, "12:30", "check_in", "Check-in settimanale", 30, "Forma Studio"],
    ["luca", 3, "18:00", "training", "Test massimali", 90, "Forma Studio · Rack 2"],
    ["francesca", 4, "09:00", "assessment", "Valutazione posturale", 60, "Forma Studio · Studio 1"],
    ["giulia", 6, "17:30", "check_in", "Check-in mensile", 45, "Forma Studio"],
    ["davide", 8, "19:00", "training", "Allenamento — Lower", 60, "Forma Studio · Sala pesi"],
    ["simone", 10, "10:00", "assessment", "Valutazione funzionale", 60, "Forma Studio · Studio 1"],
    ["marco", -1, "18:30", "training", "Allenamento — Gambe", 75, "Forma Studio · Sala pesi", "completed"],
    ["giulia", -2, "12:30", "check_in", "Check-in settimanale", 30, "Forma Studio", "completed"],
    ["sara", -3, "09:00", "training", "Allenamento — Total body A", 60, "Forma Studio", "completed"],
    ["davide", -5, "18:00", "training", "Allenamento — Upper", 60, "Forma Studio", "cancelled"],
    ["simone", -7, "10:00", "assessment", "Primo incontro e anamnesi", 60, "Forma Studio · Studio 1", "completed"],
    ["giulia", -9, "18:30", "training", "Allenamento — Glutei e femorali", 60, "Forma Studio · Sala pesi", "completed"],
    [null, 5, "14:00", "video_call", "Call con nutrizionista partner", 30, "Zoom"],
  ];
  const appointments: Appointment[] = APPTS.map(([client, offset, time, type, title, minutes, location, status], i) => ({
    id: seedUuid(`appointment:${i}`),
    clientId: client ? cid(client) : null,
    title,
    type,
    startsAt: zonedToUtc(addDaysToKey(today, offset), time).toISOString(),
    durationMinutes: minutes,
    location,
    notes: null,
    status: status ?? "scheduled",
    createdAt: ago(60 * 24 * 10),
    updatedAt: ago(60 * 24 * 2),
  }));

  const W = (key: string) => seedUuid(`workout:${key}`);
  const N = (key: string) => seedUuid(`nutrition:${key}`);
  type ActSeed = [minutesAgo: number, type: ActivityType, client: string | null, title: string, description: string, params: Record<string, string | number>, href: string | null];
  const name = (key: string) => {
    const c = CLIENTS.find((x) => x.key === key)!;
    return `${c.first} ${c.last}`;
  };
  const ACTS: ActSeed[] = [
    [25, "progress_logged", "giulia", "Progresso registrato", "{client} · {weight} kg", { client: name("giulia"), weight: 62.8 }, `/clients/${cid("giulia")}?tab=progressi`],
    [120, "workout_published", "giulia", "Scheda pubblicata", "{plan}{who}", { plan: "Forza & tonificazione", who: ` · ${name("giulia")}` }, `/workouts/${W("giulia-forza")}`],
    [300, "appointment_scheduled", "sara", "Appuntamento programmato", "{title} con {client}", { title: "Check-in settimanale", client: name("sara") }, "/calendar"],
    [60 * 20, "nutrition_created", "marco", "Nuovo piano alimentare", "{plan}{who} (bozza)", { plan: "Ipercalorico pulito", who: ` · ${name("marco")}` }, `/nutrition/${N("marco-iper")}`],
    [60 * 26, "note_added", "giulia", "Nota aggiunta", "{client}: {excerpt}", { client: name("giulia"), excerpt: "Ginocchio sinistro sensibile negli affondi profondi…" }, `/clients/${cid("giulia")}?tab=note`],
    [60 * 24 * 2, "client_created", "simone", "Nuovo cliente", "{client} è stato aggiunto ai clienti", { client: name("simone") }, `/clients/${cid("simone")}`],
    [60 * 24 * 3, "workout_published", "marco", "Scheda pubblicata", "{plan}{who}", { plan: "Ipertrofia 4 giorni", who: ` · ${name("marco")}` }, `/workouts/${W("marco-ipertrofia")}`],
    [60 * 24 * 4, "workout_created", "davide", "Nuova scheda", "{plan}{who} (bozza)", { plan: "Ricomposizione 3 giorni", who: ` · ${name("davide")}` }, `/workouts/${W("davide-ricomp")}`],
    [60 * 24 * 5, "workout_published", "matteo", "Scheda pubblicata", "{plan}{who}", { plan: "Upper / Lower", who: ` · ${name("matteo")}` }, `/workouts/${W("matteo-ul")}`],
    [60 * 24 * 6, "nutrition_published", "sara", "Piano alimentare pubblicato", "{plan}{who}", { plan: "Dimagrimento — fase 1", who: ` · ${name("sara")}` }, `/nutrition/${N("sara-fase1")}`],
    [60 * 24 * 8, "progress_logged", "davide", "Progresso registrato", "{client} · {weight} kg", { client: name("davide"), weight: 85.6 }, `/clients/${cid("davide")}?tab=progressi`],
    [60 * 24 * 12, "nutrition_published", "giulia", "Piano alimentare pubblicato", "{plan}{who}", { plan: "Piano ipocalorico", who: ` · ${name("giulia")}` }, `/nutrition/${N("giulia-ipo")}`],
  ];
  // Coach-initiated events are an activity log: stored as already read. Reminders are generated at runtime.
  const activity: Activity[] = ACTS.map(([min, type, client, title, description, params, href], i) => ({
    id: seedUuid(`activity:${i}`),
    type,
    clientId: client ? cid(client) : null,
    title,
    description,
    href,
    params,
    createdAt: ago(min),
    readAt: ago(Math.max(0, min - 30)),
  }));

  const clientNotes: ClientNote[] = [
    { id: seedUuid("note:1"), clientId: cid("giulia"), body: "Ginocchio sinistro sensibile negli affondi profondi: ridurre il ROM e preferire lo step-up nelle settimane di carico.", createdAt: ago(60 * 26) },
    { id: seedUuid("note:2"), clientId: cid("giulia"), body: "Ha chiesto alternative vegetariane per due cene a settimana.", createdAt: ago(60 * 24 * 6) },
    { id: seedUuid("note:3"), clientId: cid("giulia"), body: "Preferisce allenarsi la mattina presto, prima del lavoro.", createdAt: ago(60 * 24 * 20) },
    { id: seedUuid("note:4"), clientId: cid("marco"), body: "Recupero lento dopo le sedute di gambe: valutare un deload ogni 5 settimane.", createdAt: ago(60 * 24 * 9) },
    { id: seedUuid("note:5"), clientId: cid("sara"), body: "Turni di lavoro variabili: sessioni brevi e flessibili funzionano meglio.", createdAt: ago(60 * 24 * 15) },
  ];

  return {
    version: DEMO_DB_VERSION,
    seededAt: nowIso,
    coach,
    clients,
    clientNotes,
    exercises,
    workoutPlans,
    foods,
    nutritionPlans,
    progress,
    appointments,
    activity,
  };
}
