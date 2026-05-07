"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function createSplit(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Split name is required");

  const supabase = await createClient();

  const { data: maxRow } = await supabase
    .from("workout_splits")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("workout_splits").insert({
    name: trimmed,
    sort_order: nextOrder,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("A split with that name already exists.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/settings/splits");
  revalidatePath("/workout/start");
  revalidatePath("/settings/exercises");
}

export async function deleteSplit(id: string) {
  const supabase = await createClient();

  const { data: row, error: fErr } = await supabase
    .from("workout_splits")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (fErr) throw new Error(fErr.message);
  if (!row) throw new Error("Split not found");

  const splitName = row.name;

  const { count: exCount } = await supabase
    .from("exercises")
    .select("*", { count: "exact", head: true })
    .eq("split", splitName);

  if (exCount && exCount > 0) {
    throw new Error(
      `Cannot delete: ${exCount} exercise(s) still use this split. Reassign them first.`,
    );
  }

  const { count: woCount } = await supabase
    .from("workouts")
    .select("*", { count: "exact", head: true })
    .eq("split", splitName);

  if (woCount && woCount > 0) {
    throw new Error(
      `Cannot delete: ${woCount} workout(s) reference this split name.`,
    );
  }

  const { error } = await supabase.from("workout_splits").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings/splits");
  revalidatePath("/workout/start");
}
