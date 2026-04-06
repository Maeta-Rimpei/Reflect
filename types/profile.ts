import type { Plan } from "@/types/plan";

/** サーバー側で取得するユーザープロフィール（plan / email / name） */
export interface ServerProfile {
  plan: Plan;
  email: string | null;
  name: string | null;
}
