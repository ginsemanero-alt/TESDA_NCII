/**
 * Drives the public landing page in headless Chrome against a running server.
 * No sign-in, no seeded data needed. Checks what a person would otherwise
 * have to try on several devices:
 *
 *  A. desktop: the live 3D hero loads (lazily), assets are served from this
 *     site, the stage pins under the header while the beats scroll, the
 *     "light version" toggle works and is remembered;
 *  B. phone: the static hero, no three.js, header fits, "See it in 3D" opts in;
 *  C. reduced motion: the part holds still (and floats when motion is allowed);
 *  D. no WebGL, E. a low-power PC, F. JavaScript off: all keep the static hero
 *     and download none of the 3D code.
 *
 *   php artisan serve --port=8123
 *   APP_URL=http://127.0.0.1:8123 npm run check:landing
 *
 * WebGL runs on SwiftShader (software) in headless Chrome: the stills show
 * layout, geometry, materials and lighting, not real-GPU speed.
 */

import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer, { Browser, BrowserContext, HTTPRequest, Page } from "puppeteer-core";

const BASE = (process.env.APP_URL ?? "http://127.0.0.1:8123").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = resolve(process.cwd(), process.env.SHOTS_DIR ?? "storage/app/browser-check");
const manifest: Record<string, { file: string }> = JSON.parse(readFileSync(resolve(process.cwd(), "public/build/manifest.json"), "utf8"));

const fileOf = (needle: string) => Object.values(manifest).find((entry) => entry.file.includes(needle))!.file;
const LANDING_ENTRY = manifest["resources/js/simulations/resistor/landing.ts"].file;
const HERO_CHUNK = fileOf("mountHero");
const STAGE_CHUNK = fileOf("Stage3D");
const LAB_ENTRY = manifest["resources/js/simulations/resistor/index.tsx"].file;

const failures: string[] = [];
const notes: string[] = [];
const check = (ok: boolean, message: string) => (ok ? notes.push(`✓ ${message}`) : failures.push(`✗ ${message}`));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const has = (urls: string[], needle: string) => urls.some((u) => u.includes(needle));

mkdirSync(OUT, { recursive: true });

function launch(extra: string[] = [], software = true): Promise<Browser> {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [...(software ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] : []), ...extra],
  });
}

async function open(context: BrowserContext, viewport: Parameters<Page["setViewport"]>[0]) {
  const page = await context.newPage();
  await page.setViewport(viewport);
  const urls: string[] = [];
  const errors: string[] = [];
  page.on("request", (request: HTTPRequest) => urls.push(request.url()));
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  return { page, urls, errors };
}

const mode = (page: Page) => page.evaluate(() => document.getElementById("epas-hero")?.getAttribute("data-hero-mode") ?? "missing");

async function waitForBench(page: Page) {
  await page.waitForFunction(
    () => {
      const stage = document.getElementById("epas-hero-stage");
      return (
        stage?.querySelector("canvas") != null &&
        !stage.textContent?.includes("Setting up the bench") &&
        !stage.textContent?.includes("Loading the 3D bench") &&
        (window as unknown as { __labCamera?: unknown }).__labCamera != null
      );
    },
    { timeout: 180_000 },
  );
}

/** Software WebGL is slow: wait until the camera has stopped moving. */
async function settle(page: Page) {
  await sleep(2600);
  let last = "";
  let stable = 0;
  for (let i = 0; i < 90; i++) {
    const now = await page.evaluate(() => {
      const c = (window as unknown as { __labCamera?: { position: { x: number; y: number; z: number } } }).__labCamera;
      return c ? [c.position.x, c.position.y, c.position.z].map((v) => v.toFixed(1)).join(",") : "none";
    });
    if (now === last && now !== "none") {
      if (++stable >= 3) return;
    } else {
      stable = 0;
    }
    last = now;
    await sleep(1000);
  }
}

async function scrollToBeat(page: Page, selector: string) {
  await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "center" }), selector);
  await settle(page);
}

const shot = (page: Page, file: string) => page.screenshot({ path: resolve(OUT, file) });

/** World-space height of the resistor body, to tell floating from still. */
const bodyY = (page: Page) =>
  page.evaluate(() => {
    const scene = (window as unknown as { __labScene?: { traverse: (cb: (o: any) => void) => void } }).__labScene;
    let y = Number.NaN;
    scene?.traverse((o) => {
      if (o.name === "body") {
        const v = new o.position.constructor();
        o.getWorldPosition(v);
        y = v.y;
      }
    });
    return y;
  });

async function sectionIntact(page: Page, label: string) {
  const present = await page.evaluate(() => ["inside", "phones", "competencies", "signin"].every((id) => document.getElementById(id) !== null));
  check(present, `${label}: the rest of the landing page (inside, phones, competencies, sign-in) is still below the hero`);
}

/* A. Desktop ----------------------------------------------------------- */
async function desktop(browser: Browser) {
  const context = await browser.createBrowserContext();
  const { page, urls, errors } = await open(context, { width: 1366, height: 768 });

  await page.goto(`${BASE}/?debug3d=1`, { waitUntil: "domcontentloaded" });
  await waitForBench(page);
  check((await mode(page)) === "3d", "desktop: the hero goes live in 3D");
  check(has(urls, LANDING_ENTRY), "desktop: the tiny landing entry loads");
  check(has(urls, HERO_CHUNK) && has(urls, STAGE_CHUNK), "desktop: React and three.js load as lazy chunks, after the decision");
  check(!has(urls, LAB_ENTRY), "desktop: the lab's own island (checkpoints, scoring) is not loaded");
  check(urls.some((u) => u.endsWith("resistor.glb")) && urls.some((u) => u.includes("studio_small_09_768.hdr")), "desktop: model and HDRI are served from this site");
  const outside = urls.filter((u) => !u.startsWith(BASE) && !/^(data|blob):/.test(u) && !/fonts\.(googleapis|gstatic)\.com/.test(u));
  check(outside.length === 0, `desktop: nothing is fetched from third-party hosts${outside.length ? `: ${outside.join(", ")}` : ""}`);

  const header = await page.evaluate(() => {
    const h = document.getElementById("epas-header")!;
    const links = Array.from(h.querySelectorAll("a")).map((a) => ({ text: a.textContent?.trim(), href: a.getAttribute("href") }));
    return { links, height: h.offsetHeight };
  });
  check(header.links.some((l) => l.text === "Try the lab" && l.href?.endsWith("/sign-in")), 'desktop: the header has a "Try the lab" button to /sign-in');
  check(header.links.some((l) => l.text === "Sign in" && l.href?.endsWith("/sign-in")), 'desktop: the header has a "Sign in" button to /sign-in');

  await settle(page);
  const y1 = await bodyY(page);
  await sleep(1500);
  const y2 = await bodyY(page);
  check(Number.isFinite(y1) && Math.abs(y1 - y2) > 1e-4, "desktop: the part floats while motion is allowed");
  await shot(page, "landing-3d-intro.png");

  await scrollToBeat(page, '[data-hero-beat="colorcode"][data-step="2"]');
  const pinTop = await page.evaluate(() => Math.round(document.querySelector(".epas-hero__pin")!.getBoundingClientRect().top));
  check(Math.abs(pinTop - header.height) <= 2, `desktop: the stage stays pinned under the header while the beats scroll (top ${pinTop}px, header ${header.height}px)`);
  await shot(page, "landing-3d-band3.png");
  await scrollToBeat(page, '[data-hero-beat="measure"]');
  await shot(page, "landing-3d-measure.png");
  await scrollToBeat(page, '[data-hero-beat="circuit"]');
  await shot(page, "landing-3d-circuit.png");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 1, `desktop: no horizontal scroll (overflow ${overflow}px)`);
  await sectionIntact(page, "desktop");
  check(errors.length === 0, `desktop: no console or page errors${errors.length ? `: ${errors.slice(0, 4).join(" | ")}` : ""}`);

  // The light version: one click, and it is remembered.
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  await page.evaluate(() => document.querySelector<HTMLButtonElement>("[data-hero-toggle]")!.click());
  await sleep(800);
  check((await mode(page)) === "static", 'desktop: "Switch to the light version" returns to the static hero');
  await shot(page, "landing-static-desktop.png");
  urls.length = 0;
  await page.reload({ waitUntil: "networkidle2" });
  check((await mode(page)) === "static" && !has(urls, STAGE_CHUNK) && !has(urls, HERO_CHUNK), "desktop: the choice is remembered and the 3D code is not fetched on reload");
  await context.close();
}

/* B. Phone ------------------------------------------------------------- */
async function phone(browser: Browser) {
  const context = await browser.createBrowserContext();
  const { page, urls, errors } = await open(context, { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  await page.goto(`${BASE}/?debug3d=1`, { waitUntil: "networkidle2" });
  await sleep(1500);
  check((await mode(page)) === "static", "phone: starts on the static hero");
  check(has(urls, LANDING_ENTRY), "phone: the tiny landing entry loads");
  check(!has(urls, HERO_CHUNK) && !has(urls, STAGE_CHUNK), "phone: React and three.js are not downloaded");
  const layout = await page.evaluate(() => {
    const h = document.getElementById("epas-header")!;
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      headerFits: h.scrollWidth <= h.clientWidth + 1,
      toggle: document.querySelector<HTMLButtonElement>("[data-hero-toggle]")?.hidden === false,
    };
  });
  check(layout.overflow <= 1, `phone: no horizontal scroll at 390 px (overflow ${layout.overflow}px)`);
  check(layout.headerFits, 'phone: the header fits with both "Try the lab" and "Sign in"');
  check(layout.toggle, 'phone: "See it in 3D" is offered');
  await shot(page, "landing-phone-static.png");
  await sectionIntact(page, "phone");

  await page.evaluate(() => document.querySelector<HTMLButtonElement>("[data-hero-toggle]")!.click());
  await waitForBench(page);
  check((await mode(page)) === "3d" && has(urls, STAGE_CHUNK), 'phone: "See it in 3D" opts in and then loads three.js');
  await settle(page);
  await shot(page, "landing-phone-3d.png");
  await scrollToBeat(page, '[data-hero-beat="colorcode"][data-step="3"]');
  await shot(page, "landing-phone-3d-band4.png");
  const overflow3d = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow3d <= 1, `phone: no horizontal scroll in 3D either (overflow ${overflow3d}px)`);
  check(errors.length === 0, `phone: no console or page errors${errors.length ? `: ${errors.slice(0, 4).join(" | ")}` : ""}`);
  await context.close();
}

/* C. Reduced motion ---------------------------------------------------- */
async function reducedMotion(browser: Browser) {
  const context = await browser.createBrowserContext();
  const { page } = await open(context, { width: 1366, height: 768 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(`${BASE}/?debug3d=1`, { waitUntil: "domcontentloaded" });
  await waitForBench(page);
  await settle(page);
  const a = await bodyY(page);
  await sleep(1800);
  const b = await bodyY(page);
  check(Number.isFinite(a) && Math.abs(a - b) < 1e-6, "reduced motion: the part holds still instead of floating");

  // The camera cuts instead of gliding: within a second of reaching a beat it has arrived.
  await page.evaluate(() => document.querySelector('[data-hero-beat="measure"]')?.scrollIntoView({ block: "center" }));
  await sleep(1200);
  const p1 = await page.evaluate(() => JSON.stringify((window as any).__labCamera.position));
  await sleep(1500);
  const p2 = await page.evaluate(() => JSON.stringify((window as any).__labCamera.position));
  const before = JSON.parse(p1) as { x: number; y: number; z: number };
  const after = JSON.parse(p2) as { x: number; y: number; z: number };
  const moved = Math.hypot(before.x - after.x, before.y - after.y, before.z - after.z);
  check(moved < 25, `reduced motion: the camera cuts to the next beat instead of gliding for seconds (moved ${moved.toFixed(1)} mm after 1.2 s)`);
  await shot(page, "landing-reduced-motion.png");
  await context.close();
}

/* D. No WebGL ---------------------------------------------------------- */
async function noWebgl() {
  const browser = await launch(["--disable-3d-apis", "--disable-gpu"], false);
  try {
    const context = await browser.createBrowserContext();
    const { page, urls } = await open(context, { width: 1366, height: 768 });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
    await sleep(1500);
    const webgl = await page.evaluate(() => {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    });
    check(!webgl, "no WebGL: this browser really has no WebGL (test premise)");
    check((await mode(page)) === "static", "no WebGL: the hero falls back to the static version, even on a desktop screen");
    check(!has(urls, HERO_CHUNK) && !has(urls, STAGE_CHUNK), "no WebGL: React and three.js are not downloaded");
    check(await page.evaluate(() => document.querySelector<HTMLButtonElement>("[data-hero-toggle]")?.hidden === true), 'no WebGL: "See it in 3D" is not offered');
    await shot(page, "landing-no-webgl.png");
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/* E. Low-power PC ------------------------------------------------------ */
async function lowPower(browser: Browser) {
  const context = await browser.createBrowserContext();
  const { page, urls } = await open(context, { width: 1366, height: 768 });
  // Chrome's own override; redefining navigator.hardwareConcurrency from a page script does not stick.
  const session = await page.createCDPSession();
  await session.send("Emulation.setHardwareConcurrencyOverride", { hardwareConcurrency: 2 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
  await sleep(1500);
  const cores = await page.evaluate(() => navigator.hardwareConcurrency);
  check(cores === 2, `low-power PC: the browser reports 2 cores (test premise, got ${cores})`);
  check((await mode(page)) === "static" && !has(urls, STAGE_CHUNK) && !has(urls, HERO_CHUNK), "low-power PC (2 cores): static hero, no React or three.js");
  await context.close();
}

/* F. JavaScript off ---------------------------------------------------- */
async function noJs(browser: Browser) {
  const context = await browser.createBrowserContext();
  const { page } = await open(context, { width: 1366, height: 768 });
  await page.setJavaScriptEnabled(false);
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  // Plain JavaScript as a string: the build tool's helpers do not exist inside the page.
  const state = (await page.evaluate(`(function () {
    function visible(el) { return !!el && getComputedStyle(el).display !== 'none' && el.offsetHeight > 0; }
    return {
      mode: document.getElementById('epas-hero').getAttribute('data-hero-mode'),
      sentence: visible(document.querySelector('.epas-hero__sentence')),
      tryLab: Array.prototype.some.call(document.querySelectorAll('a'), function (a) { return a.textContent.trim() === 'Try the lab' && visible(a); }),
      board: visible(document.getElementById('epas-hero-board')),
      beats: Array.prototype.filter.call(document.querySelectorAll('[data-hero-beat]'), visible).length
    };
  })()`)) as { mode: string; sentence: boolean; tryLab: boolean; board: boolean; beats: number };
  check(state.mode === "static" && state.sentence && state.tryLab && state.board, "JavaScript off: the static hero shows the headline, a Try the lab button and the circuit diagram");
  check(state.beats === 1, `JavaScript off: only the intro copy shows, not the scroll beats (${state.beats} visible)`);
  await shot(page, "landing-no-js.png");
  await context.close();
}

async function main() {
  // A scenario that throws is a failure of that scenario, not a reason to lose the others' results.
  const scenario = async (name: string, run: () => Promise<void>) => {
    try {
      await run();
    } catch (error) {
      failures.push(`✗ ${name}: crashed: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
    }
  };

  const browser = await launch(["--window-size=1366,768"]);
  try {
    await scenario("desktop", () => desktop(browser));
    await scenario("phone", () => phone(browser));
    await scenario("reduced motion", () => reducedMotion(browser));
    await scenario("low power", () => lowPower(browser));
    await scenario("javascript off", () => noJs(browser));
  } finally {
    await browser.close().catch(() => undefined);
  }
  await scenario("no webgl", () => noWebgl());

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
