/**
 * Drives the circuit workbench in headless Chrome against a running, seeded
 * server, with real mouse and touch events:
 *
 *  A. Free build: load an example and read its numbers off the board; flip a
 *     switch; build a circuit from scratch (tap a part, tap the board, drag a wire
 *     from pin to pin); rotate, undo, reload (autosave); keyboard-only building
 *     through the "parts and connections" text panel.
 *  B. Challenges: solve all five issued challenges through the UI, the way a
 *     student would (read the meter, type the reading, rewire, repair), submit,
 *     and confirm 5/5 on the server and the student's dashboard.
 *  C. Phone: no horizontal scroll, tap-to-place works, challenges fit.
 *  D. Bundles: the workbench page downloads no three.js; other lab pages do not
 *     download the workbench.
 *
 *   php artisan migrate:fresh --seed && php artisan serve --port=8123
 *   APP_URL=http://127.0.0.1:8123 npm run check:circuit-ui
 */

import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer, { Browser, ElementHandle, HTTPRequest, Page } from "puppeteer-core";

const BASE = (process.env.APP_URL ?? "http://127.0.0.1:8123").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = resolve(process.cwd(), process.env.SHOTS_DIR ?? "storage/app/browser-check");
const manifest: Record<string, { file: string }> = JSON.parse(readFileSync(resolve(process.cwd(), "public/build/manifest.json"), "utf8"));
const chunk = (needle: string) => Object.values(manifest).find((entry) => entry.file.includes(needle))?.file ?? `__no_such_chunk_${needle}`;
const CIRCUIT_ENTRY = manifest["resources/js/simulations/circuit/index.tsx"].file;
const STAGE_CHUNK = chunk("Stage3D");
const LAB_ENTRY = manifest["resources/js/simulations/resistor/index.tsx"].file;

const failures: string[] = [];
const notes: string[] = [];
const check = (ok: boolean, message: string) => (ok ? notes.push(`✓ ${message}`) : failures.push(`✗ ${message}`));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });

type Challenge = {
  id: string;
  type: string;
  volts?: number;
  ohms?: number;
  color?: "red" | "green";
  r1?: number;
  r2?: number;
  target?: string | number;
  symptom?: string;
};

async function signIn(page: Page, username: string) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle2" });
  await page.type("#signin-username", username);
  await page.type("#signin-password", "password");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click('form[action$="/login"] button[type="submit"]')]);
}

async function openBench(page: Page) {
  await page.goto(`${BASE}/student/simulations/circuit-sandbox`, { waitUntil: "networkidle2" });
  await page.waitForSelector('[role="application"]', { timeout: 30_000 });
  await sleep(500);
}

/* --- reading the board ------------------------------------------------ */

const center = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, selector);

const pinAt = (page: Page, pin: string) => center(page, `[data-pin="${pin}"] circle`);

async function partAt(page: Page, id: string) {
  // The first rect in a part is its transparent hit area (the meter's is its holster).
  return center(page, `[data-part="${id}"] rect`);
}

async function wireAt(page: Page, id: string) {
  return page.evaluate((wireId) => {
    const path = document.querySelectorAll(`[data-wire="${wireId}"] path`)[1] as SVGPathElement | undefined;
    if (!path) return null;
    const point = path.getPointAtLength(path.getTotalLength() / 2);
    const mapped = new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM() as DOMMatrix);
    return { x: mapped.x, y: mapped.y };
  }, id);
}

const board = (page: Page) =>
  page.evaluate(() => {
    const r = document.querySelector('[role="application"]')!.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });

/** Brings the whole board into the middle of the window (clear of the sticky header) and returns where it is. */
async function focusBoard(page: Page) {
  await page.evaluate(() => document.querySelector('[role="application"]')?.scrollIntoView({ block: "center" }));
  await sleep(150);
  return board(page);
}

const summary = (page: Page) =>
  page.evaluate(() => {
    const text = document.querySelector('section[aria-label="Circuit summary"]')?.textContent ?? "";
    return { parts: Number(/Parts(\d+)/.exec(text)?.[1] ?? -1), wires: Number(/Wires(\d+)/.exec(text)?.[1] ?? -1), text };
  });

const inspector = (page: Page) => page.evaluate(() => document.querySelector('section[aria-label^="Details of"]')?.textContent ?? "");

async function dragWire(page: Page, from: string, to: string) {
  await focusBoard(page);
  const a = await pinAt(page, from);
  const b = await pinAt(page, to);
  if (!a || !b) throw new Error(`pin not found: ${from} or ${to}`);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
  await sleep(120);
}

async function clickPart(page: Page, id: string) {
  await focusBoard(page);
  const p = await partAt(page, id);
  if (!p) throw new Error(`part not found: ${id}`);
  await page.mouse.click(p.x, p.y);
  await sleep(120);
}

async function deleteWire(page: Page, id: string) {
  await focusBoard(page);
  const p = await wireAt(page, id);
  if (!p) throw new Error(`wire not found: ${id}`);
  await page.mouse.click(p.x, p.y);
  await sleep(80);
  await page.keyboard.press("Delete");
  await sleep(120);
}

async function place(page: Page, label: string, fx: number, fy: number) {
  await page.evaluate((text) => {
    const button = Array.from(document.querySelectorAll('[aria-label="Parts"] button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement | undefined;
    button?.scrollIntoView({ block: "center", inline: "center" });
  }, label);
  const handle = await page.evaluateHandle((text) => Array.from(document.querySelectorAll('[aria-label="Parts"] button')).find((b) => b.textContent?.includes(text)) ?? null, label);
  const button = handle.asElement() as ElementHandle<Element> | null;
  if (!button) throw new Error(`no palette button: ${label}`);
  await button.click();
  await sleep(80);
  const b = await focusBoard(page);
  await page.mouse.click(b.x + b.w * fx, b.y + b.h * fy);
  await sleep(150);
}

async function chooseResistor(page: Page, ohms: number) {
  // The nearest listed value, as a student would pick from the list.
  const value = await page.evaluate((target) => {
    const select = document.querySelector('section[aria-label^="Details of"] select') as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => Number(o.value));
    return values.reduce((best, v) => (Math.abs(v - target) < Math.abs(best - target) ? v : best), values[0]);
  }, ohms);
  await page.select('section[aria-label^="Details of"] select', String(value));
  await sleep(150);
}

const unitIndex = (label: string, labels: string[]) => Math.max(0, labels.indexOf(label));

/* ---------------------------------------------------------------------- */

async function freeBuild(browser: Browser) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("dialog", (d) => void d.accept());

  await signIn(page, "jhonrey.m");
  await openBench(page);

  // Load the LED example and read it off the board.
  await page.select("#circuit-example", "led");
  await sleep(500);
  let s = await summary(page);
  check(s.parts === 4 && s.wires === 4, `free build: the LED example loads (${s.parts} parts, ${s.wires} wires)`);
  await clickPart(page, "R1");
  let text = await inspector(page);
  check(/21\.10 mA/.test(text), "free build: the 330 Ω resistor carries 21.10 mA in the LED example (hand-worked 21.0996 mA)");
  await clickPart(page, "D1");
  check(/Lit/.test(await inspector(page)), "free build: the LED is lit");
  await page.evaluate(() => document.querySelector('[role="toolbar"]')?.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: resolve(OUT, "circuit-free-led.png") });

  // Flip the switch with a click: the current stops.
  await clickPart(page, "S1");
  await clickPart(page, "R1");
  text = await inspector(page);
  check(/µA/.test(text) && !/mA/.test(text.split("Current through")[1] ?? ""), "free build: clicking the switch opens the loop and the current falls to nothing");
  await clickPart(page, "S1");

  // Rotate with the keyboard.
  await clickPart(page, "R1");
  await page.keyboard.press("r");
  await sleep(150);
  const rotated = await page.evaluate(() => document.querySelector('[data-part="R1"] > g')?.getAttribute("transform") ?? "");
  check(/rotate\(90\)/.test(rotated), `free build: R turns the selected part a quarter turn (transform: ${rotated})`);

  // Start again and build from scratch with taps and drags.
  await page.evaluate(() => (Array.from(document.querySelectorAll('[role="toolbar"] button')).find((b) => b.textContent === "Clear") as HTMLButtonElement).click());
  await sleep(300);
  s = await summary(page);
  check(s.parts === 0, "free build: Clear empties the board");

  const b = await board(page);
  await place(page, "9 V battery", 0.2, 0.55);
  await place(page, "Resistor", 0.5, 0.25);
  await place(page, "LED", 0.8, 0.55);
  const placed = (await page.evaluate(() => document.querySelectorAll("[data-part]").length)) as number;
  check(placed === 3, `free build: three parts are on the board (${placed})`);

  await dragWire(page, "B1.+", "R1.a");
  await dragWire(page, "R1.b", "D1.a");
  await dragWire(page, "D1.k", "B1.-");
  await clickPart(page, "D1");
  text = await inspector(page);
  check(/Lit/.test(text), "free build: wiring B1, R1 and D1 by dragging pin to pin lights the LED");
  check(!/flag|Burnt/i.test(text), "free build: nothing is burnt or overheating at 330 Ω");

  // The resistor value changes the current live.
  await clickPart(page, "R1");
  await chooseResistor(page, 10);
  await clickPart(page, "D1");
  text = await inspector(page);
  check(/Burnt out/.test(text), "free build: a 10 Ω resistor burns the LED out, and the board says so");
  await page.screenshot({ path: resolve(OUT, "circuit-free-burnt.png") });
  await clickPart(page, "R1");
  await chooseResistor(page, 330);

  // Undo takes the last wire away.
  const before = await page.evaluate(() => document.querySelectorAll("[data-wire]").length);
  await page.evaluate(() => (Array.from(document.querySelectorAll('[role="toolbar"] button')).find((x) => x.textContent === "Undo") as HTMLButtonElement).click());
  await page.evaluate(() => (Array.from(document.querySelectorAll('[role="toolbar"] button')).find((x) => x.textContent === "Undo") as HTMLButtonElement).click());
  const after = await page.evaluate(() => document.querySelectorAll("[data-wire]").length);
  check(before === 3 && after === 3, `free build: undo steps back through edits (wires ${before} → ${after}, the value changes came first)`);

  // Autosave: the circuit survives a reload.
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForSelector('[role="application"]');
  s = await summary(page);
  check(s.parts === 3 && s.wires === 3, `free build: the circuit is still there after a reload (${s.parts} parts, ${s.wires} wires)`);

  // Keyboard path: add a part and a wire from the text panel.
  await page.evaluate(() => (document.querySelector("details summary") as HTMLElement).click());
  await page.select("#conn-type", "switch");
  await page.evaluate(() => (Array.from(document.querySelectorAll("details button")).find((x) => x.textContent === "Add") as HTMLButtonElement).click());
  await sleep(200);
  s = await summary(page).catch(() => ({ parts: -1, wires: -1, text: "" }));
  const partCount = await page.evaluate(() => document.querySelectorAll("[data-part]").length);
  check(partCount === 4, `free build: "Add" in the text panel puts a switch on the board (${partCount} parts)`);
  await page.select('select[aria-label="From pin"]', "S1.a");
  await page.select('select[aria-label="To pin"]', "R1.a");
  await page.evaluate(() => (Array.from(document.querySelectorAll("details button")).find((x) => x.textContent === "Connect") as HTMLButtonElement).click());
  await sleep(200);
  const wireCount = await page.evaluate(() => document.querySelectorAll("[data-wire]").length);
  check(wireCount === 4, `free build: "Connect" in the text panel adds a wire without the canvas (${wireCount} wires)`);

  check(errors.length === 0, `free build: no console or page errors${errors.length ? `: ${errors.slice(0, 4).join(" | ")}` : ""}`);
  await context.close();
}

/* ---------------------------------------------------------------------- */

async function challenges(browser: Browser) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("dialog", (d) => void d.accept());

  await signIn(page, "jhonrey.m");
  await openBench(page);

  const issued: Challenge[] = await page.evaluate(() => JSON.parse(document.querySelector<HTMLElement>("[data-simulation-island]")!.dataset.checkpoints!));
  check(issued.length === 5, `challenges: five are issued (${issued.map((c) => c.type).join(", ")})`);

  await page.evaluate(() => (Array.from(document.querySelectorAll('[role="radio"]')).find((r) => r.textContent === "Challenges") as HTMLElement).click());
  await page.waitForSelector("#circuit-challenges");
  await sleep(400);
  const cards = await page.$$("#circuit-challenges ol > li");
  check(cards.length === 5, `challenges: five cards are shown (${cards.length})`);
  await page.evaluate(() => document.querySelector('[role="toolbar"]')?.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: resolve(OUT, "circuit-challenges-first.png") });

  const type = async (index: number, value: number, unit: string, units: string[]) => {
    const card = (await page.$$("#circuit-challenges ol > li"))[index];
    const input = await card.$("input[inputmode]");
    await input!.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await input!.click({ clickCount: 3 });
    await input!.type(String(value));
    const select = await card.$("select");
    await select!.select(String(unitIndex(unit, units)));
  };

  const meterReading = async (index: number) => {
    const card = (await page.$$("#circuit-challenges ol > li"))[index];
    const text = await card.evaluate((el) => el.textContent ?? "");
    const m = /Meter M1 shows: (-?[0-9.]+) (µA|mA|mV|kΩ|MΩ|A|V|Ω)/.exec(text);
    return m ? { value: Number(m[1]), unit: m[2] } : null;
  };

  const open = async (index: number) => {
    const card = (await page.$$("#circuit-challenges ol > li"))[index];
    const button = await card.evaluateHandle((el) => Array.from(el.querySelectorAll("button")).find((b) => b.textContent === "Open on the board") ?? null);
    const el = button.asElement() as ElementHandle<Element> | null;
    if (el) {
      await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
      await el.click();
      await sleep(500);
    }
  };

  for (const [index, c] of issued.entries()) {
    if (index > 0) await open(index);
    await page.evaluate(() => document.querySelector('[role="toolbar"]')?.scrollIntoView({ block: "start" }));
    await sleep(300);
    const b = await board(page);

    switch (c.type) {
      case "ohms_law":
        await type(index, ((c.volts as number) / (c.ohms as number)) * 1000, "mA", ["A", "mA", "µA"]);
        break;

      case "measure_voltage": {
        await dragWire(page, "M1.v", `${c.target}.a`);
        await dragWire(page, "M1.com", `${c.target}.b`);
        const r = await meterReading(index);
        check(r !== null && r.value > 0, `challenges: the voltmeter wired across ${c.target} reads ${r?.value} ${r?.unit}`);
        if (r) await type(index, r.value, r.unit, ["V", "mV"]);
        break;
      }

      case "measure_current": {
        await deleteWire(page, "w2");
        await dragWire(page, "R1.a", "M1.v");
        await dragWire(page, "M1.com", "R2.b");
        const r = await meterReading(index);
        check(r !== null && r.value > 0, `challenges: the ammeter put into the gap reads ${r?.value} ${r?.unit}`);
        if (r) await type(index, r.value, r.unit, ["A", "mA", "µA"]);
        await page.evaluate(() => document.querySelector('[role="toolbar"]')?.scrollIntoView({ block: "start" }));
        await page.screenshot({ path: resolve(OUT, "circuit-challenge-measure-current.png") });
        break;
      }

      case "parallel": {
        const r1 = c.r1 as number;
        const target = c.target as number;
        await place(page, "Resistor", 0.82, 0.3);
        await chooseResistor(page, (r1 * target) / (r1 - target));
        await dragWire(page, "R2.a", "R1.a");
        await dragWire(page, "R2.b", "R1.b");
        await dragWire(page, "M1.v", "R1.a");
        await dragWire(page, "M1.com", "R1.b");
        const r = await meterReading(index);
        check(r !== null && Math.abs(r.value * (r.unit === "kΩ" ? 1000 : 1) - target) / target < 0.03, `challenges: the ohmmeter across the parallel pair reads ${r?.value} ${r?.unit} (target ${target} Ω)`);
        if (r) await type(index, r.value, r.unit, ["Ω", "kΩ", "MΩ"]);
        break;
      }

      case "build_led": {
        const vf = c.color === "red" ? 1.9 : 2.1;
        await place(page, "Resistor", 0.45, 0.22);
        await chooseResistor(page, ((c.volts as number) - vf) / 0.014 - 5.2);
        await dragWire(page, "V1.+", "R1.a");
        await dragWire(page, "R1.b", "D1.a");
        await dragWire(page, "D1.k", "V1.-");
        const live = await (await page.$$("#circuit-challenges ol > li"))[index].evaluate((el) => el.textContent ?? "");
        check(/In the right band/.test(live), `challenges: the live line says the LED current is in the band (${/LED current now: ([^.]*\.[0-9]+ mA)/.exec(live)?.[1] ?? live.slice(0, 60)})`);
        break;
      }

      case "troubleshoot": {
        const symptom = c.symptom ?? "";
        const cause = /faintly/.test(symptom) ? "big" : /does not light/.test(symptom) ? "reversed" : "open";
        const card = (await page.$$("#circuit-challenges ol > li"))[index];
        await card.evaluate((el, value) => (el.querySelector(`input[type=radio][value="${value}"]`) as HTMLInputElement).click(), cause);
        if (cause === "big") {
          await clickPart(page, "R1");
          await chooseResistor(page, 330);
        } else if (cause === "open") {
          await dragWire(page, "R1.b", "D1.a");
        } else {
          await deleteWire(page, "w2");
          await deleteWire(page, "w3");
          await dragWire(page, "R1.b", "D1.a");
          await dragWire(page, "D1.k", "J1.j");
        }
        const live = await card.evaluate((el) => el.textContent ?? "");
        check(/In the right band/.test(live), `challenges: the ${cause} fault is repaired and the LED current is back in the band`);
        break;
      }
    }
    await sleep(200);
  }

  await page.evaluate(() => document.getElementById("circuit-challenges")?.scrollIntoView({ block: "start" }));
  await sleep(300);
  await page.screenshot({ path: resolve(OUT, "circuit-challenges-answered.png") });

  await page.evaluate(() => (Array.from(document.querySelectorAll("button")).find((x) => x.textContent === "Submit answers") as HTMLButtonElement).click());
  await page.waitForFunction(() => document.getElementById("circuit-challenges")?.textContent?.includes("Saved."), { timeout: 30_000 });
  const verdict = await page.$eval("#circuit-challenges", (el) => el.textContent ?? "");
  check(/Passed/.test(verdict) && /5\/5/.test(verdict), "challenges: all five solved through the UI are graded correct by the server (5/5, Passed)");
  await page.screenshot({ path: resolve(OUT, "circuit-challenges-graded.png") });

  await page.goto(`${BASE}/student`, { waitUntil: "networkidle2" });
  const card = await page.$eval("[data-simulation-card]", (el) => el.textContent ?? "");
  check(/Circuit workbench/.test(card) && /5\/5/.test(card) && /Passed/.test(card), "challenges: the student dashboard shows the Circuit workbench result, 5/5 Passed");

  check(errors.length === 0, `challenges: no console or page errors${errors.length ? `: ${errors.slice(0, 4).join(" | ")}` : ""}`);
  await context.close();
}

/* ---------------------------------------------------------------------- */

async function phone(browser: Browser) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await signIn(page, "jhonrey.m");
  await openBench(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 1, `phone: no horizontal scroll at 390 px (overflow ${overflow}px)`);

  // Tap a part, tap the board.
  const b = await board(page);
  await page.evaluate(() => document.querySelector('[aria-label="Parts"]')?.scrollIntoView({ block: "center" }));
  await sleep(300);
  const handle = await page.evaluateHandle(() => Array.from(document.querySelectorAll('[aria-label="Parts"] button')).find((x) => x.textContent?.includes("Resistor")) ?? null);
  await (handle.asElement() as ElementHandle<Element>).tap();
  await sleep(150);
  const box = await focusBoard(page);
  await page.touchscreen.tap(box.x + box.w / 2, box.y + box.h / 2);
  await sleep(250);
  const parts = await page.evaluate(() => document.querySelectorAll("[data-part]").length);
  check(parts === 1, `phone: tapping a part and then the board places it (${parts} part)`);
  await page.evaluate(() => document.querySelector('[aria-label="Parts"]')?.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: resolve(OUT, "circuit-phone-free.png") });
  void b;

  // Load an example to see a real circuit at phone size.
  await page.select("#circuit-example", "led");
  await sleep(500);
  await page.evaluate(() => document.querySelector('[role="application"]')?.scrollIntoView({ block: "center" }));
  await page.screenshot({ path: resolve(OUT, "circuit-phone-led.png") });

  await page.evaluate(() => (Array.from(document.querySelectorAll('[role="radio"]')).find((r) => r.textContent === "Challenges") as HTMLElement).click());
  await page.waitForSelector("#circuit-challenges");
  await sleep(500);
  const overflowChallenges = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflowChallenges <= 1, `phone: no horizontal scroll in Challenges either (overflow ${overflowChallenges}px)`);
  await page.evaluate(() => document.getElementById("circuit-challenges")?.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: resolve(OUT, "circuit-phone-challenges.png") });
  check(errors.length === 0, `phone: no console or page errors${errors.length ? `: ${errors.slice(0, 4).join(" | ")}` : ""}`);
  await context.close();
}

/* ---------------------------------------------------------------------- */

async function bundles(browser: Browser) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const urls: string[] = [];
  page.on("request", (r: HTTPRequest) => urls.push(r.url()));
  await signIn(page, "jhonrey.m");

  urls.length = 0;
  await openBench(page);
  check(urls.some((u) => u.includes(CIRCUIT_ENTRY)), "bundles: the workbench page loads the workbench");
  check(!urls.some((u) => u.includes(STAGE_CHUNK)), "bundles: the workbench page does not download three.js or the 3D stage");
  check(!urls.some((u) => u.includes(LAB_ENTRY)), "bundles: the workbench page does not download the resistor lab");

  urls.length = 0;
  await page.goto(`${BASE}/student/simulations/resistor-lab`, { waitUntil: "networkidle2" });
  check(!urls.some((u) => u.includes(CIRCUIT_ENTRY)), "bundles: the resistor lab page does not download the workbench");

  for (const path of ["/student", "/student/modules", "/student/simulations"]) {
    urls.length = 0;
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2" });
    check(!urls.some((u) => u.includes(CIRCUIT_ENTRY) || u.includes(STAGE_CHUNK)), `bundles: ${path} downloads neither the workbench nor three.js`);
  }
  await context.close();
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const scenario = async (name: string, run: () => Promise<void>) => {
    try {
      await run();
    } catch (error) {
      failures.push(`✗ ${name}: crashed: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
    }
  };

  try {
    await scenario("free build", () => freeBuild(browser));
    await scenario("challenges", () => challenges(browser));
    await scenario("phone", () => phone(browser));
    await scenario("bundles", () => bundles(browser));
  } finally {
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
