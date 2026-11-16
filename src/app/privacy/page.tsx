import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { LegalPage, type LegalText } from "@/components/auth/legal-page";

const IT: LegalText = {
  title: "Informativa sulla privacy",
  updated: "Ultimo aggiornamento: novembre 2026",
  intro: "Forma è uno strumento riservato ai coach per gestire clienti, schede di allenamento e piani alimentari. Questa informativa spiega quali dati trattiamo e perché.",
  sections: [
    {
      heading: "Dati dei coach",
      body: [
        "Per l'accesso trattiamo email, numero di telefono, nome utente e, se usi Google, Facebook o Apple, l'identificativo e l'email forniti dal provider. Non riceviamo mai le password dei tuoi account Google, Facebook o Apple.",
        "Con Accedi con Apple puoi nascondere la tua email: in quel caso riceviamo un indirizzo di inoltro privato di Apple.",
      ],
    },
    {
      heading: "Dati dei clienti",
      body: [
        "I coach inseriscono dati dei propri clienti (anagrafica, obiettivi, misure, appuntamenti, schede e piani). Ogni coach vede solo i propri dati. Il coach è responsabile del consenso dei propri clienti.",
      ],
    },
    {
      heading: "Conservazione e sicurezza",
      body: [
        "I dati sono salvati su Supabase (database PostgreSQL) con accesso protetto per singolo coach. Puoi esportare tutti i tuoi dati da Impostazioni → Dati e chiederne la cancellazione al titolare dello studio.",
      ],
    },
    {
      heading: "Contatti",
      body: ["Per domande sulla privacy scrivi al titolare dello studio all'indirizzo indicato nel profilo coach."],
    },
  ],
  back: "Torna all'accesso",
  note: "Testo di esempio: adattalo alla tua attività e verifica i requisiti GDPR con un consulente.",
};

const EN: LegalText = {
  title: "Privacy Policy",
  updated: "Last updated: November 2026",
  intro: "Forma is a coach-only tool to manage clients, workout plans and meal plans. This policy explains which data we process and why.",
  sections: [
    {
      heading: "Coach data",
      body: [
        "To sign you in we process your email, phone number, username and, if you use Google, Facebook or Apple, the identifier and email provided by that service. We never receive your Google, Facebook or Apple passwords.",
        "With Sign in with Apple you can hide your email: in that case we receive a private Apple relay address.",
      ],
    },
    {
      heading: "Client data",
      body: [
        "Coaches enter their clients' data (personal details, goals, measurements, appointments, workouts and meal plans). Each coach only sees their own data. Coaches are responsible for their clients' consent.",
      ],
    },
    {
      heading: "Storage and security",
      body: [
        "Data is stored in Supabase (PostgreSQL) with per-coach access control. You can export all your data from Settings → Data and ask the studio owner to delete it.",
      ],
    },
    {
      heading: "Contact",
      body: ["For privacy questions, contact the studio owner at the address shown in the coach profile."],
    },
  ],
  back: "Back to sign in",
  note: "Sample text: adapt it to your business and check GDPR requirements with an advisor.",
};

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return { title: (locale === "en" ? EN : IT).title };
}

export default async function PrivacyPage() {
  const { locale } = await getI18n();
  return <LegalPage locale={locale} text={locale === "en" ? EN : IT} />;
}
