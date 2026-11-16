/**
 * Starter libraries shared by demo mode and supabase/seed.sql.
 *
 * Exercise photos: free-exercise-db (public domain, github.com/yuhonas/free-exercise-db), colour-graded.
 * Food illustrations: Microsoft Fluent Emoji 3D (MIT).
 *
 * Nutrition values are indicative per-100 g references (USDA FoodData Central style) and are flagged
 * in the UI as `source: "demo"` — the coach should verify them before relying on them.
 */
import type { Difficulty, Equipment, FoodCategory, FoodUnit, MuscleGroup } from "@/lib/domain/constants";
import type { Exercise, Food } from "@/lib/domain/types";
import { seedUuid } from "@/lib/id";
import { computeRecipe } from "@/lib/domain/nutrition";

type ExerciseSeed = {
  key: string;
  name: string;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  equipment: Equipment;
  difficulty: Difficulty;
  steps: string[];
};

const EXERCISES: ExerciseSeed[] = [
  {
    key: "squat-bilanciere",
    name: "Squat con bilanciere",
    primary: ["quadriceps", "glutes"],
    secondary: ["hamstrings", "core"],
    equipment: "barbell",
    difficulty: "intermediate",
    steps: [
      "Posiziona il bilanciere sui trapezi, piedi alla larghezza delle spalle e punte leggermente extraruotate.",
      "Inspira, attiva il core e scendi spingendo le anche indietro con le ginocchia in linea con le punte.",
      "Raggiungi almeno il parallelo mantenendo la schiena neutra e i talloni a terra.",
      "Risali spingendo con tutto il piede ed espira nella parte finale del movimento.",
    ],
  },
  {
    key: "hip-thrust",
    name: "Hip Thrust",
    primary: ["glutes"],
    secondary: ["hamstrings", "core"],
    equipment: "barbell",
    difficulty: "intermediate",
    steps: [
      "Appoggia la parte alta della schiena su una panca e posiziona il bilanciere imbottito sulle anche.",
      "Piedi a terra alla larghezza delle anche, tibie verticali nella posizione alta.",
      "Spingi con i talloni ed estendi le anche fino ad allineare spalle, anche e ginocchia.",
      "Contrai i glutei per un secondo in alto e scendi in modo controllato.",
    ],
  },
  {
    key: "leg-press",
    name: "Leg Press",
    primary: ["quadriceps", "glutes"],
    secondary: ["hamstrings", "calves"],
    equipment: "machine",
    difficulty: "beginner",
    steps: [
      "Siediti con schiena e bacino aderenti allo schienale, piedi sulla pedana alla larghezza delle spalle.",
      "Sblocca i fermi e scendi piegando le ginocchia verso il petto senza sollevare il bacino.",
      "Spingi la pedana fino quasi alla completa estensione, senza bloccare le ginocchia.",
    ],
  },
  {
    key: "affondi-manubri",
    name: "Affondi con manubri",
    primary: ["quadriceps", "glutes"],
    secondary: ["hamstrings", "core"],
    equipment: "dumbbell",
    difficulty: "intermediate",
    steps: [
      "In piedi con un manubrio per mano, braccia distese lungo i fianchi.",
      "Fai un passo in avanti e scendi finché entrambe le ginocchia formano circa 90°.",
      "Mantieni il busto eretto e il ginocchio anteriore in linea con il piede.",
      "Spingi sul tallone anteriore per tornare in posizione e alterna le gambe.",
    ],
  },
  {
    key: "stacco-rumeno",
    name: "Stacco rumeno",
    primary: ["hamstrings", "glutes"],
    secondary: ["back", "core"],
    equipment: "barbell",
    difficulty: "intermediate",
    steps: [
      "In piedi con il bilanciere in presa prona e le ginocchia leggermente flesse.",
      "Spingi le anche indietro facendo scorrere il bilanciere lungo le cosce, schiena neutra.",
      "Scendi fino a sentire l'allungamento dei femorali, poco sotto le ginocchia.",
      "Risali estendendo le anche e contraendo i glutei.",
    ],
  },
  {
    key: "stacco-da-terra",
    name: "Stacco da terra",
    primary: ["back", "hamstrings", "glutes"],
    secondary: ["quadriceps", "forearms", "core"],
    equipment: "barbell",
    difficulty: "advanced",
    steps: [
      "Piedi sotto il bilanciere alla larghezza delle anche, impugnatura appena fuori dalle gambe.",
      "Abbassa le anche, petto in fuori, schiena neutra e spalle sopra il bilanciere.",
      "Spingi il pavimento con le gambe mantenendo il bilanciere a contatto con le tibie.",
      "Completa estendendo anche e ginocchia insieme, poi riporta a terra con controllo.",
    ],
  },
  {
    key: "goblet-squat",
    name: "Goblet squat",
    primary: ["quadriceps", "glutes"],
    secondary: ["core"],
    equipment: "kettlebell",
    difficulty: "beginner",
    steps: [
      "Tieni un kettlebell o un manubrio vicino al petto con entrambe le mani.",
      "Scendi tra le gambe con i gomiti all'interno delle ginocchia e il busto alto.",
      "Risali spingendo con i talloni senza perdere la posizione della schiena.",
    ],
  },
  {
    key: "leg-curl",
    name: "Leg curl sdraiato",
    primary: ["hamstrings"],
    secondary: ["calves"],
    equipment: "machine",
    difficulty: "beginner",
    steps: [
      "Sdraiati prono sulla macchina con il rullo appena sopra i talloni.",
      "Fletti le ginocchia portando i talloni verso i glutei senza sollevare il bacino.",
      "Fai una breve pausa e torna giù lentamente.",
    ],
  },
  {
    key: "leg-extension",
    name: "Leg extension",
    primary: ["quadriceps"],
    secondary: [],
    equipment: "machine",
    difficulty: "beginner",
    steps: [
      "Siediti con la schiena aderente e il rullo appoggiato sulla parte bassa delle tibie.",
      "Estendi le ginocchia fino alla quasi completa estensione.",
      "Mantieni un secondo la contrazione e scendi in modo controllato.",
    ],
  },
  {
    key: "glute-bridge",
    name: "Glute bridge con bilanciere",
    primary: ["glutes"],
    secondary: ["hamstrings"],
    equipment: "barbell",
    difficulty: "beginner",
    steps: [
      "Sdraiati a terra con le ginocchia piegate e il bilanciere sulle anche.",
      "Spingi con i talloni e solleva il bacino fino ad allineare spalle, anche e ginocchia.",
      "Contrai i glutei in alto e ritorna lentamente a terra.",
    ],
  },
  {
    key: "step-up",
    name: "Step-up con manubri",
    primary: ["quadriceps", "glutes"],
    secondary: ["hamstrings", "calves"],
    equipment: "dumbbell",
    difficulty: "beginner",
    steps: [
      "In piedi davanti a una panca o a un box con un manubrio per mano.",
      "Appoggia tutto il piede sul rialzo e sali spingendo con la gamba avanti.",
      "Scendi con controllo e completa le ripetizioni prima di cambiare lato.",
    ],
  },
  {
    key: "calf-raise",
    name: "Calf raise in piedi",
    primary: ["calves"],
    secondary: [],
    equipment: "machine",
    difficulty: "beginner",
    steps: [
      "Posiziona gli avampiedi sul rialzo con i talloni liberi e le spalle sotto i cuscinetti.",
      "Sali sulle punte il più in alto possibile mantenendo le ginocchia distese.",
      "Scendi lentamente fino a sentire l'allungamento dei polpacci.",
    ],
  },
  {
    key: "stacco-sumo",
    name: "Stacco sumo",
    primary: ["glutes", "adductors", "hamstrings"],
    secondary: ["quadriceps", "back"],
    equipment: "barbell",
    difficulty: "advanced",
    steps: [
      "Piedi larghi con punte extraruotate, impugnatura stretta all'interno delle gambe.",
      "Spingi le ginocchia verso l'esterno, petto alto e schiena neutra.",
      "Solleva spingendo il pavimento con i piedi e chiudi estendendo le anche.",
    ],
  },
  {
    key: "panca-piana",
    name: "Panca piana con bilanciere",
    primary: ["chest"],
    secondary: ["triceps", "shoulders"],
    equipment: "barbell",
    difficulty: "intermediate",
    steps: [
      "Sdraiati sulla panca con gli occhi sotto il bilanciere, scapole addotte e piedi ben piantati.",
      "Impugna il bilanciere poco oltre la larghezza delle spalle e staccalo dai supporti.",
      "Scendi controllato fino a sfiorare la parte bassa del petto.",
      "Spingi verso l'alto mantenendo i polsi sopra i gomiti.",
    ],
  },
  {
    key: "panca-inclinata-manubri",
    name: "Panca inclinata con manubri",
    primary: ["chest", "shoulders"],
    secondary: ["triceps"],
    equipment: "dumbbell",
    difficulty: "intermediate",
    steps: [
      "Regola la panca a 30–45° e porta i manubri all'altezza del petto.",
      "Spingi i manubri verso l'alto avvicinandoli senza farli toccare.",
      "Scendi lentamente mantenendo i gomiti a circa 45° dal busto.",
    ],
  },
  {
    key: "croci-manubri",
    name: "Croci con manubri",
    primary: ["chest"],
    secondary: ["shoulders"],
    equipment: "dumbbell",
    difficulty: "beginner",
    steps: [
      "Sdraiati su panca piana con i manubri sopra il petto e i gomiti leggermente flessi.",
      "Apri le braccia ad arco fino a sentire l'allungamento del petto.",
      "Richiudi lungo lo stesso arco contraendo i pettorali.",
    ],
  },
  {
    key: "piegamenti",
    name: "Piegamenti sulle braccia",
    primary: ["chest", "triceps"],
    secondary: ["shoulders", "core"],
    equipment: "bodyweight",
    difficulty: "beginner",
    steps: [
      "Mani poco oltre la larghezza delle spalle, corpo in linea dalla testa ai talloni.",
      "Scendi fino a portare il petto vicino al pavimento con i gomiti a circa 45°.",
      "Spingi per tornare su mantenendo il core attivo.",
    ],
  },
  {
    key: "croci-cavi",
    name: "Croci ai cavi",
    primary: ["chest"],
    secondary: ["shoulders"],
    equipment: "cable",
    difficulty: "intermediate",
    steps: [
      "Impugna le maniglie dei cavi alti e fai un passo avanti con il busto leggermente inclinato.",
      "Porta le mani davanti al petto con un movimento ad arco, gomiti morbidi.",
      "Ritorna lentamente fino a sentire l'allungamento dei pettorali.",
    ],
  },
  {
    key: "dip-parallele",
    name: "Dip alle parallele",
    primary: ["chest", "triceps"],
    secondary: ["shoulders"],
    equipment: "bodyweight",
    difficulty: "advanced",
    steps: [
      "Sostieniti sulle parallele con le braccia distese e il busto leggermente inclinato in avanti.",
      "Scendi piegando i gomiti fino a circa 90°.",
      "Spingi per tornare in alto senza bloccare i gomiti.",
    ],
  },
  {
    key: "lat-machine",
    name: "Lat machine presa larga",
    primary: ["back"],
    secondary: ["biceps", "shoulders"],
    equipment: "cable",
    difficulty: "beginner",
    steps: [
      "Siediti con le cosce bloccate sotto i cuscinetti e impugna la barra con presa larga.",
      "Tira la barra verso la parte alta del petto portando i gomiti verso i fianchi.",
      "Ritorna in alto con controllo fino alla completa distensione delle braccia.",
    ],
  },
  {
    key: "pulley-basso",
    name: "Pulley basso",
    primary: ["back"],
    secondary: ["biceps", "forearms"],
    equipment: "cable",
    difficulty: "beginner",
    steps: [
      "Siediti con i piedi sulla pedana e le ginocchia leggermente flesse, busto eretto.",
      "Tira la maniglia verso l'addome portando i gomiti indietro e stringendo le scapole.",
      "Ritorna in avanti lentamente senza arrotondare la schiena.",
    ],
  },
  {
    key: "rematore-bilanciere",
    name: "Rematore con bilanciere",
    primary: ["back"],
    secondary: ["biceps", "shoulders", "core"],
    equipment: "barbell",
    difficulty: "intermediate",
    steps: [
      "Busto inclinato a circa 45°, schiena neutra, bilanciere in presa prona.",
      "Tira il bilanciere verso l'ombelico portando i gomiti indietro.",
      "Abbassa con controllo mantenendo la posizione del busto.",
    ],
  },
  {
    key: "rematore-manubrio",
    name: "Rematore con manubrio",
    primary: ["back"],
    secondary: ["biceps", "shoulders"],
    equipment: "dumbbell",
    difficulty: "beginner",
    steps: [
      "Appoggia mano e ginocchio su una panca, schiena parallela al pavimento.",
      "Tira il manubrio verso il fianco mantenendo il gomito vicino al corpo.",
      "Scendi lentamente fino alla completa distensione e completa le ripetizioni per lato.",
    ],
  },
  {
    key: "trazioni",
    name: "Trazioni alla sbarra",
    primary: ["back"],
    secondary: ["biceps", "forearms", "core"],
    equipment: "bodyweight",
    difficulty: "advanced",
    steps: [
      "Appenditi alla sbarra con presa prona poco oltre la larghezza delle spalle.",
      "Tira portando il petto verso la sbarra e i gomiti verso il basso.",
      "Supera la sbarra con il mento e scendi lentamente fino a braccia distese.",
    ],
  },
  {
    key: "face-pull",
    name: "Face pull",
    primary: ["shoulders"],
    secondary: ["back"],
    equipment: "cable",
    difficulty: "beginner",
    steps: [
      "Imposta il cavo all'altezza del viso con la corda e impugnala con i pollici verso di te.",
      "Tira la corda verso il viso aprendo le mani e portando i gomiti in alto e indietro.",
      "Mantieni un secondo e ritorna con controllo.",
    ],
  },
  {
    key: "lento-manubri",
    name: "Lento avanti con manubri",
    primary: ["shoulders"],
    secondary: ["triceps"],
    equipment: "dumbbell",
    difficulty: "intermediate",
    steps: [
      "Seduto o in piedi, manubri all'altezza delle spalle con i palmi in avanti.",
      "Spingi i manubri sopra la testa fino alla quasi completa estensione.",
      "Scendi lentamente fino all'altezza delle orecchie.",
    ],
  },
  {
    key: "alzate-laterali",
    name: "Alzate laterali",
    primary: ["shoulders"],
    secondary: [],
    equipment: "dumbbell",
    difficulty: "beginner",
    steps: [
      "In piedi con un manubrio per mano e i gomiti leggermente flessi.",
      "Solleva le braccia lateralmente fino all'altezza delle spalle.",
      "Scendi lentamente senza dondolare il busto.",
    ],
  },
  {
    key: "arnold-press",
    name: "Arnold press",
    primary: ["shoulders"],
    secondary: ["triceps"],
    equipment: "dumbbell",
    difficulty: "intermediate",
    steps: [
      "Seduto con i manubri davanti al viso e i palmi rivolti verso di te.",
      "Spingi verso l'alto ruotando i palmi in avanti durante la salita.",
      "Ritorna invertendo la rotazione fino alla posizione iniziale.",
    ],
  },
  {
    key: "curl-manubri",
    name: "Curl con manubri",
    primary: ["biceps"],
    secondary: ["forearms"],
    equipment: "dumbbell",
    difficulty: "beginner",
    steps: [
      "In piedi, braccia distese e palmi rivolti in avanti.",
      "Fletti i gomiti portando i manubri verso le spalle senza muovere i gomiti.",
      "Scendi lentamente fino alla completa distensione.",
    ],
  },
  {
    key: "curl-martello",
    name: "Curl a martello",
    primary: ["biceps", "forearms"],
    secondary: [],
    equipment: "dumbbell",
    difficulty: "beginner",
    steps: [
      "Impugna i manubri con presa neutra, palmi rivolti verso il corpo.",
      "Fletti i gomiti mantenendo la presa neutra per tutto il movimento.",
      "Ritorna con controllo senza slanci.",
    ],
  },
  {
    key: "pushdown-cavi",
    name: "Push down ai cavi",
    primary: ["triceps"],
    secondary: [],
    equipment: "cable",
    difficulty: "beginner",
    steps: [
      "In piedi davanti al cavo alto, impugna la barra con i gomiti vicini ai fianchi.",
      "Estendi i gomiti spingendo la barra verso il basso.",
      "Ritorna fino a 90° mantenendo i gomiti fermi.",
    ],
  },
  {
    key: "french-press",
    name: "French press con bilanciere EZ",
    primary: ["triceps"],
    secondary: [],
    equipment: "barbell",
    difficulty: "intermediate",
    steps: [
      "Sdraiato su panca piana, bilanciere EZ sopra il petto a braccia tese.",
      "Fletti i gomiti portando il bilanciere verso la fronte, gomiti fermi.",
      "Estendi le braccia tornando alla posizione iniziale.",
    ],
  },
  {
    key: "plank",
    name: "Plank",
    primary: ["core"],
    secondary: ["shoulders", "glutes"],
    equipment: "bodyweight",
    difficulty: "beginner",
    steps: [
      "Appoggia avambracci e punte dei piedi a terra, gomiti sotto le spalle.",
      "Mantieni il corpo in linea retta contraendo addome e glutei.",
      "Respira regolarmente e mantieni la posizione per il tempo indicato.",
    ],
  },
  {
    key: "crunch",
    name: "Crunch",
    primary: ["core"],
    secondary: [],
    equipment: "bodyweight",
    difficulty: "beginner",
    steps: [
      "Sdraiati supino con le ginocchia piegate e le mani vicino alle tempie.",
      "Solleva le spalle da terra avvicinando lo sterno al bacino.",
      "Ritorna giù lentamente senza tirare la testa con le mani.",
    ],
  },
  {
    key: "russian-twist",
    name: "Russian twist",
    primary: ["core"],
    secondary: [],
    equipment: "bodyweight",
    difficulty: "beginner",
    steps: [
      "Seduto con le ginocchia piegate, busto inclinato indietro e piedi sollevati o a terra.",
      "Ruota il busto da un lato all'altro portando le mani accanto al fianco.",
      "Mantieni la schiena dritta e il movimento controllato.",
    ],
  },
  {
    key: "leg-raise-sbarra",
    name: "Leg raise alla sbarra",
    primary: ["core"],
    secondary: ["forearms"],
    equipment: "bodyweight",
    difficulty: "advanced",
    steps: [
      "Appenditi alla sbarra con le braccia distese.",
      "Solleva le gambe tese o piegate fino all'altezza delle anche o oltre.",
      "Scendi lentamente evitando di oscillare.",
    ],
  },
  {
    key: "mountain-climber",
    name: "Mountain climber",
    primary: ["core", "cardio"],
    secondary: ["shoulders", "quadriceps"],
    equipment: "bodyweight",
    difficulty: "beginner",
    steps: [
      "Parti dalla posizione di plank a braccia tese.",
      "Porta alternativamente le ginocchia verso il petto con ritmo sostenuto.",
      "Mantieni il bacino stabile e le spalle sopra i polsi.",
    ],
  },
  {
    key: "kettlebell-swing",
    name: "Kettlebell swing",
    primary: ["glutes", "hamstrings"],
    secondary: ["back", "core", "shoulders"],
    equipment: "kettlebell",
    difficulty: "intermediate",
    steps: [
      "Piedi alla larghezza delle spalle, kettlebell a terra davanti a te.",
      "Porta il kettlebell indietro tra le gambe spingendo le anche indietro.",
      "Estendi le anche con forza e lascia salire il kettlebell all'altezza del petto.",
      "Accompagna la discesa e ripeti in modo fluido.",
    ],
  },
  {
    key: "vogatore",
    name: "Vogatore",
    primary: ["cardio", "back"],
    secondary: ["quadriceps", "biceps"],
    equipment: "machine",
    difficulty: "beginner",
    steps: [
      "Siediti, blocca i piedi e impugna la maniglia a braccia tese.",
      "Spingi con le gambe, poi inclina leggermente il busto e tira la maniglia verso l'addome.",
      "Ritorna invertendo la sequenza: braccia, busto, gambe.",
    ],
  },
  {
    key: "tapis-roulant",
    name: "Corsa su tapis roulant",
    primary: ["cardio"],
    secondary: ["quadriceps", "calves"],
    equipment: "machine",
    difficulty: "beginner",
    steps: [
      "Imposta velocità e pendenza secondo l'intensità indicata.",
      "Mantieni una postura eretta e una falcata naturale.",
      "Monitora la frequenza cardiaca e defatica negli ultimi minuti.",
    ],
  },
  {
    key: "cyclette",
    name: "Cyclette",
    primary: ["cardio"],
    secondary: ["quadriceps", "hamstrings"],
    equipment: "machine",
    difficulty: "beginner",
    steps: [
      "Regola la sella all'altezza dell'anca, con il ginocchio leggermente flesso in basso.",
      "Pedala a ritmo costante con la resistenza indicata.",
      "Varia la resistenza seguendo gli intervalli del programma.",
    ],
  },
  {
    key: "salto-corda",
    name: "Salto della corda",
    primary: ["cardio", "calves"],
    secondary: ["shoulders"],
    equipment: "other",
    difficulty: "beginner",
    steps: [
      "Impugna la corda con i gomiti vicini ai fianchi.",
      "Ruota la corda con i polsi e salta sugli avampiedi con piccoli rimbalzi.",
      "Mantieni un ritmo regolare per il tempo indicato.",
    ],
  },
  {
    key: "jump-squat",
    name: "Jump squat",
    primary: ["quadriceps", "glutes"],
    secondary: ["calves", "cardio"],
    equipment: "bodyweight",
    difficulty: "intermediate",
    steps: [
      "Parti in posizione di squat con le braccia davanti.",
      "Salta esplosivamente verso l'alto estendendo anche e ginocchia.",
      "Atterra morbido sugli avampiedi e torna subito in squat.",
    ],
  },
];

export const exerciseId = (key: string) => seedUuid(`exercise:${key}`);
export const foodId = (key: string) => seedUuid(`food:${key}`);

export function buildExerciseLibrary(nowIso: string): Exercise[] {
  return EXERCISES.map((e) => ({
    id: exerciseId(e.key),
    name: e.name,
    primaryMuscles: e.primary,
    secondaryMuscles: e.secondary,
    equipment: e.equipment,
    difficulty: e.difficulty,
    instructions: e.steps,
    imageUrls: [`/exercises/${e.key}-0.jpg`, `/exercises/${e.key}-1.jpg`],
    isCustom: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
}

/* ------------------------------------------------------------------------- */

type BaseFood = {
  key: string;
  name: string;
  category: FoodCategory;
  image: string;
  unit: FoodUnit;
  serving: number;
  label: string | null;
  /** kcal, protein, carbs, fat — per 100 g / ml */
  n: [number, number, number, number];
};

const BASE_FOODS: BaseFood[] = [
  { key: "avena", name: "Fiocchi d'avena", category: "grains", image: "bowl-with-spoon", unit: "g", serving: 40, label: "4 cucchiai", n: [379, 13.2, 67.7, 6.5] },
  { key: "latte", name: "Latte parzialmente scremato", category: "dairy", image: "glass-of-milk", unit: "ml", serving: 200, label: "1 tazza", n: [46, 3.4, 5, 1.6] },
  { key: "yogurt-greco", name: "Yogurt greco 0%", category: "dairy", image: "jar", unit: "g", serving: 170, label: "1 vasetto", n: [59, 10.2, 3.6, 0.4] },
  { key: "ricotta", name: "Ricotta vaccina", category: "dairy", image: "cheese-wedge", unit: "g", serving: 100, label: null, n: [174, 11.3, 3, 13] },
  { key: "fiocchi-latte", name: "Fiocchi di latte", category: "dairy", image: "jar", unit: "g", serving: 150, label: "1 confezione", n: [84, 11, 4.3, 2.3] },
  { key: "parmigiano", name: "Parmigiano", category: "dairy", image: "cheese-wedge", unit: "g", serving: 15, label: "1 cucchiaio grattugiato", n: [392, 35.8, 3.2, 25.8] },
  { key: "uova", name: "Uova intere", category: "eggs", image: "egg", unit: "g", serving: 100, label: "2 uova medie", n: [143, 12.6, 0.7, 9.5] },
  { key: "albume", name: "Albume d'uovo", category: "eggs", image: "egg", unit: "g", serving: 100, label: null, n: [52, 10.9, 0.7, 0.2] },
  { key: "pollo", name: "Petto di pollo", category: "meat_fish", image: "poultry-leg", unit: "g", serving: 150, label: null, n: [120, 22.5, 0, 2.6] },
  { key: "tacchino", name: "Petto di tacchino", category: "meat_fish", image: "poultry-leg", unit: "g", serving: 150, label: null, n: [114, 23.7, 0.1, 1.5] },
  { key: "manzo", name: "Manzo magro", category: "meat_fish", image: "cut-of-meat", unit: "g", serving: 150, label: null, n: [137, 21.4, 0, 5] },
  { key: "salmone", name: "Salmone", category: "meat_fish", image: "sushi", unit: "g", serving: 130, label: null, n: [208, 20.4, 0, 13.4] },
  { key: "merluzzo", name: "Merluzzo", category: "meat_fish", image: "fish", unit: "g", serving: 200, label: null, n: [82, 17.8, 0, 0.7] },
  { key: "tonno", name: "Tonno al naturale", category: "meat_fish", image: "canned-food", unit: "g", serving: 80, label: "1 scatoletta sgocciolata", n: [116, 25.5, 0, 0.8] },
  { key: "gamberi", name: "Gamberi", category: "meat_fish", image: "shrimp", unit: "g", serving: 150, label: null, n: [85, 20.1, 0, 0.5] },
  { key: "riso", name: "Riso basmati crudo", category: "grains", image: "cooked-rice", unit: "g", serving: 80, label: null, n: [365, 7.1, 80, 0.7] },
  { key: "pasta-integrale", name: "Pasta integrale cruda", category: "grains", image: "spaghetti", unit: "g", serving: 80, label: null, n: [352, 13.9, 75, 2.5] },
  { key: "pasta", name: "Pasta di semola cruda", category: "grains", image: "spaghetti", unit: "g", serving: 80, label: null, n: [371, 13, 74.7, 1.5] },
  { key: "quinoa", name: "Quinoa cruda", category: "grains", image: "cooked-rice", unit: "g", serving: 70, label: null, n: [368, 14.1, 64.2, 6.1] },
  { key: "pane-integrale", name: "Pane integrale", category: "grains", image: "bread", unit: "g", serving: 50, label: "1 fetta grande", n: [247, 13, 41, 3.4] },
  { key: "cornetto", name: "Cornetto semplice", category: "sweets", image: "croissant", unit: "g", serving: 50, label: "1 cornetto", n: [406, 8.2, 45.8, 21] },
  { key: "patate", name: "Patate", category: "vegetables", image: "potato", unit: "g", serving: 200, label: null, n: [77, 2, 17.5, 0.1] },
  { key: "patate-dolci", name: "Patate dolci", category: "vegetables", image: "roasted-sweet-potato", unit: "g", serving: 150, label: null, n: [86, 1.6, 20.1, 0.1] },
  { key: "insalata", name: "Insalata mista", category: "vegetables", image: "leafy-green", unit: "g", serving: 80, label: "1 ciotola", n: [15, 1.4, 2.9, 0.2] },
  { key: "zucchine", name: "Zucchine", category: "vegetables", image: "cucumber", unit: "g", serving: 150, label: null, n: [17, 1.2, 3.1, 0.3] },
  { key: "broccoli", name: "Broccoli", category: "vegetables", image: "broccoli", unit: "g", serving: 150, label: null, n: [34, 2.8, 6.6, 0.4] },
  { key: "carote", name: "Carote", category: "vegetables", image: "carrot", unit: "g", serving: 100, label: null, n: [41, 0.9, 9.6, 0.2] },
  { key: "pomodori", name: "Pomodori", category: "vegetables", image: "tomato", unit: "g", serving: 150, label: null, n: [18, 0.9, 3.9, 0.2] },
  { key: "peperoni", name: "Peperoni", category: "vegetables", image: "bell-pepper", unit: "g", serving: 120, label: null, n: [20, 0.9, 4.6, 0.2] },
  { key: "funghi", name: "Funghi champignon", category: "vegetables", image: "mushroom", unit: "g", serving: 100, label: null, n: [22, 3.1, 3.3, 0.3] },
  { key: "avocado", name: "Avocado", category: "fruit", image: "avocado", unit: "g", serving: 70, label: "½ avocado", n: [160, 2, 8.5, 14.7] },
  { key: "banana", name: "Banana", category: "fruit", image: "banana", unit: "g", serving: 120, label: "1 banana media", n: [89, 1.1, 22.8, 0.3] },
  { key: "mela", name: "Mela", category: "fruit", image: "red-apple", unit: "g", serving: 180, label: "1 mela media", n: [52, 0.3, 13.8, 0.2] },
  { key: "arancia", name: "Arancia", category: "fruit", image: "tangerine", unit: "g", serving: 150, label: "1 arancia", n: [47, 0.9, 11.8, 0.1] },
  { key: "kiwi", name: "Kiwi", category: "fruit", image: "kiwi-fruit", unit: "g", serving: 75, label: "1 kiwi", n: [61, 1.1, 14.7, 0.5] },
  { key: "pera", name: "Pera", category: "fruit", image: "pear", unit: "g", serving: 170, label: "1 pera media", n: [57, 0.4, 15.2, 0.1] },
  { key: "fragole", name: "Fragole", category: "fruit", image: "strawberry", unit: "g", serving: 150, label: null, n: [32, 0.7, 7.7, 0.3] },
  { key: "mirtilli", name: "Mirtilli", category: "fruit", image: "blueberries", unit: "g", serving: 80, label: null, n: [57, 0.7, 14.5, 0.3] },
  { key: "mandorle", name: "Mandorle", category: "nuts_seeds", image: "chestnut", unit: "g", serving: 25, label: "1 manciata", n: [579, 21.2, 21.6, 49.9] },
  { key: "noci", name: "Noci", category: "nuts_seeds", image: "peanuts", unit: "g", serving: 25, label: "1 manciata", n: [654, 15.2, 13.7, 65.2] },
  { key: "burro-arachidi", name: "Burro di arachidi", category: "nuts_seeds", image: "peanuts", unit: "g", serving: 20, label: "1 cucchiaio", n: [588, 25, 20, 50] },
  { key: "olio", name: "Olio extravergine d'oliva", category: "fats_oils", image: "olive", unit: "g", serving: 10, label: "1 cucchiaio", n: [884, 0, 0, 100] },
  { key: "miele", name: "Miele", category: "sweets", image: "honey-pot", unit: "g", serving: 10, label: "1 cucchiaino", n: [304, 0.3, 82.4, 0] },
  { key: "cioccolato", name: "Cioccolato fondente 70–85%", category: "sweets", image: "chocolate-bar", unit: "g", serving: 20, label: "2 quadretti", n: [598, 7.8, 45.9, 42.6] },
  { key: "ceci", name: "Ceci lessati", category: "legumes", image: "beans", unit: "g", serving: 150, label: null, n: [164, 8.9, 27.4, 2.6] },
  { key: "fagioli", name: "Fagioli lessati", category: "legumes", image: "beans", unit: "g", serving: 150, label: null, n: [127, 8.7, 22.8, 0.5] },
  { key: "whey", name: "Proteine whey", category: "supplements", image: "cup-with-straw", unit: "g", serving: 30, label: "1 misurino", n: [375, 80, 6, 4] },
  { key: "caseina-polvere", name: "Caseina micellare", category: "supplements", image: "glass-of-milk", unit: "g", serving: 30, label: "1 misurino", n: [360, 80, 6, 1.5] },
  { key: "caffe", name: "Caffè espresso", category: "drinks", image: "hot-beverage", unit: "ml", serving: 30, label: "1 tazzina", n: [9, 0.1, 1.7, 0.2] },
];

type RecipeSeed = {
  key: string;
  name: string;
  image: string;
  servings: number;
  label: string | null;
  ingredients: [string, number][];
};

const RECIPES: RecipeSeed[] = [
  { key: "porridge", name: "Porridge avena", image: "bowl-with-spoon", servings: 1, label: "1 ciotola", ingredients: [["avena", 50], ["latte", 200], ["mirtilli", 50], ["miele", 10]] },
  { key: "yogurt-frutta", name: "Yogurt e frutta", image: "blueberries", servings: 1, label: "1 coppa", ingredients: [["yogurt-greco", 170], ["fragole", 80], ["mirtilli", 40]] },
  { key: "pane-uova", name: "Pane e uova", image: "cooking", servings: 1, label: null, ingredients: [["pane-integrale", 60], ["uova", 100], ["olio", 5]] },
  { key: "smoothie", name: "Smoothie proteico", image: "cup-with-straw", servings: 1, label: "1 bicchiere", ingredients: [["latte", 250], ["whey", 30], ["banana", 100]] },
  { key: "pancake", name: "Pancake proteici", image: "pancakes", servings: 1, label: "3 pancake", ingredients: [["albume", 150], ["avena", 40], ["banana", 60], ["miele", 10]] },
  { key: "frutta-mista", name: "Frutta mista", image: "red-apple", servings: 1, label: "1 coppetta", ingredients: [["mela", 80], ["arancia", 80], ["kiwi", 60]] },
  { key: "pollo-riso", name: "Pollo e riso", image: "curry-rice", servings: 1, label: null, ingredients: [["pollo", 130], ["riso", 70], ["zucchine", 150], ["olio", 10]] },
  { key: "pasta-integrale-pomodoro", name: "Pasta integrale", image: "spaghetti", servings: 1, label: "al pomodoro", ingredients: [["pasta-integrale", 80], ["pomodori", 150], ["olio", 10], ["parmigiano", 10]] },
  { key: "tonno-insalata", name: "Tonno e insalata", image: "green-salad", servings: 1, label: null, ingredients: [["tonno", 120], ["insalata", 80], ["pomodori", 120], ["pane-integrale", 50], ["olio", 10]] },
  { key: "pollo-patate", name: "Pollo e patate", image: "poultry-leg", servings: 1, label: null, ingredients: [["pollo", 130], ["patate", 250], ["olio", 10]] },
  { key: "riso-verdure", name: "Riso e verdure", image: "shallow-pan-of-food", servings: 1, label: null, ingredients: [["riso", 70], ["ceci", 80], ["zucchine", 100], ["carote", 80], ["peperoni", 80], ["olio", 10]] },
  { key: "pasta-tonno", name: "Pasta e tonno", image: "spaghetti", servings: 1, label: null, ingredients: [["pasta", 80], ["tonno", 80], ["pomodori", 100], ["olio", 10]] },
  { key: "salmone-quinoa", name: "Salmone e quinoa", image: "sushi", servings: 1, label: null, ingredients: [["salmone", 130], ["quinoa", 60], ["broccoli", 150], ["olio", 5]] },
  { key: "pesce-verdure", name: "Pesce e verdure", image: "fish", servings: 1, label: null, ingredients: [["merluzzo", 200], ["zucchine", 150], ["patate", 150], ["olio", 10]] },
  { key: "tacchino-insalata", name: "Tacchino e insalata", image: "leafy-green", servings: 1, label: null, ingredients: [["tacchino", 150], ["insalata", 80], ["pomodori", 100], ["pane-integrale", 50], ["olio", 10]] },
  { key: "uova-verdure", name: "Uova e verdure", image: "cooking", servings: 1, label: null, ingredients: [["uova", 150], ["zucchine", 100], ["peperoni", 100], ["funghi", 80], ["olio", 5], ["pane-integrale", 40]] },
  { key: "carne-magra", name: "Carne magra", image: "cut-of-meat", servings: 1, label: "con verdure", ingredients: [["manzo", 150], ["broccoli", 150], ["patate-dolci", 150], ["olio", 10]] },
  { key: "salmone-verdure", name: "Salmone e verdure", image: "sushi", servings: 1, label: null, ingredients: [["salmone", 130], ["zucchine", 150], ["carote", 100], ["olio", 5]] },
  { key: "pollo-verdure", name: "Pollo e verdure", image: "poultry-leg", servings: 1, label: null, ingredients: [["pollo", 150], ["broccoli", 150], ["peperoni", 100], ["olio", 10]] },
  { key: "zuppa-verdure", name: "Zuppa di verdure", image: "pot-of-food", servings: 1, label: "1 piatto fondo", ingredients: [["zucchine", 100], ["carote", 100], ["patate", 100], ["fagioli", 100], ["pomodori", 80], ["olio", 10], ["pane-integrale", 40]] },
  { key: "frullato-proteico", name: "Frullato proteico", image: "cup-with-straw", servings: 1, label: "1 bicchiere", ingredients: [["latte", 250], ["whey", 30], ["fragole", 100]] },
  { key: "caseina", name: "Caseina", image: "glass-of-milk", servings: 1, label: "con latte", ingredients: [["caseina-polvere", 30], ["latte", 200]] },
  { key: "gamberi-avocado", name: "Gamberi e avocado", image: "shrimp", servings: 1, label: null, ingredients: [["gamberi", 150], ["avocado", 70], ["insalata", 60], ["pane-integrale", 40], ["olio", 5]] },
  { key: "cornetto-caffe", name: "Cornetto e caffè", image: "croissant", servings: 1, label: null, ingredients: [["cornetto", 50], ["caffe", 30]] },
];

export function buildFoodLibrary(nowIso: string): Food[] {
  const base: Food[] = BASE_FOODS.map((f) => ({
    id: foodId(f.key),
    name: f.name,
    category: f.category,
    kind: "food",
    imageUrl: `/foods/${f.image}.png`,
    unit: f.unit,
    servingSize: f.serving,
    servingLabel: f.label,
    per100: { kcal: f.n[0], protein: f.n[1], carbs: f.n[2], fat: f.n[3] },
    servings: null,
    ingredients: [],
    source: "demo",
    sourceRef: null,
    isCustom: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
  const byId = new Map(base.map((f) => [f.id, f]));
  const recipes: Food[] = RECIPES.map((r) => {
    const ingredients = r.ingredients.map(([key, amount]) => ({ foodId: foodId(key), amount }));
    const computed = computeRecipe(ingredients, byId, r.servings);
    if (computed.missing.length) throw new Error(`Recipe ${r.key} references unknown foods`);
    return {
      id: foodId(r.key),
      name: r.name,
      category: "dishes",
      kind: "recipe",
      imageUrl: `/foods/${r.image}.png`,
      unit: "g",
      servingSize: computed.servingSize,
      servingLabel: r.label,
      per100: computed.per100,
      servings: r.servings,
      ingredients,
      source: "demo",
      sourceRef: null,
      isCustom: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });
  return [...base, ...recipes];
}

/** Bundled 3D food illustrations the coach can pick for custom foods. */
export const FOOD_ICONS = [
  "avocado", "bagel", "baguette-bread", "banana", "beans", "bell-pepper", "bento-box", "blueberries", "bowl-with-spoon",
  "bread", "broccoli", "butter", "canned-food", "carrot", "cheese-wedge", "cherries", "chestnut", "chocolate-bar",
  "coconut", "cooked-rice", "cooking", "croissant", "cucumber", "cup-with-straw", "curry-rice", "cut-of-meat",
  "ear-of-corn", "egg", "falafel", "fish", "glass-of-milk", "grapes", "green-apple", "green-salad", "honey-pot",
  "hot-beverage", "jar", "kiwi-fruit", "leafy-green", "lemon", "mango", "mushroom", "olive", "pancakes", "peach",
  "peanuts", "pear", "pineapple", "pot-of-food", "potato", "poultry-leg", "red-apple", "rice-ball", "roasted-sweet-potato",
  "sandwich", "shallow-pan-of-food", "shrimp", "spaghetti", "steaming-bowl", "strawberry", "stuffed-flatbread", "sushi",
  "tangerine", "teacup-without-handle", "tomato", "waffle", "watermelon",
] as const;
