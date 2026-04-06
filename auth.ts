import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { verifyPassword } from "@/lib/password";
import { PLAN_FREE } from "@/constants/plan";

/** セッション全体の有効期限（リフレッシュトークン相当）= 30日 */
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
/** JWT の更新間隔（アクセストークン相当）= 1時間。この間隔で次のリクエスト時に JWT が再発行される */
const SESSION_UPDATE_AGE = 60 * 60;

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: {
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),

    /** メール + パスワードでログイン */
    Credentials({
      id: "email-password",
      name: "Email & Password",
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials as { email?: string })?.email
          ?.trim()
          .toLowerCase();
        const password = (credentials as { password?: string })?.password;

        if (!email || !password || !isSupabaseAdminConfigured()) return null;

        const supabase = createSupabaseAdminClient();

        const { data: user } = await supabase
          .from("users")
          .select("id, email, name, password_hash, email_verified, deleted_at")
          .eq("email", email)
          .single();

        if (!user || !user.password_hash) return null;

        // 論理削除済みはログイン不可
        if ((user as { deleted_at?: string | null }).deleted_at) return null;
        // メール未認証はログイン不可
        if (user.email_verified === false) return null;

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),

    /** Magic Link トークンでログイン（メール認証フロー用） */
    Credentials({
      id: "magic-link",
      name: "Magic Link",
      credentials: {
        token: { type: "text" },
      },
      async authorize(credentials) {
        const token = (credentials as { token?: string })?.token;
        if (!token || !isSupabaseAdminConfigured()) return null;

        const supabase = createSupabaseAdminClient();

        // トークンの検証
        const { data: tokenRow } = await supabase
          .from("magic_link_tokens")
          .select("id, email, expires_at")
          .eq("token", token)
          .single();

        if (!tokenRow) return null;

        // 有効期限チェック
        if (new Date(tokenRow.expires_at) < new Date()) {
          await supabase
            .from("magic_link_tokens")
            .delete()
            .eq("id", tokenRow.id);
          return null;
        }

        // 使用済みトークンを削除
        await supabase
          .from("magic_link_tokens")
          .delete()
          .eq("id", tokenRow.id);

        const email = tokenRow.email;

        // ユーザーを検索し、email_verified を true にする
        const { data: existingUser } = await supabase
          .from("users")
          .select("id, name, email, deleted_at")
          .eq("email", email)
          .single();

        if (existingUser) {
          // 論理削除済みはログイン不可
          if ((existingUser as { deleted_at?: string | null }).deleted_at) return null;
          await supabase
            .from("users")
            .update({ email_verified: true, updated_at: new Date().toISOString() })
            .eq("id", existingUser.id);
          return {
            id: existingUser.id,
            email,
            name: existingUser.name,
          };
        }

        // ユーザーが見つからない（通常ないがフォールバック）
        const newId = crypto.randomUUID();
        await supabase.from("users").insert({
          id: newId,
          email,
          email_verified: true,
          plan: PLAN_FREE,
        });

        return { id: newId, email, name: null };
      },
    }),
  ],
  callbacks: {
    jwt({ token, account, user }) {
      // middleware(getToken) でメールを参照するため JWT に保持する
      if (user?.email) {
        token.email = user.email;
      }
      if (user?.name !== undefined) {
        token.name = user.name;
      }
      if (account) {
        if (account.provider === "google") {
          // Google の安定した sub をユーザー ID として固定する
          token.sub = account.providerAccountId;
        } else if (user?.id) {
          // email-password / magic-link: authorize で返したユーザー ID を使う
          token.sub = user.id;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
