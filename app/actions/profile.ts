"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function saveTrainingProfile(formData: FormData) {
  const rawBw = String(formData.get("body_weight") ?? "").trim();
  const bodyWeight = rawBw ? Number(rawBw) : null;

  if (rawBw && !Number.isFinite(bodyWeight)) {
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
  revalidatePath("/");
}
