import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ShopClient from "./ShopClient";

export interface Crop {
  id: string;
  name: string;
  grow_seconds: number;
  growth_stages: number;
  seed_price: number;
  sell_price: number;
}

export default async function ShopPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: crops, error: cropsError } = await supabase
    .from("crops")
    .select("id, name, grow_seconds, growth_stages, seed_price, sell_price")
    .order("seed_price");

  console.log("[shop] crops result:", { crops, cropsError });
  if (cropsError) {
    console.error("[shop] error fetching crops:", cropsError);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("currency, inventory")
    .eq("id", user.id)
    .maybeSingle();

  console.log("[shop] profile query -> id =", user.id);
  console.log("[shop] profile result:", { profile, profileError });
  if (profileError) {
    console.error("[shop] error fetching profile:", profileError);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Shop</h1>
          <div className="flex gap-4 text-sm">
            <Link href="/dashboard" className="underline">
              Dashboard
            </Link>
            <Link href="/farm" className="underline">
              Farm
            </Link>
          </div>
        </div>

        {cropsError || profileError ? (
          <p className="text-red-600 dark:text-red-400">
            Error loading shop data:{" "}
            {(cropsError ?? profileError)?.message}
          </p>
        ) : (
          <ShopClient
            crops={(crops as Crop[]) ?? []}
            initialCurrency={profile?.currency ?? 0}
            initialInventory={(profile?.inventory as Record<string, number>) ?? {}}
          />
        )}
      </div>
    </div>
  );
}
