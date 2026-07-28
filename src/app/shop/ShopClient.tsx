"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatGrowTime } from "@/lib/formatGrowTime";
import type { Crop } from "./page";

interface ShopClientProps {
  crops: Crop[];
  initialCurrency: number;
  initialInventory: Record<string, number>;
}

interface BuyResult {
  currency: number;
  inventory: Record<string, number>;
}

type CropStatus =
  | { state: "idle" }
  | { state: "buying" }
  | { state: "error"; message: string }
  | { state: "success" };

export default function ShopClient({
  crops,
  initialCurrency,
  initialInventory,
}: ShopClientProps) {
  const supabase = createClient();
  const [currency, setCurrency] = useState(initialCurrency);
  const [inventory, setInventory] = useState(initialInventory);
  const [statuses, setStatuses] = useState<Record<string, CropStatus>>({});

  async function handleBuy(crop: Crop) {
    if (currency < crop.seed_price) {
      setStatuses((s) => ({
        ...s,
        [crop.id]: {
          state: "error",
          message: `Not enough currency (need ${crop.seed_price}, have ${currency}).`,
        },
      }));
      return;
    }

    setStatuses((s) => ({ ...s, [crop.id]: { state: "buying" } }));

    const { data, error } = await supabase.rpc("buy_seed", {
      crop_id: crop.id,
    });

    console.log("[shop] buy_seed result:", { crop_id: crop.id, data, error });

    if (error) {
      console.error("[shop] error buying seed:", error);
      setStatuses((s) => ({
        ...s,
        [crop.id]: { state: "error", message: error.message },
      }));
      return;
    }

    const result = data as BuyResult;
    setCurrency(result.currency);
    setInventory(result.inventory);
    setStatuses((s) => ({ ...s, [crop.id]: { state: "success" } }));

    setTimeout(() => {
      setStatuses((s) => ({ ...s, [crop.id]: { state: "idle" } }));
    }, 2000);
  }

  const inventoryEntries = Object.entries(inventory).filter(([, qty]) => qty > 0);

  return (
    <div className="space-y-6">
      <div className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Currency</p>
        <p className="text-3xl font-bold">{currency}</p>
      </div>

      <div className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <p className="text-sm font-medium mb-2">Inventory</p>
        {inventoryEntries.length === 0 ? (
          <p className="text-sm text-gray-500">No seeds yet.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {inventoryEntries.map(([cropId, qty]) => {
              const crop = crops.find((c) => c.id === cropId);
              return (
                <li key={cropId}>
                  {crop?.name ?? cropId}: {qty}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {crops.map((crop) => {
          const status = statuses[crop.id] ?? { state: "idle" };
          return (
            <div
              key={crop.id}
              className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-1"
            >
              <p className="font-semibold">{crop.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Seed price: {crop.seed_price}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sell price: {crop.sell_price}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Grow time: {formatGrowTime(crop.grow_seconds)}
              </p>

              <button
                type="button"
                onClick={() => handleBuy(crop)}
                disabled={status.state === "buying"}
                className="mt-2 w-full rounded-md bg-black dark:bg-white text-white dark:text-black py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {status.state === "buying" ? "Buying..." : "Buy Seed"}
              </button>

              {status.state === "error" && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {status.message}
                </p>
              )}
              {status.state === "success" && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Bought!
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
