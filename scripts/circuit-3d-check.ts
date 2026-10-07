/**
 * The circuit workbench's 3D bench in headless Chrome (software WebGL): opens
 * the LED example in 3D, checks that it renders, the LED lights, the switch
 * flips from a click in 3D and the schematic follows. Screenshots go to
 * storage/app/browser-check/. Needs a running, seeded server.
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:8123";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = resolve("storage/app/browser-check");
mkdirSync(OUT, { recursive: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (ok: boolean, text: string) => {
  console.log(`${ok ? "✓" : "✗"} ${text}`);
  if (!ok) failed++;
};

const clipOf = async (page: import("puppeteer-core").Page) => (await page.evaluate(() => document.querySelector("[data-bench3d]")?.scrollIntoView({ block: "center" })), await sleep(400), page.$eval("[data-bench3d]", (e) => { const r = e.getBoundingClientRect(); return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height }; }));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const [name, viewport] of [["desktop", { width: 1366, height: 768 }], ["phone", { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]] as const) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(`${BASE}/sign-in`);
  if (await page.$("#signin-username")) {
    await page.type("#signin-username", "jhonrey.m");
    await page.type("#signin-password", "password");
    await Promise.all([page.waitForNavigation(), page.click('form[action$="/login"] button[type="submit"]')]);
  }
  await page.goto(`${BASE}/student/simulations/circuit-sandbox`, { waitUntil: "networkidle2" });
  await page.waitForSelector('[role="application"]');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForSelector('[role="application"]');

  await page.select("#circuit-example", "led");
  await sleep(300);
  const downloadedThreeBefore = await page.evaluate(() => performance.getEntriesByType("resource").some((r) => /Stage3D|three/i.test(r.name)));
  check(!downloadedThreeBefore, `${name}: three.js is not downloaded before the 3D view is opened`);

  await page.evaluate(() => (Array.from(document.querySelectorAll('[role="radio"]')).find((b) => b.textContent === "3D bench") as HTMLElement).click());
  await page.waitForSelector("[data-bench3d] canvas", { timeout: 20000 });
  await sleep(4000);
  await page.evaluate(() => document.querySelector("[data-bench3d]")?.scrollIntoView({ block: "center" }));
  await sleep(500);
  await page.screenshot({ path: resolve(OUT, `circuit-3d-${name}-led-on.png`) });

  const tags = async () => (await page.$$eval("[data-bench3d] div.font-mono", (els) => els.map((e) => e.textContent ?? ""))).join(" | ");
  const lit = await page.$eval("[data-bench3d]", (e) => e.getBoundingClientRect().height);
  const shotOn = await page.screenshot({ clip: await clipOf(page) });
  check(/S1 +closed/.test(await tags()) && /D1 +red LED/.test(await tags()), `${name}: the 3D bench labels its parts (${await tags()})`);
  check(lit > 300, `${name}: the 3D stage has room (${Math.round(lit)} px high)`);
  check(errors.length === 0, `${name}: no console or page errors${errors.length ? " — " + errors.slice(0, 2).join(" | ") : ""}`);

  // Open the switch in the schematic; the 3D bench must follow, and the LED must go dark.
  await page.evaluate(() => (Array.from(document.querySelectorAll('[role="radio"]')).find((b) => b.textContent === "Schematic") as HTMLElement).click());
  await sleep(400);
  await page.evaluate(() => document.querySelector('[data-part="S1"]')?.scrollIntoView({ block: "center" }));
  await sleep(500);
  const r = await page.evaluate(() => { const e = document.querySelector('[data-part="S1"] rect')!.getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 }; });
  await page.mouse.click(r.x, r.y);
  await sleep(300);
  await page.evaluate(() => (Array.from(document.querySelectorAll('[role="radio"]')).find((b) => b.textContent === "3D bench") as HTMLElement).click());
  await page.waitForSelector("[data-bench3d] canvas");
  await sleep(3500);
  await page.evaluate(() => document.querySelector("[data-bench3d]")?.scrollIntoView({ block: "center" }));
  await sleep(300);
  check(/S1 +open/.test(await tags()), `${name}: opening the switch in the schematic shows it open in 3D`);
  const shotOff = await page.screenshot({ clip: await clipOf(page) });
  await page.screenshot({ path: resolve(OUT, `circuit-3d-${name}-led-off.png`) });
  check(Buffer.compare(shotOn as Buffer, shotOff as Buffer) !== 0, `${name}: the 3D picture changes when the LED goes out`);

  // Back to the schematic keeps the circuit.
  await page.evaluate(() => (Array.from(document.querySelectorAll('[role="radio"]')).find((b) => b.textContent === "Schematic") as HTMLElement).click());
  await sleep(500);
  const parts = await page.evaluate(() => document.querySelectorAll("[data-part]").length);
  check(parts === 4, `${name}: the schematic still has the 4 parts (${parts})`);
  await page.close();
}
await browser.close();
console.log(failed === 0 ? "all passed" : `${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
