"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Database, Download, FileText, KeyRound, Languages, LogOut, RotateCcw, Save, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import type { CoachProfile, DataMode } from "@/lib/domain/types";
import { resetDemoDataAction, updateCoachAction } from "@/lib/actions/account";
import { changePasswordAction, signOutAction } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { msg, type Locale } from "@/lib/i18n/core";
import { cn, parseDecimal } from "@/lib/utils";
import { Topbar, PageContainer } from "@/components/shell/topbar";
import { Panel, PanelHeader } from "@/components/common/basics";
import { ImageUpload } from "@/components/common/image-upload";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { useConfirm } from "@/components/common/confirm";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/menus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const intIn = (min: number, max: number, message: string) =>
  z.string().refine((v) => {
    const n = parseDecimal(v);
    return n !== null && Number.isInteger(n) && n >= min && n <= max;
  }, message);

const schema = z.object({
  fullName: z.string().trim().min(1, msg("Inserisci il tuo nome")).max(80, msg("Massimo 80 caratteri")),
  studioName: z.string().trim().max(80, msg("Massimo 80 caratteri")),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || z.email().safeParse(v).success, msg("Email non valida")),
  phone: z.string().trim().max(30, msg("Massimo 30 caratteri")),
  bio: z.string().trim().max(600, msg("Massimo 600 caratteri")),
  avatarUrl: z.string().nullable(),
  defaultSets: intIn(1, 20, msg("Serie tra 1 e 20")),
  defaultReps: z.string().trim().min(1, msg("Inserisci le ripetizioni")).max(12, msg("Massimo 12 caratteri")),
  defaultRestSeconds: z.string(),
  pdfFooter: z.string().trim().max(300, msg("Massimo 300 caratteri")),
});
type Values = z.infer<typeof schema>;

const REST_OPTIONS = [30, 45, 60, 75, 90, 120, 150, 180, 240];

function toValues(c: CoachProfile): Values {
  return {
    fullName: c.fullName,
    studioName: c.studioName ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    bio: c.bio ?? "",
    avatarUrl: c.avatarUrl,
    defaultSets: String(c.defaultSets),
    defaultReps: c.defaultReps,
    defaultRestSeconds: String(c.defaultRestSeconds),
    pdfFooter: c.pdfFooter ?? "",
  };
}

interface Props {
  coach: CoachProfile;
  locale: Locale;
  account: { email: string; provider: "supabase" | "local" | "none"; demoCredentials: boolean };
  data: { mode: DataMode; host: string | null };
}

const SECTIONS = [
  { id: "profilo", label: msg("Profilo coach"), icon: UserRound },
  { id: "preferenze", label: msg("Preferenze schede"), icon: SlidersHorizontal },
  { id: "lingua", label: msg("Lingua"), icon: Languages },
  { id: "account", label: msg("Account e accesso"), icon: ShieldCheck },
  { id: "dati", label: msg("Dati"), icon: Database },
] as const;

export function SettingsView({ coach, locale, account, data }: Props) {
  const { t, fmt } = useI18n();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(coach) });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  const onSubmit = async (v: Values) => {
    const res = await updateCoachAction({
      fullName: v.fullName,
      studioName: v.studioName || null,
      email: v.email || null,
      phone: v.phone || null,
      bio: v.bio || null,
      avatarUrl: v.avatarUrl,
      defaultSets: Number(parseDecimal(v.defaultSets)),
      defaultReps: v.defaultReps,
      defaultRestSeconds: Number(v.defaultRestSeconds),
      pdfFooter: v.pdfFooter || null,
    });
    if (!res.ok) {
      for (const [path, message] of Object.entries(res.fieldErrors ?? {})) if (path in v) setError(path as keyof Values, { message });
      toast.error(res.error);
      return;
    }
    reset(toValues(res.data));
    toast.success(t("Impostazioni salvate"));
  };

  const restLabel = (s: number) => (s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)}′${String(s % 60).padStart(2, "0")}″` : `${s / 60}′`);
  const restOptions = React.useMemo(() => {
    const set = new Set([...REST_OPTIONS, coach.defaultRestSeconds]);
    return [...set].sort((a, b) => a - b).map((s) => ({ value: String(s), label: restLabel(s) }));
  }, [coach.defaultRestSeconds]);

  return (
    <>
      <Topbar
        title={t("Impostazioni")}
        actions={
          <Button type="submit" form="settings-form" loading={isSubmitting} disabled={!isDirty} className="max-sm:hidden">
            {!isSubmitting && <Save />} {t("Salva modifiche")}
          </Button>
        }
      />
      <PageContainer>
        <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,820px)]">
          <nav aria-label={t("Sezioni impostazioni")} className="max-lg:hidden lg:sticky lg:top-[84px]">
            <ul className="flex flex-col gap-0.5">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground">
                    <s.icon className="size-[18px] text-muted-foreground" />
                    {t(s.label)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex min-w-0 flex-col gap-5">
            <form id="settings-form" onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
              {/* ------------------------------ profile ------------------------------ */}
              <Panel id="profilo" className="scroll-mt-24">
                <PanelHeader title={t("Profilo coach")} description={t("Nome e contatti compaiono nella dashboard e nei PDF che consegni ai clienti.")} />
                <div className="grid gap-5 px-5 pb-6 md:grid-cols-[auto_minmax(0,1fr)] md:px-6">
                  <Controller
                    control={control}
                    name="avatarUrl"
                    render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} folder="avatars" shape="circle" label={t("Carica foto")} />}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("Nome e cognome")} htmlFor="fullName" error={errors.fullName?.message}>
                      <Input id="fullName" autoComplete="name" {...register("fullName")} aria-invalid={Boolean(errors.fullName)} />
                    </Field>
                    <Field label={t("Nome dello studio")} htmlFor="studioName" error={errors.studioName?.message} optional>
                      <Input id="studioName" placeholder={t("Es. Forma Studio")} {...register("studioName")} />
                    </Field>
                    <Field label={t("Email")} htmlFor="coachEmail" error={errors.email?.message} optional>
                      <Input id="coachEmail" type="email" autoComplete="email" {...register("email")} aria-invalid={Boolean(errors.email)} />
                    </Field>
                    <Field label={t("Telefono")} htmlFor="phone" error={errors.phone?.message} optional>
                      <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
                    </Field>
                    <Field label={t("Presentazione")} htmlFor="bio" error={errors.bio?.message} optional className="sm:col-span-2">
                      <Textarea id="bio" rows={3} placeholder={t("Specializzazioni, certificazioni, approccio…")} {...register("bio")} />
                    </Field>
                  </div>
                </div>
              </Panel>

              {/* ---------------------------- preferences ---------------------------- */}
              <Panel id="preferenze" className="scroll-mt-24">
                <PanelHeader title={t("Preferenze schede")} description={t("Valori proposti quando aggiungi un esercizio a una scheda.")} />
                <div className="grid gap-4 px-5 pb-6 sm:grid-cols-3 md:px-6">
                  <Field label={t("Serie predefinite")} htmlFor="defaultSets" error={errors.defaultSets?.message}>
                    <Input id="defaultSets" inputMode="numeric" {...register("defaultSets")} aria-invalid={Boolean(errors.defaultSets)} />
                  </Field>
                  <Field label={t("Ripetizioni predefinite")} htmlFor="defaultReps" error={errors.defaultReps?.message} hint={t("Es. 10 oppure 8-12")}>
                    <Input id="defaultReps" {...register("defaultReps")} aria-invalid={Boolean(errors.defaultReps)} />
                  </Field>
                  <Field label={t("Recupero predefinito")} htmlFor="defaultRest">
                    <Controller
                      control={control}
                      name="defaultRestSeconds"
                      render={({ field }) => <Select id="defaultRest" value={field.value} onValueChange={field.onChange} options={restOptions} />}
                    />
                  </Field>
                  <Field
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="size-3.5" /> {t("Piè di pagina dei PDF")}
                      </span>
                    }
                    htmlFor="pdfFooter"
                    error={errors.pdfFooter?.message}
                    hint={t("Compare in fondo a schede e piani esportati. Es. contatti, sito o disclaimer.")}
                    optional
                    className="sm:col-span-3"
                  >
                    <Textarea id="pdfFooter" rows={2} {...register("pdfFooter")} />
                  </Field>
                </div>
              </Panel>
            </form>

            {/* ------------------------------ language ------------------------------ */}
            <Panel id="lingua" className="scroll-mt-24">
              <PanelHeader title={t("Lingua")} description={t("L'italiano è la lingua predefinita. La scelta vale per questo browser.")} />
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-6 md:px-6">
                <LanguageSwitcher locale={locale} />
                <p className="text-[12.5px] text-muted-foreground">{t("Date e numeri seguono la lingua scelta: {sample}", { sample: `${fmt.dayKey("2026-03-14", { day: "numeric", month: "long" })} · ${fmt.number(72.5, 1)} kg` })}</p>
              </div>
            </Panel>

            {/* ------------------------------ account ------------------------------- */}
            <AccountPanel account={account} />

            {/* -------------------------------- data -------------------------------- */}
            <DataPanel data={data} />

            {/* mobile save bar */}
            {isDirty && (
              <div className="sticky bottom-[84px] z-10 flex justify-end sm:hidden">
                <Button type="submit" form="settings-form" loading={isSubmitting} className="shadow-pop">
                  {!isSubmitting && <Save />} {t("Salva modifiche")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </>
  );
}

function AccountPanel({ account }: { account: Props["account"] }) {
  const { t } = useI18n();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const supabase = account.provider === "supabase";
  const open = account.provider === "none";

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 10) return setError(t("La password deve avere almeno 10 caratteri."));
    if (password !== confirmPassword) return setError(t("Le password non coincidono."));
    setError(null);
    startTransition(async () => {
      const res = await changePasswordAction({ password });
      if (!res.ok) return void setError(res.error ?? t("Impossibile aggiornare la password. Riprova."));
      setPassword("");
      setConfirmPassword("");
      toast.success(t("Password aggiornata"));
    });
  };

  return (
    <Panel id="account" className="scroll-mt-24">
      <PanelHeader
        title={t("Account e accesso")}
        description={t("Solo il coach accede all'app: i clienti ricevono schede e piani in PDF, senza account.")}
        actions={
          !open && (
          <form action={signOutAction}>
            <Button type="submit" variant="destructive-ghost" size="sm">
              <LogOut /> {t("Esci")}
            </Button>
          </form>
          )
        }
      />
      <div className="flex flex-col gap-5 px-5 pb-6 md:px-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/70 p-4">
          <span className="grid size-10 place-items-center rounded-xl bg-card text-forest shadow-card">
            <KeyRound className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14.5px] font-semibold">{account.email}</div>
            <div className="text-[12.5px] text-muted-foreground">
              {open ? t("Accesso senza login (REQUIRE_LOGIN non attivo)") : supabase ? t("Supabase Auth · email e password") : account.demoCredentials ? t("Accesso demo con credenziali di prova") : t("Accesso locale (COACH_EMAIL / COACH_PASSWORD)")}
            </div>
          </div>
          <Badge variant={open ? "neutral" : supabase ? "success" : account.demoCredentials ? "warning" : "info"} dot>
            {open ? t("Login disattivato") : supabase ? "Supabase" : account.demoCredentials ? t("Demo") : t("Locale")}
          </Badge>
        </div>

        {supabase ? (
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
            <Field label={t("Nuova password")} htmlFor="newPassword" hint={t("Almeno 10 caratteri.")}>
              <Input id="newPassword" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Field label={t("Conferma password")} htmlFor="confirmPassword">
              <Input id="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </Field>
            <Button type="submit" variant="secondary" loading={pending} disabled={!password} className={cn("sm:mb-[22px]")}>
              {t("Cambia password")}
            </Button>
            {error && (
              <p role="alert" className="text-[13px] font-medium text-destructive sm:col-span-3">
                {error}
              </p>
            )}
          </form>
        ) : (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {open
              ? t("Il login è disattivato: chiunque abbia il link può aprire l'app. Per attivarlo imposta REQUIRE_LOGIN=true nelle variabili d'ambiente.")
              : account.demoCredentials
              ? t("Stai usando le credenziali demo. Prima di pubblicare l'app imposta COACH_EMAIL, COACH_PASSWORD e AUTH_SECRET nelle variabili d'ambiente, oppure collega Supabase Auth.")
              : t("Le credenziali sono definite dalle variabili d'ambiente COACH_EMAIL e COACH_PASSWORD: modificale lì e riavvia l'app.")}
          </p>
        )}
      </div>
    </Panel>
  );
}

function DataPanel({ data }: { data: Props["data"] }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const [pending, startTransition] = React.useTransition();
  const demo = data.mode === "demo";

  const resetDemo = async () => {
    const ok = await confirm({
      title: t("Ripristinare i dati demo?"),
      description: t("Clienti, schede, piani e progressi torneranno ai dati di esempio. Le modifiche fatte andranno perse."),
      confirmLabel: t("Ripristina dati"),
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await resetDemoDataAction();
      if (!res.ok) toast.error(res.error);
      else toast.success(t("Dati demo ripristinati"));
    });
  };

  return (
    <Panel id="dati" className="scroll-mt-24">
      <PanelHeader title={t("Dati")} description={t("Dove sono salvati i dati e come esportarli.")} />
      <div className="flex flex-col gap-4 px-5 pb-6 md:px-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/70 p-4">
          <span className="grid size-10 place-items-center rounded-xl bg-card text-forest shadow-card">
            <Database className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-semibold">{demo ? t("Modalità demo") : t("Database Supabase")}</div>
            <div className="text-[12.5px] text-muted-foreground">
              {demo ? t("Dati di esempio salvati in locale nella cartella .demo-data. Collega Supabase per l'uso reale.") : t("Progetto collegato: {host}", { host: data.host ?? "—" })}
            </div>
          </div>
          <Badge variant={demo ? "warning" : "success"} dot>
            {demo ? t("Demo") : t("Collegato")}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href="/api/export" download>
              <Download /> {t("Esporta tutti i dati (JSON)")}
            </a>
          </Button>
          {demo && (
            <Button variant="destructive-ghost" onClick={resetDemo} loading={pending}>
              {!pending && <RotateCcw />} {t("Ripristina dati demo")}
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}
