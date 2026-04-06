import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { getSafeInternalPath } from "@/lib/safe-callback-url";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const afterLogin = getSafeInternalPath(params.callbackUrl) ?? "/journal";

  const session = await auth();
  if (session?.user?.id) {
    redirect(afterLogin);
  }

  return (
    <div className="min-h-screen bg-background">
      <SignInPanel callbackUrl={afterLogin} />
    </div>
  );
}
