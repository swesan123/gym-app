/**
 * Production browser walkthrough for issues #74–#81, #80 + refactor regression.
 * Run: BASE_URL=https://gymlog-swesan.vercel.app node scripts/production-walkthrough.mjs
 */
import { chromium } from "playwright";
import { mkdir, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "https://gymlog-swesan.vercel.app";
const OUT_DIR = path.resolve("verification-artifacts");
const SCREENSHOT_DIR = path.join(OUT_DIR, "screenshots");
const VIDEO_DIR = path.join(OUT_DIR, "video");
const VIEWPORT = { width: 390, height: 844 };
const SYNC_EXERCISE = "Seated Calf Raise";
const SPLIT_NAME = process.env.SPLIT_NAME ?? "Push";

/** @type {string | null} */
let workoutUrl = process.env.WORKOUT_ID
  ? `${BASE}/workout/${process.env.WORKOUT_ID}`
  : null;

/** @type {Array<{id: string, issue: string, pass: boolean, note: string}>} */
const results = [];

function exerciseSection(page, name) {
  return page
    .getByRole("heading", { name, exact: true, level: 2 })
    .locator("xpath=ancestor::section[1]");
}

function exerciseSettingsCard(page, name) {
  return page
    .getByText(name, { exact: true })
    .locator("xpath=ancestor::li[1]");
}

async function pause(page, ms = 2000) {
  await page.waitForTimeout(ms);
}

async function screenshot(page, name) {
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

function record(id, issue, pass, note) {
  results.push({ id, issue, pass, note });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`[${mark}] ${id} (${issue}): ${note}`);
}

async function ensureActiveWorkout(page) {
  if (workoutUrl) {
    await page.goto(workoutUrl, { waitUntil: "networkidle" });
    const notFound = await page.getByText("Not found").isVisible().catch(() => false);
    if (!notFound) {
      await page.getByRole("heading", { name: "Active workout" }).waitFor({
        timeout: 15000,
      });
      return workoutUrl;
    }
    workoutUrl = null;
  }

  await page.goto(BASE, { waitUntil: "networkidle" });
  const continueLink = page.getByRole("link", { name: "Continue" });
  if (await continueLink.isVisible().catch(() => false)) {
    await continueLink.click();
    await page.waitForURL(/\/workout\/[a-f0-9-]+/);
    workoutUrl = page.url();
    await page.getByRole("heading", { name: "Active workout" }).waitFor({
      timeout: 15000,
    });
    return workoutUrl;
  }

  await page.goto(`${BASE}/workout/start`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: SPLIT_NAME }).click();
  await page.waitForURL(/\/workout\/[a-f0-9-]+/, { timeout: 20000 });
  workoutUrl = page.url();
  await page.getByRole("heading", { name: "Active workout" }).waitFor({
    timeout: 15000,
  });
  return workoutUrl;
}

async function openWorkout(page) {
  await ensureActiveWorkout(page);
}

async function switchToFocus(page) {
  await page.getByRole("button", { name: "Focus" }).click();
  await pause(page, 800);
}

async function switchToList(page) {
  await page.getByRole("button", { name: "List" }).click();
  await pause(page, 800);
}

async function clickFocusNext(page) {
  await page.getByRole("button", { name: "Next →" }).click();
}

async function clickFocusBack(page) {
  await page.getByRole("button", { name: "← Back" }).click();
}

async function unlockSetIfDone(section, setNum) {
  const editBtn = section.getByRole("button", { name: `Edit set ${setNum}` });
  if ((await editBtn.count()) > 0) {
    await editBtn.click();
    await section.page().waitForTimeout(400);
  }
}

async function prepareWeightedSet(section, setNum) {
  await unlockSetIfDone(section, setNum);
  const row = section.locator("tbody tr").nth(setNum - 1);
  const reps = row.getByLabel("Reps");
  if ((await reps.inputValue().catch(() => "")) === "") {
    await reps.selectOption({ index: 1 });
  }
  const wt = row.getByLabel("Wt");
  if ((await wt.inputValue().catch(() => "")) === "") {
    await wt.selectOption({ index: 1 });
  }
  const rir = row.getByLabel("RIR");
  if ((await rir.inputValue().catch(() => "")) === "") {
    await rir.selectOption({ index: 1 });
  }
  await section.page().waitForTimeout(300);
}

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  await mkdir(VIDEO_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: VIDEO_DIR, size: VIEWPORT },
  });
  const page = await context.newPage();

  try {
    // Scene 1 — Home + enter workout
    await page.goto(BASE, { waitUntil: "networkidle" });
    const hasDraft = await page.getByText("Draft in progress").isVisible().catch(() => false);
    await screenshot(page, "01-home");
    if (hasDraft) {
      await page.getByRole("link", { name: "Continue" }).click();
      await page.waitForURL(/\/workout\/[a-f0-9-]+/);
      workoutUrl = page.url();
    } else {
      await page.goto(`${BASE}/workout/start`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: SPLIT_NAME }).click();
      await page.waitForURL(/\/workout\/[a-f0-9-]+/, { timeout: 20000 });
      workoutUrl = page.url();
    }
    await page.getByRole("heading", { name: "Active workout" }).waitFor();
    await screenshot(page, "01-active-workout-list");
    record(
      "scene-1",
      "Refactor list view",
      true,
      hasDraft
        ? "Continued existing draft into active workout list view"
        : `Started new ${SPLIT_NAME} workout (${workoutUrl})`,
    );

    // Scene 2 — #74 Focus without volume
    await switchToFocus(page);
    const volVisible = await page.getByText(/^Vol\b/i).isVisible().catch(() => false);
    await screenshot(page, "02-focus-no-volume");
    record(
      "scene-2",
      "#74",
      !volVisible,
      volVisible ? 'Found "Vol" label in Focus view' : "No volume label in Focus card",
    );
    await clickFocusNext(page);
    await pause(page, 700);
    await clickFocusNext(page);
    await pause(page, 700);
    await clickFocusBack(page);
    await pause(page, 700);

    // Scene 3 — #77 Focus step persistence
    for (let i = 0; i < 4; i += 1) {
      await clickFocusNext(page);
      await pause(page, 350);
    }
    const stepBefore = await page
      .locator("text=/Step \\d+ of \\d+/")
      .first()
      .textContent()
      .catch(() => null);
    await page.getByRole("button", { name: "← Home" }).click();
    await pause(page, 800);
    const continueAfterHome = page.getByRole("link", { name: "Continue" });
    if (await continueAfterHome.isVisible().catch(() => false)) {
      await continueAfterHome.click();
      await page.waitForURL(/\/workout\/[a-f0-9-]+/);
    } else if (workoutUrl) {
      await page.goto(workoutUrl, { waitUntil: "networkidle" });
    }
    await pause(page, 1000);
    await switchToFocus(page);
    const stepAfter = await page
      .locator("text=/Step \\d+ of \\d+/")
      .first()
      .textContent()
      .catch(() => null);
    await screenshot(page, "03-focus-step-persistence");
    record(
      "scene-3",
      "#77",
      !!stepBefore && stepBefore === stepAfter,
      `Step before=${stepBefore ?? "n/a"}, after=${stepAfter ?? "n/a"}`,
    );

    // Scene 4 — #75 Bodyweight zero preset
    await switchToList(page);
    const pushups = exerciseSection(page, "Pushups");
    await pushups.scrollIntoViewIfNeeded();
    await unlockSetIfDone(pushups, 1);
    const extraWt = pushups.getByLabel("Extra wt").first();
    await extraWt.click({ force: true });
    await pause(page, 800);
    const option0 = page.getByRole("option", { name: "0" }).first();
    const hasZero = (await option0.count()) > 0;
    await screenshot(page, "04-bodyweight-zero-preset");
    await page.keyboard.press("Escape").catch(() => {});
    record(
      "scene-4",
      "#75",
      hasZero,
      hasZero ? "Extra wt dropdown shows 0 option for Pushups" : "0 option not found",
    );

    // Scene 5 — #78 Last-set removal blocked
    const chinTucks = exerciseSection(page, "Chin Tucks");
    await chinTucks.scrollIntoViewIfNeeded();
    await chinTucks
      .getByRole("button", { name: /^Remove set \d+$/ })
      .click();
    await pause(page, 400);
    const blockMsg = page.getByText(/Cannot remove the last set/i);
    const blocked = await blockMsg.isVisible().catch(() => false);
    await screenshot(page, "05-last-set-removal-blocked");
    record(
      "scene-5",
      "#78",
      blocked,
      blocked ? "Last-set removal shows guard message" : "Guard message not shown",
    );

    // Scene 6 — #81 Finish modal blocked
    await page.getByRole("button", { name: "Finish" }).click();
    const modalTitle = page.getByText("Sets still need Done");
    const modalVisible = await modalTitle.isVisible().catch(() => false);
    const confirmDisabled = await page
      .getByRole("button", { name: /Mark all sets Done first/i })
      .isDisabled()
      .catch(() => false);
    await screenshot(page, "06-finish-modal-blocked");
    await page.getByRole("button", { name: "Cancel" }).click();
    await pause(page, 500);
    record(
      "scene-6",
      "#81",
      modalVisible && confirmDisabled,
      `Modal visible=${modalVisible}, confirm disabled=${confirmDisabled}`,
    );

    // Scene 7 — Rest timer + optimistic Done
    try {
      const machine = exerciseSection(page, "Machine Shoulder Press");
      await machine.scrollIntoViewIfNeeded();
      await prepareWeightedSet(machine, 2);
      const markDone = machine.getByRole("button", { name: /^Mark set 2 done$/ });
      await markDone.click({ timeout: 10000 });
      const restVisible = await page
        .getByText("Rest timer")
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      await pause(page, 1200);
      if (restVisible) {
        await page.getByRole("button", { name: "Skip rest" }).click();
        await pause(page, 600);
      }
      const editAfter = machine.getByRole("button", { name: "Edit set 2" });
      const optimistic = (await editAfter.count()) > 0;
      await screenshot(page, "07-rest-timer-optimistic-done");
      record(
        "scene-7",
        "Rest timer regression",
        restVisible && optimistic,
        `Rest overlay=${restVisible}, optimistic Edit=${optimistic}`,
      );
    } catch (err) {
      await screenshot(page, "07-rest-timer-error").catch(() => {});
      record(
        "scene-7",
        "Rest timer regression",
        false,
        err instanceof Error ? err.message : String(err),
      );
    }

    // Scene 8 — #79 Exercise sync into active draft
    try {
      const hadExerciseBefore = (await page.getByRole("heading", {
        name: SYNC_EXERCISE,
        exact: true,
        level: 2,
      }).count()) > 0;

      await page.goto(`${BASE}/settings/exercises`, { waitUntil: "networkidle" });
      const exerciseCard = exerciseSettingsCard(page, SYNC_EXERCISE);
      await exerciseCard.scrollIntoViewIfNeeded();
      await exerciseCard.getByRole("button", { name: "Edit" }).click();
      const addPush = page.getByRole("button", { name: "+ Push" });
      if ((await addPush.count()) > 0) {
        await addPush.click();
      }
      await page.getByRole("button", { name: "Save" }).click();
      await pause(page, 2000);

      await page.goto(workoutUrl, { waitUntil: "networkidle" });
      await page.evaluate(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await pause(page, 2500);
      const hasSyncedExercise = (await page.getByRole("heading", {
        name: SYNC_EXERCISE,
        exact: true,
        level: 2,
      }).count()) > 0;
      await screenshot(page, "08-exercise-sync-into-draft");
      record(
        "scene-8",
        "#79",
        !hadExerciseBefore && hasSyncedExercise,
        `Before=${hadExerciseBefore}, after sync=${hasSyncedExercise}`,
      );

      await page.goto(`${BASE}/settings/exercises`, { waitUntil: "networkidle" });
      await exerciseCard.getByRole("button", { name: "Edit" }).click();
      const pushChip = page.getByRole("button", { name: /^Push/ });
      if ((await pushChip.count()) > 0) {
        await pushChip.first().click();
        await page.getByRole("button", { name: "Save" }).click();
        await pause(page, 1000);
      }
    } catch (err) {
      await screenshot(page, "08-exercise-sync-error").catch(() => {});
      record(
        "scene-8",
        "#79",
        false,
        err instanceof Error ? err.message : String(err),
      );
    }

    // Scene 9 — #80 Progress rep capacity
    try {
      await page.goto(`${BASE}/progress`, { waitUntil: "networkidle" });
      const subtitle = page.getByText(/RIR-adjusted volume/i);
      const subtitleVisible = await subtitle.isVisible().catch(() => false);

      const splitFilter = page.locator("select").first();
      if ((await splitFilter.count()) > 0) {
        await splitFilter.selectOption({ label: "Push" });
        await pause(page, 800);
      }

      const exerciseSectionEl = page
        .getByRole("heading", { name: /Exercise rep capacity by week/i })
        .locator("xpath=ancestor::section[1]");
      const exerciseSelect = exerciseSectionEl.locator("select");
      const exerciseOptions =
        (await exerciseSelect.count()) > 0
          ? await exerciseSelect.locator("option").allTextContents()
          : [];
      const hasPushExercises =
        exerciseOptions.length > 1 &&
        !exerciseOptions.some((o) => o === "No exercises");
      if (hasPushExercises) {
        await exerciseSelect.selectOption({ index: 1 });
      }
      await pause(page, 1200);
      const chartHeading = page.getByRole("heading", {
        name: /Exercise adjusted volume by week/i,
      });
      const chartVisible = await chartHeading.isVisible().catch(() => false);
      await screenshot(page, "09-progress-rep-capacity");
      record(
        "scene-9",
        "#80",
        subtitleVisible && chartVisible && hasPushExercises,
        `Subtitle=${subtitleVisible}, chart=${chartVisible}, pushExercises=${hasPushExercises} (${exerciseOptions.length} options)`,
      );
    } catch (err) {
      await screenshot(page, "09-progress-error").catch(() => {});
      record(
        "scene-9",
        "#80",
        false,
        err instanceof Error ? err.message : String(err),
      );
    }

    // Scene 10 — Wrap
    await page.goto(BASE, { waitUntil: "networkidle" });
    await screenshot(page, "10-home-wrap");
    record("scene-10", "Wrap", true, "Returned to home");
  } catch (err) {
    console.error("Walkthrough error:", err);
    await screenshot(page, "error-state").catch(() => {});
    record("error", "Walkthrough", false, err instanceof Error ? err.message : String(err));
  } finally {
    await pause(page, 1500);
    await context.close();
    await browser.close();
  }

  const videoFiles = await readdir(VIDEO_DIR);
  const webm = videoFiles.find((f) => f.endsWith(".webm"));
  if (webm) {
    await rename(
      path.join(VIDEO_DIR, webm),
      path.join(OUT_DIR, "production-walkthrough.webm"),
    );
  }

  const report = {
    baseUrl: BASE,
    workoutUrl,
    viewport: VIEWPORT,
    recordedAt: new Date().toISOString(),
    browserMcpAvailable: false,
    automation: "playwright-chromium",
    results,
    allPassed: results.every((r) => r.pass),
  };

  await writeFile(
    path.join(OUT_DIR, "walkthrough-report.json"),
    JSON.stringify(report, null, 2),
  );

  console.log(`\nArtifacts: ${OUT_DIR}/`);
  console.log(`All passed: ${report.allPassed}`);
  process.exit(report.allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
