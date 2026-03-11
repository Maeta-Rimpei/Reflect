/** サーバー側で取得するユーザープロフィール（plan / email / name） */
export interface ServerProfile {
  plan: "free" | "deep";
  email: string | null;
  name: string | null;
}
