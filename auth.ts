import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { encode as defaultJwtEncode } from "@auth/core/jwt";
import type { JWTEncodeParams } from "@auth/core/jwt";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { authenticateEmailPassword } from "@/lib/email-password-login";
import { PLAN_FREE } from "@/constants/plan";

function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * セッション JWT の寿命（秒）。この時間以上リクエストが無いとログアウト相当になる（rolling）。
 * 環境変数: AUTH_SESSION_MAX_AGE_SEC
 */
const SESSION_MAX_AGE = parsePositiveIntEnv(
  "AUTH_SESSION_MAX_AGE_SEC",
  60 * 60 * 24 * 30,
);

/**
 * JWT の rolling を抑える間隔（秒）。この時間より短い間隔のリクエストではセッション期限を延長しない。
 * Auth.js の JWT 戦略は本来 session.updateAge を無視するため、jwt.encode をラップして反映する。
 * 環境変数: AUTH_SESSION_UPDATE_AGE_SEC
 */
const SESSION_UPDATE_AGE = parsePositiveIntEnv(
  "AUTH_SESSION_UPDATE_AGE_SEC",
  60 * 60,
);

const AUTH_LAST_ROLL = "auth_last_roll" as const;

async function jwtEncodeWithThrottledRoll(params: JWTEncodeParams) {
  const { token = {}, maxAge: configuredMaxAge, ...rest } = params;
  const maxAge = configuredMaxAge ?? SESSION_MAX_AGE;
  const nowSec = Math.floor(Date.now() / 1000);
  const t = token as Record<string, unknown>;
  const lastRollRaw = t[AUTH_LAST_ROLL];
  const lastRoll =
    typeof lastRollRaw === "number" && Number.isFinite(lastRollRaw)
      ? lastRollRaw
      : nowSec;
  const existingExp = typeof t.exp === "number" ? t.exp : undefined;

  let effectiveMaxAge = maxAge;
  if (
    existingExp != null &&
    existingExp > nowSec &&
    nowSec - lastRoll < SESSION_UPDATE_AGE
  ) {
    effectiveMaxAge = Math.max(1, existingExp - nowSec);
  } else {
    t[AUTH_LAST_ROLL] = nowSec;
    effectiveMaxAge = maxAge;
  }

  return defaultJwtEncode({
    ...rest,
    token: t,
    maxAge: effectiveMaxAge,
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: {
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  jwt: {
    encode: jwtEncodeWithThrottledRoll,
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
        const result = await authenticateEmailPassword(supabase, email, password);
        if (!result.ok) return null;

        return {
          id: result.user?.id ?? "",
          email: result.user?.email ?? "",
          name: result.user?.name ?? null,
        };
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
        token.authProvider = account.provider;
        if (account.provider === "google") {
          // Google の安定した sub をユーザー ID として固定する
          token.sub = account.providerAccountId;
          token.googleReauthAt = Math.floor(Date.now() / 1000);
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
      if (session.user && typeof token.authProvider === "string") {
        session.user.authProvider = token.authProvider;
      }
      if (typeof token.googleReauthAt === "number") {
        (session as { googleReauthAt?: number }).googleReauthAt = token.googleReauthAt;
      }
      // コア実装は常に「今から maxAge」を返すが、updateAge 抑制時は JWT の exp とずれるため実際の期限を使う
      if (typeof token.exp === "number") {
        (session as { expires: string }).expires = new Date(
          token.exp * 1000,
        ).toISOString();
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
    googleReauthAt?: number;
    user: {
      id: string;
      authProvider?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
