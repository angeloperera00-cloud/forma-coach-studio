import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { LegalPage, type LegalText } from "@/components/auth/legal-page";

const IT: LegalText = {
  title: "Termini di servizio",
  updated: "Ultimo aggiornamento: novembre 2026",
  intro: "Usando Forma accetti questi termini. Forma è destinato ai coach autorizzati dal titolare dello studio.",
  sections: [
    {
      heading: "Accesso",
      body: [
        "L'accesso è riservato ai coach approvati. Accedere con Google, Facebook, Apple, email o telefono non dà automaticamente accesso ai dati: serve l'approvazione o l'invito del titolare.",
        "Sei responsabile della riservatezza delle tue credenziali e delle attività svolte con il tuo account.",
      ],
    },
    {
      heading: "Contenuti",
      body: [
        "Schede di allenamento e piani alimentari sono preparati dal coach. I valori nutrizionali della libreria iniziale sono indicativi e vanno verificati.",
      ],
    },
    {
      heading: "Sospensione",
      body: ["Il titolare dello studio può disattivare un account in qualsiasi momento, ad esempio in caso di uso improprio."],
    },
  ],
  back: "Torna all'accesso",
  note: "Testo di esempio: adattalo alla tua attività prima di pubblicare il sito.",
};

const EN: LegalText = {
  title: "Terms of Service",
  updated: "Last updated: November 2026",
  intro: "By using Forma you accept these terms. Forma is intended for coaches authorized by the studio owner.",
  sections: [
    {
      heading: "Access",
      body: [
        "Access is limited to approved coaches. Signing in with Google, Facebook, Apple, email or phone does not grant access to data by itself: the studio owner must approve or invite you.",
        "You are responsible for keeping your credentials confidential and for activity carried out with your account.",
      ],
    },
    {
      heading: "Content",
      body: ["Workout plans and meal plans are prepared by the coach. Nutrition values in the starter library are indicative and should be verified."],
    },
    {
      heading: "Suspension",
      body: ["The studio owner may disable an account at any time, for example in case of misuse."],
    },
  ],
  back: "Back to sign in",
  note: "Sample text: adapt it to your business before going live.",
};

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return { title: (locale === "en" ? EN : IT).title };
}

export default async function TermsPage() {
  const { locale } = await getI18n();
  return <LegalPage locale={locale} text={locale === "en" ? EN : IT} />;
}
