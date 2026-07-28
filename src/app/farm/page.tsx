import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FarmClient, { type CropOption, type PlotView } from "./FarmClient";

interface Crop {
  id: string;
  name: string;
  grow_seconds: number;
  growth_stages: number;
  seed_price: number;
  sell_price: number;
}

interface Planting {
  crop_id: string;
  planted_at: string;
  crops: Crop | Crop[] | null;
}

interface Plot {
  id: string;
  position: number;
  plantings: Planting | Planting[] | null;
}

function getCrop(planting: Planting | null): Crop | null {
  if (!planting) return null;
  return Array.isArray(planting.crops) ? (planting.crops[0] ?? null) : planting.crops;
}

function getPlanting(plot: Plot): Planting | null {
  if (!plot.plantings) return null;
  return Array.isArray(plot.plantings) ? (plot.plantings[0] ?? null) : plot.plantings;
}

function getStage(planting: Planting, crop: Crop) {
  const plantedAt = new Date(planting.planted_at).getTime();
  const elapsedSeconds = (Date.now() - plantedAt) / 1000;
  const stageDuration = crop.grow_seconds / crop.growth_stages;
  const rawStage = Math.floor(elapsedSeconds / stageDuration);
  return Math.min(Math.max(rawStage, 0), crop.growth_stages);
}

function toPlotView(plot: Plot): PlotView {
  const planting = getPlanting(plot);
  const crop = planting ? getCrop(planting) : null;

  if (!planting || !crop) {
    return {
      id: plot.id,
      cropId: null,
      cropName: null,
      stage: 0,
      growthStages: 0,
      ready: false,
      secondsRemaining: 0,
    };
  }

  const stage = getStage(planting, crop);
  const ready = stage >= crop.growth_stages;
  const plantedAt = new Date(planting.planted_at).getTime();
  const elapsedSeconds = (Date.now() - plantedAt) / 1000;
  const secondsRemaining = Math.max(crop.grow_seconds - elapsedSeconds, 0);

  return {
    id: plot.id,
    cropId: crop.id,
    cropName: crop.name,
    stage,
    growthStages: crop.growth_stages,
    ready,
    secondsRemaining,
  };
}

export default async function FarmPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  console.log("[farm] authenticated user id:", user.id);

  const farmQuery = supabase
    .from("farms")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  const { data: farm, error: farmError } = await farmQuery;

  console.log("[farm] farms query -> owner_id =", user.id);
  console.log("[farm] farms result:", { farm, farmError });

  if (farmError) {
    console.error("[farm] error fetching farm:", farmError);
  }

  const { data: plots, error: plotsError } = farm
    ? await supabase
        .from("plots")
        .select(
          "id, position, plantings(crop_id, planted_at, crops(id, name, grow_seconds, growth_stages, seed_price, sell_price))",
        )
        .eq("farm_id", farm.id)
        .order("position")
    : { data: null, error: null };

  console.log("[farm] plots query -> farm_id =", farm?.id);
  console.log("[farm] plots result:", { plots, plotsError });

  if (plotsError) {
    console.error("[farm] error fetching plots:", plotsError);
  }

  const { data: crops, error: cropsError } = await supabase
    .from("crops")
    .select("id, name, grow_seconds, growth_stages, seed_price, sell_price")
    .order("seed_price");

  console.log("[farm] crops result:", { crops, cropsError });
  if (cropsError) {
    console.error("[farm] error fetching crops:", cropsError);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("inventory")
    .eq("id", user.id)
    .maybeSingle();

  console.log("[farm] profile result:", { profile, profileError });
  if (profileError) {
    console.error("[farm] error fetching profile:", profileError);
  }

  const anyError = farmError || plotsError || cropsError || profileError;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My Farm</h1>
          <div className="flex gap-4 text-sm">
            <Link href="/dashboard" className="underline">
              Dashboard
            </Link>
            <Link href="/shop" className="underline">
              Shop
            </Link>
          </div>
        </div>

        {anyError ? (
          <p className="text-red-600 dark:text-red-400">
            Error loading farm data: {anyError.message}
          </p>
        ) : !farm || !plots ? (
          <p className="text-gray-600 dark:text-gray-400">
            No farm found for this account.
          </p>
        ) : (
          <FarmClient
            plots={(plots as Plot[]).map(toPlotView)}
            crops={(crops as CropOption[]) ?? []}
            inventory={(profile?.inventory as Record<string, number>) ?? {}}
          />
        )}
      </div>
    </div>
  );
}
