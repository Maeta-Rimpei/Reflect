import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInPanel } from "@/components/auth/sign-in-panel";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/journal");
  }
  return (
    <div className="min-h-screen bg-background">
      <SignInPanel />
    </div>
  );
}
