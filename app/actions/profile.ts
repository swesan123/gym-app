"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function saveTrainingProfile(formData: FormData) {
  const rawBw = String(formData.get("body_weight") ?? "").trim();
  const bodyWeight = rawBw ? Number(rawBw) : null;

  if (rawBw && !Number.isFinite(bodyWeight)) {
    throw new Error("Body weight must be a valid number");
  }

  const rawProg = String(formData.get("progression_base_pct") ?? "").trim();
  const progressionBasePct = rawProg ? Number(rawProg) : null;
  if (rawProg && (!Number.isFinite(progressionBasePct) || progressionBasePct! < 0 || progressionBasePct! > 100)) {
    throw new Error("Progression base % must be between 0 and 100");
  }
  const progression_base_pct =
    progressionBasePct != null && progressionBasePct > 0
      ? progressionBasePct
      : null;

  const supabase = await createClient();
  const { error } = await supabase.from("user_training_profile").upsert(
    {
      singleton: true,
      body_weight: bodyWeight,
      progression_base_pct,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "singleton" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/settings/profile");
  revalidatePath("/workout/start");
  revalidatePath("/");
}
