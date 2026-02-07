import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import HistoryPage from "@/app/[lang]/history/page";

export default async function Page() {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("ui_lang")?.value;
  const acceptLang = (await headers()).get("accept-language") ?? "";
  const prefersZh = cookieLang ? cookieLang === "zh" : acceptLang.toLowerCase().includes("zh");

  if (prefersZh) {
    redirect("/zh/history");
  }

  return <HistoryPage />;
}

