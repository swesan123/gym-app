"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function saveBodyWeight(formData: FormData) {
  const raw = String(formData.get("body_weight") ?? "").trim();
  const bodyWeight = raw ? Number(raw) : null;

  if (raw && !Number.isFinite(bodyWeight)) {
    throw new Error("Body weight must be a valid number");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_training_profile").upsert(
    {
      singleton: true,
      body_weight: bodyWeight,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "singleton" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/settings/profile");
  revalidatePath("/workout/start");
}
