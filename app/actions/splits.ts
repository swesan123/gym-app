"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { UNASSIGNED_SPLIT_NAME } from "@/lib/constants";

export async function createSplit(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Split name is required");
  if (trimmed.toLowerCase() === UNASSIGNED_SPLIT_NAME.toLowerCase()) {
    throw new Error(`"${UNASSIGNED_SPLIT_NAME}" is reserved by the app.`);
  }

  const supabase = await createClient();

  const { data: maxRow } = await supabase
    .from("workout_splits")
    .select("sort_order")
    .neq("name", UNASSIGNED_SPLIT_NAME)
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

  const splitName = row.name;
  if (splitName === UNASSIGNED_SPLIT_NAME) {
    throw new Error(`The "${UNASSIGNED_SPLIT_NAME}" split cannot be archived.`);
  }

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
  if (splitName === UNASSIGNED_SPLIT_NAME) {
    throw new Error(`The "${UNASSIGNED_SPLIT_NAME}" split cannot be deleted.`);
  }

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

  const movable = rows.filter((r) => r.name !== UNASSIGNED_SPLIT_NAME);
  const idx = movable.findIndex((r) => r.id === splitId);
  if (idx < 0) return;

  const j = direction === "up" ? idx - 1 : idx + 1;
  if (j < 0 || j >= movable.length) return;

  const a = movable[idx];
  const b = movable[j];
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
