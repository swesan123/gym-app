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

export async function archiveSplit(id: string) {
  const supabase = await createClient();

  const { data: row, error: fErr } = await supabase
    .from("workout_splits")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (fErr) throw new Error(fErr.message);
  if (!row) throw new Error("Split not found");

  const { error } = await supabase
    .from("workout_splits")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/splits");
  revalidatePath("/workout/start");
  revalidatePath("/settings/exercises");
}

export async function restoreSplit(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("workout_splits")
    .update({ archived_at: null })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/splits");
  revalidatePath("/workout/start");
  revalidatePath("/settings/exercises");
}

export async function renameSplit(id: string, newName: string) {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error("Split name is required");

  const supabase = await createClient();

  const { data: row, error: fErr } = await supabase
    .from("workout_splits")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (fErr) throw new Error(fErr.message);
  if (!row) throw new Error("Split not found");

  const oldName = row.name;

  // Check if new name already exists
  const { count: existing } = await supabase
    .from("workout_splits")
    .select("*", { count: "exact", head: true })
    .eq("name", trimmed)
    .neq("id", id);

  if (existing && existing > 0) {
    throw new Error("A split with that name already exists.");
  }

  // Update the split name
  const { error: updateErr } = await supabase
    .from("workout_splits")
    .update({ name: trimmed })
    .eq("id", id);

  if (updateErr) throw new Error(updateErr.message);

  // Cascade update: exercise_splits
  const { error: exErr } = await supabase
    .from("exercise_splits")
    .update({ split_name: trimmed })
    .eq("split_name", oldName);

  if (exErr) throw new Error(exErr.message);

  // Cascade update: workouts
  const { error: woErr } = await supabase
    .from("workouts")
    .update({ split: trimmed })
    .eq("split", oldName);

  if (woErr) throw new Error(woErr.message);

  revalidatePath("/settings/splits");
  revalidatePath("/workout/start");
  revalidatePath("/settings/exercises");
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/progress");
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
  revalidatePath("/settings/exercises");
}

export async function reorderSplit(splitId: string, direction: "up" | "down") {
  const supabase = await createClient();

  const { data: rows, error: listErr } = await supabase
    .from("workout_splits")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (listErr || !rows?.length) {
    throw new Error(listErr?.message ?? "Could not load splits");
  }

  const idx = rows.findIndex((r) => r.id === splitId);
  if (idx < 0) return;

  const j = direction === "up" ? idx - 1 : idx + 1;
  if (j < 0 || j >= rows.length) return;

  const a = rows[idx];
  const b = rows[j];
  const orderA = Number(a.sort_order);
  const orderB = Number(b.sort_order);

  const { error: u1 } = await supabase
    .from("workout_splits")
    .update({ sort_order: orderB })
    .eq("id", a.id);
  if (u1) throw new Error(u1.message);

  const { error: u2 } = await supabase
    .from("workout_splits")
    .update({ sort_order: orderA })
    .eq("id", b.id);
  if (u2) throw new Error(u2.message);

  revalidatePath("/settings/splits");
  revalidatePath("/workout/start");
  revalidatePath("/settings/exercises");
  revalidatePath("/history");
}
