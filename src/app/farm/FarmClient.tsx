"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatGrowTime } from "@/lib/formatGrowTime";

export interface CropOption {
  id: string;
  name: string;
  grow_seconds: number;
}

export interface PlotView {
  id: string;
  cropId: string | null;
  cropName: string | null;
  stage: number;
  growthStages: number;
  ready: boolean;
  secondsRemaining: number;
}

interface FarmClientProps {
  plots: PlotView[];
  crops: CropOption[];
  inventory: Record<string, number>;
}

interface PlantResult {
  inventory: Record<string, number>;
}

type PlotStatus =
  | { state: "idle" }
  | { state: "busy" }
  | { state: "error"; message: string }
  | { state: "info"; message: string };

export default function FarmClient({ plots, crops, inventory }: FarmClientProps) {
  const supabase = createClient();
  const router = useRouter();

  const [modalPlotId, setModalPlotId] = useState<string | null>(null);
  const [inventoryState, setInventoryState] = useState(inventory);
  const [statuses, setStatuses] = useState<Record<string, PlotStatus>>({});

  function setStatus(plotId: string, status: PlotStatus, autoClearMs?: number) {
    setStatuses((s) => ({ ...s, [plotId]: status }));
    if (autoClearMs) {
      setTimeout(() => {
        setStatuses((s) => ({ ...s, [plotId]: { state: "idle" } }));
      }, autoClearMs);
    }
  }

  async function handlePlant(plotId: string, cropId: string) {
    setModalPlotId(null);
    setStatus(plotId, { state: "busy" });

    const { data, error } = await supabase.rpc("plant_seed", {
      plot_id: plotId,
      crop_id: cropId,
    });

    console.log("[farm] plant_seed result:", { plotId, cropId, data, error });

    if (error) {
      console.error("[farm] error planting seed:", error);
      setStatus(plotId, { state: "error", message: error.message }, 4000);
      return;
    }

    const result = data as PlantResult;
    setInventoryState(result.inventory);
    setStatus(plotId, { state: "idle" });
    router.refresh();
  }

  async function handleHarvest(plotId: string) {
    setStatus(plotId, { state: "busy" });

    const { data, error } = await supabase.rpc("harvest_plot", {
      plot_id: plotId,
    });

    console.log("[farm] harvest_plot result:", { plotId, data, error });

    if (error) {
      console.error("[farm] error harvesting plot:", error);
      setStatus(plotId, { state: "error", message: error.message }, 4000);
      return;
    }

    setStatus(plotId, { state: "idle" });
    router.refresh();
  }

  function handlePlotClick(plot: PlotView) {
    if (statuses[plot.id]?.state === "busy") return;

    if (!plot.cropId) {
      setModalPlotId(plot.id);
      return;
    }

    if (plot.ready) {
      handleHarvest(plot.id);
      return;
    }

    setStatus(
      plot.id,
      {
        state: "info",
        message: `Not ready yet — ${formatGrowTime(plot.secondsRemaining)} remaining`,
      },
      3000,
    );
  }

  const availableSeeds = crops.filter((c) => (inventoryState[c.id] ?? 0) >= 1);
  const modalPlot = plots.find((p) => p.id === modalPlotId) ?? null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {plots.map((plot) => {
          const status = statuses[plot.id] ?? { state: "idle" };
          const busy = status.state === "busy";

          let tileClasses =
            "aspect-square w-full rounded border p-1 flex flex-col items-center justify-center text-center text-xs font-medium disabled:cursor-not-allowed ";

          if (!plot.cropId) {
            tileClasses += "border-amber-900/40 bg-amber-800 text-amber-200";
          } else if (plot.ready) {
            tileClasses += "bg-yellow-400 border-yellow-600 text-yellow-950";
          } else {
            tileClasses += "bg-green-500 border-green-700 text-green-950";
          }

          return (
            <div key={plot.id} className="space-y-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => handlePlotClick(plot)}
                className={tileClasses}
              >
                {!plot.cropId ? (
                  <span>{busy ? "..." : "empty"}</span>
                ) : (
                  <>
                    <span>{plot.cropName}</span>
                    <span>
                      {busy
                        ? "..."
                        : plot.ready
                          ? "READY"
                          : `Stage ${plot.stage}/${plot.growthStages}`}
                    </span>
                  </>
                )}
              </button>

              {status.state === "error" && (
                <p className="text-[10px] text-red-600 dark:text-red-400 text-center">
                  {status.message}
                </p>
              )}
              {status.state === "info" && (
                <p className="text-[10px] text-gray-600 dark:text-gray-400 text-center">
                  {status.message}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {modalPlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setModalPlotId(null)}
        >
          <div
            className="w-full max-w-sm space-y-3 rounded border border-gray-300 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Plant a seed</h2>
              <button
                type="button"
                onClick={() => setModalPlotId(null)}
                className="text-sm underline"
              >
                Close
              </button>
            </div>

            {availableSeeds.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You have no seeds —{" "}
                <Link href="/shop" className="underline">
                  visit the shop
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-2">
                {availableSeeds.map((crop) => (
                  <li key={crop.id}>
                    <button
                      type="button"
                      onClick={() => handlePlant(modalPlot.id, crop.id)}
                      className="flex w-full items-center justify-between rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      <span>
                        {crop.name} ({inventoryState[crop.id]})
                      </span>
                      <span className="text-gray-500">
                        {formatGrowTime(crop.grow_seconds)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
