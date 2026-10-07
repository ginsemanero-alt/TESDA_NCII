/**
 * Drives the real app in headless Chrome against a running server and a
 * seeded database. It checks what can be checked without a person:
 *  1. pages without a simulation never request the 3D chunk (or the island);
 *  2. a seeded student completes the lab's checkpoints on the lesson page and
 *     sees the result on the dashboard; the instructor sees it on the class list;
 *  3. stills of the part at four band sets, plus phone and laptop screenshots.
 *
 *   php artisan migrate:fresh --seed && php artisan serve --port=8123
 *   APP_URL=http://127.0.0.1:8123 CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" npm run check:browser
 *
 * WebGL runs on SwiftShader (software) in headless Chrome: the stills show
 * geometry, materials and lighting, not real-GPU speed.
 */

import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer, { Browser, HTTPRequest, Page } from "puppeteer-core";

import { bandsFor, Checkpoint } from "../resources/js/simulations/resistor/lib/checkpoints";
import { BandSet, readBands } from "../resources/js/simulations/resistor/lib/resistor";

const BASE = (process.env.APP_URL ?? "http://127.0.0.1:8123").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = resolve(process.cwd(), process.env.SHOTS_DIR ?? "storage/app/browser-check");
const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "public/build/manifest.json"), "utf8"));
const STAGE_CHUNK = manifest["resources/js/simulations/resistor/three/Stage3D.tsx"]?.file ?? manifest["_Stage3D"]?.file
  ?? Object.values<{ file: string }>(manifest).find((entry) => entry.file.includes("Stage3D"))!.file;
const ISLAND_CHUNK = manifest["resources/js/simulations/resistor/index.tsx"].file;

const failures: string[] = [];
const notes: string[] = [];
const check = (ok: boolean, message: string) => (ok ? notes.push(`✓ ${message}`) : failures.push(`✗ ${message}`));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });

async function signIn(page: Page, username: string) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle2" });
  await page.type('form[action$="/login"] input[name="username"]', username);
  await page.type('form[action$="/login"] input[name="password"]', "password");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click('form[action$="/login"] button[type="submit"]')]);
}

async function signOut(page: Page) {
  await page.evaluate(() => {
    const form = document.querySelector<HTMLFormElement>('form[action$="/logout"]');
    if (form) {
      form.dataset.confirmed = "1";
      form.submit();
    }
  });
  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => undefined);
}

function track(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request: HTTPRequest) => urls.push(request.url()));
  return urls;
}

async function waitForBench(page: Page) {
  await page.waitForFunction(
    () => document.querySelector("canvas") !== null && !document.body.innerText.includes("Setting up the bench"),
    { timeout: 120_000 },
  );
  await sleep(2500);
}

/** Screenshot of just the stage box. Puppeteer clips in document coordinates. */
/**
 * Software WebGL renders a frame or two a second, so a fixed sleep is not
 * enough: wait until the camera (exposed by ?debug3d) stops moving.
 */
async function waitForCamera(page: Page) {
  await sleep(2600);
  let last = "";
  let stable = 0;
  for (let i = 0; i < 90; i++) {
    const now = await page.evaluate(() => {
      const c = (window as unknown as { __labCamera?: { position: { x: number; y: number; z: number } } }).__labCamera;
      return c ? [c.position.x, c.position.y, c.position.z].map((v) => v.toFixed(1)).join(",") : "none";
    });
    // Settled once three readings a second apart agree (a slow GPU may skip frames).
    if (now === last && now !== "none") {
      stable++;
      if (stable >= 3) return;
    } else {
      stable = 0;
    }
    last = now;
    await sleep(1000);
  }
}

async function stageShot(page: Page, file: string) {
  const box = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const stage = (canvas ?? document.querySelector(".lab-graticule.absolute"))!.closest(".relative.h-\\[42vh\\]") ?? canvas!.parentElement!;
    const r = stage.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
  });
  await page.screenshot({ path: resolve(OUT, file), clip: box });
}

async function setBands(page: Page, bands: BandSet) {
  for (let i = 0; i < 4; i++) {
    await page.evaluate((id) => document.getElementById(id)?.click(), `build-b${i}-${bands[i]}`);
  }
}

async function goToChapterStep(page: Page, selector: string) {
  await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "center" }), selector);
  await waitForCamera(page);
}

async function answerCheckpoints(page: Page) {
  const checkpoints: Checkpoint[] = await page.evaluate(() =>
    JSON.parse(document.querySelector<HTMLElement>("[data-simulation-island]")!.dataset.checkpoints!),
  );
  const cards = await page.$$("#lab-checkpoints ol > li");

  for (const [index, checkpoint] of checkpoints.entries()) {
    const card = cards[index];
    switch (checkpoint.type) {
      case "read":
        await (await card.$("input"))!.type(String(readBands(checkpoint.bands).ohms));
        break;
      case "current":
        await (await card.$("input"))!.type(String(checkpoint.volts / checkpoint.ohms));
        break;
      case "role":
        await card.evaluate((el, value) => el.querySelector<HTMLInputElement>(`input[type=radio][value="${value}"]`)!.click(), String(checkpoint.role));
        break;
      case "tolerance": {
        const value = readBands(checkpoint.bands);
        const within = checkpoint.measured >= value.min && checkpoint.measured <= value.max;
        await card.evaluate((el, v) => el.querySelector<HTMLInputElement>(`input[type=radio][value="${v}"]`)!.click(), String(within));
        break;
      }
      case "bands": {
        const target = bandsFor(checkpoint.ohms, checkpoint.tolerance)!;
        for (let i = 0; i < 4; i++) {
          await page.evaluate((id) => document.getElementById(id)?.click(), `cp-${checkpoint.id}-b${i}-${target[i]}`);
        }
        break;
      }
    }
  }
}

async function main() {
  const browser: Browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl", "--window-size=1366,768"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    const requests = track(page);
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => consoleErrors.push(String(error)));
    page.on("console", (message) => message.type() === "error" && consoleErrors.push(message.text()));

    /* 1. Pages without a simulation ---------------------------------- */
    // The public landing page now carries a lazy 3D hero; scripts/landing-check.ts covers it.
    const plain = ["/sign-in"];
    for (const path of plain) {
      requests.length = 0;
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2" });
      check(!requests.some((u) => u.includes(STAGE_CHUNK) || u.includes(ISLAND_CHUNK)), `${path} loads no simulation code`);
    }

    await signIn(page, "jhonrey.m");
    for (const path of ["/student", "/student/modules", "/student/quizzes", "/student/simulations"]) {
      requests.length = 0;
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2" });
      check(!requests.some((u) => u.includes(STAGE_CHUNK)), `${path} does not download the 3D chunk`);
      check(!requests.some((u) => u.includes(ISLAND_CHUNK)), `${path} does not download the lab island`);
      await page.screenshot({ path: resolve(OUT, `page${path.replace(/\//g, "_") || "_root"}.png`), fullPage: true });
    }

    // A text page of the lab's own module.
    const moduleUrl: string = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll<HTMLAnchorElement>("a")).find((a) => a.textContent?.includes("Describe resistance and identify resistors"));
      return link?.href ?? "";
    });
    await page.goto(`${BASE}/student/modules`, { waitUntil: "networkidle2" });
    const lessonUrl: string =
      moduleUrl ||
      (await page.evaluate(() => {
        const link = Array.from(document.querySelectorAll<HTMLAnchorElement>("a")).find((a) => a.textContent?.includes("Describe resistance and identify resistors"));
        return link?.href ?? "";
      }));
    check(lessonUrl !== "", "the ELC724205 lesson is listed for the student");
    const base = lessonUrl.split("?")[0];

    requests.length = 0;
    await page.goto(`${base}?p=1`, { waitUntil: "networkidle2" });
    check(!requests.some((u) => u.includes(STAGE_CHUNK) || u.includes(ISLAND_CHUNK)), "a text lesson page loads no simulation code");

    /* 2. The lab on its lesson page, 3D --------------------------------- */
    await page.evaluate(() => localStorage.setItem("epas.simulations.resistor.mode", "3d"));
    requests.length = 0;
    await page.goto(`${base}?p=4&debug3d=1`, { waitUntil: "networkidle2" });
    check(requests.some((u) => u.includes(ISLAND_CHUNK)), "the simulation lesson page loads the lab island");
    await waitForBench(page);
    check(requests.some((u) => u.includes(STAGE_CHUNK)), "the 3D chunk loads on the simulation page when 3D is chosen");
    check(requests.some((u) => u.endsWith("resistor.glb")), "the GLB is served from this site");
    check(requests.some((u) => u.includes("studio_small_09_768.hdr")), "the HDRI is served from this site");
    const external = requests.filter((u) => !u.startsWith(BASE) && !u.startsWith("data:") && !u.startsWith("blob:") && !/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(u));
    check(external.length === 0, `the lab fetches nothing from third-party hosts${external.length ? `: ${external.join(", ")}` : ""}`);

    await page.evaluate(() => window.scrollBy(0, 300));
    await sleep(2500);
    await stageShot(page, "stage-intro-realistic.png");

    // Stills: default and three other parts, macro on band 2, Realistic.
    const sets: [string, BandSet][] = [
      ["1k-gold", ["brown", "black", "red", "gold"]],
      ["4k7-gold", ["yellow", "violet", "red", "gold"]],
      ["330-gold", ["orange", "orange", "brown", "gold"]],
      ["10k-silver", ["brown", "black", "orange", "silver"]],
    ];
    for (const [name, bands] of sets) {
      await goToChapterStep(page, '[data-chapter="build"]');
      await setBands(page, bands);
      await goToChapterStep(page, '[data-chapter="colorcode"][data-step="1"]');
      await stageShot(page, `still-${name}-macro.png`);
      await goToChapterStep(page, '[data-chapter="build"]');
      await stageShot(page, `still-${name}-bench.png`);
    }

    for (const chapter of ["measure", "circuit", "ohmslaw"]) {
      await goToChapterStep(page, `[data-chapter="${chapter}"]`);
      await stageShot(page, `stage-${chapter}-realistic.png`);
    }

    // Explain mode on the circuit and the colour code.
    await page.evaluate(() => (Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "Explain") as HTMLButtonElement)?.click());
    for (const selector of ['[data-chapter="circuit"]', '[data-chapter="colorcode"][data-step="3"]']) {
      await goToChapterStep(page, selector);
      await stageShot(page, `stage-explain-${selector.includes("circuit") ? "circuit" : "band4"}.png`);
    }

    // Optional High quality pass (SSAO + mild bloom), desktop only.
    await page.evaluate(() => (Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "Realistic") as HTMLButtonElement)?.click());
    const hq = await page.$('label input[type="checkbox"]');
    check(hq !== null, "the High quality toggle is offered on a desktop-sized screen");
    if (hq) {
      await hq.click();
      await goToChapterStep(page, '[data-chapter="measure"]');
      await sleep(4000);
      await stageShot(page, "stage-measure-high-quality.png");
      await hq.click();
    }

    /* Checkpoints -------------------------------------------------- */
    await page.evaluate(() => document.getElementById("lab-checkpoints")?.scrollIntoView());
    await sleep(800);
    await answerCheckpoints(page);
    await page.evaluate(() => (Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "Submit answers") as HTMLButtonElement).click());
    await page.waitForFunction(() => document.querySelector("#lab-checkpoints")?.textContent?.includes("Saved."), { timeout: 30_000 });
    const verdict = await page.$eval("#lab-checkpoints", (el) => el.textContent ?? "");
    check(verdict.includes("Passed") && verdict.includes("5/5"), "all five checkpoints graded correct by the server (5/5, Passed)");
    await page.screenshot({ path: resolve(OUT, "checkpoints-passed.png"), fullPage: false });

    await page.goto(`${BASE}/student`, { waitUntil: "networkidle2" });
    const dashboard = await page.$eval("[data-simulation-card]", (el) => el.textContent ?? "");
    check(dashboard.includes("5/5") && dashboard.includes("Passed"), "the student dashboard shows the new 5/5 result");
    await page.screenshot({ path: resolve(OUT, "student-dashboard.png"), fullPage: true });

    check(consoleErrors.length === 0, `no page errors in the browser console${consoleErrors.length ? `: ${consoleErrors.slice(0, 5).join(" | ")}` : ""}`);

    /* Instructor ------------------------------------------------------ */
    await signOut(page);
    await signIn(page, "mvillamor");
    await page.goto(`${BASE}/instructor/classes`, { waitUntil: "networkidle2" });
    const row = await page.evaluate(() => Array.from(document.querySelectorAll(".list__row")).find((r) => r.textContent?.includes("Dela Cruz, Jhon Rey"))?.textContent ?? "");
    check(row.includes("Lab 5/5"), "the instructor's class list shows Jhon Rey's best lab attempt (Lab 5/5)");
    await page.screenshot({ path: resolve(OUT, "instructor-classes.png"), fullPage: true });
    await signOut(page);

    /* 3. Phone and 2D --------------------------------------------- */
    const phone = await browser.newPage();
    await phone.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await signIn(phone, "jhonrey.m");
    await phone.evaluate(() => localStorage.setItem("epas.simulations.resistor.mode", "2d"));
    const phoneRequests = track(phone);
    await phone.goto(`${base}?p=4&debug3d=1`, { waitUntil: "networkidle2" });
    await sleep(1500);
    check(!phoneRequests.some((u) => u.includes(STAGE_CHUNK)), "the light 2D bench does not download three.js");
    const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 1, `no horizontal scroll at 390 px (overflow ${overflow}px)`);
    await phone.screenshot({ path: resolve(OUT, "phone-2d-top.png") });
    await phone.evaluate(() => document.querySelector('[data-chapter="measure"]')?.scrollIntoView({ block: "center" }));
    await sleep(800);
    await phone.screenshot({ path: resolve(OUT, "phone-2d-measure.png") });

    await phone.evaluate(() => localStorage.setItem("epas.simulations.resistor.mode", "3d"));
    await phone.goto(`${base}?p=4&debug3d=1`, { waitUntil: "networkidle2" });
    await waitForBench(phone);
    await phone.evaluate(() => document.querySelector('[data-chapter="colorcode"][data-step="0"]')?.scrollIntoView({ block: "center" }));
    await sleep(3200);
    await phone.screenshot({ path: resolve(OUT, "phone-3d-colorcode.png") });
  } finally {
    // Windows sometimes holds Chrome's temp profile open for a moment; that is not a test failure.
    await browser.close().catch(() => undefined);
  }

  console.log(notes.join("\n"));
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(`\nScreenshots in ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
