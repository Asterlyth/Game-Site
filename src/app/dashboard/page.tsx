import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import SpriteAnimation from "@/components/SpriteAnimation";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center justify-center gap-3">
          <SpriteAnimation
            src="/sprites/test-bounce.png"
            frameCount={4}
            frameWidth={48}
            frameHeight={48}
            frameDuration={150}
          />
          <p className="text-gray-600 dark:text-gray-400">
            Logged in as <span className="font-medium">{user.email}</span>
          </p>
        </div>
        <Link
          href="/farm"
          className="block rounded-md bg-black dark:bg-white text-white dark:text-black py-2 text-sm font-medium hover:opacity-90"
        >
          Go to my farm
        </Link>
        <Link
          href="/shop"
          className="block rounded-md border border-gray-300 dark:border-gray-700 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-900"
        >
          Go to shop
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
