import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { getRepository } from "@/lib/data";
import { FoodLibraryView } from "@/components/library/food-library-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Libreria alimenti") };
}

export default async function FoodsPage() {
  const foods = await getRepository().listFoods();
  return <FoodLibraryView foods={foods} />;
}
