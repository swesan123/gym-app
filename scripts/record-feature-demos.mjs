/**
 * Records short browser videos demonstrating features from the ActiveWorkout refactor.
 * Run: node scripts/record-feature-demos.mjs
 * Requires: dev server on http://localhost:3000
 */
import { chromium } from "playwright";
import { mkdir, readdir, rename } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("verification-videos");
const WORKOUT_ID =
  process.env.WORKOUT_ID ?? "9bc4eaba-8e2e-4e86-84ce-50d970958a69";
const WORKOUT_URL = `${BASE}/workout/${WORKOUT_ID}`;

const VIEWPORT = { width: 390, height: 844 };

async function recordScenario(name, run) {
  const scenarioDir = path.join(OUT_DIR, name);
  await mkdir(scenarioDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: scenarioDir, size: VIEWPORT },
  });
  const page = await context.newPage();

  try {
    await run(page);
    await page.waitForTimeout(1200);
  } finally {
    await context.close();
    await browser.close();
  }

  const files = await readdir(scenarioDir);
  const webm = files.find((f) => f.endsWith(".webm"));
  if (webm) {
    await rename(
      path.join(scenarioDir, webm),
      path.join(OUT_DIR, `${name}.webm`),
    );
  }

  console.log(`✓ ${name}`);
}

async function openWorkout(page) {
  await page.goto(WORKOUT_URL, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Active workout" }).waitFor();
}

async function switchToFocus(page) {
  await page.getByRole("button", { name: "Focus" }).click();
  await page.waitForTimeout(600);
}

async function clickFocusNext(page) {
  await page.getByRole("button", { name: "Next →" }).click();
}

async function clickFocusBack(page) {
  await page.getByRole("button", { name: "← Back" }).click();
}

function exerciseSection(page, name) {
  return page
    .getByRole("heading", { name, exact: true, level: 2 })
    .locator("xpath=ancestor::section[1]");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  await recordScenario("01-list-view-decomposed", async (page) => {
    await openWorkout(page);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(800);
    await page.getByRole("heading", { name: "Main exercises" }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
  });

  await recordScenario("02-focus-mode-navigation", async (page) => {
    await openWorkout(page);
    await switchToFocus(page);
    await clickFocusNext(page);
    await page.waitForTimeout(700);
    await clickFocusNext(page);
    await page.waitForTimeout(700);
    await clickFocusBack(page);
    await page.waitForTimeout(700);
  });

  await recordScenario("03-focus-step-persistence", async (page) => {
    await openWorkout(page);
    await switchToFocus(page);
    for (let i = 0; i < 4; i += 1) {
      await clickFocusNext(page);
      await page.waitForTimeout(350);
    }
    await page.getByRole("button", { name: "← Home" }).click();
    await page.waitForTimeout(800);
    await page.getByRole("link", { name: "Continue" }).click();
    await page.waitForURL(/\/workout\//);
    await page.waitForTimeout(1000);
    await switchToFocus(page);
    await page.waitForTimeout(1200);
  });

  await recordScenario("04-bodyweight-zero-preset", async (page) => {
    await openWorkout(page);
    const pushups = exerciseSection(page, "Pushups");
    const editBtn = pushups.getByRole("button", { name: "Edit set 1" });
    if ((await editBtn.count()) > 0) {
      await editBtn.click();
      await page.waitForTimeout(400);
    }
    const extraWt = pushups.getByLabel("Extra wt").first();
    await extraWt.scrollIntoViewIfNeeded();
    await extraWt.click({ force: true });
    await page.waitForTimeout(1000);
  });

  await recordScenario("05-finish-modal-blocked", async (page) => {
    await openWorkout(page);
    await page.getByRole("button", { name: "Finish" }).click();
    await page.getByText("Sets still need Done").waitFor({ timeout: 5000 });
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  await recordScenario("06-last-set-removal-blocked", async (page) => {
    await openWorkout(page);
    const stretchSection = exerciseSection(page, "Chin Tucks");
    await stretchSection.scrollIntoViewIfNeeded();
    await stretchSection
      .getByRole("button", { name: /^Remove set \d+$/ })
      .click();
    await page.waitForTimeout(300);
    await page.getByText(/Cannot remove the last set/i).waitFor();
    await page.waitForTimeout(1200);
  });

  await recordScenario("07-rest-timer-on-done", async (page) => {
    await openWorkout(page);
    const machineSection = exerciseSection(page, "Machine Shoulder Press");
    const doneBtn = machineSection
      .getByRole("button", { name: /^Mark set 2 done$/ })
      .or(machineSection.getByRole("button", { name: /^Done$/ }))
      .first();
    if (await doneBtn.isDisabled()) {
      const editBtn = machineSection.getByRole("button", {
        name: "Edit set 2",
      });
      if ((await editBtn.count()) > 0) {
        await editBtn.click();
        await page.waitForTimeout(500);
      }
    }
    const markDone = machineSection
      .getByRole("button", { name: /^Mark set 2 done$/ })
      .or(machineSection.getByRole("button", { name: /^Done$/ }))
      .first();
    await markDone.scrollIntoViewIfNeeded();
    await markDone.click();
    await page.getByText("Rest timer").waitFor({ timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Skip rest" }).click();
  });

  await recordScenario("08-mark-done-optimistic-ui", async (page) => {
    await openWorkout(page);
    const pushups = exerciseSection(page, "Pushups");
    let markDone = pushups.getByRole("button", { name: /^Mark set 1 done$/ });
    if (await markDone.isDisabled()) {
      await pushups.getByRole("button", { name: "Edit set 1" }).click();
      await page.waitForTimeout(500);
      markDone = pushups.getByRole("button", { name: /^Mark set 1 done$/ });
    }
    await markDone.scrollIntoViewIfNeeded();
    await markDone.click();
    await pushups.getByRole("button", { name: "Edit set 1" }).waitFor();
    await page.waitForTimeout(1200);
  });

  console.log(`\nVideos saved to ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
