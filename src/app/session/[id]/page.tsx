import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import SessionPage from "@/app/[lang]/session/[id]/page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("ui_lang")?.value;
  const acceptLang = (await headers()).get("accept-language") ?? "";
  const prefersZh = cookieLang ? cookieLang === "zh" : acceptLang.toLowerCase().includes("zh");

  if (prefersZh) {
    redirect(`/zh/session/${id}`);
  }

  return <SessionPage />;
}

