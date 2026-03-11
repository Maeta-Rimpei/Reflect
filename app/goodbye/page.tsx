import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { GoodbyeContent } from "@/components/goodbye-content";

/**
 * 退会完了ページ。退会 API 成功時に付与される Cookie がある場合のみ表示する。
 * 直接 URL でアクセスした場合はトップへリダイレクトする。
 */
export default async function GoodbyePage() {
  const cookieStore = await cookies();
  if (!cookieStore.get("withdrawal_complete")?.value) {
    redirect("/");
  }

  return <GoodbyeContent />;
}
