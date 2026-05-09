function nearestOnMachineGrid(
  target: number,
  start: number,
  end: number,
  increment: number,
): number {
  let best = start;
  let bestDist = Math.abs(target - start);
  const maxSteps = 5000;
  for (let i = 0; i < maxSteps; i += 1) {
    const v = start + i * increment;
    if (v > end + 1e-9) break;
    const rounded = Number(v.toFixed(6));
    const d = Math.abs(target - rounded);
    if (d < bestDist - 1e-9) {
      best = rounded;
      bestDist = d;
    }
  }
  const endRounded = Number(end.toFixed(6));
  const endDist = Math.abs(target - endRounded);
  if (endDist < bestDist - 1e-9) return endRounded;
  return best;
}

function ceilOnMachineGrid(
  target: number,
  start: number,
  end: number,
  increment: number,
): number {
  if (target <= start) return Number(start.toFixed(6));
  const maxSteps = 5000;
  for (let i = 0; i < maxSteps; i += 1) {
    const v = start + i * increment;
    if (v > end + 1e-9) break;
    const rounded = Number(v.toFixed(6));
    if (rounded + 1e-9 >= target) return rounded;
  }
  return Number(end.toFixed(6));
}

/** Progressive overload: optional % on last weight; snap to machine grid when configured. */
export function applyProgressiveOverload(
  lastWeight: number | null | undefined,
  pct: number | null | undefined,
  machineStart: number | null | undefined,
  machineEnd: number | null | undefined,
  machineIncrement: number | null | undefined,
): number | null {
  if (lastWeight == null || !Number.isFinite(Number(lastWeight))) return null;

  const prev = Number(lastWeight);
  const p = pct == null || !Number.isFinite(Number(pct)) ? 0 : Number(pct);
  const raw =
    p > 0 ? prev * (1 + p / 100) : prev;

  const hasGrid =
    machineStart != null &&
    machineEnd != null &&
    machineIncrement != null &&
    Number(machineIncrement) > 0 &&
    Number(machineEnd) >= Number(machineStart);

  if (hasGrid) {
    if (p > 0) {
      // For positive overload, never round back down to the same plate.
      return ceilOnMachineGrid(
        raw,
        Number(machineStart),
        Number(machineEnd),
        Number(machineIncrement),
      );
    }
    return nearestOnMachineGrid(
      raw,
      Number(machineStart),
      Number(machineEnd),
      Number(machineIncrement),
    );
  }

  return Number(raw.toFixed(2));
}

export function usesLoggedWeightColumn(trackingType: string): boolean {
  return (
    trackingType === "weighted" ||
    trackingType === "assisted" ||
    trackingType === "bodyweight"
  );
}
