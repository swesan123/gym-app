/**
 * Compares OpenRouter models on the real chat system prompt + tools against live (read-only) data.
 * Write tools are stubbed to throw, and approval-gated tools stop before execution anyway.
 *
 * Run: npx tsx --env-file=.env.local scripts/eval-chat-models.ts [model ...]
 * Requires OPENROUTER_API_KEY plus Supabase env vars. EVAL_RUNS (default 3) and EVAL_CONCURRENCY (default 4) are optional.
 */
import { writeFile } from "node:fs/promises";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, isStepCount, type ToolSet } from "ai";

import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { chatTools, WRITE_TOOL_APPROVAL } from "@/lib/ai/tools";
import { listSplitsForChat } from "@/lib/queries/stats";

const DEFAULT_MODELS = [
  "openai/gpt-6-luna",
  "openai/gpt-6-luna-pro",
  "anthropic/claude-haiku-5.5",
  "google/gemini-3.1-flash-lite",
  "deepseek/deepseek-v4.1-flash",
  "qwen/qwen3.8-flash",
  "z-ai/glm-5.3-flash",
];

const RUNS = Number(process.env.EVAL_RUNS ?? 3);

type ToolCallRecord = { name: string; input: Record<string, unknown> };
type RunTrace = {
  text: string;
  calls: ToolCallRecord[];
  approvals: ToolCallRecord[];
  outputs: unknown[];
};
type Scenario = {
  id: string;
  prompt: string;
  grade: (trace: RunTrace, ctx: { splits: string[] }) => { pass: boolean; why: string };
};

const blockedWrite = async (): Promise<never> => {
  throw new Error("eval: write tools are disabled");
};

const evalTools = {
  ...chatTools,
  createExercise: { ...chatTools.createExercise, execute: blockedWrite },
  startWorkout: { ...chatTools.startWorkout, execute: blockedWrite },
} as typeof chatTools;

const lower = (value: unknown) => String(value ?? "").toLowerCase();

const collectNumbers = (value: unknown, out: number[] = []): number[] => {
  if (typeof value === "number") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectNumbers(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectNumbers(v, out));
  else if (typeof value === "string") {
    for (const match of value.matchAll(/\d+(?:\.\d+)?/g)) out.push(Number(match[0]));
  }
  return out;
};

/** Numbers >= 10 in the answer that don't appear (within rounding) anywhere in tool outputs. */
const ungroundedNumbers = (trace: RunTrace): number[] => {
  const known = collectNumbers(trace.outputs);
  const month = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
  const withoutDates = trace.text
    .replace(new RegExp(`${month}\\s+\\d{1,2}|\\d{1,2}\\s+${month}`, "gi"), "")
    .replace(/,(\d{3})/g, "$1");
  const stated = [...withoutDates.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  return stated.filter(
    (n) =>
      n >= 10 &&
      !(n >= 2020 && n <= 2030) &&
      !known.some((k) => Math.abs(k - n) <= 0.6 || Math.abs(Math.round(k) - n) < 1e-9),
  );
};

const groundedCheck = (trace: RunTrace) => {
  const bad = ungroundedNumbers(trace);
  return { ok: bad.length === 0, why: bad.length ? `ungrounded numbers: ${bad.join(", ")}` : "" };
};

const noWrites = (trace: RunTrace) => trace.approvals.length === 0;

const SCENARIOS: Scenario[] = [
  {
    id: "bench-pr",
    prompt: "What's my bench press PR?",
    grade: (t) => {
      const called = t.calls.some(
        (c) =>
          c.name === "getPersonalRecords" &&
          (lower(c.input.exercise) === "barbell bench press" ||
            (c.input.exercise == null && /bench/i.test(t.text))),
      );
      const g = groundedCheck(t);
      return { pass: called && g.ok && noWrites(t), why: !called ? "no getPersonalRecords for bench press" : g.why };
    },
  },
  {
    id: "start-push",
    prompt: "Start my push workout",
    grade: (t) => {
      const ok =
        t.approvals.length === 1 &&
        t.approvals[0].name === "startWorkout" &&
        t.approvals[0].input.split === "Push";
      return { pass: ok, why: ok ? "" : `approvals=${JSON.stringify(t.approvals)}` };
    },
  },
  {
    id: "return-override",
    prompt: "I've been off for about 7 weeks. Start my Push workout but go 15% lighter",
    grade: (t) => {
      const ok =
        t.approvals.length === 1 &&
        t.approvals[0].name === "startWorkout" &&
        t.approvals[0].input.split === "Push" &&
        t.approvals[0].input.loadAdjustmentPercent === 15;
      return { pass: ok, why: ok ? "" : `approvals=${JSON.stringify(t.approvals)}` };
    },
  },
  {
    id: "return-auto",
    prompt: "I haven't trained since September. Start my Push workout",
    grade: (t) => {
      const ok =
        t.approvals.length === 1 &&
        t.approvals[0].name === "startWorkout" &&
        t.approvals[0].input.split === "Push" &&
        t.approvals[0].input.loadAdjustmentPercent === undefined;
      return { pass: ok, why: ok ? "" : `approvals=${JSON.stringify(t.approvals)}` };
    },
  },
  {
    id: "create-exercise",
    prompt: "Add cable crossovers to my Push day for chest, 3 sets of 12 reps",
    grade: (t) => {
      const a = t.approvals.find((x) => x.name === "createExercise");
      const ok =
        Boolean(a) &&
        /cable cross/i.test(String(a?.input.name)) &&
        /chest/i.test(String(a?.input.muscle)) &&
        JSON.stringify(a?.input.splits) === JSON.stringify(["Push"]) &&
        a?.input.default_sets === 3 &&
        a?.input.default_reps === 12;
      return { pass: ok && t.approvals.length === 1, why: ok ? "" : `approval=${JSON.stringify(a ?? null)}` };
    },
  },
  {
    id: "leg-press-progress",
    prompt: "How has my leg press been progressing lately?",
    grade: (t) => {
      const called = t.calls.some(
        (c) => c.name === "getExerciseProgress" && lower(c.input.exercise) === "leg press",
      );
      const g = groundedCheck(t);
      return { pass: called && g.ok && noWrites(t), why: !called ? "no getExerciseProgress('Leg Press')" : g.why };
    },
  },
  {
    id: "deadlift-ambiguous",
    prompt: "What's my deadlift PR?",
    grade: (t) => {
      const honest = /romanian|rdl|smith|don.t (?:have|see)|no .*deadlift|not find|couldn.t find|isn.t|which/i.test(t.text);
      const g = groundedCheck(t);
      return {
        pass: honest && g.ok && noWrites(t),
        why: !honest ? "did not flag that only Smith Machine Romanian Deadlift exists" : g.why,
      };
    },
  },
  {
    id: "unknown-split",
    prompt: "Add hammer curls to my Arms day",
    grade: (t, { splits }) => {
      const invalid = t.approvals.some(
        (a) =>
          a.name === "createExercise" &&
          (a.input.splits as string[] | undefined)?.some((s) => !splits.includes(s)),
      );
      const explained = /arms/i.test(t.text);
      return {
        pass: !invalid && (t.approvals.length === 0 ? explained : true),
        why: invalid ? `used a non-existent split: ${JSON.stringify(t.approvals)}` : explained ? "" : "did not explain missing Arms split",
      };
    },
  },
  {
    id: "last-week",
    prompt: "How did last week go?",
    grade: (t) => {
      const called = t.calls.some((c) => c.name === "getRecentWorkouts");
      const g = groundedCheck(t);
      return { pass: called && g.ok && noWrites(t), why: !called ? "no getRecentWorkouts" : g.why };
    },
  },
];

type RunResult = {
  model: string;
  scenario: string;
  run: number;
  pass: boolean;
  why: string;
  ms: number;
  cost: number | null;
  steps: number;
  error?: string;
  trace?: RunTrace;
};

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: { "X-Title": "GymLog eval" },
});

const readCost = (metadata: unknown): number => {
  const cost = (metadata as { openrouter?: { usage?: { cost?: number } } } | undefined)?.openrouter?.usage?.cost;
  return typeof cost === "number" ? cost : 0;
};

const runOnce = async (model: string, scenario: Scenario, run: number, splits: string[]): Promise<RunResult> => {
  const started = Date.now();
  try {
    const result = await generateText({
      model: openrouter(model, { usage: { include: true } }),
      instructions: buildSystemPrompt({ today: new Date().toISOString().slice(0, 10) }),
      prompt: scenario.prompt,
      tools: evalTools as ToolSet,
      toolApproval: WRITE_TOOL_APPROVAL,
      stopWhen: isStepCount(8),
    });

    const trace: RunTrace = { text: result.text, calls: [], approvals: [], outputs: [] };
    let cost = 0;
    for (const step of result.steps) {
      cost += readCost(step.providerMetadata);
      for (const call of step.toolCalls) {
        trace.calls.push({ name: call.toolName, input: (call.input ?? {}) as Record<string, unknown> });
      }
      for (const toolResult of step.toolResults) trace.outputs.push(toolResult.output);
      for (const part of step.content) {
        if (part.type !== "tool-approval-request") continue;
        trace.approvals.push({
          name: part.toolCall.toolName,
          input: (part.toolCall.input ?? {}) as Record<string, unknown>,
        });
      }
    }
    const { pass, why } = scenario.grade(trace, { splits });
    return { model, scenario: scenario.id, run, pass, why, ms: Date.now() - started, cost, steps: result.steps.length, trace };
  } catch (error) {
    return {
      model,
      scenario: scenario.id,
      run,
      pass: false,
      why: "error",
      ms: Date.now() - started,
      cost: null,
      steps: 0,
      error: error instanceof Error ? error.message.slice(0, 200) : String(error),
    };
  }
};

const CONCURRENCY = Number(process.env.EVAL_CONCURRENCY ?? 4);

const runPool = async <T>(jobs: (() => Promise<T>)[], limit: number): Promise<T[]> => {
  const results: T[] = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const index = next;
      next += 1;
      results[index] = await jobs[index]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker));
  return results;
};

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const main = async () => {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set");
  const models = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_MODELS;
  const { splits } = await listSplitsForChat();

  const jobs = models.flatMap((model) =>
    Array.from({ length: RUNS }, (_, i) => i + 1).flatMap((run) =>
      SCENARIOS.map((scenario) => () => runOnce(model, scenario, run, splits)),
    ),
  );
  const all = await runPool(jobs, CONCURRENCY);
  await writeFile("/tmp/eval-chat-models.json", JSON.stringify(all, null, 2));

  console.log(`\n${RUNS} runs x ${SCENARIOS.length} scenarios per model\n`);
  console.log("model | pass | median latency | avg cost/turn | errors | per-scenario passes");
  for (const model of models) {
    const rows = all.filter((r) => r.model === model);
    const passes = rows.filter((r) => r.pass).length;
    const costs = rows.map((r) => r.cost).filter((c): c is number => c != null);
    const avgCost = costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;
    const perScenario = SCENARIOS.map((s) => {
      const sr = rows.filter((r) => r.scenario === s.id);
      return `${s.id}:${sr.filter((r) => r.pass).length}/${sr.length}`;
    }).join(" ");
    console.log(
      `${model} | ${passes}/${rows.length} | ${(median(rows.map((r) => r.ms)) / 1000).toFixed(1)}s | $${avgCost.toFixed(5)} | ${rows.filter((r) => r.error).length} | ${perScenario}`,
    );
  }
  console.log("\nFailures:");
  for (const r of all.filter((x) => !x.pass)) {
    console.log(`- ${r.model} ${r.scenario}#${r.run}: ${r.error ?? r.why}`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
